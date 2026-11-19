'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPtspPage() {
  const router = useRouter();
  const [permohonanList, setPermohonanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatanAdmin, setCatatanAdmin] = useState('');
  
  // Field Tambahan Tindak Lanjut / Penugasan (khusus status Selesai)
  const [petugasDitunjuk, setPetugasDitunjuk] = useState('');
  const [noHpPetugas, setNoHpPetugas] = useState('');
  const [linkSuratTugas, setLinkSuratTugas] = useState('');

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      await loadPermohonan();
    }
    init();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadPermohonan() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ptsp_permohonan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error load PTSP:', error.message);
    } else if (data) {
      setPermohonanList(data);
    }
    setLoading(false);
  }

  const openActionModal = (item: any) => {
    setSelectedItem(item);
    setNewStatus(item.status || 'Menunggu Verifikasi');
    setCatatanAdmin(item.catatan_admin || '');
    setPetugasDitunjuk(item.petugas_ditunjuk || '');
    setNoHpPetugas(item.no_hp_petugas || '');
    setLinkSuratTugas(item.link_surat_tugas || '');
    setShowModal(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setProcessing(true);

    const updatePayload: any = {
      status: newStatus,
      catatan_admin: catatanAdmin,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'Selesai') {
      updatePayload.petugas_ditunjuk = petugasDitunjuk;
      updatePayload.no_hp_petugas = noHpPetugas;
      updatePayload.link_surat_tugas = linkSuratTugas;
    }

    const { error } = await supabase
      .from('ptsp_permohonan')
      .update(updatePayload)
      .eq('id', selectedItem.id);

    setProcessing(false);
    setShowModal(false);

    if (error) {
      triggerToast('error', 'Gagal Memperbarui', error.message);
    } else {
      triggerToast('success', 'Status Diperbarui', `Permohonan ${selectedItem.nomor_tiket} berhasil diperbarui.`);
      loadPermohonan();

      // KIRIM NOTIFIKASI EMAIL OTOMATIS JIKA STATUS DIUBAH JADI SELESAI & PEMOHON PUNYA EMAIL
      if (selectedItem.email && newStatus === 'Selesai') {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedItem.email,
            namaPemohon: selectedItem.nama_pemohon,
            nomorTiket: selectedItem.nomor_tiket,
            jenisLayanan: selectedItem.jenis_layanan,
            status: 'selesai',
            namaPetugas: petugasDitunjuk,
            noHpPetugas: noHpPetugas,
            linkSuratTugas: linkSuratTugas,
            catatanAdmin: catatanAdmin,
            trackingUrl: `${window.location.origin}/ptsp/lacak?tiket=${selectedItem.nomor_tiket}`,
          }),
        }).catch((err) => console.error('Gagal mengirim email selesai:', err));
      }

      // Kirim WhatsApp ke Pemohon
      if (newStatus === 'Selesai') {
        sendWhatsAppToPemohon(selectedItem, petugasDitunjuk, noHpPetugas, linkSuratTugas, catatanAdmin);
      }
    }
  };

  const sendWhatsAppToPemohon = (item: any, petugas: string, hpPetugas: string, suratTugas: string, catatan: string) => {
    let phone = item.no_hp.trim();
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    let pesan = `*PERMOHONAN PTSP SELESAI - KEMENAG POHUWATO*\n\n` +
      `Halo Bpk/Ibu *${item.nama_pemohon}*,\n` +
      `Permohonan layanan *${item.jenis_layanan}* dengan Nomor Tiket *${item.nomor_tiket}* telah *SELESAI* diproses.\n\n`;

    if (petugas) {
      pesan += `*Informasi Petugas Ditunjuk:*\n` +
        `- Nama Petugas: *${petugas}*\n` +
        (hpPetugas ? `- No WA Petugas: ${hpPetugas}\n` : '') +
        (suratTugas ? `- Surat Tugas: ${suratTugas}\n` : '') +
        `\n`;
    }

    if (catatan) {
      pesan += `*Catatan Petugas:* ${catatan}\n\n`;
    }

    pesan += `Anda dapat memeriksa rincian lengkap melalui halaman lacak tiket:\n` +
      `http://localhost:3000/ptsp/lacak\n\n` +
      `Terima kasih telah menggunakan layanan PTSP Online Bimas Islam Kantor Kementerian Agama Kabupaten Pohuwato.`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`;
    window.open(waUrl, '_blank');
  };

  const filteredData = permohonanList.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.nomor_tiket?.toLowerCase().includes(query) ||
      item.nama_pemohon?.toLowerCase().includes(query) ||
      item.nik_pemohon?.toLowerCase().includes(query) ||
      item.jenis_layanan?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    if (status === 'Selesai') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === 'Diproses') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === 'Ditolak') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">
          
          {toast && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] max-w-md sm:w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toast.type === 'success' ? '✓' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
                <p className="text-xs text-gray-700 mt-0.5 font-medium break-words">{toast.message}</p>
              </div>
              <button type="button" onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1 shrink-0">✕</button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Verifikasi PTSP Publik</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Verifikasi berkas masuk dan permohonan layanan keagamaan masyarakat</p>
              </div>
              <Link
                href="/admin/ptsp/layanan"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>⚙️</span> Kelola Master Jenis Layanan & Persyaratan
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-96">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
                <input
                  type="text"
                  placeholder="Cari nomor tiket, nama pemohon, NIK, atau layanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="text-xs font-semibold text-gray-600">
                Total Permohonan: <strong className="text-emerald-700">{filteredData.length} Berkas</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">Memuat permohonan...</div>
              ) : filteredData.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">Belum ada permohonan PTSP masuk.</div>
              ) : (
                <>
                  {/* TAMPILAN KARTU KHUSUS LAYAR HP (< md) */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white">
                    {filteredData.map((item, idx) => (
                      <div key={item.id || idx} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                #{idx + 1}
                              </span>
                              <span className="font-mono font-bold text-emerald-800 text-xs break-all">
                                {item.nomor_tiket}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full border ${getStatusBadge(item.status)}`}>
                            {item.status || 'Menunggu Verifikasi'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-sm text-gray-900 break-words">{item.nama_pemohon}</div>
                          <div className="font-mono text-gray-600 break-all">NIK: {item.nik_pemohon}</div>
                          <div className="text-emerald-700 font-medium">📞 {item.no_hp}</div>
                          {item.email && <div className="text-gray-500 break-all">✉️ {item.email}</div>}
                        </div>

                        <div>
                          <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 break-words">
                            {item.jenis_layanan}
                          </span>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => openActionModal(item)}
                            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition text-center"
                          >
                            Verifikasi / Proses
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TAMPILAN TABEL DESKTOP (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">No</th>
                          <th className="px-6 py-3.5 font-semibold">Tiket & Tanggal</th>
                          <th className="px-6 py-3.5 font-semibold">Pemohon & NIK</th>
                          <th className="px-6 py-3.5 font-semibold">Jenis Layanan</th>
                          <th className="px-6 py-3.5 font-semibold">Status</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredData.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-500 text-xs">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="font-mono font-bold text-emerald-800 text-xs">{item.nomor_tiket}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{item.nama_pemohon}</div>
                              <div className="font-mono text-xs text-gray-500">NIK: {item.nik_pemohon}</div>
                              <div className="text-[11px] text-emerald-700">📞 {item.no_hp}</div>
                              {item.email && <div className="text-[11px] text-gray-500">✉️ {item.email}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {item.jenis_layanan}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadge(item.status)}`}>
                                {item.status || 'Menunggu Verifikasi'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openActionModal(item)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition"
                              >
                                Verifikasi / Proses
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* MODAL VERIFIKASI & PENUGASAN */}
          {showModal && selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Verifikasi Permohonan PTSP</h3>
                <p className="text-xs text-gray-500 mb-4 font-mono">Tiket: {selectedItem.nomor_tiket}</p>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-2 text-xs">
                  <div><strong>Pemohon:</strong> {selectedItem.nama_pemohon} (NIK: {selectedItem.nik_pemohon})</div>
                  <div><strong>Layanan:</strong> {selectedItem.jenis_layanan}</div>
                  <div><strong>Email Pemohon:</strong> {selectedItem.email || 'Tidak diisi'}</div>
                  <div><strong>Keterangan:</strong> {selectedItem.keterangan_permohonan}</div>
                  {selectedItem.file_lampiran_url && (
                    <div>
                      <strong>Lampiran Pemohon:</strong>{' '}
                      <a href={selectedItem.file_lampiran_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">
                        Unduh Berkas 📄
                      </a>
                    </div>
                  )}
                </div>

                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status Permohonan</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="Menunggu Verifikasi">⏳ Menunggu Verifikasi</option>
                      <option value="Diproses">⚙️ Sedang Diproses</option>
                      <option value="Selesai">✅ Selesai</option>
                      <option value="Ditolak">❌ Ditolak</option>
                    </select>
                  </div>

                  {/* FORM KHUSUS JIKA STATUS SELESAI (PENUGASAN) */}
                  {newStatus === 'Selesai' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="text-xs font-bold text-emerald-900 uppercase">📋 Form Tindak Lanjut & Penugasan Resmi</div>
                      
                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Nama Petugas / Rohaniwan yang Ditunjuk</label>
                        <input
                          type="text"
                          value={petugasDitunjuk}
                          onChange={(e) => setPetugasDitunjuk(e.target.value)}
                          placeholder="Contoh: Ust. H. Abdul Rahman, S.Ag"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Nomor HP / WhatsApp Petugas</label>
                        <input
                          type="tel"
                          value={noHpPetugas}
                          onChange={(e) => setNoHpPetugas(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Link Surat Tugas / Dokumen (Google Drive)</label>
                        <input
                          type="url"
                          value={linkSuratTugas}
                          onChange={(e) => setLinkSuratTugas(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan / Keterangan Petugas</label>
                    <textarea
                      rows={3}
                      value={catatanAdmin}
                      onChange={(e) => setCatatanAdmin(e.target.value)}
                      placeholder="Masukkan catatan atau instruksi lanjutan..."
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                      {processing ? 'Menyimpan...' : 'Simpan Status & Penugasan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}