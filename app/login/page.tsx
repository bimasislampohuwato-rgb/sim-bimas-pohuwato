'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(''); // Bisa NIP atau Email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State untuk Modal Pilih Peran (Dual Role Switcher)
  const [showRoleChooser, setShowRoleChooser] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Jika input tidak mengandung '@', anggap sebagai NIP dan konversi ke email internal
      const cleanInput = identifier.trim();
      const loginEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@simbimas.local`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) throw new Error('NIP / Email atau kata sandi salah.');

      const user = authData.user;
      if (!user) throw new Error('Gagal mendapatkan sesi pengguna.');

      // Ambil profil lengkap beserta status jabatan_admin
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        localStorage.setItem('active_mode', 'pegawai');
        router.push('/pegawai');
        return;
      }

      // 1. Jika Super Admin -> Langsung masuk mode Super Admin
      if (profileData.role === 'super_admin') {
        localStorage.setItem('active_mode', 'super_admin');
        router.push('/pegawai');
        return;
      }

      // 2. Jika Pegawai yang ditunjuk sebagai Admin Bimas atau Admin KUA -> Tampilkan Pilihan Mode!
      if (profileData.jabatan_admin === 'admin_bimas' || profileData.jabatan_admin === 'admin_kua') {
        setUserProfile(profileData);
        setShowRoleChooser(true);
        setLoading(false);
        return;
      }

      // 3. Jika Pegawai biasa -> Langsung masuk mode Pegawai
      localStorage.setItem('active_mode', 'pegawai');
      router.push('/pegawai');

    } catch (error: any) {
      setErrorMessage(error.message || 'Terjadi kesalahan saat masuk.');
      setLoading(false);
    }
  };

  const handleSelectMode = (mode: 'admin' | 'pegawai') => {
    if (mode === 'admin' && userProfile?.jabatan_admin) {
      localStorage.setItem('active_mode', userProfile.jabatan_admin); // 'admin_bimas' atau 'admin_kua'
    } else {
      localStorage.setItem('active_mode', 'pegawai');
    }
    router.push('/pegawai');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-gray-900 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-10 rounded-2xl shadow-2xl border border-emerald-100">

        {/* Header Logo & Instansi */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-inner mb-4">
            🏛️
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            SIM Bimas Islam
          </h2>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mt-1">
            Kemenag Kabupaten Pohuwato
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Masuk menggunakan <strong>NIP</strong> atau Email Administrator
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-xs text-red-700">
            <span className="font-bold">Gagal Masuk: </span> {errorMessage}
          </div>
        )}

        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                NIP Pegawai / Email Admin
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 199108212023211018"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Kata Sandi (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi Akun...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © 2026 Kantor Kementerian Agama Kab. Pohuwato <br />
            Sistem Informasi Manajemen Bimbingan Masyarakat Islam
          </p>
        </div>
      </div>

      {/* MODAL PILIH PERAN (MUNCUL JIKA PEGAWAI MERANGKAP ADMIN BIMAS / ADMIN KUA) */}
      {showRoleChooser && userProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-emerald-100 text-center max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🎭
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Selamat Datang, {userProfile.nama_lengkap}
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Akun Anda memiliki hak akses ganda. Silakan pilih mode ruang kerja yang ingin Anda buka saat ini:
            </p>

            <div className="space-y-3">
              {/* Pilihan 1: Masuk Sebagai Admin */}
              <button
                type="button"
                onClick={() => handleSelectMode('admin')}
                className="w-full p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-left transition flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                    Mode Administrator
                  </span>
                  <span className="text-sm font-bold text-gray-900 block break-words">
                    Masuk sebagai {userProfile.jabatan_admin === 'admin_bimas' ? 'Admin Bimas Islam' : `Admin ${userProfile.kua_wilayah || 'KUA'}`}
                  </span>
                  <span className="text-xs text-gray-600 block mt-0.5">
                    Kelola data kepegawaian & layanan unit kerja
                  </span>
                </div>
                <span className="text-emerald-700 font-bold text-lg group-hover:translate-x-1 transition shrink-0">→</span>
              </button>

              {/* Pilihan 2: Masuk Sebagai Pegawai */}
              <button
                type="button"
                onClick={() => handleSelectMode('pegawai')}
                className="w-full p-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-left transition flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                    Mode Personal
                  </span>
                  <span className="text-sm font-bold text-gray-900 block">
                    Masuk sebagai Pegawai
                  </span>
                  <span className="text-xs text-gray-500 block mt-0.5">
                    Lihat & perbarui biodata kepegawaian pribadi
                  </span>
                </div>
                <span className="text-gray-400 font-bold text-lg group-hover:translate-x-1 transition shrink-0">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}