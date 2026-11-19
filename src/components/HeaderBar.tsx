'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function HeaderBar() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          // Tentukan mode awal berdasarkan role atau localStorage
          const savedMode = localStorage.getItem('active_mode');
          if (savedMode) {
            setActiveMode(savedMode);
          } else {
            // Default mode tertinggi yang dimiliki
            if (data.role === 'super_admin') setActiveMode('super_admin');
            else if (data.jabatan_admin) setActiveMode(data.jabatan_admin);
            else setActiveMode('pegawai');
          }
        }
      }
    }
    loadProfile();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchMode = (mode: string) => {
    setActiveMode(mode);
    localStorage.setItem('active_mode', mode);
    setDropdownOpen(false);
    window.location.reload(); // Refresh halaman untuk menerapkan filter data
  };

  const handleLogout = async () => {
    localStorage.removeItem('active_mode');
    await supabase.auth.signOut();
    router.push('/login');
  };

  const inisial = profile?.nama_lengkap ? profile.nama_lengkap.charAt(0).toUpperCase() : 'A';

  const getModeLabel = (m: string) => {
    if (m === 'super_admin') return '👑 SUPER ADMIN';
    if (m === 'admin_bimas') return '🛡️ ADMIN BIMAS';
    if (m === 'admin_kua') return `🕌 ADMIN KUA (${profile?.kua_wilayah || ''})`;
    return '👤 PEGAWAI (PRIBADI)';
  };

  const hasDualRole = Boolean(profile && (profile.role === 'super_admin' || profile.jabatan_admin));

  return (
    <header className="min-h-16 sm:h-20 bg-white border-b border-gray-200 px-4 sm:px-10 py-2 sm:py-0 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      <div className="min-w-0 flex-1">
        <h2 className="text-xs sm:text-base font-bold text-gray-800 truncate">
          Sistem Informasi Manajemen Bimas Islam
        </h2>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] sm:text-xs text-gray-500 truncate">
            Kantor Kementerian Agama Kabupaten Pohuwato
          </p>
          {hasDualRole && (
            <span className="md:hidden inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              {getModeLabel(activeMode)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Indikator / Switcher Mode Aktif jika punya peran ganda */}
        {hasDualRole && (
          <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <span className="px-3 py-1 text-gray-500">Mode:</span>
            <span className="px-3 py-1 bg-white text-emerald-800 rounded-lg shadow-xs">
              {getModeLabel(activeMode)}
            </span>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-md border-2 border-emerald-200 transition focus:outline-none overflow-hidden"
            title="Profil Pengguna"
          >
            {profile?.foto_url ? (
              <img src={profile.foto_url} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <span>{inisial}</span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 animate-fade-in">
              <div className="px-4 pb-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-base sm:text-lg overflow-hidden shrink-0 border border-emerald-300">
                  {profile?.foto_url ? (
                    <img src={profile.foto_url} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <span>{inisial}</span>
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{profile?.nama_lengkap || 'Pengguna'}</h4>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{profile?.email || profile?.nip}</p>
                </div>
              </div>

              {/* MENU ALIH PERAN (ROLE SWITCHER) */}
              {hasDualRole && (
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Alih Peran Mode Akses:</p>
                  <div className="space-y-1">
                    {profile.role === 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('super_admin')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${activeMode === 'super_admin' ? 'bg-purple-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                      >
                        <span>👑 Super Admin</span> {activeMode === 'super_admin' && '✓'}
                      </button>
                    )}
                    {profile.jabatan_admin === 'admin_bimas' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('admin_bimas')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${activeMode === 'admin_bimas' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                      >
                        <span>🛡️ Admin Bimas Islam</span> {activeMode === 'admin_bimas' && '✓'}
                      </button>
                    )}
                    {profile.jabatan_admin === 'admin_kua' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('admin_kua')}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${activeMode === 'admin_kua' ? 'bg-amber-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                      >
                        <span>🕌 Admin KUA</span> {activeMode === 'admin_kua' && '✓'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('pegawai')}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${activeMode === 'pegawai' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                    >
                      <span>👤 Mode Pegawai Pribadi</span> {activeMode === 'pegawai' && '✓'}
                    </button>
                  </div>
                </div>
              )}

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); router.push('/akun'); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition"
                >
                  <span>⚙️</span> Manajemen Akun & Sandi
                </button>
              </div>

              <div className="border-t border-gray-100 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition"
                >
                  <span>🚪</span> Keluar Sistem
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}