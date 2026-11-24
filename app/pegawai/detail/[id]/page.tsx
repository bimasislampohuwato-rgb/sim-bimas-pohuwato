'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldValue(val: any): string {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (Array.isArray(val)) {
    return val.length > 0 ? val.map((item) => formatFieldValue(item)).join(', ') : '-';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

function DetailPegawaiContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [pegawai, setPegawai] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Toast Kustom Modern (Pengganti alert browser)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    async function loadDetailAndAccess() {
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

      const savedMode = localStorage.getItem('active_mode');
      const activeMode =
        savedMode ||
        (myProfile?.role === 'super_admin'
          ? 'super_admin'
          : myProfile?.jabatan_admin || 'pegawai');

      const { data: pegData, error } = await supabase
        .from('pegawai')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !pegData) {
        router.push('/pegawai');
        return;
      }

      setPegawai(pegData);

      const isOwner =
        (myProfile?.nip && myProfile.nip === pegData.nip) ||
        (myProfile?.email && myProfile.email === pegData.email);

      if (
        activeMode === 'super_admin' ||
        activeMode === 'admin_bimas' ||
        (activeMode === 'pegawai' && isOwner)
      ) {
        setCanEdit(true);
      } else {
        setCanEdit(false);
      }

      setLoading(false);
    }

    if (id) loadDetailAndAccess();
  }, [id, router]);

  // Handler Ganti Foto Cepat via Hover Pensil dengan Toast Kustom
  const handleQuickFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerToast('error', 'File Terlalu Besar', 'Maksimal ukuran berkas foto adalah 2 MB.');
      return;
    }

    setUploadingFoto(true);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `pegawai_${id}_${Date.now()}.${fileExt}`;
    const filePath = `pegawai_foto/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media_sim')
      .upload(filePath, file, { cacheControl: '3600' });

    if (uploadError) {
      setUploadingFoto(false);
      triggerToast('error', 'Gagal Mengunggah', uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media_sim')
      .getPublicUrl(filePath);

    const newFotoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('pegawai')
      .update({ foto_url: newFotoUrl })
      .eq('id', id);

    setUploadingFoto(false);

    if (updateError) {
      triggerToast('error', 'Gagal Menyimpan', updateError.message);
    } else {
      setPegawai({ ...pegawai, foto_url: newFotoUrl });
      triggerToast('success', 'Foto Diperbarui', 'Foto profil pegawai berhasil diperbarui secara instan.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          <main className="flex-1 flex items-center justify-center text-sm text-gray-500 p-6 pb-24 md:pb-10">
            Memuat profil lengkap pegawai...
          </main>
        </div>
      </div>
    );
  }

  const nama =
    pegawai?.nama_lengkap ||
    pegawai?.nama_tanpa_gelar ||
    pegawai?.namaLengkap ||
    'Tanpa Nama';

  const namaTanpaGelar =
    pegawai?.nama_tanpa_gelar ||
    pegawai?.namaTanpaGelar ||
    pegawai?.nama_lengkap ||
    '-';

  // Field yang sudah ditempatkan di bagian khusus agar tidak duplikat di bagian "Informasi Tambahan"
  const renderedKeys = new Set<string>([
    'id',
    'created_at',
    'updated_at',
    'foto_url',
    'nama_lengkap',
    'nama_tanpa_gelar',
    'namaLengkap',
    'namaTanpaGelar',
    'nip',
    'jabatan',
    'unit_kerja',
    'nik',
    'tempat_lahir',
    'tanggal_lahir',
    'jenis_kelamin',
    'status_perkawinan',
    'alamat',
    'alamat_domisili',
    'agama',
    'kewarganegaraan',
    'status_pegawai',
    'status_kepegawaian',
    'pangkat_golongan',
    'golongan',
    'tmt_cpns',
    'tmt_pns',
    'tmt_jabatan',
    'pendidikan_terakhir',
    'jenjang_pendidikan',
    'jurusan',
    'program_studi',
    'universitas',
    'institusi_pendidikan',
    'tahun_lulus',
    'nama_pasangan',
    'pekerjaan_pasangan',
    'jumlah_anak',
    'data_keluarga',
    'keluarga',
    'no_hp',
    'nomor_hp',
    'no_wa',
    'whatsapp',
    'email',
  ]);

  const extraEntries = Object.entries(pegawai || {}).filter(
    ([key, value]) =>
      !renderedKeys.has(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
  );

  const pendidikanItems = [
    { label: 'Pendidikan Terakhir', value: formatFieldValue(pegawai?.pendidikan_terakhir || pegawai?.jenjang_pendidikan) },
    { label: 'Jurusan / Prodi', value: formatFieldValue(pegawai?.jurusan || pegawai?.program_studi) },
    { label: 'Institusi / Kampus', value: formatFieldValue(pegawai?.universitas || pegawai?.institusi_pendidikan) },
    { label: 'Tahun Lulus', value: formatFieldValue(pegawai?.tahun_lulus) },
  ];

  const keluargaItems = [
    { label: 'Status Perkawinan', value: formatFieldValue(pegawai?.status_perkawinan) },
    { label: 'Nama Pasangan', value: formatFieldValue(pegawai?.nama_pasangan) },
    { label: 'Pekerjaan Pasangan', value: formatFieldValue(pegawai?.pekerjaan_pasangan) },
    { label: 'Jumlah Anak', value: formatFieldValue(pegawai?.jumlah_anak) },
    ...(pegawai?.data_keluarga || pegawai?.keluarga
      ? [{ label: 'Catatan Keluarga', value: formatFieldValue(pegawai?.data_keluarga || pegawai?.keluarga) }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">
          
          {/* TOAST KUSTOM MODERN (Z-[9999] PALING DEPAN) */}
          {toast && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] max-w-md sm:w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5 animate-fade-in">
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

          <div className="max-w-5xl mx-auto">
            {/* Navigasi Atas & Tombol Aksi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/pegawai"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-xs shrink-0"
                  title="Kembali"
                >
                  ←
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    Detail Profil Kepegawaian
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Informasi lengkap identitas, jabatan, pendidikan, keluarga, dan unit kerja pegawai
                  </p>
                </div>
              </div>

              {canEdit && (
                <Link
                  href={`/pegawai/edit/${pegawai.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 w-full sm:w-auto"
                >
                  <span>✏️</span> Edit Data Pegawai
                </Link>
              )}
            </div>

            {/* Kartu Header Profil Utama dengan Hover Pensil Foto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8 mb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                
                {/* Kotak Foto dengan Efek Hover Pensil */}
                <div className="relative group shrink-0">
                  <div className="w-28 h-32 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-3xl border-2 border-emerald-200 shadow-md overflow-hidden">
                    {pegawai?.foto_url ? (
                      <img
                        src={pegawai.foto_url}
                        alt={nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {nama
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  {canEdit && (
                    <label
                      title="Ganti Foto Profil"
                      className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                    >
                      <span className="text-xl mb-0.5">✏️</span>
                      <span className="text-[10px] font-bold">
                        {uploadingFoto ? 'Mengunggah...' : 'Ganti Foto'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleQuickFotoChange}
                        disabled={uploadingFoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                    {pegawai?.jabatan || 'Pegawai'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                    {nama}
                  </h2>
                  <p className="text-sm font-mono text-emerald-700 font-semibold mt-1 break-all">
                    NIP: {pegawai?.nip || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Unit Kerja: <strong className="text-gray-700">{pegawai?.unit_kerja || '-'}</strong>
                  </p>
                  {canEdit && (
                    <p className="text-[11px] text-emerald-600 mt-2 italic">
                      💡 Letakkan kursor di atas foto (atau ketuk di HP) untuk mengganti foto profil secara instan.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rincian Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identitas Pribadi */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  🪪 Identitas Pribadi
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Nama Tanpa Gelar</dt>
                    <dd className="font-semibold text-gray-900 text-right break-words">{namaTanpaGelar}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">NIK</dt>
                    <dd className="font-mono font-semibold text-gray-900 text-right break-all">{pegawai?.nik || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Tempat, Tanggal Lahir</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {pegawai?.tempat_lahir || '-'}, {pegawai?.tanggal_lahir || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Jenis Kelamin</dt>
                    <dd className="font-semibold text-gray-900 text-right">{pegawai?.jenis_kelamin || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Status Perkawinan</dt>
                    <dd className="font-semibold text-gray-900 text-right">{pegawai?.status_perkawinan || '-'}</dd>
                  </div>
                  {(pegawai?.agama || pegawai?.kewarganegaraan) && (
                    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                      <dt className="text-gray-500 shrink-0">Agama / Kewarganegaraan</dt>
                      <dd className="font-semibold text-gray-900 text-right">
                        {pegawai?.agama || '-'} • {pegawai?.kewarganegaraan || 'WNI'}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 py-1.5">
                    <dt className="text-gray-500 shrink-0">Alamat Domisili</dt>
                    <dd className="font-semibold text-gray-900 text-right max-w-xs break-words">
                      {pegawai?.alamat || pegawai?.alamat_domisili || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Kepegawaian & Kontak */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  💼 Kepegawaian & Kontak
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Status Kepegawaian</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {pegawai?.status_pegawai || pegawai?.status_kepegawaian || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Pangkat / Golongan</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {pegawai?.pangkat_golongan || pegawai?.golongan || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Jabatan & Unit Kerja</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {pegawai?.jabatan || '-'} ({pegawai?.unit_kerja || '-'})
                    </dd>
                  </div>
                  {(pegawai?.tmt_jabatan || pegawai?.tmt_pns || pegawai?.tmt_cpns) && (
                    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                      <dt className="text-gray-500 shrink-0">TMT Aktif</dt>
                      <dd className="font-semibold text-gray-900 text-right">
                        {pegawai?.tmt_jabatan || pegawai?.tmt_pns || pegawai?.tmt_cpns}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Pendidikan Terakhir</dt>
                    <dd className="font-semibold text-gray-900 text-right">{pegawai?.pendidikan_terakhir || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                    <dt className="text-gray-500 shrink-0">Nomor HP / WhatsApp</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {pegawai?.no_hp || pegawai?.nomor_hp || pegawai?.no_wa || pegawai?.whatsapp || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-1.5">
                    <dt className="text-gray-500 shrink-0">Email Aktif</dt>
                    <dd className="font-semibold text-emerald-700 text-right break-all">{pegawai?.email || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Riwayat Pendidikan */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  🎓 Pendidikan & Kualifikasi
                </h3>
                <dl className="space-y-3 text-xs">
                  {pendidikanItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between gap-4 py-1.5 ${
                        idx < pendidikanItems.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <dt className="text-gray-500 shrink-0">{item.label}</dt>
                      <dd className="font-semibold text-gray-900 text-right break-words">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Data Keluarga */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  👨‍👩‍👧‍👦 Data Keluarga
                </h3>
                <dl className="space-y-3 text-xs">
                  {keluargaItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between gap-4 py-1.5 ${
                        idx < keluargaItems.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      <dt className="text-gray-500 shrink-0">{item.label}</dt>
                      <dd className="font-semibold text-gray-900 text-right break-words">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Informasi Tambahan / Atribut Lain di Database */}
            {extraEntries.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 mt-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  📋 Informasi Tambahan Kepegawaian
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  {extraEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 py-1.5 border-b border-gray-50">
                      <dt className="text-gray-500 shrink-0">{formatFieldLabel(key)}</dt>
                      <dd className="font-semibold text-gray-900 text-right break-words">
                        {formatFieldValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DetailPegawaiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Memuat halaman detail...</div>}>
      <DetailPegawaiContent />
    </Suspense>
  );
}