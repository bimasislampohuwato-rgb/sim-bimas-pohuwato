'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function MasterLayananPtspPage() {
  const router = useRouter();
  const [layananList, setLayananList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Nomor WhatsApp Official Bimas
  const [waOfficial, setWaOfficial] = useState('');
  const [savingWa, setSavingWa] = useState(false);

  // Form State Tambah/Edit
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [namaLayanan, setNamaLayanan] = useState('');
  const [deskripsiPersyaratan, setDeskripsiPersyaratan] = useState('');
  const [linkBerkas, setLinkBerkas] = useState('');
  const [waktuPengerjaan, setWaktuPengerjaan] = useState('');
  const [processing, setProcessing] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      await loadData();
    }
    init();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadData() {
    setLoading(true);
    // 1. Load Master Layanan
    const { data: layananData, error } = await supabase
      .from('ptsp_master_layanan')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error load master layanan:', error.message);
    } else if (layananData) {
      setLayananList(layananData);
    }

    // 2. Load Nomor WA Official Bimas dari app_settings
    const { data: waData } = await supabase
      .from('app_settings')
      .select('value_text')
      .eq('key_name', 'wa_official_bimas')
      .single();

    if (waData && waData.value_text) {
      setWaOfficial(waData.value_text);
    }

    setLoading(false);
  }

  // Simpan Nomor WA Official Bimas
  const handleSaveWaOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWa(true);

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key_name: 'wa_official_bimas', value_text: waOfficial, updated_at: new Date().toISOString() },
        { onConflict: 'key_name' }
      );

    setSavingWa(false);

    if (error) {
      triggerToast('error', 'Gagal Menyimpan', error.message);
    } else {
      triggerToast('success', 'Berhasil', 'Nomor WhatsApp Official Bimas berhasil diperbarui.');
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setNamaLayanan('');
    setDeskripsiPersyaratan('1. ');
    setLinkBerkas('');
    setWaktuPengerjaan('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    setNamaLayanan(item.nama_layanan);
    setDeskripsiPersyaratan(item.deskripsi_persyaratan || '1. ');
    setLinkBerkas(item.link_berkas_syarat || '');
    setWaktuPengerjaan(item.waktu_pengerjaan || '');
    setShowModal(true);
  };

  const handlePersyaratanKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = deskripsiPersyaratan.substring(0, cursorPosition);
      const textAfterCursor = deskripsiPersyaratan.substring(cursorPosition);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      const match = currentLine.match(/^(\d+)\.\s*(.*)/);
      if (match) {
        e.preventDefault();
        const currentNumber = parseInt(match[1], 10);
        const content = match[2].trim();

        if (content === '') {
          const newTextBefore = lines.slice(0, -1).join('\n') + (lines.length > 1 ? '\n' : '');
          setDeskripsiPersyaratan(newTextBefore + textAfterCursor);
        } else {
          const nextNumber = currentNumber + 1;
          const insertText = `\n${nextNumber}. `;
          const newText = textBeforeCursor + insertText + textAfterCursor;
          setDeskripsiPersyaratan(newText);

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertText.length;
          }, 0);
        }
      }
    }
  };

  const renderFormattedPersyaratan = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    return (
      <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-700 break-words">
        {lines.map((line, i) => {
          const cleanLine = line.replace(/^\d+[\.\)]\s*/, '');
          return <li key={i}>{cleanLine}</li>;
        })}
      </ol>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const payload = {
      nama_layanan: namaLayanan,
      deskripsi_persyaratan: deskripsiPersyaratan,
      link_berkas_syarat: linkBerkas,
      waktu_pengerjaan: waktuPengerjaan,
    };

    if (editId) {
      const { error } = await supabase
        .from('ptsp_master_layanan')
        .update(payload)
        .eq('id', editId);

      setProcessing(false);
      setShowModal(false);

      if (error) {
        triggerToast('error', 'Gagal Memperbarui', error.message);
      } else {
        triggerToast('success', 'Berhasil', 'Master layanan berhasil diperbarui.');
        loadData();
      }
    } else {
      const { error } = await supabase
        .from('ptsp_master_layanan')
        .insert([payload]);

      setProcessing(false);
      setShowModal(false);

      if (error) {
        triggerToast('error', 'Gagal Menyimpan', error.message);
      } else {
        triggerToast('success', 'Berhasil', 'Master layanan baru berhasil ditambahkan.');
        loadData();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jenis layanan ini?')) return;

    const { error } = await supabase
      .from('ptsp_master_layanan')
      .delete()
      .eq('id', id);

    if (error) {
      triggerToast('error', 'Gagal Menghapus', error.message);
    } else {
      triggerToast('success', 'Berhasil', 'Layanan berhasil dihapus.');
      loadData();
    }
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

          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <Link href="/admin/ptsp" className="text-xs font-bold text-emerald-700 hover:underline mb-1 inline-block">
                  ← Kembali ke Kelola Verifikasi Permohonan
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Kelola Layanan & Persyaratan PTSP</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Atur nomor WhatsApp official, jenis layanan keagamaan, persyaratan, dan estimasi waktu pengerjaan</p>
              </div>
            </div>

            {/* KOTAK PENGATURAN NOMOR WHATSAPP OFFICIAL BIMAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-4 sm:p-5">
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">💬 Konfigurasi Nomor WhatsApp Official Bimas / Petugas Piket</h3>
              <p className="text-xs text-gray-500 mb-3">Nomor tujuan otomatis saat pemohon melaporkan permohonan baru melalui tombol WhatsApp.</p>
              
              <form onSubmit={handleSaveWaOfficial} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  required
                  value={waOfficial}
                  onChange={(e) => setWaOfficial(e.target.value)}
                  placeholder="Contoh: 628114326021"
                  className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingWa}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 shrink-0 text-center"
                >
                  {savingWa ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}
                </button>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <h2 className="text-base font-bold text-gray-900">Daftar Jenis Layanan PTSP</h2>
              <button
                type="button"
                onClick={openAddModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 text-center"
              >
                + Tambah Jenis Layanan Baru
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">Memuat data master layanan...</div>
              ) : layananList.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">Belum ada jenis layanan yang ditambahkan.</div>
              ) : (
                <>
                  {/* TAMPILAN KARTU KHUSUS LAYAR HP (< md) */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white">
                    {layananList.map((item, idx) => (
                      <div key={item.id || idx} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              #{idx + 1}
                            </span>
                            <div className="font-bold text-sm text-gray-900 mt-1 break-words">{item.nama_layanan}</div>
                          </div>
                          {item.waktu_pengerjaan && (
                            <span className="shrink-0 inline-block px-2.5 py-1 text-[11px] rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold max-w-[140px] truncate">
                              ⏱️ {item.waktu_pengerjaan}
                            </span>
                          )}
                        </div>

                        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-2">
                          <div className="text-[11px] font-bold text-gray-500 uppercase">Persyaratan</div>
                          {renderFormattedPersyaratan(item.deskripsi_persyaratan)}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            {item.link_berkas_syarat ? (
                              <a
                                href={item.link_berkas_syarat}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline font-semibold"
                              >
                                🔗 Unduh Dokumen
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">Tidak ada link dokumen</span>
                            )}
                          </div>
                          {!item.waktu_pengerjaan && (
                            <span className="text-gray-400 italic">SOP belum diatur</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition text-center"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition text-center"
                          >
                            Hapus
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
                          <th className="px-5 py-3.5 font-semibold w-12">No</th>
                          <th className="px-5 py-3.5 font-semibold w-56">Nama Layanan</th>
                          <th className="px-5 py-3.5 font-semibold">Rincian Persyaratan</th>
                          <th className="px-5 py-3.5 font-semibold w-44">Dokumen Pendukung</th>
                          <th className="px-5 py-3.5 font-semibold w-48">Waktu Pengerjaan</th>
                          <th className="px-5 py-3.5 font-semibold text-right w-36">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {layananList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition align-top">
                            <td className="px-5 py-4 text-gray-500 text-xs font-medium">{idx + 1}</td>
                            <td className="px-5 py-4 font-bold text-gray-900">{item.nama_layanan}</td>
                            <td className="px-5 py-4">
                              {renderFormattedPersyaratan(item.deskripsi_persyaratan)}
                            </td>
                            <td className="px-5 py-4 text-xs">
                              {item.link_berkas_syarat ? (
                                <a
                                  href={item.link_berkas_syarat}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline font-semibold"
                                >
                                  🔗 Unduh Dokumen
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Tidak ada link</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-xs">
                              {item.waktu_pengerjaan ? (
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                  ⏱️ {item.waktu_pengerjaan}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
                              >
                                Hapus
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

          {/* MODAL TAMBAH / EDIT LAYANAN */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {editId ? 'Edit Master Layanan PTSP' : 'Tambah Jenis Layanan Baru'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">Lengkapi detail layanan, daftar persyaratan berurut, dokumen pendukung, dan standar waktu pengerjaan.</p>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Layanan</label>
                    <input
                      type="text"
                      required
                      value={namaLayanan}
                      onChange={(e) => setNamaLayanan(e.target.value)}
                      placeholder="Contoh: Penerbitan SKT Majelis Taklim"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                      <label className="block text-xs font-bold text-gray-700 uppercase">Rincian Persyaratan</label>
                      <span className="text-[11px] text-emerald-700 font-medium">Tekan Enter untuk nomor urut otomatis</span>
                    </div>
                    <textarea
                      rows={5}
                      required
                      value={deskripsiPersyaratan}
                      onKeyDown={handlePersyaratanKeyDown}
                      onChange={(e) => setDeskripsiPersyaratan(e.target.value)}
                      onFocus={() => {
                        if (!deskripsiPersyaratan.trim()) setDeskripsiPersyaratan('1. ');
                      }}
                      placeholder="1. Surat Permohonan&#10;2. Fotokopi KTP..."
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dokumen Pendukung (Link Google Drive)</label>
                    <input
                      type="url"
                      value={linkBerkas}
                      onChange={(e) => setLinkBerkas(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Tempel link Google Drive berkas format/panduan persyaratan (opsional).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Waktu Pengerjaan (SOP)</label>
                    <input
                      type="text"
                      required
                      value={waktuPengerjaan}
                      onChange={(e) => setWaktuPengerjaan(e.target.value)}
                      placeholder="Contoh: 5 Hari kerja sejak berkas lengkap diterima"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                      {processing ? 'Menyimpan...' : 'Simpan Layanan'}
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
