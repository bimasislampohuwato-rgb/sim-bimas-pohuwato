'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePegawai } from '@/app/pegawai/edit/[id]/_actions/pegawai-edit';
import Sidebar from '@/components/Sidebar';
import RiwayatJabatanSection from '@/components/pegawai/RiwayatJabatanSection';
import RiwayatPendidikanSection from '@/components/pegawai/RiwayatPendidikanSection';
import DataKeluargaSection from '@/components/pegawai/DataKeluargaSection';
import type { PegawaiEditPageData } from '@/app/pegawai/edit/[id]/_actions/pegawai-edit';

interface PegawaiEditClientProps {
  initialData: PegawaiEditPageData | null;
  initialError: string | null;
  pegawaiId: string;
}

export default function PegawaiEditClient({ initialData, initialError, pegawaiId }: PegawaiEditClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('identitas');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const pegawai = initialData?.pegawai;

  const [masterJabatanList] = useState<string[]>(initialData?.masterJabatanList || [
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
  const [masterKuaList] = useState<string[]>(initialData?.masterKuaList || [
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
    'IV/a (Pembina)', 'IV/b (Pembina Tk. I)',
  ];
  const masterPendidikan = ['SD / Sederajat', 'SMP / Sederajat', 'SMA / MA / Sederajat', 'D-III', 'S-1 / D-IV', 'S-2', 'S-3'];

  const [formData, setFormData] = useState({
    nik: pegawai?.nik || '',
    nip: pegawai?.nip || '',
    namaTanpaGelar: pegawai?.nama_tanpa_gelar || '',
    gelarDepan: pegawai?.gelar_depan || '',
    gelarBelakang: pegawai?.gelar_belakang || '',
    jenisKelamin: pegawai?.jenis_kelamin || 'L',
    tempatLahir: pegawai?.tempat_lahir || '',
    tanggalLahir: pegawai?.tanggal_lahir || '',
    agama: pegawai?.agama || 'Islam',
    kewarganegaraan: 'WNI',
    alamat: pegawai?.alamat || '',
    noHp: pegawai?.no_hp || '',
    statusPerkawinan: pegawai?.status_perkawinan || 'Kawin',
    tmtCpns: pegawai?.tmt_cpns || '',
    tmtPns: pegawai?.tmt_pns || '',
  });

  const [riwayatJabatan, setRiwayatJabatan] = useState(
    initialData?.riwayatJabatan && initialData.riwayatJabatan.length > 0
      ? initialData.riwayatJabatan.map((r) => ({ ...r, fileSk: null as File | null }))
      : [{ pangkatGolongan: '', jabatan: '', unitKerja: '', nomorSk: '', tanggalSk: '', tmt: '', angkaKredit: '', fileSk: null as File | null }]
  );

  const [riwayatPendidikan, setRiwayatPendidikan] = useState(
    initialData?.riwayatPendidikan && initialData.riwayatPendidikan.length > 0
      ? initialData.riwayatPendidikan
      : [{ jenjang: '', namaSekolah: '', tahunLulus: '' }]
  );

  const [dataKeluarga, setDataKeluarga] = useState(
    initialData?.dataKeluarga && initialData.dataKeluarga.length > 0
      ? initialData.dataKeluarga
      : [{ hubungan: 'Suami/Istri', nama: '', tempatTanggalLahir: '', pekerjaan: '' }]
  );

  const menuSections = [
    { id: 'identitas', step: '01', label: 'Identitas Pribadi', desc: 'NIK, NIP, Gelar & Kontak', icon: '👤' },
    { id: 'kepegawaian', step: '02', label: 'Jabatan & Golongan', desc: 'Riwayat SK, TMT & Unit', icon: '💼' },
    { id: 'pendidikan', step: '03', label: 'Riwayat Pendidikan', desc: 'Jenjang Formal & Tahun', icon: '🎓' },
    { id: 'keluarga', step: '04', label: 'Data Keluarga', desc: 'Pasangan, Anak & Ortu', icon: '👨‍👩‍👧‍👦' },
    { id: 'lainnya', step: '05', label: 'Riwayat Lainnya', desc: 'TMT CPNS & PNS', icon: '📋' },
  ];

  const currentSectionIndex = menuSections.findIndex((m) => m.id === activeTab);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }, [formData]);

  const handleJabatanChange = useCallback((index: number, field: string, value: any) => {
    setRiwayatJabatan(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleFileChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleJabatanChange(index, 'fileSk', e.target.files[0]);
    }
  }, [handleJabatanChange]);

  const tambahBarisJabatan = useCallback(() => {
    setRiwayatJabatan(prev => [...prev, { pangkatGolongan: '', jabatan: '', unitKerja: '', nomorSk: '', tanggalSk: '', tmt: '', angkaKredit: '', fileSk: null }]);
  }, []);

  const hapusBarisJabatan = useCallback((index: number) => {
    setRiwayatJabatan(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handlePendidikanChange = useCallback((index: number, field: string, value: string) => {
    setRiwayatPendidikan(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const tambahBarisPendidikan = useCallback(() => {
    setRiwayatPendidikan(prev => [...prev, { jenjang: '', namaSekolah: '', tahunLulus: '' }]);
  }, []);

  const hapusBarisPendidikan = useCallback((index: number) => {
    setRiwayatPendidikan(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeluargaChange = useCallback((index: number, field: string, value: string) => {
    setDataKeluarga(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const tambahBarisKeluarga = useCallback(() => {
    setDataKeluarga(prev => [...prev, { hubungan: 'Anak Kandung', nama: '', tempatTanggalLahir: '', pekerjaan: '' }]);
  }, []);

  const hapusBarisKeluarga = useCallback((index: number) => {
    setDataKeluarga(prev => prev.filter((_, i) => i !== index));
  }, []);

  const namaLengkapFinal = `${formData.gelarDepan ? formData.gelarDepan + ' ' : ''}${formData.namaTanpaGelar}${formData.gelarBelakang ? ', ' + formData.gelarBelakang : ''}`.trim();
  const inisialNama = formData.namaTanpaGelar
    ? formData.namaTanpaGelar.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PG';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payloadFinal = {
      nama_lengkap: namaLengkapFinal,
      nama_tanpa_gelar: formData.namaTanpaGelar,
      nip: formData.nip,
      nik: formData.nik,
      jenis_kelamin: formData.jenisKelamin,
      agama: formData.agama,
      tempat_lahir: formData.tempatLahir,
      tanggal_lahir: formData.tanggalLahir,
      no_hp: formData.noHp,
      email: null,
      alamat: formData.alamat,
      jabatan: riwayatJabatan[0]?.jabatan || '',
      unit_kerja: riwayatJabatan[0]?.unitKerja || '',
      pangkat_gol: riwayatJabatan[0]?.pangkatGolongan || null,
      tmt_jabatan: riwayatJabatan[0]?.tmt || null,
      tmt_cpns: formData.tmtCpns || null,
      tmt_pns: formData.tmtPns || null,
      pendidikan_terakhir: riwayatPendidikan[0]?.jenjang || null,
      jurusan: riwayatPendidikan[0]?.namaSekolah || null,
      tahun_lulus: riwayatPendidikan[0]?.tahunLulus || null,
      status_perkawinan: formData.statusPerkawinan,
      nama_pasangan: dataKeluarga.find((k) => k.hubungan === 'Suami/Istri')?.nama || null,
      jumlah_anak: dataKeluarga.filter((k) => k.hubungan === 'Anak Kandung').length,
      riwayatJabatan: riwayatJabatan.map((r) => ({
        pangkatGolongan: r.pangkatGolongan,
        jabatan: r.jabatan,
        unitKerja: r.unitKerja,
        nomorSk: r.nomorSk,
        tanggalSk: r.tanggalSk,
        tmt: r.tmt,
        angkaKredit: r.angkaKredit,
      })),
      riwayatPendidikan,
      dataKeluarga,
    };

    try {
      const result = await updatePegawai(pegawaiId, payloadFinal);
      if (result.success) {
        setSuccessMessage('Data pegawai berhasil diperbarui.');
        setShowSuccessModal(true);
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan jaringan atau server.');
    } finally {
      setLoading(false);
    }
  }, [formData, namaLengkapFinal, riwayatJabatan, riwayatPendidikan, dataKeluarga, pegawaiId]);

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
                <Link href="/pegawai" className="hover:underline">Kepegawaian</Link>
                <span>/</span>
                <span>Edit Pegawai</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Formulir Edit Pegawai</h1>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    {inisialNama}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Edit Pegawai</p>
                    <h2 className="text-sm font-bold text-gray-900 truncate">
                      {namaLengkapFinal || 'Nama Belum Diisi'}
                    </h2>
                    <p className="text-xs font-mono text-gray-500 truncate mt-0.5">
                      {formData.nip ? `NIP. ${formData.nip}` : 'NIP belum diisi'}
                    </p>
                  </div>
                </div>
              </div>

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
                  {loading ? 'Menyimpan Data...' : '💾 Simpan Perubahan'}
                </button>
              </div>

            </aside>

            <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 sm:p-8">

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

                {activeTab === 'kepegawaian' && (
                  <RiwayatJabatanSection
                    items={riwayatJabatan}
                    masterGolongan={masterGolongan}
                    masterJabatanList={masterJabatanList}
                    masterKuaList={masterKuaList}
                    onChange={handleJabatanChange}
                    onFileChange={handleFileChange}
                    onTambah={tambahBarisJabatan}
                    onHapus={hapusBarisJabatan}
                  />
                )}

                {activeTab === 'pendidikan' && (
                  <RiwayatPendidikanSection
                    items={riwayatPendidikan}
                    masterPendidikan={masterPendidikan}
                    onChange={handlePendidikanChange}
                    onTambah={tambahBarisPendidikan}
                    onHapus={hapusBarisPendidikan}
                  />
                )}

                {activeTab === 'keluarga' && (
                  <DataKeluargaSection
                    items={dataKeluarga}
                    onChange={handleKeluargaChange}
                    onTambah={tambahBarisKeluarga}
                    onHapus={hapusBarisKeluarga}
                  />
                )}

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
                      {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                  </div>
                </div>

              </form>
            </div>

          </div>

        </div>

        {showSuccessModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-emerald-100 transform transition-all">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Alhamdulillah, Berhasil Diperbarui!</h3>
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