'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        <div className="flex-1 flex flex-col">
          <HeaderBar />
          <main className="flex-1 flex items-center justify-center text-sm text-gray-500">
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          
          {/* TOAST KUSTOM MODERN (Z-[9999] PALING DEPAN) */}
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

          <div className="max-w-5xl mx-auto">
            {/* Navigasi Atas & Tombol Aksi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/pegawai"
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition shadow-xs"
                  title="Kembali"
                >
                  ←
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Detail Profil Kepegawaian
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Informasi lengkap identitas, jabatan, dan unit kerja pegawai
                  </p>
                </div>
              </div>

              {canEdit && (
                <Link
                  href={`/pegawai/edit/${pegawai.id}`}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20"
                >
                  <span>✏️</span> Edit Data Pegawai
                </Link>
              )}
            </div>

            {/* Kartu Header Profil Utama dengan Hover Pensil Foto */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
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

                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                    {pegawai?.jabatan || 'Pegawai'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {nama}
                  </h2>
                  <p className="text-sm font-mono text-emerald-700 font-semibold mt-1">
                    NIP: {pegawai?.nip || '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Unit Kerja: <strong className="text-gray-700">{pegawai?.unit_kerja || '-'}</strong>
                  </p>
                  {canEdit && (
                    <p className="text-[11px] text-emerald-600 mt-2 italic">
                      💡 Letakkan kursor di atas foto untuk mengganti foto profil secara instan.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rincian Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identitas Pribadi */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  🪪 Identitas Pribadi
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">NIK</dt>
                    <dd className="font-mono font-semibold text-gray-900">{pegawai?.nik || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Tempat, Tanggal Lahir</dt>
                    <dd className="font-semibold text-gray-900">
                      {pegawai?.tempat_lahir || '-'}, {pegawai?.tanggal_lahir || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Jenis Kelamin</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.jenis_kelamin || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Status Perkawinan</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.status_perkawinan || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">Alamat Domisili</dt>
                    <dd className="font-semibold text-gray-900 text-right max-w-xs">{pegawai?.alamat || pegawai?.alamat_domisili || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Kepegawaian & Kontak */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-3 border-b border-gray-100 mb-4">
                  💼 Kepegawaian & Kontak
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Status Kepegawaian</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.status_pegawai || pegawai?.status_kepegawaian || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Pangkat / Golongan</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.pangkat_golongan || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Pendidikan Terakhir</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.pendidikan_terakhir || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <dt className="text-gray-500">Nomor HP / WhatsApp</dt>
                    <dd className="font-semibold text-gray-900">{pegawai?.no_hp || pegawai?.nomor_hp || '-'}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">Email Aktif</dt>
                    <dd className="font-semibold text-emerald-700">{pegawai?.email || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>
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