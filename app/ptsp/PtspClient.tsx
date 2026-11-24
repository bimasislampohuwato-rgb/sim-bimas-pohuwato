'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';
import type { PtspPermohonanItem, PtspPageData } from '@/app/ptsp/_actions/ptsp';

interface PtspClientProps {
  initialData: PtspPageData | null;
  initialError: string | null;
}

export default function PtspClient({ initialData, initialError }: PtspClientProps) {
  const router = useRouter();
  const [permohonanList, setPermohonanList] = useState<PtspPermohonanItem[]>(initialData?.permohonanList || []);
  const [loading, setLoading] = useState(!initialData);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PtspPermohonanItem | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [processing, setProcessing] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const triggerToast = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const openActionModal = useCallback((item: PtspPermohonanItem) => {
    setSelectedItem(item);
    setNewStatus(item.status || 'Menunggu Verifikasi');
    setCatatanAdmin(item.catatan_admin || '');
    setShowModal(true);
  }, []);

  const handleUpdateStatus = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/ptsp/update/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          catatan_admin: catatanAdmin,
        }),
      });
      const result = await response.json();

      setProcessing(false);
      setShowModal(false);

      if (result.success) {
        triggerToast('success', 'Status Diperbarui', `Permohonan ${selectedItem.nomor_tiket} berhasil diperbarui.`);
        setPermohonanList((prev) =>
          prev.map((p) =>
            p.id === selectedItem.id ? { ...p, status: newStatus, catatan_admin: catatanAdmin } : p
          )
        );
      } else {
        triggerToast('error', 'Gagal Memperbarui', result.error || 'Terjadi kesalahan.');
      }
    } catch (err: any) {
      setProcessing(false);
      triggerToast('error', 'Gagal Memperbarui', err?.message || 'Terjadi kesalahan.');
    }
  }, [selectedItem, newStatus, catatanAdmin, triggerToast]);

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

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 md:pb-10 max-w-7xl w-full mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h2 className="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h2>
              <p className="text-red-700">{initialError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          {toast && (
            <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5 animate-fade-in">
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

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kelola Layanan PTSP Publik</h1>
                <p className="text-sm text-gray-600 mt-1">Verifikasi dan pantau permohonan layanan keagamaan dari masyarakat</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-96">
                <input
                  type="text"
                  placeholder="Cari nomor tiket, nama pemohon, NIK, atau jenis layanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="text-xs font-semibold text-gray-600">
                Total Permohonan: <strong className="text-emerald-700">{filteredData.length} Berkas</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
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
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Memuat permohonan PTSP...</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Belum ada permohonan layanan PTSP masuk.</td></tr>
                    ) : (
                      filteredData.map((item, idx) => (
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
                              onClick={() => openActionModal(item)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs"
                            >
                              Verifikasi / Proses
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL VERIFIKASI / PROSES PTSP */}
            {showModal && selectedItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Verifikasi Permohonan PTSP</h3>
                  <p className="text-xs text-gray-500 mb-4 font-mono">Tiket: {selectedItem.nomor_tiket}</p>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-2 text-xs">
                    <div><strong>Pemohon:</strong> {selectedItem.nama_pemohon} (NIK: {selectedItem.nik_pemohon})</div>
                    <div><strong>Layanan:</strong> {selectedItem.jenis_layanan}</div>
                    <div><strong>Keterangan:</strong> {selectedItem.keterangan_permohonan}</div>
                    {selectedItem.file_lampiran_url && (
                      <div>
                        <strong>Lampiran:</strong>{' '}
                        <a href={selectedItem.file_lampiran_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">
                          Unduh Berkas Syarat 📄
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

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan / Keterangan Petugas</label>
                      <textarea
                        rows={3}
                        value={catatanAdmin}
                        onChange={(e) => setCatatanAdmin(e.target.value)}
                        placeholder="Masukkan catatan atau alasan jika ditolak..."
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                      <button type="submit" disabled={processing} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                        {processing ? 'Menyimpan...' : 'Simpan Status PTSP'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}