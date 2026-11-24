'use client';

import { BarChart3, FileText, Building2, Users, BookOpen, Settings } from 'lucide-react';
import {
  DashboardMenu,
  LayananPublikMenu,
  LayananInternalMenu,
  KepegawaianMenu,
  KebimasislamanMenu,
  ManajemenKuaMenu,
  ManajemenSuperAdminMenu,
} from './menus';
import { useSidebar } from './hooks/useSidebar';

interface DesktopSidebarProps {
  onItemClick?: () => void;
}

export function DesktopSidebar({ onItemClick }: DesktopSidebarProps) {
  const {
    logoUrl,
    activeMode,
    kuaLabel,
    activeSubMenu,
    loadingRole,
    openMenus,
    toggleMenu,
    handleSelectNestedMenu,
    handleOpenProfilKua,
  } = useSidebar();

  const pathname = window.location.pathname;

  const isPegawaiMode = activeMode === 'pegawai';
  const isAdminKua = activeMode === 'admin_kua';
  const isAdminBimas = activeMode === 'admin_bimas';
  const isSuperAdmin = activeMode === 'super_admin';

  if (loadingRole) {
    return (
      <aside className="hidden md:flex w-72 bg-[#062e21] text-emerald-100 flex-col h-screen sticky top-0 border-r border-emerald-900/50 shadow-xl select-none font-sans shrink-0">
        <div className="p-5 border-b border-emerald-900/60 bg-[#042217]/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-lg shadow-inner border border-emerald-500/30 overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                '🕌'
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <h3 className="text-sm font-bold text-white truncate">SIM Bimas Islam</h3>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                KEMENAG POHUWATO
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <div className="px-4 py-6 text-xs text-emerald-400/70 text-center">Menyesuaikan hak akses...</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-72 bg-[#062e21] text-emerald-100 flex-col h-screen sticky top-0 border-r border-emerald-900/50 shadow-xl select-none font-sans shrink-0">
      <div className="p-5 border-b border-emerald-900/60 bg-[#042217]/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-lg shadow-inner border border-emerald-500/30 overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              '🕌'
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <h3 className="text-sm font-bold text-white truncate">SIM Bimas Islam</h3>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
              KEMENAG POHUWATO
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {/* DASHBOARD UTAMA */}
        {!isPegawaiMode && <DashboardMenu onItemClick={onItemClick} pathname={pathname} />}

        {/* LAYANAN PUBLIK (Khusus Super Admin & Admin Bimas) */}
        {(isSuperAdmin || isAdminBimas) && (
          <LayananPublikMenu
            onItemClick={onItemClick}
            pathname={pathname}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        )}

        {/* LAYANAN INTERNAL KUA */}
        {(isSuperAdmin || isAdminBimas || isAdminKua) && (
          <LayananInternalMenu
            onItemClick={onItemClick}
            pathname={pathname}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        )}

        {/* KEPEGAWAIAN */}
        <KepegawaianMenu
          onItemClick={onItemClick}
          pathname={pathname}
          activeMode={activeMode}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
        />

        {/* DATA KEBIMASISLAMAN */}
        <KebimasislamanMenu
          onItemClick={onItemClick}
          pathname={pathname}
          activeMode={activeMode}
          activeSubMenu={activeSubMenu}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
          handleSelectNestedMenu={handleSelectNestedMenu}
        />

        {/* MANAJEMEN PROFIL KUA (Khusus Admin KUA) */}
        <ManajemenKuaMenu
          onItemClick={onItemClick}
          pathname={pathname}
          activeMode={activeMode}
          kuaLabel={kuaLabel}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
          handleOpenProfilKua={handleOpenProfilKua}
        />

        {/* MANAJEMEN (Khusus Super Admin) */}
        <ManajemenSuperAdminMenu
          onItemClick={onItemClick}
          pathname={pathname}
          activeMode={activeMode}
          openMenus={openMenus}
          toggleMenu={toggleMenu}
        />
      </div>

      <div className="p-4 border-t border-emerald-900/60 bg-[#042217]/40 text-center">
        <p className="text-[10px] text-emerald-400/70 font-medium">
          SIM Bimas Islam Kab. Pohuwato <br /> © 2026 Kemenag RI
        </p>
      </div>
    </aside>
  );
}