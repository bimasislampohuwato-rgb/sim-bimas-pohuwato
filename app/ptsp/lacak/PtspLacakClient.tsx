'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { PtspPermohonanItem, PtspLacakPageData } from '@/app/ptsp/lacak/_actions/ptsp-lacak';

interface PtspLacakClientProps {
  initialData: PtspLacakPageData | null;
  initialError: string | null;
}

export default function PtspLacakClient({ initialData, initialError }: PtspLacakClientProps) {
  const [nomorTiket, setNomorTiket] = useState('');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [hasilData, setHasilData] = useState<PtspPermohonanItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const jalankanPelacakan = useCallback(async (tiketInput: string) => {
    const cleanTiket = tiketInput.trim();
    if (!cleanTiket) return;

    setLoading(true);
    setErrorMsg('');
    setHasilData(null);

    const { data, error } = await supabase
      .from('ptsp_permohonan')
      .select('*')
      .ilike('nomor_tiket', cleanTiket)
      .single();

    setLoading(false);

    if (error || !data) {
      setErrorMsg('Nomor tiket permohonan tidak ditemukan. Silakan periksa kembali.');
    } else {
      setHasilData(data as PtspPermohonanItem);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const tiketParam = params.get('tiket');
      if (tiketParam) {
        setNomorTiket(tiketParam);
        await jalankanPelacakan(tiketParam);
      }
    }
    init();
  }, [jalankanPelacakan]);

  const handleLacak = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await jalankanPelacakan(nomorTiket);
  }, [nomorTiket, jalankanPelacakan]);

  const getStatusBadge = useCallback((status: string) => {
    if (status === 'Selesai') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === 'Diproses') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === 'Ditolak') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }, []);

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#062e21] via-[#093d2c] to-[#042217] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 text-emerald-100">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-gray-900">
            <h2 className="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h2>
            <p className="text-red-700">{initialError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062e21] via-[#093d2c] to-[#042217] py-8 sm:py-10 px-4 sm:px-6 lg:px-8 text-emerald-100">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/ptsp/tambah"
            className="text-xs font-bold text-emerald-200 hover:bg-emerald-800/60 bg-emerald-900/50 border border-emerald-600/50 px-4 py-2 rounded-xl transition shadow-sm backdrop-blur-md"
          >
            ← Kembali ke Formulir Pengajuan
          </Link>
          <div />
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg border border-emerald-500/30 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Bimas" className="w-full h-full object-cover" />
            ) : (
              <span>🔍</span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">Lacak Status Permohonan PTSP</h1>
          <p className="text-xs sm:text-sm text-emerald-300/90 mt-1">Masukkan nomor tiket layanan keagamaan Anda untuk memantau progres</p>
        </div>

        <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-emerald-900/50 p-5 sm:p-8 mb-6 backdrop-blur-md">
          <form onSubmit={handleLacak} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nomor Tiket Layanan</label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  required
                  value={nomorTiket}
                  onChange={(e) => setNomorTiket(e.target.value)}
                  placeholder="CONTOH: PTSP-20261117-XXXX"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 shrink-0"
                >
                  {loading ? 'Mencari...' : 'Lacak Status'}
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 text-center font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* HASIL PENCARIAN TIKET */}
        {hasilData && (
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-emerald-200 p-5 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Nomor Tiket</span>
                <span className="text-lg sm:text-xl font-mono font-bold text-emerald-900 break-all">{hasilData.nomor_tiket}</span>
              </div>
              <span className={`shrink-0 px-3.5 py-1 text-xs font-bold rounded-full border ${getStatusBadge(hasilData.status)}`}>
                {hasilData.status || 'Menunggu Verifikasi'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block mb-0.5 font-semibold">Nama Pemohon</span>
                <strong className="text-gray-900 text-sm break-words">{hasilData.nama_pemohon}</strong>
                <div className="text-gray-500 font-mono mt-0.5 break-all">NIK: {hasilData.nik_pemohon}</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block mb-0.5 font-semibold">Jenis Layanan</span>
                <strong className="text-emerald-800 text-sm break-words">{hasilData.jenis_layanan}</strong>
                <div className="text-gray-500 mt-0.5">📞 {hasilData.no_hp}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <strong className="text-gray-700 block uppercase tracking-wider text-[11px]">Keterangan Permohonan:</strong>
                <p className="text-gray-600 leading-relaxed break-words">{hasilData.keterangan_permohonan}</p>
              </div>

              {/* INFORMASI PETUGAS / SURAT TUGAS JIKA STATUS SELESAI */}
              {hasilData.status === 'Selesai' && (hasilData.petugas_ditunjuk || hasilData.link_surat_tugas || hasilData.catatan_admin) && (
                <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-3">
                  <div className="font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>✅</span> Tindak Lanjut & Penugasan Resmi Kemenag
                  </div>

                  {hasilData.petugas_ditunjuk && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-emerald-700 block font-semibold">Petugas / Rohaniwan Ditunjuk:</span>
                        <strong className="text-emerald-950 text-sm break-words">{hasilData.petugas_ditunjuk}</strong>
                      </div>
                      {hasilData.no_hp_petugas && (
                        <div>
                          <span className="text-emerald-700 block font-semibold">Kontak WhatsApp Petugas:</span>
                          <a
                            href={`https://wa.me/${hasilData.no_hp_petugas.replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-800 font-bold underline"
                          >
                            💬 {hasilData.no_hp_petugas}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasilData.link_surat_tugas && (
                <div className="pt-1">
                  <a
                    href={hasilData.link_surat_tugas}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-800 font-bold rounded-xl border border-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
                  >
                    <span>📄</span> Unduh Surat Tugas Resmi (Google Drive)
                  </a>
                </div>
              )}

              {hasilData.catatan_admin && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-emerald-700 block font-semibold">Catatan Petugas / Admin:</span>
                  <p className="text-emerald-900 mt-0.5 break-words">{hasilData.catatan_admin}</p>
                </div>
              )}
            </div>

            {hasilData.status !== 'Selesai' && hasilData.catatan_admin && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                <strong className="text-amber-900 block uppercase tracking-wider text-[11px]">Catatan / Pesan Petugas:</strong>
                <p className="text-amber-800 break-words">{hasilData.catatan_admin}</p>
              </div>
            )}

            {hasilData.file_lampiran_url && (
              <div className="pt-2">
                <a
                  href={hasilData.file_lampiran_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>📎</span> Unduh Berkas Lampiran / Proposal yang Anda Unggah
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}