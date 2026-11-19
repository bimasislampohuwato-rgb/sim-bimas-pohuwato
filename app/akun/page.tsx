'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PengaturanAkunPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form State
  const [namaLengkap, setNamaLengkap] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) {
        setProfile(prof);
        setNamaLengkap(prof.nama_lengkap || '');
        setFotoUrl(prof.foto_url || '');
        setPreviewUrl(prof.foto_url || '');
      }
      setLoading(false);
    }
    loadUserData();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file gambar
    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Format Tidak Valid', 'Harap pilih file gambar (JPG, PNG, atau WebP).');
      e.target.value = '';
      return;
    }

    // Validasi ukuran maksimal 500 KB (500 * 1024 bytes)
    const maxSize = 500 * 1024;
    if (file.size > maxSize) {
      triggerToast('error', 'Ukuran File Terlalu Besar', 'Maksimal ukuran foto profil adalah 500 KB agar penyimpanan tetap hemat.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProcessing(true);

    let finalFotoUrl = fotoUrl;

    // 1. Jika ada file foto baru yang dipilih, upload ke Supabase Storage (upsert: true)
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const filePath = `profil/${profile.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media_sim')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true, // Timpa file lama agar storage tidak penuh
        });

      if (uploadError) {
        triggerToast('error', 'Gagal Upload Foto', uploadError.message);
        setProcessing(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('media_sim')
        .getPublicUrl(filePath);

      // Tambahkan timestamp cache-buster agar foto di HeaderBar langsung berubah
      finalFotoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    }

    // 2. Update tabel profiles
    const { error: errProf } = await supabase
      .from('profiles')
      .update({
        nama_lengkap: namaLengkap,
        foto_url: finalFotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    // 3. Update password jika diisi
    if (passwordBaru) {
      if (passwordBaru !== konfirmasiSandi) {
        triggerToast('error', 'Konfirmasi Sandi Gagal', 'Password baru dan konfirmasi tidak cocok.');
        setProcessing(false);
        return;
      }
      const { error: errAuth } = await supabase.auth.updateUser({ password: passwordBaru });
      if (errAuth) {
        triggerToast('error', 'Gagal Update Sandi', errAuth.message);
        setProcessing(false);
        return;
      }
    }

    setProcessing(false);

    if (errProf) {
      triggerToast('error', 'Gagal Memperbarui', errProf.message);
    } else {
      setFotoUrl(finalFotoUrl);
      setSelectedFile(null);
      setPasswordBaru('');
      setKonfirmasiSandi('');
      triggerToast('success', 'Berhasil', 'Profil dan foto berhasil diperbarui! Memuat ulang tampilan...');
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          <main className="flex-1 flex items-center justify-center text-sm text-gray-500 p-6 pb-24 md:pb-10">
            Memuat profil akun...
          </main>
        </div>
      </div>
    );
  }

  const inisial = namaLengkap ? namaLengkap.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">
          
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

          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pengaturan Akun & Sandi Pribadi</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 mb-6">Kelola informasi profil, foto avatar, dan kata sandi login Anda</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Info Akun Dasar (Read Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username (NIP / Email)</label>
                    <input
                      type="text"
                      readOnly
                      value={profile?.nip || profile?.email || ''}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level / Hak Akses</label>
                    <input
                      type="text"
                      readOnly
                      value={profile?.role === 'super_admin' ? 'SUPER ADMIN' : profile?.jabatan_admin || 'PEGAWAI'}
                      className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-800 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Upload Foto Profil & Edit Nama */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Foto Profil / Avatar</label>
                    <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <div className="w-20 h-20 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-2xl overflow-hidden shrink-0 border-4 border-white shadow-md">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{inisial}</span>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs">
                          <span>📷</span> Pilih Foto Baru
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-gray-500 mt-2">
                          Format: JPG, PNG, atau WebP. <strong>Maksimal ukuran 500 KB</strong>.
                        </p>
                        {selectedFile && (
                          <p className="text-[11px] font-semibold text-emerald-700 mt-1 break-all">
                            ✓ File siap diunggah: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Ubah Password */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">🔑 Ubah Kata Sandi (Opsional)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kata Sandi Baru</label>
                      <input
                        type="password"
                        value={passwordBaru}
                        onChange={(e) => setPasswordBaru(e.target.value)}
                        placeholder="Kosongkan jika tidak diubah"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Konfirmasi Kata Sandi Baru</label>
                      <input
                        type="password"
                        value={konfirmasiSandi}
                        onChange={(e) => setKonfirmasiSandi(e.target.value)}
                        placeholder="Ulangi sandi baru"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    {processing ? 'Menyimpan & Mengunggah...' : 'Simpan Perubahan Akun'}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}