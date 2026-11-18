'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Sidebar() {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState('');
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [loadingRole, setLoadingRole] = useState(true);

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    layananPublik: true,
    layananInternal: false,
    kepegawaian: true,
    dataKebimasislaman: false,
    manajemen: true,
  });

  useEffect(() => {
    async function initSidebar() {
      // 1. Muat Logo Instansi
      const { data: logoData } = await supabase
        .from('app_settings')
        .select('value_text')
        .eq('key_name', 'logo_bimas_url')
        .single();
      if (logoData && logoData.value_text) {
        setLogoUrl(logoData.value_text);
      }

      // 2. Cek Mode Akses Aktif
      const savedMode = localStorage.getItem('active_mode');
      if (savedMode) {
        setActiveMode(savedMode);
        setLoadingRole(false);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role, jabatan_admin')
            .eq('id', user.id)
            .single();

          if (prof) {
            const defaultMode =
              prof.role === 'super_admin'
                ? 'super_admin'
                : prof.jabatan_admin || 'pegawai';
            setActiveMode(defaultMode);
          }
        }
        setLoadingRole(false);
      }
    }

    initSidebar();
  }, []);

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const isPegawaiMode = activeMode === 'pegawai';
  const isAdminKua = activeMode === 'admin_kua';
  const isAdminBimas = activeMode === 'admin_bimas';
  const isSuperAdmin = activeMode === 'super_admin';

  return (
    <aside className="w-72 bg-[#062e21] text-emerald-100 flex flex-col h-screen sticky top-0 border-r border-emerald-900/50 shadow-xl select-none font-sans shrink-0">
      
      {/* HEADER / LOGO INSTANSI DINAMIS */}
      <div className="p-5 border-b border-emerald-900/60 bg-[#042217]/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-lg shadow-inner border border-emerald-500/30 overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span>🕌</span>
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <h3 className="text-sm font-bold text-white truncate">
              SIM Bimas Islam
            </h3>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
              KEMENAG POHUWATO
            </span>
          </div>
        </div>
      </div>

      {/* MENU NAVIGASI UTAMA */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {loadingRole ? (
          <div className="px-4 py-6 text-xs text-emerald-400/70 text-center">
            Menyesuaikan hak akses...
          </div>
        ) : (
          <>
            {/* DASHBOARD UTAMA */}
            {!isPegawaiMode && (
              <Link
                href="/pegawai"
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  pathname === '/pegawai'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                    : 'text-emerald-200/80 hover:bg-emerald-800/40 hover:text-white'
                }`}
              >
                <span className="text-base">📊</span>
                <span>Dashboard Utama</span>
              </Link>
            )}

            {/* LAYANAN PUBLIK (Khusus Super Admin & Admin Bimas) */}
            {(isSuperAdmin || isAdminBimas) && (
              <div className="pt-2">
                <button
                  onClick={() => toggleMenu('layananPublik')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📄</span>
                    <span>Layanan Publik (PTSP)</span>
                  </div>
                  <span className={`text-[10px] transition-transform ${openMenus.layananPublik ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openMenus.layananPublik && (
                  <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
                    <Link
                      href="/admin/ptsp"
                      className={`block px-3 py-2 rounded-lg text-xs transition ${
                        pathname === '/admin/ptsp'
                          ? 'bg-emerald-600 text-white font-bold shadow-md'
                          : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                      }`}
                    >
                      • Verifikasi Permohonan
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* LAYANAN INTERNAL KUA */}
            {(isSuperAdmin || isAdminBimas || isAdminKua) && (
              <div className="pt-2">
                <button
                  onClick={() => toggleMenu('layananInternal')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🏛️</span>
                    <span>Layanan Internal (KUA)</span>
                  </div>
                  <span className={`text-[10px] transition-transform ${openMenus.layananInternal ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openMenus.layananInternal && (
                  <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
                    <a href="#" className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Buku Nikah</a>
                    <a href="#" className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Blangko N</a>
                    <a href="#" className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Blangko NB</a>
                  </div>
                )}
              </div>
            )}

            {/* KEPEGAWAIAN */}
            <div className={isPegawaiMode ? '' : 'pt-2'}>
              <button
                onClick={() => toggleMenu('kepegawaian')}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{isPegawaiMode ? '🪪' : '👥'}</span>
                  <span>Kepegawaian</span>
                </div>
                <span className={`text-[10px] transition-transform ${openMenus.kepegawaian ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {openMenus.kepegawaian && (
                <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
                  <Link
                    href="/pegawai"
                    className={`block px-3 py-2 rounded-lg text-xs transition ${
                      pathname.startsWith('/pegawai')
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                        : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                    }`}
                  >
                    {isPegawaiMode
                      ? '• Profil Saya'
                      : isAdminKua
                      ? '• Daftar Pegawai KUA'
                      : '• Daftar Pegawai'}
                  </Link>
                </div>
              )}
            </div>

            {/* DATA KEBIMASISLAMAN */}
            {(isSuperAdmin || isAdminBimas || isAdminKua) && (
              <div className="pt-2">
                <button
                  onClick={() => toggleMenu('dataKebimasislaman')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📖</span>
                    <span>Data Kebimasislaman</span>
                  </div>
                  <span className={`text-[10px] transition-transform ${openMenus.dataKebimasislaman ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openMenus.dataKebimasislaman && (
                  <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
                    <a href="#" className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Masjid & Mushalla</a>
                  </div>
                )}
              </div>
            )}

            {/* MANAJEMEN (Khusus Super Admin) */}
            {isSuperAdmin && (
              <div className="pt-2">
                <button
                  onClick={() => toggleMenu('manajemen')}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">⚙️</span>
                    <span>Manajemen</span>
                  </div>
                  <span className={`text-[10px] transition-transform ${openMenus.manajemen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openMenus.manajemen && (
                  <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
                    <Link
                      href="/admin/ptsp/layanan"
                      className={`block px-3 py-2 rounded-lg text-xs transition ${
                        pathname === '/admin/ptsp/layanan'
                          ? 'bg-emerald-600 text-white font-bold shadow-md'
                          : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                      }`}
                    >
                      • Kelola Layanan PTSP
                    </Link>
                    <Link
                      href="/admin/users"
                      className={`block px-3 py-2 rounded-lg text-xs transition ${
                        pathname === '/admin/users'
                          ? 'bg-emerald-600 text-white font-bold shadow-md'
                          : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                      }`}
                    >
                      • Akun Pengguna
                    </Link>
                    <Link
                      href="/admin/master"
                      className={`block px-3 py-2 rounded-lg text-xs transition ${
                        pathname === '/admin/master'
                          ? 'bg-emerald-600 text-white font-bold shadow-md'
                          : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                      }`}
                    >
                      • Master Data Utama
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER SIDEBAR */}
      <div className="p-4 border-t border-emerald-900/60 bg-[#042217]/40 text-center">
        <p className="text-[10px] text-emerald-400/70 font-medium">
          SIM Bimas Islam Kab. Pohuwato <br /> © 2026 Kemenag RI
        </p>
      </div>

    </aside>
  );
}