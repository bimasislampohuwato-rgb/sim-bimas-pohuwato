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
  const [moreOpen, setMoreOpen] = useState(false);

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

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const isPegawaiMode = activeMode === 'pegawai';
  const isAdminKua = activeMode === 'admin_kua';
  const isAdminBimas = activeMode === 'admin_bimas';
  const isSuperAdmin = activeMode === 'super_admin';

  const renderMenuItems = (onItemClick?: () => void) => {
    if (loadingRole) {
      return (
        <div className="px-4 py-6 text-xs text-emerald-400/70 text-center">
          Menyesuaikan hak akses...
        </div>
      );
    }

    return (
      <>
        {/* DASHBOARD UTAMA */}
        {!isPegawaiMode && (
          <Link
            href="/pegawai"
            onClick={onItemClick}
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
              type="button"
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
                  onClick={onItemClick}
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
              type="button"
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
                <a href="#" onClick={onItemClick} className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Buku Nikah</a>
                <a href="#" onClick={onItemClick} className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Blangko N</a>
                <a href="#" onClick={onItemClick} className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Permohonan Blangko NB</a>
              </div>
            )}
          </div>
        )}

        {/* KEPEGAWAIAN */}
        <div className={isPegawaiMode ? '' : 'pt-2'}>
          <button
            type="button"
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
                onClick={onItemClick}
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
              type="button"
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
                <a href="#" onClick={onItemClick} className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition">• Masjid & Mushalla</a>
              </div>
            )}
          </div>
        )}

        {/* MANAJEMEN (Khusus Super Admin) */}
        {isSuperAdmin && (
          <div className="pt-2">
            <button
              type="button"
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
                  onClick={onItemClick}
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
                  onClick={onItemClick}
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
                  onClick={onItemClick}
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
    );
  };

  // 3 Menu Utama untuk Bottom Nav di HP + 1 tombol More
  const primaryMobileItems = isPegawaiMode
    ? [
        {
          label: 'Profil Saya',
          href: '/pegawai',
          icon: '🪪',
          active: pathname.startsWith('/pegawai'),
        },
        {
          label: 'Akun',
          href: '/akun',
          icon: '⚙️',
          active: pathname === '/akun',
        },
        {
          label: 'Bantuan',
          href: '/pegawai',
          icon: '📋',
          active: false,
        },
      ]
    : [
        {
          label: 'Dashboard',
          href: '/pegawai',
          icon: '📊',
          active: pathname === '/pegawai',
        },
        {
          label: isSuperAdmin || isAdminBimas ? 'PTSP' : 'Pegawai',
          href: isSuperAdmin || isAdminBimas ? '/admin/ptsp' : '/pegawai',
          icon: isSuperAdmin || isAdminBimas ? '📄' : '👥',
          active: pathname.startsWith('/admin/ptsp'),
        },
        {
          label: 'Akun',
          href: '/akun',
          icon: '👤',
          active: pathname === '/akun',
        },
      ];

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-72 bg-[#062e21] text-emerald-100 flex-col h-screen sticky top-0 border-r border-emerald-900/50 shadow-xl select-none font-sans shrink-0">
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
          {renderMenuItems()}
        </div>

        {/* FOOTER SIDEBAR */}
        <div className="p-4 border-t border-emerald-900/60 bg-[#042217]/40 text-center">
          <p className="text-[10px] text-emerald-400/70 font-medium">
            SIM Bimas Islam Kab. Pohuwato <br /> © 2026 Kemenag RI
          </p>
        </div>
      </aside>

      {/* BOTTOM NAVIGATION BAR MOBILE (< md) */}
      <nav
        aria-label="Navigasi Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#062e21] text-emerald-100 border-t border-emerald-800/80 shadow-2xl select-none"
      >
        <div className="grid grid-cols-4 items-center px-1 py-1.5">
          {primaryMobileItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition ${
                item.active
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/40'
              }`}
            >
              <span className="text-base leading-none mb-1">{item.icon}</span>
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition ${
              moreOpen
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            <span className="text-base leading-none mb-1">☰</span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* DRAWER "MORE" UNTUK MENU LENGKAP DI HP */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/55 backdrop-blur-xs">
          <div
            className="flex-1"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-[#062e21] text-emerald-100 rounded-t-3xl border-t border-emerald-700/60 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-900/70 bg-[#042217]/70 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-base overflow-hidden shrink-0 border border-emerald-500/30">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span>🕌</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">Semua Menu</h3>
                  <p className="text-[11px] text-emerald-300/80 truncate">
                    SIM Bimas Islam • Kemenag Pohuwato
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center text-sm shrink-0"
                aria-label="Tutup menu"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
              {renderMenuItems(() => setMoreOpen(false))}
            </div>

            <div className="px-5 py-3 border-t border-emerald-900/70 bg-[#042217]/50 text-center">
              <p className="text-[10px] text-emerald-400/70">
                © 2026 Kemenag Kab. Pohuwato
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}