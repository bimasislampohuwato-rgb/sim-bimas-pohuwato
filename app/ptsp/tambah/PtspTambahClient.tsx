'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { sendEmailNotification } from '@/actions/sendEmailAction';
import type { MasterLayananItem, PtspTambahPageData } from '@/app/ptsp/tambah/_actions/ptsp-tambah';

interface PtspTambahClientProps {
  initialData: PtspTambahPageData | null;
  initialError: string | null;
}

export default function PtspTambahClient({ initialData, initialError }: PtspTambahClientProps) {
  const [layananList, setLayananList] = useState<MasterLayananItem[]>(initialData?.layananList || []);
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [namaPemohon, setNamaPemohon] = useState('');
  const [nikPemohon, setNikPemohon] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState('');
  const [selectedLayananObj, setSelectedLayananObj] = useState<MasterLayananItem | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [successTiket, setSuccessTiket] = useState<string | null>(null);
  const [savedNoHp, setSavedNoHp] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const triggerToast = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const handleLayananChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setJenisLayanan(val);
    const found = layananList.find((item) => item.nama_layanan === val);
    setSelectedLayananObj(found || null);
  }, [layananList]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerToast('error', 'File Terlalu Besar', 'Maksimal ukuran berkas lampiran adalah 2 MB.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  }, [triggerToast]);

  const renderFormattedPersyaratan = useCallback((text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    return (
      <ol className="list-decimal pl-5 space-y-1.5 text-emerald-900 leading-relaxed">
        {lines.map((line, i) => {
          const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
          return <li key={i}>{cleanLine}</li>;
        })}
      </ol>
    );
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    let fileUrl = null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop() || 'pdf';
      const randomStr = Math.random().toString(36).substring(2, 7);
      const fileName = `ptsp_${Date.now()}_${randomStr}.${fileExt}`;
      const filePath = `ptsp_lampiran/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media_sim')
        .upload(filePath, selectedFile, { cacheControl: '3600' });

      if (uploadError) {
        triggerToast('error', 'Gagal Upload Berkas', uploadError.message);
        setProcessing(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('media_sim')
        .getPublicUrl(filePath);

      fileUrl = publicUrlData.publicUrl;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomorTiket = `PTSP-${dateStr}-${randomCode}`;

    const { error: insertError } = await supabase.from('ptsp_permohonan').insert([
      {
        nomor_tiket: nomorTiket,
        nama_pemohon: namaPemohon,
        nik_pemohon: nikPemohon,
        no_hp: noHp,
        email: email || null,
        jenis_layanan: jenisLayanan,
        keterangan_permohonan: keterangan,
        file_lampiran_url: fileUrl,
        status: 'Menunggu Verifikasi',
      },
    ]);

    setProcessing(false);

    if (insertError) {
      triggerToast('error', 'Gagal Mengajukan', insertError.message);
    } else {
      setSuccessTiket(nomorTiket);
      setSavedNoHp(noHp);
      triggerToast('success', 'Berhasil Diajukan', 'Permohonan layanan Anda telah terkirim ke sistem PTSP Kemenag Pohuwato.');

      if (email) {
        sendEmailNotification({
          to: email,
          namaPemohon: namaPemohon,
          nomorTiket: nomorTiket,
          jenisLayanan: jenisLayanan,
          status: 'masuk',
          trackingUrl: `${window.location.origin}/ptsp/lacak?tiket=${nomorTiket}`,
        })
          .then((res) => {
            if (res.success) {
              triggerToast('success', 'Email Terkirim', `Bukti tiket juga telah dikirim ke ${email}`);
            } else {
              triggerToast('error', 'Email Gagal Terkirim', res.message || 'Cek konfigurasi SMTP di server.');
            }
          })
          .catch((err) => {
            console.error('Error server action email:', err);
            triggerToast('error', 'Error Sistem Email', 'Terjadi kesalahan saat memanggil layanan email.');
          });
      }
    }
  }, [selectedFile, namaPemohon, nikPemohon, noHp, email, jenisLayanan, keterangan, triggerToast]);

  const handleCopyTiket = useCallback(() => {
    if (!successTiket) return;
    navigator.clipboard.writeText(successTiket);
    triggerToast('success', 'Berhasil Disalin', 'Nomor tiket berhasil disalin ke clipboard.');
  }, [successTiket, triggerToast]);

  const handleOpenWhatsAppPemohon = useCallback(() => {
    if (!successTiket) return;
    let formattedPhone = savedNoHp.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const pesan = `*NOTIFIKASI PTSP KEMENAG POHUWATO*\n\n` +
      `Halo Bpk/Ibu *${namaPemohon}*,\n` +
      `Permohonan layanan keagamaan Anda telah berhasil kami terima dan masuk dalam antrean verifikasi.\n\n` +
      `*Detail Permohonan:*\n` +
      `- Nomor Tiket: *${successTiket}*\n` +
      `- Jenis Layanan: ${jenisLayanan}\n` +
      `- Status: Menunggu Verifikasi\n\n` +
      `Anda dapat melacak status permohonan secara berkala melalui tautan berikut:\n` +
      `${window.location.origin}/ptsp/lacak\n\n` +
      `Terima kasih telah menggunakan layanan PTSP Online Bimas Islam Kantor Kementerian Agama Kabupaten Pohuwato.`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(pesan)}`;
    window.open(waUrl, '_blank');
  }, [successTiket, savedNoHp, namaPemohon, jenisLayanan]);

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#062e21] via-[#093d2c] to-[#042217] py-10 px-4 sm:px-6 lg:px-8 text-emerald-100">
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
    <div className="min-h-screen bg-gradient-to-br from-[#062e21] via-[#093d2c] to-[#042217] py-10 px-4 sm:px-6 lg:px-8 text-emerald-100">
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5 text-gray-900">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {toast.type === 'success' ? '✓' : '⚠️'}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
            <p className="text-xs text-gray-700 mt-0.5 font-medium">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <Link href="/ptsp/lacak" className="text-xs font-bold text-emerald-200 hover:bg-emerald-800/60 bg-emerald-900/50 border border-emerald-600/50 px-4 py-2 rounded-xl transition shadow-sm backdrop-blur-md">
            🔍 Lacak Status Tiket Anda
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg border border-emerald-500/30 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Bimas" className="w-full h-full object-cover" />
            ) : (
              <span>🕌</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">PTSP Online Bimas Islam</h1>
          <p className="text-sm text-emerald-300/90 mt-1">Kantor Kementerian Agama Kabupaten Pohuwato</p>
        </div>

        {successTiket ? (
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-emerald-200 p-8 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto font-bold">✓</div>
            <h2 className="text-xl font-bold text-gray-900">Permohonan Berhasil Dikirim!</h2>
            <p className="text-xs text-gray-600">Simpan Nomor Tiket Pelacakan Anda di bawah ini untuk memeriksa status permohonan keagamaan:</p>
            <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 py-4 px-6 rounded-2xl inline-flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] text-emerald-700 block font-semibold uppercase tracking-wider">Nomor Tiket Layanan</span>
                <span className="text-2xl font-mono font-bold text-emerald-900">{successTiket}</span>
              </div>
              <button onClick={handleCopyTiket} title="Salin Tiket" className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
                📋 Salin
              </button>
            </div>
            <div className="pt-2">
              <button onClick={handleOpenWhatsAppPemohon} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition">
                <span>💬</span> Kirim Bukti ke WhatsApp Pemohon
              </button>
            </div>
            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  setSuccessTiket(null);
                  setNamaPemohon('');
                  setNikPemohon('');
                  setNoHp('');
                  setEmail('');
                  setKeterangan('');
                  setSelectedFile(null);
                }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
              >
                Ajukan Permohonan Lain
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-emerald-900/50 p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-base font-bold text-gray-900 mb-1">Formulir Pengajuan Layanan Publik</h2>
            <p className="text-xs text-gray-500 mb-6">Silakan pilih layanan dan lengkapi rincian persyaratan yang ditentukan.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Pilih Jenis Layanan PTSP</label>
                <select value={jenisLayanan} onChange={handleLayananChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-semibold">
                  {layananList.map((item) => (
                    <option key={item.id} value={item.nama_layanan}>{item.nama_layanan}</option>
                  ))}
                </select>
              </div>

              {selectedLayananObj && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/80">
                    <div className="font-bold text-emerald-950 uppercase">📋 Ketentuan & Persyaratan Layanan</div>
                    {selectedLayananObj.waktu_pengerjaan && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] shrink-0">
                        ⏱️ Estimasi: {selectedLayananObj.waktu_pengerjaan}
                      </span>
                    )}
                  </div>
                  {renderFormattedPersyaratan(selectedLayananObj.deskripsi_persyaratan || '')}
                  {selectedLayananObj.link_berkas_syarat && (
                    <div className="pt-2">
                      <a href={selectedLayananObj.link_berkas_syarat} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-emerald-800 font-bold rounded-xl border border-emerald-300 hover:bg-emerald-100 transition shadow-2xs">
                        <span>📥</span> Unduh Dokumen Pendukung / Contoh Format
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap Pemohon</label>
                  <input type="text" required value={namaPemohon} onChange={(e) => setNamaPemohon(e.target.value)} placeholder="Sesuai KTP" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NIK (Nomor Induk Kependudukan)</label>
                  <input type="text" required maxLength={16} value={nikPemohon} onChange={(e) => setNikPemohon(e.target.value)} placeholder="16 digit NIK" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nomor HP / WhatsApp Aktif</label>
                  <input type="tel" required value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="08123456789" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email (Untuk Notifikasi)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Detail Keperluan / Keterangan Permohonan</label>
                <textarea rows={4} required value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Jelaskan secara ringkas maksud dan tujuan permohonan layanan ini..." className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unggah Berkas Syarat / Proposal (PDF / Gambar)</label>
                <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-gray-300 rounded-xl" />
                <p className="text-[11px] text-gray-500 mt-1">Format PDF atau Gambar. Maksimal ukuran 2 MB.</p>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <button type="submit" disabled={processing} className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50">
                  {processing ? 'Mengirim Permohonan...' : 'Kirim Permohonan PTSP'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}