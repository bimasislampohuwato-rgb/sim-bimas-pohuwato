'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';
import {
  getPegawaiTanpaAkun,
  createAkunPegawai,
  createAkunMassalPegawai,
  updateRolePegawai,
  resetPasswordSingle,
  resetPasswordMassal,
  deleteAkunUser,
} from '@/src/actions/user-management';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ConfirmDialogState {
  isOpen: boolean;
  type: 'delete' | 'reset_single' | 'reset_massal' | 'buat_massal';
  title: string;
  message: string;
  subMessage?: string;
  userId?: string;
  userName?: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [pegawaiAvailable, setPegawaiAvailable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast & Modal
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogState>({
    isOpen: false,
    type: 'delete',
    title: '',
    message: '',
  });
  const [massalInput, setMassalInput] = useState('');

  // Modal Tambah Satuan
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNip, setSelectedNip] = useState('');
  const [selectedNamaBaru, setSelectedNamaBaru] = useState('');
  const [jabatanAdminBaru, setJabatanAdminBaru] = useState('');
  const [kuaWilayahBaru, setKuaWilayahBaru] = useState('');

  // Modal Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editJabatanAdmin, setEditJabatanAdmin] = useState('');
  const [editKuaWilayah, setEditKuaWilayah] = useState('');

  const masterKua = [
    'KUA Kecamatan Marisa',
    'KUA Kecamatan Buntulia',
    'KUA Kecamatan Paguat',
    'KUA Kecamatan Randangan',
    'KUA Kecamatan Popayato',
  ];

  useEffect(() => {
    async function checkAccessAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!myProfile || myProfile.role !== 'super_admin') {
        triggerToast('error', 'Akses Ditolak', 'Halaman Manajemen Akun khusus Super Admin.');
        router.push('/pegawai');
        return;
      }

      await refreshAllData();
    }

    checkAccessAndLoad();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => { setToast(null); }, 5000);
  };

  async function refreshAllData() {
    setLoading(true);
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: false })
      .order('nama_lengkap', { ascending: true });

    if (profData) setProfiles(profData);

    const pegRes = await getPegawaiTanpaAkun();
    if (pegRes.success) setPegawaiAvailable(pegRes.data || []);

    setLoading(false);
  }

  // Handler Pilih Pegawai dari Dropdown Tambah Akun
  const handleSelectPegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nipVal = e.target.value;
    setSelectedNip(nipVal);
    const found = pegawaiAvailable.find((p) => p.nip === nipVal);
    if (found) {
      setSelectedNamaBaru(found.nama_lengkap || found.namaTanpaGelar || '');
    } else {
      setSelectedNamaBaru('');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNip) {
      triggerToast('error', 'Pilihan Kosong', 'Silakan pilih pegawai terlebih dahulu.');
      return;
    }

    setProcessing(true);
    const res = await createAkunPegawai({
      nip: selectedNip,
      namaLengkap: selectedNamaBaru,
      jabatanAdmin: jabatanAdminBaru,
      kuaWilayah: jabatanAdminBaru === 'admin_kua' ? kuaWilayahBaru : '',
    });
    setProcessing(false);

    if (res.success) {
      triggerToast('success', 'Akun Berhasil Dibuat', res.message);
      setShowAddModal(false);
      setSelectedNip('');
      setSelectedNamaBaru('');
      setJabatanAdminBaru('');
      setKuaWilayahBaru('');
      router.refresh();
      await refreshAllData();
    } else {
      triggerToast('error', 'Gagal Membuat Akun', res.message);
    }
  };

  const openEditModal = (p: any) => {
    setEditUserId(p.id);
    setEditNip(p.nip || p.email);
    setEditNama(p.nama_lengkap);
    setEditJabatanAdmin(p.jabatan_admin || '');
    setEditKuaWilayah(p.jabatan_admin === 'admin_kua' ? (p.kua_wilayah || '') : '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const res = await updateRolePegawai({
      userId: editUserId,
      namaLengkap: editNama,
      jabatanAdmin: editJabatanAdmin,
      kuaWilayah: editJabatanAdmin === 'admin_kua' ? editKuaWilayah : '',
    });
    setProcessing(false);

    if (res.success) {
      if (res.data) {
        setProfiles((prev) =>
          prev.map((item) => (item.id === editUserId ? { ...item, ...res.data } : item))
        );
      }
      triggerToast('success', 'Perubahan Disimpan', res.message);
      setShowEditModal(false);
      router.refresh();
      await refreshAllData();
    } else {
      triggerToast('error', 'Gagal Menyimpan', res.message);
    }
  };

  const openDeleteConfirm = (userId: string, nama: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Konfirmasi Penghapusan Akun',
      message: `Apakah Anda yakin ingin menghapus akun login milik "${nama}"?`,
      subMessage: 'Akun login akan dihapus secara permanen, namun data profil kepegawaian di master pegawai tetap aman tersimpan.',
      userId,
      userName: nama,
    });
  };

  const openResetSingleConfirm = (userId: string, nama: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'reset_single',
      title: 'Konfirmasi Reset Kata Sandi',
      message: `Apakah Anda yakin ingin mereset kata sandi milik "${nama}"?`,
      subMessage: 'Kata sandi pengguna akan dikembalikan ke sandi bawaan sistem: Kemenag2026!',
      userId,
      userName: nama,
    });
  };

  const openResetMassalConfirm = () => {
    setMassalInput('');
    setConfirmModal({
      isOpen: true,
      type: 'reset_massal',
      title: 'Reset Kata Sandi Massal',
      message: 'Apakah Anda benar-benar yakin ingin mereset seluruh kata sandi Pegawai & Admin?',
      subMessage: 'Semua akun (kecuali Super Admin) akan dikembalikan ke password bawaan: Kemenag2026!',
    });
  };

  const openBuatMassalConfirm = () => {
    setConfirmModal({
      isOpen: true,
      type: 'buat_massal',
      title: 'Buat Akun Pegawai Secara Massal',
      message: `Sistem akan otomatis membuatkan akun login untuk ${pegawaiAvailable.length} pegawai yang belum memiliki akun.`,
      subMessage: 'Setiap akun akan menggunakan NIP sebagai username dan password bawaan: Kemenag2026!',
    });
  };

  const executeConfirmedAction = async () => {
    if (confirmModal.type === 'reset_massal' && massalInput !== 'RESET') {
      triggerToast('error', 'Verifikasi Gagal', 'Silakan ketik kata RESET dengan huruf kapital untuk melanjutkan.');
      return;
    }

    setProcessing(true);

    if (confirmModal.type === 'delete' && confirmModal.userId) {
      const res = await deleteAkunUser(confirmModal.userId);
      setProcessing(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
      if (res.success) {
        triggerToast('success', 'Akun Berhasil Dihapus', res.message);
        router.refresh();
        await refreshAllData();
      } else {
        triggerToast('error', 'Gagal Menghapus Akun', res.message);
      }
    } else if (confirmModal.type === 'reset_single' && confirmModal.userId) {
      const res = await resetPasswordSingle(confirmModal.userId);
      setProcessing(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
      if (res.success) {
        triggerToast('success', 'Kata Sandi Direset', res.message);
      } else {
        triggerToast('error', 'Gagal Reset Sandi', res.message);
      }
    } else if (confirmModal.type === 'reset_massal') {
      const res = await resetPasswordMassal();
      setProcessing(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
      if (res.success) {
        triggerToast('success', 'Reset Massal Berhasil', res.message);
      } else {
        triggerToast('error', 'Gagal Reset Massal', res.message);
      }
    } else if (confirmModal.type === 'buat_massal') {
      const res = await createAkunMassalPegawai();
      setProcessing(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
      if (res.success) {
        triggerToast('success', 'Pembuatan Akun Massal Berhasil', res.message);
        router.refresh();
        await refreshAllData();
      } else {
        triggerToast('error', 'Gagal Pembuatan Massal', res.message);
      }
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.nama_lengkap?.toLowerCase().includes(q) ||
      p.nip?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          
          {toast && (
            <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3.5 transition-all">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                ✓
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-gray-400 font-bold p-1">✕</button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Akun & Penunjukan Admin</h1>
                <p className="text-sm text-gray-600 mt-1">Kelola akun login berbasis NIP, tunjuk Admin Bimas/KUA, dan reset kata sandi</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={openResetMassalConfirm}
                  disabled={processing}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-4 py-2.5 rounded-xl font-bold text-xs transition"
                >
                  🔑 Reset Password Massal
                </button>
                {pegawaiAvailable.length > 0 && (
                  <button
                    onClick={openBuatMassalConfirm}
                    disabled={processing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md"
                  >
                    ⚡ Buat Akun Massal ({pegawaiAvailable.length})
                  </button>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md"
                >
                  + Buat Akun Pegawai
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-xs text-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="font-bold">ℹ️ Ketentuan Akun Otomatis:</span> Pegawai login menggunakan <strong>NIP</strong>. Password bawaan otomatis untuk akun baru & hasil reset adalah: <code className="bg-white px-2 py-0.5 rounded border border-blue-300 font-bold text-blue-700">Kemenag2026!</code>
              </div>
              <div className="text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 shrink-0">
                Pegawai belum punya akun: {pegawaiAvailable.length} orang
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama Pegawai atau NIP..."
                  className="w-full sm:w-80 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-gray-600">
                  Total Akun Aktif: <strong className="text-emerald-700">{profiles.length} Pengguna</strong>
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-500 text-sm">Memuat daftar akun pengguna...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">No</th>
                        <th className="px-5 py-3.5 font-semibold">Nama Pegawai</th>
                        <th className="px-5 py-3.5 font-semibold">Username (NIP / Email)</th>
                        <th className="px-5 py-3.5 font-semibold">Status Hak Akses</th>
                        <th className="px-5 py-3.5 font-semibold">Unit Tugas Admin</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Aksi Pengelolaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredProfiles.map((p, idx) => {
                        const isSuperAdmin = p.role === 'super_admin';
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/70 transition">
                            <td className="px-5 py-4 text-gray-500">{idx + 1}</td>
                            <td className="px-5 py-4 font-bold text-gray-900">{p.nama_lengkap}</td>
                            <td className="px-5 py-4 font-mono text-xs text-gray-700">
                              {p.nip ? <span className="bg-gray-100 px-2.5 py-1 rounded-md font-semibold text-emerald-800">NIP: {p.nip}</span> : <span>{p.email}</span>}
                            </td>
                            <td className="px-5 py-4">
                              {isSuperAdmin ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">👑 SUPER ADMIN</span>
                              ) : p.jabatan_admin === 'admin_bimas' ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">🛡️ ADMIN BIMAS</span>
                              ) : p.jabatan_admin === 'admin_kua' ? (
                                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">🕌 ADMIN KUA</span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">👤 PEGAWAI</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-600 font-medium">
                              {p.jabatan_admin === 'admin_bimas' ? 'Seksi Bimas Islam Kab. Pohuwato' : p.jabatan_admin === 'admin_kua' ? (p.kua_wilayah || '-') : '-'}
                            </td>
                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              {isSuperAdmin ? (
                                <span className="text-xs text-gray-400 italic">Akun Sistem Terkunci</span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button onClick={() => openEditModal(p)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition">Edit</button>
                                  <button onClick={() => openResetSingleConfirm(p.id, p.nama_lengkap)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition">Reset</button>
                                  <button onClick={() => openDeleteConfirm(p.id, p.nama_lengkap)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition">Hapus</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* MODAL TAMBAH AKUN PEGAWAI */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center pb-3 border-b mb-4">
                  <h3 className="text-lg font-bold text-gray-900">+ Buat Akun Login Pegawai</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 font-bold p-1">✕</button>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Pilih Pegawai (Belum Punya Akun) *</label>
                    <select
                      value={selectedNip}
                      onChange={handleSelectPegawaiChange}
                      required
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Pilih Pegawai dari Master --</option>
                      {pegawaiAvailable.map((peg, idx) => (
                        <option key={idx} value={peg.nip}>
                          {peg.nama_lengkap || peg.namaTanpaGelar} (NIP: {peg.nip})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={selectedNamaBaru}
                      readOnly
                      className="w-full border bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hak Akses / Jabatan Admin</label>
                    <select
                      value={jabatanAdminBaru}
                      onChange={(e) => {
                        const nextJabatan = e.target.value;
                        setJabatanAdminBaru(nextJabatan);
                        if (nextJabatan !== 'admin_kua') {
                          setKuaWilayahBaru('');
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Pegawai Biasa (Akses Standar)</option>
                      <option value="admin_bimas">Admin Bimas Islam</option>
                      <option value="admin_kua">Admin KUA Kecamatan</option>
                    </select>
                  </div>

                  {jabatanAdminBaru === 'admin_kua' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Wilayah KUA</label>
                      <select
                        value={kuaWilayahBaru}
                        onChange={(e) => setKuaWilayahBaru(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih KUA Wilayah --</option>
                        {masterKua.map((kua, idx) => (
                          <option key={idx} value={kua}>{kua}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                    💡 Akun akan dibuat otomatis menggunakan NIP sebagai username dan password default: <strong>Kemenag2026!</strong>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                      {processing ? 'Memproses...' : 'Buat Akun'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL EDIT AKUN & HAK AKSES */}
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center pb-3 border-b mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Edit Akun & Hak Akses</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-400 font-bold p-1">✕</button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Username (NIP)</label>
                    <input
                      type="text"
                      value={editNip}
                      readOnly
                      className="w-full border bg-gray-100 rounded-xl px-3 py-2 text-sm font-mono text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      required
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hak Akses / Jabatan Admin</label>
                    <select
                      value={editJabatanAdmin}
                      onChange={(e) => {
                        const nextJabatan = e.target.value;
                        setEditJabatanAdmin(nextJabatan);
                        if (nextJabatan !== 'admin_kua') {
                          setEditKuaWilayah('');
                        }
                      }}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Pegawai Biasa (Akses Standar)</option>
                      <option value="admin_bimas">Admin Bimas Islam</option>
                      <option value="admin_kua">Admin KUA Kecamatan</option>
                    </select>
                  </div>

                  {editJabatanAdmin === 'admin_kua' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Wilayah KUA</label>
                      <select
                        value={editKuaWilayah}
                        onChange={(e) => setEditKuaWilayah(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih KUA Wilayah --</option>
                        {masterKua.map((kua, idx) => (
                          <option key={idx} value={kua}>{kua}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                      {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI KUSTOM */}
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-gray-800 mb-2">{confirmModal.message}</p>
                <p className="text-xs text-gray-500 mb-5">{confirmModal.subMessage}</p>

                {confirmModal.type === 'reset_massal' && (
                  <div className="mb-5 text-left bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <label className="block text-xs font-bold text-amber-900 mb-1">Ketik <u>RESET</u> untuk konfirmasi:</label>
                    <input type="text" value={massalInput} onChange={(e) => setMassalInput(e.target.value)} placeholder="RESET" className="w-full px-3 py-2 border rounded-xl text-sm font-mono uppercase" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-2.5 bg-gray-100 rounded-xl text-xs font-bold">Batal</button>
                  <button onClick={executeConfirmedAction} disabled={processing} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">
                    {processing ? 'Memproses...' : 'Ya, Lanjutkan'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}