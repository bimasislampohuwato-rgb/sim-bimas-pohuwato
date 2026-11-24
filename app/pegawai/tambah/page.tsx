'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';
import { createPegawaiLengkap } from '@/actions/pegawai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TambahPegawaiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('identitas');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Master Referensi Dinamis dari Supabase + Fallback
  const [masterJabatanList, setMasterJabatanList] = useState<string[]>([
    'Kepala Seksi Bimas Islam',
    'Kepala KUA Kecamatan',
    'Penghulu Ahli Pertama',
    'Penghulu Ahli Muda',
    'Penghulu Ahli Madya',
    'Penyuluh Agama Islam Ahli Pertama',
    'Penyuluh Agama Islam Ahli Muda',
    'Pengadministrasi Perkantoran',
    'Pranata Komputer',
  ]);
  const [masterKuaList, setMasterKuaList] = useState<string[]>([
    'Seksi Bimbingan Masyarakat Islam',
    'KUA Kecamatan Marisa',
    'KUA Kecamatan Buntulia',
    'KUA Kecamatan Paguat',
    'KUA Kecamatan Randangan',
    'KUA Kecamatan Popayato',
  ]);

  const masterGolongan = [
    'II/a (Pengatur Muda)', 'II/b (Pengatur Muda Tk. I)', 'II/c (Pengatur)', 'II/d (Pengatur Tk. I)',
    'III/a (Penata Muda)', 'III/b (Penata Muda Tk. I)', 'III/c (Penata)', 'III/d (Penata Tk. I)',
    'IV/a (Pembina)', 'IV/b (Pembina Tk. I)'
  ];
  const masterPendidikan = ['SD / Sederajat', 'SMP / Sederajat', 'SMA / MA / Sederajat', 'D-III', 'S-1 / D-IV', 'S-2', 'S-3'];

  useEffect(() => {
    async function fetchMaster() {
      const { data: jabData } = await supabase.from('MasterJabatan').select('namaJabatan').order('namaJabatan', { ascending: true });
      if (jabData && jabData.length > 0) {
        setMasterJabatanList(jabData.map((j) => j.namaJabatan));
      }

      const { data: kuaData } = await supabase.from('KuaProfile').select('namaKua').order('namaKua', { ascending: true });
      if (kuaData && kuaData.length > 0) {
        setMasterKuaList(kuaData.map((k) => k.namaKua));
      }
    }
    fetchMaster();
  }, []);

  // State Form Utama
  const [formData, setFormData] = useState({
    nik: '',
    nip: '',
    namaTanpaGelar: '',
    gelarDepan: '',
    gelarBelakang: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    kewarganegaraan: 'WNI',
    alamat: '',
    noHp: '',
    statusPerkawinan: 'Kawin',
    tmtCpns: '',
    tmtPns: '',
  });

  // State Riwayat Dinamis
  const [riwayatJabatan, setRiwayatJabatan] = useState([
    { pangkatGolongan: '', jabatan: '', unitKerja: '', nomorSk: '', tanggalSk: '', tmt: '', angkaKredit: '', fileSk: null }
  ]);

  const [riwayatPendidikan, setRiwayatPendidikan] = useState([
    { jenjang: '', namaSekolah: '', tahunLulus: '' }
  ]);

  const [dataKeluarga, setDataKeluarga] = useState([
    { hubungan: 'Suami/Istri', nama: '', tempatTanggalLahir: '', pekerjaan: '' }
  ]);

  const menuSections = [
    { id: 'identitas', step: '01', label: 'Identitas Pribadi', desc: 'NIK, NIP, Gelar & Kontak', icon: '👤' },
    { id: 'kepegawaian', step: '02', label: 'Jabatan & Golongan', desc: 'Riwayat SK, TMT & Unit', icon: '💼' },
    { id: 'pendidikan', step: '03', label: 'Riwayat Pendidikan', desc: 'Jenjang Formal & Tahun', icon: '🎓' },
    { id: 'keluarga', step: '04', label: 'Data Keluarga', desc: 'Pasangan, Anak & Ortu', icon: '👨‍👩‍👧‍👦' },
    { id: 'lainnya', step: '05', label: 'Riwayat Lainnya', desc: 'TMT CPNS & PNS', icon: '📋' },
  ];

  const currentSectionIndex = menuSections.findIndex((m) => m.id === activeTab);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handler Dinamis Riwayat Jabatan
  const handleJabatanChange = (index: number, field: string, value: any) => {
    const updated = [...riwayatJabatan];
    updated[index] = { ...updated[index], [field]: value };
    setRiwayatJabatan(updated);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleJabatanChange(index, 'fileSk', e.target.files[0]);
    }
  };

  const tambahBarisJabatan = () => {
    setRiwayatJabatan([...riwayatJabatan, { pangkatGolongan: '', jabatan: '', unitKerja: '', nomorSk: '', tanggalSk: '', tmt: '', angkaKredit: '', fileSk: null }]);
  };

  const hapusBarisJabatan = (index: number) => {
    setRiwayatJabatan(riwayatJabatan.filter((_, i) => i !== index));
  };

  // Handler Riwayat Pendidikan
  const handlePendidikanChange = (index: number, field: string, value: string) => {
    const updated = [...riwayatPendidikan];
    updated[index] = { ...updated[index], [field]: value };
    setRiwayatPendidikan(updated);
  };
  const tambahBarisPendidikan = () => {
    setRiwayatPendidikan([...riwayatPendidikan, { jenjang: '', namaSekolah: '', tahunLulus: '' }]);
  };
  const hapusBarisPendidikan = (index: number) => {
    setRiwayatPendidikan(riwayatPendidikan.filter((_, i) => i !== index));
  };

  // Handler Data Keluarga
  const handleKeluargaChange = (index: number, field: string, value: string) => {
    const updated = [...dataKeluarga];
    updated[index] = { ...updated[index], [field]: value };
    setDataKeluarga(updated);
  };
  const tambahBarisKeluarga = () => {
    setDataKeluarga([...dataKeluarga, { hubungan: 'Anak Kandung', nama: '', tempatTanggalLahir: '', pekerjaan: '' }]);
  };
  const hapusBarisKeluarga = (index: number) => {
    setDataKeluarga(dataKeluarga.filter((_, i) => i !== index));
  };

  // Preview Nama Gabungan dengan Gelar
  const namaLengkapFinal = `${formData.gelarDepan ? formData.gelarDepan + ' ' : ''}${formData.namaTanpaGelar}${formData.gelarBelakang ? ', ' + formData.gelarBelakang : ''}`.trim();
  const inisialNama = formData.namaTanpaGelar
    ? formData.namaTanpaGelar.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PG';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const payloadFinal = {
      ...formData,
      namaLengkap: namaLengkapFinal,
      riwayatJabatan,
      riwayatPendidikan,
      dataKeluarga
    };

    try {
      const res = await createPegawaiLengkap(payloadFinal);
      if (res.success) {
        setSuccessMessage('Data pegawai beserta riwayat kepegawaian berhasil direkam ke dalam database SIM Bimas Islam.');
        setShowSuccessModal(true);
      } else {
        alert('Gagal: ' + res.message);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan jaringan atau server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Utama Aplikasi */}
      <Sidebar />

      {/* Area Konten Utama */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Top Bar Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
                <Link href="/pegawai" className="hover:underline">Kepegawaian</Link>
                <span>/</span>
                <span>Tambah Pegawai Baru</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Formulir Registrasi Pegawai</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Kantor Kementerian Agama Kabupaten Pohuwato — SIM Bimas Islam
              </p>
            </div>
            <Link
              href="/pegawai"
              className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-xs"
            >
              <span>← Kembali ke Daftar</span>
            </Link>
          </div>

          {/* Layout 2 Kolom: Sub-Sidebar Vertikal (Kiri) + Form Konten (Kanan) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* KOLOM KIRI: CONTEXTUAL SUB-SIDEBAR */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
              
              {/* Kartu Ringkasan Pegawai (Live Preview) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    {inisialNama}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Pegawai Baru</p>
                    <h2 className="text-sm font-bold text-gray-900 truncate">
                      {namaLengkapFinal || 'Nama Belum Diisi'}
                    </h2>
                    <p className="text-xs font-mono text-gray-500 truncate mt-0.5">
                      {formData.nip ? `NIP. ${formData.nip}` : 'NIP belum diisi'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Navigasi Vertikal */}
              <nav className="bg-white rounded-2xl border border-gray-200 p-2.5 shadow-xs space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Bagian Formulir
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

              {/* Tombol Simpan Cepat di Sidebar */}
              <div className="hidden lg:block bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4">
                <p className="text-xs text-emerald-900 font-medium mb-3 leading-relaxed">
                  Pastikan <strong>NIK</strong>, <strong>NIP</strong>, dan <strong>Nama Lengkap</strong> sudah terisi sebelum menyimpan.
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Menyimpan Data...' : '💾 Simpan Data Pegawai'}
                </button>
              </div>

            </aside>

            {/* KOLOM KANAN: AREA FORMULIR */}
            <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                
                {/* BAGIAN 1: IDENTITAS PRIBADI */}
                {activeTab === 'identitas' && (
                  <div className="space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 1 dari 5</span>
                      <h3 className="text-lg font-bold text-gray-900 mt-0.5">Identitas Pribadi & Gelar</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">NIK (Nomor Induk Kependudukan) *</label>
                        <input
                          type="text"
                          name="nik"
                          value={formData.nik}
                          onChange={handleChange}
                          placeholder="Contoh: 7504xxxxxxxxxxxx"
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">NIP (Nomor Induk Pegawai) *</label>
                        <input
                          type="text"
                          name="nip"
                          value={formData.nip}
                          onChange={handleChange}
                          placeholder="Contoh: 198001012005011001"
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Gelar Depan (Opsional)</label>
                        <input
                          type="text"
                          name="gelarDepan"
                          value={formData.gelarDepan}
                          onChange={handleChange}
                          placeholder="Contoh: H., Dr., Drs."
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Gelar Belakang (Opsional)</label>
                        <input
                          type="text"
                          name="gelarBelakang"
                          value={formData.gelarBelakang}
                          onChange={handleChange}
                          placeholder="Contoh: S.Ag., M.H."
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nama Lengkap (Tanpa Gelar) *</label>
                        <input
                          type="text"
                          name="namaTanpaGelar"
                          value={formData.namaTanpaGelar}
                          onChange={handleChange}
                          placeholder="Contoh: Arman Mohamad"
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          required
                        />
                        <p className="text-xs text-emerald-800 mt-2 font-medium bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                          ✨ Preview Nama Lengkap: <strong>{namaLengkapFinal || '(Belum diisi)'}</strong>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Jenis Kelamin</label>
                        <select
                          name="jenisKelamin"
                          value={formData.jenisKelamin}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Agama</label>
                        <select
                          name="agama"
                          value={formData.agama}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Tempat Lahir</label>
                        <input
                          type="text"
                          name="tempatLahir"
                          value={formData.tempatLahir}
                          onChange={handleChange}
                          placeholder="Contoh: Marisa"
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Tanggal Lahir</label>
                        <input
                          type="date"
                          name="tanggalLahir"
                          value={formData.tanggalLahir}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Nomor Kontak / WhatsApp Aktif</label>
                        <input
                          type="text"
                          name="noHp"
                          value={formData.noHp}
                          onChange={handleChange}
                          placeholder="Contoh: 081234567890"
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Status Perkawinan</label>
                        <select
                          name="statusPerkawinan"
                          value={formData.statusPerkawinan}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Kawin">Kawin</option>
                          <option value="Belum Kawin">Belum Kawin</option>
                          <option value="Cerai Hidup">Cerai Hidup</option>
                          <option value="Cerai Mati">Cerai Mati</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Alamat Domisili</label>
                        <textarea
                          name="alamat"
                          rows={2}
                          value={formData.alamat}
                          onChange={handleChange}
                          placeholder="Masukkan alamat lengkap domisili..."
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* BAGIAN 2: RIWAYAT KEPEGAWAIAN & JABATAN */}
                {activeTab === 'kepegawaian' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 2 dari 5</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Jabatan & Golongan</h3>
                      </div>
                      <button
                        type="button"
                        onClick={tambahBarisJabatan}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                      >
                        + Tambah Riwayat Jabatan
                      </button>
                    </div>

                    {riwayatJabatan.map((item, index) => (
                      <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            Riwayat Jabatan #{index + 1}
                          </span>
                          {riwayatJabatan.length > 1 && (
                            <button
                              type="button"
                              onClick={() => hapusBarisJabatan(index)}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                              Hapus Baris
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Pangkat & Golongan Ruang</label>
                            <select
                              value={item.pangkatGolongan}
                              onChange={(e) => handleJabatanChange(index, 'pangkatGolongan', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih Golongan --</option>
                              {masterGolongan.map((gol, i) => (
                                <option key={i} value={gol}>{gol}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Jabatan</label>
                            <select
                              value={item.jabatan}
                              onChange={(e) => handleJabatanChange(index, 'jabatan', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih Jabatan --</option>
                              {masterJabatanList.map((jab, i) => (
                                <option key={i} value={jab}>{jab}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Unit Kerja / Penempatan</label>
                            <select
                              value={item.unitKerja}
                              onChange={(e) => handleJabatanChange(index, 'unitKerja', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih Unit Kerja / KUA --</option>
                              {masterKuaList.map((kua, i) => (
                                <option key={i} value={kua}>{kua}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nomor SK</label>
                            <input
                              type="text"
                              value={item.nomorSk}
                              onChange={(e) => handleJabatanChange(index, 'nomorSk', e.target.value)}
                              placeholder="Contoh: SK/123/Kemenag/2025"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal SK</label>
                            <input
                              type="date"
                              value={item.tanggalSk}
                              onChange={(e) => handleJabatanChange(index, 'tanggalSk', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">TMT Jabatan</label>
                            <input
                              type="date"
                              value={item.tmt}
                              onChange={(e) => handleJabatanChange(index, 'tmt', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-800"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Angka Kredit</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.angkaKredit}
                              onChange={(e) => handleJabatanChange(index, 'angkaKredit', e.target.value)}
                              placeholder="Contoh: 150.00"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Upload File SK (PDF / Gambar)</label>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => handleFileChange(index, e)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                            />
                            {item.fileSk && (
                              <p className="text-xs text-emerald-600 mt-1 font-medium">📎 File dipilih: {(item.fileSk as File).name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BAGIAN 3: RIWAYAT PENDIDIKAN */}
                {activeTab === 'pendidikan' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 3 dari 5</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Pendidikan Formal (SD s.d. S3)</h3>
                      </div>
                      <button
                        type="button"
                        onClick={tambahBarisPendidikan}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                      >
                        + Tambah Riwayat Pendidikan
                      </button>
                    </div>

                    {riwayatPendidikan.map((item, index) => (
                      <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            Pendidikan #{index + 1}
                          </span>
                          {riwayatPendidikan.length > 1 && (
                            <button
                              type="button"
                              onClick={() => hapusBarisPendidikan(index)}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                              Hapus Baris
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Jenjang Pendidikan</label>
                            <select
                              value={item.jenjang}
                              onChange={(e) => handlePendidikanChange(index, 'jenjang', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">-- Pilih Jenjang --</option>
                              {masterPendidikan.map((p, i) => (
                                <option key={i} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Sekolah / Universitas</label>
                            <input
                              type="text"
                              value={item.namaSekolah}
                              onChange={(e) => handlePendidikanChange(index, 'namaSekolah', e.target.value)}
                              placeholder="Contoh: MIN Marisa / IAIN Gorontalo"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tahun Lulus</label>
                            <input
                              type="text"
                              value={item.tahunLulus}
                              onChange={(e) => handlePendidikanChange(index, 'tahunLulus', e.target.value)}
                              placeholder="Contoh: 2018"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BAGIAN 4: DATA KELUARGA */}
                {activeTab === 'keluarga' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 4 dari 5</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Data Keluarga (Pasangan, Anak, Orang Tua)</h3>
                      </div>
                      <button
                        type="button"
                        onClick={tambahBarisKeluarga}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
                      >
                        + Tambah Anggota Keluarga
                      </button>
                    </div>

                    {dataKeluarga.map((item, index) => (
                      <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            Anggota Keluarga #{index + 1}
                          </span>
                          {dataKeluarga.length > 1 && (
                            <button
                              type="button"
                              onClick={() => hapusBarisKeluarga(index)}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                              Hapus Baris
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Hubungan Keluarga</label>
                            <select
                              value={item.hubungan}
                              onChange={(e) => handleKeluargaChange(index, 'hubungan', e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="Suami/Istri">Suami / Istri</option>
                              <option value="Anak Kandung">Anak Kandung</option>
                              <option value="Ayah Kandung">Ayah Kandung</option>
                              <option value="Ibu Kandung">Ibu Kandung</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                            <input
                              type="text"
                              value={item.nama}
                              onChange={(e) => handleKeluargaChange(index, 'nama', e.target.value)}
                              placeholder="Nama lengkap anggota keluarga"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tempat, Tanggal Lahir</label>
                            <input
                              type="text"
                              value={item.tempatTanggalLahir}
                              onChange={(e) => handleKeluargaChange(index, 'tempatTanggalLahir', e.target.value)}
                              placeholder="Contoh: Marisa, 12-05-1985"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Pekerjaan</label>
                            <input
                              type="text"
                              value={item.pekerjaan}
                              onChange={(e) => handleKeluargaChange(index, 'pekerjaan', e.target.value)}
                              placeholder="Contoh: PNS / Ibu Rumah Tangga / Pelajar"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BAGIAN 5: RIWAYAT LAINNYA */}
                {activeTab === 'lainnya' && (
                  <div className="space-y-6">
                    <div className="border-b border-gray-100 pb-4">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 5 dari 5</span>
                      <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Lainnya & TMT Kepegawaian</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">TMT CPNS / PPPK</label>
                        <input
                          type="date"
                          name="tmtCpns"
                          value={formData.tmtCpns}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">TMT PNS</label>
                        <input
                          type="date"
                          name="tmtPns"
                          value={formData.tmtPns}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Navigasi Antar Langkah & Tombol Simpan */}
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
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {loading ? 'Menyimpan...' : '💾 Simpan Pegawai'}
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>

        </div>

        {/* MODAL SUKSES KUSTOM */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-emerald-100 transform transition-all">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alhamdulillah, Berhasil Disimpan!</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {successMessage}
              </p>
              <button
                type="button"
                onClick={() => router.push('/pegawai')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-emerald-600/30 text-sm"
              >
                Lihat Daftar Pegawai
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
