'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DaftarPegawaiPage() {
  const router = useRouter();
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<string>('pegawai');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setCurrentUser(profile);
        const savedMode = localStorage.getItem('active_mode');
        const mode = savedMode || (profile.role === 'super_admin' ? 'super_admin' : profile.jabatan_admin || 'pegawai');
        setActiveMode(mode);
        await loadDataByMode(profile, mode);
      }
    }
    init();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadDataByMode(profile: any, mode: string) {
    setLoading(true);
    let fetchedData: any[] = [];

    let query = supabase.from('pegawai').select('*').order('nama_lengkap', { ascending: true });

    if (mode === 'pegawai') {
      if (profile.nip) {
        query = query.eq('nip', profile.nip);
      } else {
        query = query.eq('email', profile.email);
      }
    } else if (mode === 'admin_kua') {
      if (profile.kua_wilayah) {
        query = query.eq('unit_kerja', profile.kua_wilayah);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase Error:', error.message);
      triggerToast('error', 'Gagal Memuat Data', error.message);
    } else if (data) {
      fetchedData = data;
    }

    setPegawaiList(fetchedData);
    setLoading(false);
  }

  const confirmDelete = (id: string, nama: string) => {
    setDeleteTarget({ id, nama });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);

    const { error } = await supabase.from('pegawai').delete().eq('id', deleteTarget.id);
    setProcessing(false);
    setShowDeleteModal(false);

    if (!error) {
      triggerToast('success', 'Berhasil Dihapus', `Data pegawai ${deleteTarget.nama} telah dihapus.`);
      if (currentUser) loadDataByMode(currentUser, activeMode);
    } else {
      triggerToast('error', 'Gagal Menghapus', error.message);
    }
  };

  const filteredPegawai = pegawaiList.filter((item) => {
    const nama = item.nama_lengkap || item.nama_tanpa_gelar || item.namaLengkap || item.nama || '';
    const nip = item.nip || '';
    const jabatan = item.jabatan || '';
    const unitKerja = item.unit_kerja || '';
    const query = searchQuery.toLowerCase();
    return (
      nama.toLowerCase().includes(query) ||
      nip.toLowerCase().includes(query) ||
      jabatan.toLowerCase().includes(query) ||
      unitKerja.toLowerCase().includes(query)
    );
  });

  // Hanya Super Admin dan Admin Bimas yang dapat menambah/menghapus pegawai
  const canManagePegawai = activeMode === 'super_admin' || activeMode === 'admin_bimas';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          
          {toast && (
            <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5 animate-bounce">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600 font-bold'}`}>
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeMode === 'pegawai'
                    ? 'Profil Kepegawaian Pribadi'
                    : activeMode === 'admin_kua'
                    ? `Daftar Pegawai (${currentUser?.kua_wilayah || 'Wilayah KUA'})`
                    : 'Manajemen Daftar Pegawai'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeMode === 'pegawai'
                    ? 'Lihat dan kelola data profil, pas foto, pendidikan, dan keluarga Anda sendiri'
                    : activeMode === 'admin_kua'
                    ? 'Pemantauan data pegawai yang bertugas pada unit kerja KUA Anda'
                    : 'Kelola seluruh data pegawai ASN & Non-ASN di lingkungan Bimas Islam Kab. Pohuwato'}
                </p>
              </div>

              {canManagePegawai && (
                <div className="flex items-center gap-3">
                  <Link
                    href="/pegawai/import"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    📥 Import CSV & Template
                  </Link>
                  <Link
                    href="/pegawai/tambah"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20"
                  >
                    + Tambah Pegawai Baru
                  </Link>
                </div>
              )}
            </div>

            {activeMode !== 'pegawai' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-full sm:w-96">
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama, NIP, jabatan, atau unit kerja..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="text-xs font-semibold text-gray-600">
                  Jumlah Data Ditampilkan: <strong className="text-emerald-700">{filteredPegawai.length} Orang</strong>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">No</th>
                      <th className="px-6 py-3.5 font-semibold">Pas Foto & Nama Lengkap / NIP</th>
                      <th className="px-6 py-3.5 font-semibold">Jabatan</th>
                      <th className="px-6 py-3.5 font-semibold">Unit Kerja</th>
                      <th className="px-6 py-3.5 font-semibold">Kontak & Email</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Memuat data pegawai...</td></tr>
                    ) : filteredPegawai.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Tidak ada data pegawai ditemukan.</td></tr>
                    ) : (
                      filteredPegawai.map((item, idx) => {
                        const nama = item.nama_lengkap || item.nama_tanpa_gelar || item.namaLengkap || item.nama || 'Tanpa Nama';
                        const nip = item.nip || '-';
                        const nik = item.nik || '-';
                        const jabatan = item.jabatan || 'Pegawai';
                        const unitKerja = item.unit_kerja || '-';
                        const noHp = item.no_hp || item.nomorHp || '-';
                        const email = item.email || '-';

                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-500 text-xs">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                {item.foto_url ? (
                                  <img
                                    src={item.foto_url}
                                    alt={nama}
                                    className="w-11 h-11 rounded-xl object-cover border border-emerald-200 shrink-0 shadow-xs"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200 shadow-xs">
                                    {nama.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-gray-900">{nama}</div>
                                  <div className="font-mono text-xs text-emerald-800 mt-0.5">NIP: {nip}</div>
                                  <div className="text-[11px] text-gray-400">NIK: {nik}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {jabatan}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-700">
                              {unitKerja}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600">
                              <div>📞 {noHp}</div>
                              <div className="text-emerald-700 mt-0.5">✉️ {email}</div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-2">
                                {/* Ikon Mata: Lihat Detail Profil */}
                                <Link
                                  href={`/pegawai/detail/${item.id}`}
                                  title="Lihat Detail Profil"
                                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center transition shadow-2xs"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </Link>

                                {/* Ikon Tempat Sampah: Hapus (Khusus Super Admin & Admin Bimas) */}
                                {canManagePegawai && (
                                  <button
                                    onClick={() => confirmDelete(item.id, nama)}
                                    title="Hapus Pegawai"
                                    className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 inline-flex items-center justify-center transition shadow-2xs"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* MODAL KONFIRMASI HAPUS */}
          {showDeleteModal && deleteTarget && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">⚠️</div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus Pegawai</h3>
                <p className="text-xs text-gray-600 mb-6">Yakin ingin menghapus <strong className="text-gray-900">"{deleteTarget.nama}"</strong>?</p>
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                  <button type="button" disabled={processing} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold" onClick={executeDelete}>Ya, Hapus</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}