'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function MasterDataPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan' | 'logo_instansi'>('jabatan');
  
  const [jabatanList, setJabatanList] = useState<any[]>([]);
  const [kategoriJabatanList, setKategoriJabatanList] = useState<any[]>([]);
  const [kuaList, setKuaList] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  
  // State Logo Instansi (Upload)
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

  const [loading, setLoading] = useState(true);

  // State Modal Tambah / Edit
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // State Modal Konfirmasi Hapus Kustom
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);

  // Field Form Umum (Jabatan, Kategori Jabatan & Kecamatan)
  const [inputField1, setInputField1] = useState(''); 
  const [inputField2, setInputField2] = useState(''); 
  const [inputKategoriJabatan, setInputKategoriJabatan] = useState('');

  // Field Form Khusus KUA (Tabel KuaProfile)
  const [inputNamaKua, setInputNamaKua] = useState('');
  const [inputAlamatKua, setInputAlamatKua] = useState('');
  const [inputTeleponKua, setInputTeleponKua] = useState('');
  const [inputEmailKua, setInputEmailKua] = useState('');
  const [inputKecamatanIdKua, setInputKecamatanIdKua] = useState('');

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!prof || prof.role !== 'super_admin') {
        router.push('/pegawai');
        return;
      }

      await loadMasterData();
    }
    init();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadMasterData() {
    setLoading(true);
    const { data: jab } = await supabase.from('MasterJabatan').select('*').order('namaJabatan', { ascending: true });
    if (jab) setJabatanList(jab);

    const { data: katJab } = await supabase.from('MasterKategoriJabatan').select('*').order('namaKategori', { ascending: true });
    if (katJab) setKategoriJabatanList(katJab);

    const { data: kua } = await supabase.from('KuaProfile').select('*').order('namaKua', { ascending: true });
    if (kua) setKuaList(kua);

    const { data: kec } = await supabase.from('MasterKecamatan').select('*').order('namaKecamatan', { ascending: true });
    if (kec) setKecamatanList(kec);

    const { data: appSet } = await supabase.from('app_settings').select('*').eq('key_name', 'logo_bimas_url').single();
    if (appSet) {
      setLogoUrl(appSet.value_text || '');
      setLogoPreviewUrl(appSet.value_text || '');
    }

    setLoading(false);
  }

  const openAddModal = () => {
    setEditId(null);
    setInputField1('');
    setInputField2('');
    setInputKategoriJabatan(kategoriJabatanList.length > 0 ? kategoriJabatanList[0].namaKategori : '');
    setInputNamaKua('');
    setInputAlamatKua('');
    setInputTeleponKua('');
    setInputEmailKua('');
    setInputKecamatanIdKua('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    if (activeTab === 'jabatan') {
      setInputField1(item.namaJabatan || '');
      setInputKategoriJabatan(item.kategori || '');
      setInputField2(item.deskripsi || '');
    } else if (activeTab === 'kategori_jabatan') {
      setInputField1(item.namaKategori || '');
      setInputField2(item.deskripsi || '');
    } else if (activeTab === 'kecamatan') {
      setInputField1(item.kodeKecamatan || '');
      setInputField2(item.namaKecamatan || '');
    } else if (activeTab === 'kua') {
      setInputNamaKua(item.namaKua || '');
      setInputAlamatKua(item.alamat || '');
      setInputTeleponKua(item.telepon || '');
      setInputEmailKua(item.email || '');
      setInputKecamatanIdKua(item.kecamatanId || '');
    }
    setShowModal(true);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    let tableName = '';
    let payload: any = {};

    if (activeTab === 'jabatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterJabatan';
      payload = { 
        namaJabatan: inputField1, 
        kategori: inputKategoriJabatan,
        deskripsi: inputField2,
        updatedAt: new Date().toISOString()
      };

      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'jab_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (activeTab === 'kategori_jabatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterKategoriJabatan';
      payload = { 
        namaKategori: inputField1, 
        deskripsi: inputField2,
        updatedAt: new Date().toISOString()
      };

      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kat_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (activeTab === 'kecamatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterKecamatan';
      payload = { 
        kodeKecamatan: inputField1, 
        namaKecamatan: inputField2,
        updatedAt: new Date().toISOString()
      };

      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kec_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (activeTab === 'kua') {
      if (!inputNamaKua || !inputKecamatanIdKua) {
        triggerToast('error', 'Data Belum Lengkap', 'Nama Unit / KUA dan Kecamatan wajib diisi.');
        setProcessing(false);
        return;
      }
      tableName = 'KuaProfile';
      payload = { 
        namaKua: inputNamaKua, 
        alamat: inputAlamatKua || null,
        telepon: inputTeleponKua || null,
        email: inputEmailKua || null,
        kecamatanId: inputKecamatanIdKua,
        updatedAt: new Date().toISOString()
      };
      
      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kua_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    }

    let error = null;
    let errorMessage = '';

    if (editId) {
      const res = await supabase.from(tableName).update(payload).eq('id', editId);
      error = res.error;
      if (error) errorMessage = error.message;
    } else {
      const res = await supabase.from(tableName).insert([payload]);
      error = res.error;
      if (error) {
        errorMessage = error.message;
        if (error.code === '23505' || error.message.includes('unique constraint')) {
          errorMessage = `Data duplikat terdeteksi (${error.details || error.message}).`;
        }
      }
    }

    setProcessing(false);

    if (!error) {
      triggerToast('success', editId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan', 'Data referensi berhasil disimpan.');
      setShowModal(false);
      loadMasterData();
    } else {
      console.error('Save Master Error:', error);
      triggerToast('error', 'Gagal Menyimpan', errorMessage);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Format Tidak Valid', 'Harap pilih file gambar logo (PNG, JPG, atau WebP).');
      e.target.value = '';
      return;
    }

    // Validasi ukuran maksimal 1 MB (1024 * 1024 bytes)
    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      triggerToast('error', 'Ukuran File Terlalu Besar', 'Maksimal ukuran file logo adalah 1 MB.');
      e.target.value = '';
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogoFile) {
      triggerToast('error', 'Belum Ada File Dipilih', 'Silakan pilih file logo terlebih dahulu sebelum menyimpan.');
      return;
    }

    setProcessing(true);

    const fileExt = selectedLogoFile.name.split('.').pop() || 'png';
    const filePath = `instansi/logo_bimas.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media_sim')
      .upload(filePath, selectedLogoFile, {
        cacheControl: '3600',
        upsert: true, // Timpa file lama agar storage tetap bersih
      });

    if (uploadError) {
      triggerToast('error', 'Gagal Upload Logo', uploadError.message);
      setProcessing(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media_sim')
      .getPublicUrl(filePath);

    const finalLogoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key_name: 'logo_bimas_url', value_text: finalLogoUrl }, { onConflict: 'key_name' });

    setProcessing(false);

    if (error) {
      triggerToast('error', 'Gagal Menyimpan Logo', error.message);
    } else {
      setLogoUrl(finalLogoUrl);
      setSelectedLogoFile(null);
      triggerToast('success', 'Berhasil', 'Logo instansi berhasil diunggah dan diterapkan!');
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  const confirmDelete = (id: string, namaItem: string) => {
    setDeleteTarget({ id, nama: namaItem });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);

    let tableName = '';
    if (activeTab === 'jabatan') tableName = 'MasterJabatan';
    else if (activeTab === 'kategori_jabatan') tableName = 'MasterKategoriJabatan';
    else if (activeTab === 'kua') tableName = 'KuaProfile';
    else if (activeTab === 'kecamatan') tableName = 'MasterKecamatan';

    const { error } = await supabase.from(tableName).delete().eq('id', deleteTarget.id);
    setProcessing(false);
    setShowDeleteModal(false);

    if (!error) {
      triggerToast('success', 'Berhasil Dihapus', 'Data referensi telah dihapus dari sistem.');
      loadMasterData();
    } else {
      triggerToast('error', 'Gagal Menghapus', error.message);
    }
  };

  const getTabTitle = () => {
    if (activeTab === 'jabatan') return 'Jabatan';
    if (activeTab === 'kategori_jabatan') return 'Kategori Jabatan';
    if (activeTab === 'kua') return 'Unit Kerja / KUA';
    if (activeTab === 'kecamatan') return 'Kecamatan';
    return 'Logo Instansi';
  };

  const getTotalItems = () => {
    if (activeTab === 'jabatan') return jabatanList.length;
    if (activeTab === 'kategori_jabatan') return kategoriJabatanList.length;
    if (activeTab === 'kua') return kuaList.length;
    if (activeTab === 'kecamatan') return kecamatanList.length;
    return 1;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          
          {toast && (
            <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 flex items-start gap-3.5 animate-fade-in">
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

          <div className="max-w-6xl mx-auto">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Master Data Utama</h1>
                <p className="text-sm text-gray-600 mt-1">Kelola referensi data Jabatan, Kategori, Wilayah KUA, Kecamatan, dan Logo Instansi</p>
              </div>
              {activeTab !== 'logo_instansi' && (
                <button
                  onClick={openAddModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20"
                >
                  + Tambah {getTabTitle()} Baru
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('jabatan')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'jabatan' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                💼 Master Jabatan ({jabatanList.length})
              </button>
              <button
                onClick={() => setActiveTab('kategori_jabatan')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'kategori_jabatan' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                🏷️ Kategori Jabatan ({kategoriJabatanList.length})
              </button>
              <button
                onClick={() => setActiveTab('kua')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'kua' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                🕌 Master Unit KUA ({kuaList.length})
              </button>
              <button
                onClick={() => setActiveTab('kecamatan')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'kecamatan' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                📍 Master Kecamatan ({kecamatanList.length})
              </button>
              <button
                onClick={() => setActiveTab('logo_instansi')}
                className={`pb-3 px-4 text-sm font-bold transition border-b-2 whitespace-nowrap ${activeTab === 'logo_instansi' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                🖼️ Logo Instansi Sidebar
              </button>
            </div>

            {activeTab === 'logo_instansi' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h3 className="text-base font-bold text-gray-900 mb-2">Konfigurasi Logo Resmi Bimas Islam</h3>
                <p className="text-xs text-gray-500 mb-6">Unggah logo resmi instansi yang akan otomatis tampil di sudut kiri atas sidebar aplikasi.</p>

                <form onSubmit={handleSaveLogo} className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-3xl overflow-hidden shrink-0 border-2 border-emerald-500/40 shadow-md">
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Preview Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span>🕌</span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs">
                        <span>📤</span> Pilih File Logo Instansi
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-gray-500 mt-2">
                        Disarankan format PNG transparan atau JPG/WebP rasio persegi (1:1). <strong>Maksimal ukuran 1 MB</strong>.
                      </p>
                      {selectedLogoFile && (
                        <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                          ✓ File terpilih: {selectedLogoFile.name} ({Math.round(selectedLogoFile.size / 1024)} KB)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <button
                      type="submit"
                      disabled={processing || !selectedLogoFile}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-50"
                    >
                      {processing ? 'Mengunggah & Menyimpan...' : 'Simpan & Terapkan Logo'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-600">
                  <span>Daftar Referensi {getTabTitle().toUpperCase()}</span>
                  <span>Total Data: <strong className="text-emerald-700">{getTotalItems()} Item</strong></span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">No</th>
                        {activeTab === 'kecamatan' ? (
                          <>
                            <th className="px-6 py-3.5 font-semibold">Kode Kecamatan</th>
                            <th className="px-6 py-3.5 font-semibold">Nama Kecamatan</th>
                          </>
                        ) : activeTab === 'jabatan' ? (
                          <>
                            <th className="px-6 py-3.5 font-semibold">Nama Jabatan</th>
                            <th className="px-6 py-3.5 font-semibold">Kategori</th>
                            <th className="px-6 py-3.5 font-semibold">Deskripsi</th>
                          </>
                        ) : activeTab === 'kategori_jabatan' ? (
                          <>
                            <th className="px-6 py-3.5 font-semibold">Nama Kategori Jabatan</th>
                            <th className="px-6 py-3.5 font-semibold">Deskripsi / Keterangan</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-3.5 font-semibold">Nama Unit / KUA</th>
                            <th className="px-6 py-3.5 font-semibold">Alamat Kantor</th>
                            <th className="px-6 py-3.5 font-semibold">Telepon / Email</th>
                            <th className="px-6 py-3.5 font-semibold">Kecamatan</th>
                          </>
                        )}
                        <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {loading ? (
                        <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Memuat data master...</td></tr>
                      ) : activeTab === 'jabatan' ? (
                        jabatanList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{item.namaJabatan}</td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {item.kategori || 'Umum'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600">{item.deskripsi || '-'}</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                              <button onClick={() => openEditModal(item)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition">Edit</button>
                              <button onClick={() => confirmDelete(item.id, item.namaJabatan)} className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition">Hapus</button>
                            </td>
                          </tr>
                        ))
                      ) : activeTab === 'kategori_jabatan' ? (
                        kategoriJabatanList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{item.namaKategori}</td>
                            <td className="px-6 py-4 text-xs text-gray-600">{item.deskripsi || '-'}</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                              <button onClick={() => openEditModal(item)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition">Edit</button>
                              <button onClick={() => confirmDelete(item.id, item.namaKategori)} className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition">Hapus</button>
                            </td>
                          </tr>
                        ))
                      ) : activeTab === 'kecamatan' ? (
                        kecamatanList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-4 font-mono text-xs text-emerald-800 font-bold">{item.kodeKecamatan}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{item.namaKecamatan}</td>
                            <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                              <button onClick={() => openEditModal(item)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition">Edit</button>
                              <button onClick={() => confirmDelete(item.id, item.namaKecamatan)} className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition">Hapus</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        kuaList.map((item, idx) => {
                          const matchedKec = kecamatanList.find(k => k.id === item.kecamatanId);
                          return (
                            <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">{item.namaKua}</td>
                              <td className="px-6 py-4 text-xs text-gray-600">{item.alamat || '-'}</td>
                              <td className="px-6 py-4 text-xs text-gray-600">
                                <div>{item.telepon || '-'}</div>
                                <div className="text-emerald-800">{item.email || ''}</div>
                              </td>
                              <td className="px-6 py-4 text-xs text-emerald-800 font-semibold">
                                {matchedKec ? matchedKec.namaKecamatan : '-'}
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                                <button onClick={() => openEditModal(item)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition">Edit</button>
                                <button onClick={() => confirmDelete(item.id, item.namaKua)} className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition">Hapus</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* MODAL FORM TAMBAH / EDIT */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{editId ? 'Edit' : 'Tambah'} Master {getTabTitle().toUpperCase()}</h3>
                <p className="text-xs text-gray-500 mb-4">Kelola data referensi dalam database Supabase.</p>

                <form onSubmit={handleSaveMaster} className="space-y-4">
                  {activeTab === 'kua' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Unit Kerja / KUA</label>
                        <input
                          type="text"
                          required
                          value={inputNamaKua}
                          onChange={(e) => setInputNamaKua(e.target.value)}
                          placeholder="Contoh: KUA Kecamatan Dengilo / Seksi Bimas Islam"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alamat Kantor</label>
                        <input
                          type="text"
                          value={inputAlamatKua}
                          onChange={(e) => setInputAlamatKua(e.target.value)}
                          placeholder="Contoh: Jl. Trans Sulawesi..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Telepon</label>
                          <input
                            type="text"
                            value={inputTeleponKua}
                            onChange={(e) => setInputTeleponKua(e.target.value)}
                            placeholder="0812..."
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            value={inputEmailKua}
                            onChange={(e) => setInputEmailKua(e.target.value)}
                            placeholder="kua@..."
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kecamatan (Referensi)</label>
                        <select
                          value={inputKecamatanIdKua}
                          onChange={(e) => setInputKecamatanIdKua(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Kecamatan --</option>
                          {kecamatanList.map((kec) => (
                            <option key={kec.id} value={kec.id}>{kec.namaKecamatan}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : activeTab === 'jabatan' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Jabatan</label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="Contoh: Pengelola Keuangan"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kategori Jabatan (Referensi)</label>
                        <select
                          value={inputKategoriJabatan}
                          onChange={(e) => setInputKategoriJabatan(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Kategori Jabatan --</option>
                          {kategoriJabatanList.map((kat) => (
                            <option key={kat.id} value={kat.namaKategori}>{kat.namaKategori}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Deskripsi</label>
                        <input
                          type="text"
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Keterangan tambahan..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  ) : activeTab === 'kategori_jabatan' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Kategori Jabatan</label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="Contoh: Fungsional"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Deskripsi</label>
                        <input
                          type="text"
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Keterangan jenis jabatan..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kode Kecamatan (Contoh: 75.04.14)</label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="75.04.14"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Kecamatan</label>
                        <input
                          type="text"
                          required
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Contoh: Taluditi"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                      {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI HAPUS ELEGAN */}
          {showDeleteModal && deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">⚠️</div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Yakin ingin menghapus <strong className="text-gray-900">"{deleteTarget.nama}"</strong> dari master data? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={executeDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-red-600/20"
                  >
                    {processing ? 'Menghapus...' : 'Ya, Hapus'}
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