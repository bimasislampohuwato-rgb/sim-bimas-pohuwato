'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function EditPegawaiContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const pegawaiId = resolvedParams.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'pribadi' | 'jabatan' | 'pendidikan' | 'keluarga'>('pribadi');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [masterJabatan, setMasterJabatan] = useState<any[]>([]);
  const [masterKua, setMasterKua] = useState<any[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const [editForm, setEditForm] = useState({
    nama_lengkap: '',
    nip: '',
    nik: '',
    jenis_kelamin: 'L',
    agama: 'Islam',
    tempat_lahir: '',
    tanggal_lahir: '',
    no_hp: '',
    email: '',
    alamat: '',
    jabatan: '',
    unit_kerja: '',
    pangkat_gol: '',
    tmt_jabatan: '',
    pendidikan_terakhir: '',
    jurusan: '',
    tahun_lulus: '',
    status_perkawinan: 'Menikah',
    nama_pasangan: '',
    jumlah_anak: '0'
  });

  const menuSections: { id: 'pribadi' | 'jabatan' | 'pendidikan' | 'keluarga'; label: string; desc: string; icon: string }[] = [
    { id: 'pribadi', label: 'Data Pribadi', desc: 'Nama, NIP, NIK & Kontak', icon: '👤' },
    { id: 'jabatan', label: 'Jabatan & Unit', desc: 'Jabatan, KUA & Pangkat', icon: '💼' },
    { id: 'pendidikan', label: 'Pendidikan', desc: 'Jenjang, Jurusan & Lulus', icon: '🎓' },
    { id: 'keluarga', label: 'Data Keluarga', desc: 'Status, Pasangan & Anak', icon: '👨‍👩‍👧‍👦' },
  ];

  const currentSectionIndex = menuSections.findIndex((m) => m.id === activeTab);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      const { data: jabData } = await supabase.from('MasterJabatan').select('*').order('namaJabatan', { ascending: true });
      if (jabData) setMasterJabatan(jabData);

      const { data: kuaData } = await supabase.from('KuaProfile').select('*').order('namaKua', { ascending: true });
      if (kuaData) setMasterKua(kuaData);

      const { data: item, error } = await supabase.from('pegawai').select('*').eq('id', pegawaiId).single();
      
      if (error || !item) {
        triggerToast('error', 'Data Tidak Ditemukan', 'Profil pegawai tidak ditemukan di database.');
        setLoading(false);
        return;
      }

      setEditForm({
        nama_lengkap: item.nama_lengkap || item.nama_tanpa_gelar || item.namaLengkap || item.nama || '',
        nip: item.nip || '',
        nik: item.nik || '',
        jenis_kelamin: item.jenis_kelamin || 'L',
        agama: item.agama || 'Islam',
        tempat_lahir: item.tempat_lahir || '',
        tanggal_lahir: item.tanggal_lahir || '',
        no_hp: item.no_hp || item.nomorHp || item.kontak || '',
        email: item.email || '',
        alamat: item.alamat || '',
        jabatan: item.jabatan || '',
        unit_kerja: item.unit_kerja || '',
        pangkat_gol: item.pangkat_gol || '',
        tmt_jabatan: item.tmt_jabatan || '',
        pendidikan_terakhir: item.pendidikan_terakhir || '',
        jurusan: item.jurusan || '',
        tahun_lulus: item.tahun_lulus || '',
        status_perkawinan: item.status_perkawinan || 'Menikah',
        nama_pasangan: item.nama_pasangan || '',
        jumlah_anak: item.jumlah_anak?.toString() || '0'
      });

      setLoading(false);
    }

    if (pegawaiId) {
      initData();
    }
  }, [pegawaiId, router]);

  const handleUpdatePegawai = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProcessing(true);

    const payload = {
      nama_lengkap: editForm.nama_lengkap,
      nama_tanpa_gelar: editForm.nama_lengkap,
      nip: editForm.nip,
      nik: editForm.nik || null,
      jenis_kelamin: editForm.jenis_kelamin,
      agama: editForm.agama,
      tempat_lahir: editForm.tempat_lahir || null,
      tanggal_lahir: editForm.tanggal_lahir || null,
      no_hp: editForm.no_hp,
      email: editForm.email || null,
      alamat: editForm.alamat || null,
      jabatan: editForm.jabatan,
      unit_kerja: editForm.unit_kerja,
      pangkat_gol: editForm.pangkat_gol || null,
      tmt_jabatan: editForm.tmt_jabatan || null,
      pendidikan_terakhir: editForm.pendidikan_terakhir || null,
      jurusan: editForm.jurusan || null,
      tahun_lulus: editForm.tahun_lulus || null,
      status_perkawinan: editForm.status_perkawinan || null,
      nama_pasangan: editForm.nama_pasangan || null,
      jumlah_anak: parseInt(editForm.jumlah_anak) || 0
    };

    const { error } = await supabase.from('pegawai').update(payload).eq('id', pegawaiId);
    setProcessing(false);

    if (!error) {
      triggerToast('success', 'Berhasil Diperbarui', 'Data profil pegawai berhasil disimpan.');
      setTimeout(() => {
        router.push('/pegawai');
      }, 1500);
    } else {
      triggerToast('error', 'Gagal Memperbarui', error.message);
    }
  };

  const inisialNama = editForm.nama_lengkap
    ? editForm.nama_lengkap.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PG';

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 relative">
        
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
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
                <Link href="/pegawai" className="hover:underline">Kepegawaian</Link>
                <span>/</span>
                <span>Edit Profil Pegawai</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Data Komprehensif Pegawai</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Perbarui seluruh informasi profil, jabatan, pendidikan, dan keluarga pegawai
              </p>
            </div>
            <Link
              href="/pegawai"
              className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-xs"
            >
              <span>← Kembali ke Daftar</span>
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-500">
              Memuat profil lengkap pegawai...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                      {inisialNama}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Profil Pegawai</p>
                      <h2 className="text-sm font-bold text-gray-900 truncate">
                        {editForm.nama_lengkap || 'Tanpa Nama'}
                      </h2>
                      <p className="text-xs font-mono text-gray-500 truncate mt-0.5">
                        {editForm.nip ? `NIP. ${editForm.nip}` : 'NIP belum diisi'}
                      </p>
                    </div>
                  </div>
                  {editForm.jabatan && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {editForm.jabatan}
                      </span>
                    </div>
                  )}
                </div>

                <nav className="bg-white rounded-2xl border border-gray-200 p-2.5 shadow-xs space-y-1">
                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Bagian Data Pegawai
                  </div>
                  {menuSections.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                          isActive ? 'bg-white/20' : 'bg-gray-100'
                        }`}>
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div className={`text-[11px] truncate ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                <div className="hidden lg:block bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4">
                  <p className="text-xs text-emerald-900 font-medium mb-3 leading-relaxed">
                    Perubahan pada semua bagian akan disimpan sekaligus ke database.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleUpdatePegawai()}
                    disabled={processing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-50"
                  >
                    {processing ? 'Menyimpan...' : '💾 Simpan Semua Perubahan'}
                  </button>
                </div>
              </aside>

              <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                <form onSubmit={handleUpdatePegawai} className="p-6 sm:p-8">
                  
                  {activeTab === 'pribadi' && (
                    <div className="space-y-5">
                      <div className="border-b border-gray-100 pb-4">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bagian 1 dari 4</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Informasi Data Pribadi</h3>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nama Lengkap & Gelar *</label>
                        <input
                          type="text"
                          required
                          value={editForm.nama_lengkap}
                          onChange={(e) => setEditForm({ ...editForm, nama_lengkap: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">NIP (Nomor Induk Pegawai)</label>
                          <input
                            type="text"
                            value={editForm.nip}
                            onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">NIK (Nomor Induk Kependudukan)</label>
                          <input
                            type="text"
                            value={editForm.nik}
                            onChange={(e) => setEditForm({ ...editForm, nik: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jenis Kelamin</label>
                          <select
                            value={editForm.jenis_kelamin}
                            onChange={(e) => setEditForm({ ...editForm, jenis_kelamin: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Agama</label>
                          <input
                            type="text"
                            value={editForm.agama}
                            onChange={(e) => setEditForm({ ...editForm, agama: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Tempat Lahir</label>
                          <input
                            type="text"
                            value={editForm.tempat_lahir}
                            onChange={(e) => setEditForm({ ...editForm, tempat_lahir: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Tanggal Lahir</label>
                          <input
                            type="date"
                            value={editForm.tanggal_lahir}
                            onChange={(e) => setEditForm({ ...editForm, tanggal_lahir: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">No HP / WhatsApp</label>
                          <input
                            type="text"
                            value={editForm.no_hp}
                            onChange={(e) => setEditForm({ ...editForm, no_hp: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Alamat Domisili</label>
                        <textarea
                          rows={2}
                          value={editForm.alamat}
                          onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'jabatan' && (
                    <div className="space-y-5">
                      <div className="border-b border-gray-100 pb-4">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bagian 2 dari 4</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Jabatan, Pangkat & Unit Kerja</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jabatan</label>
                          <select
                            value={editForm.jabatan}
                            onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="">-- Pilih Jabatan --</option>
                            {masterJabatan.map((j) => (
                              <option key={j.id} value={j.namaJabatan}>{j.namaJabatan}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Unit Kerja / KUA</label>
                          <select
                            value={editForm.unit_kerja}
                            onChange={(e) => setEditForm({ ...editForm, unit_kerja: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="">-- Pilih Unit Kerja --</option>
                            {masterKua.map((k) => (
                              <option key={k.id} value={k.namaKua}>{k.namaKua}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Pangkat / Golongan</label>
                          <input
                            type="text"
                            value={editForm.pangkat_gol}
                            onChange={(e) => setEditForm({ ...editForm, pangkat_gol: e.target.value })}
                            placeholder="Contoh: III/c"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">TMT Jabatan</label>
                          <input
                            type="date"
                            value={editForm.tmt_jabatan}
                            onChange={(e) => setEditForm({ ...editForm, tmt_jabatan: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'pendidikan' && (
                    <div className="space-y-5">
                      <div className="border-b border-gray-100 pb-4">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bagian 3 dari 4</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Pendidikan Terakhir</h3>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jenjang Pendidikan Terakhir</label>
                        <select
                          value={editForm.pendidikan_terakhir}
                          onChange={(e) => setEditForm({ ...editForm, pendidikan_terakhir: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Jenjang --</option>
                          <option value="SD">SD</option>
                          <option value="SMP">SMP</option>
                          <option value="SMA">SMA</option>
                          <option value="D3">D3</option>
                          <option value="S1">S1</option>
                          <option value="S2">S2</option>
                          <option value="S3">S3</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jurusan / Program Studi</label>
                          <input
                            type="text"
                            value={editForm.jurusan}
                            onChange={(e) => setEditForm({ ...editForm, jurusan: e.target.value })}
                            placeholder="Contoh: Hukum Keluarga Islam"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Tahun Lulus</label>
                          <input
                            type="text"
                            value={editForm.tahun_lulus}
                            onChange={(e) => setEditForm({ ...editForm, tahun_lulus: e.target.value })}
                            placeholder="Contoh: 2016"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'keluarga' && (
                    <div className="space-y-5">
                      <div className="border-b border-gray-100 pb-4">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bagian 4 dari 4</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Informasi Data Keluarga</h3>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Status Perkawinan</label>
                        <select
                          value={editForm.status_perkawinan}
                          onChange={(e) => setEditForm({ ...editForm, status_perkawinan: e.target.value })}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Menikah">Menikah</option>
                          <option value="Belum Menikah">Belum Menikah</option>
                          <option value="Duda/Janda">Duda/Janda</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nama Pasangan (Suami/Istri)</label>
                          <input
                            type="text"
                            value={editForm.nama_pasangan}
                            onChange={(e) => setEditForm({ ...editForm, nama_pasangan: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jumlah Anak</label>
                          <input
                            type="number"
                            value={editForm.jumlah_anak}
                            onChange={(e) => setEditForm({ ...editForm, jumlah_anak: e.target.value })}
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {currentSectionIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab(menuSections[currentSectionIndex - 1].id)}
                          className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs transition"
                        >
                          ← Sebelumnya
                        </button>
                      )}
                      {currentSectionIndex < menuSections.length - 1 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab(menuSections[currentSectionIndex + 1].id)}
                          className="flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold text-xs transition"
                        >
                          Selanjutnya ({menuSections[currentSectionIndex + 1].label}) →
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <Link
                        href="/pegawai"
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs transition"
                      >
                        Batal
                      </Link>
                      <button
                        type="submit"
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {processing ? 'Menyimpan...' : '💾 Simpan Semua Perubahan'}
                      </button>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function EditPegawaiPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Memuat halaman...</div>}>
      <EditPegawaiContent params={params} />
    </Suspense>
  );
}