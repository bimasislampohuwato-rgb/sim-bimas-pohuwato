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

interface MoreDrawerProps {
  onClose: () => void;
}

export function MoreDrawer({ onClose }: MoreDrawerProps) {
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
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/55 backdrop-blur-xs">
        <div className="flex-1" onClick={onClose} aria-hidden="true" />
        <div className="bg-[#062e21] text-emerald-100 rounded-t-3xl border-t border-emerald-700/60 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-900/70 bg-[#042217]/70 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-base overflow-hidden shrink-0 border border-emerald-500/30">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  '🕌'
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
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center text-sm shrink-0"
              aria-label="Tutup menu"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
            <div className="px-4 py-6 text-xs text-emerald-400/70 text-center">Menyesuaikan hak akses...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/55 backdrop-blur-xs">
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
      <div className="bg-[#062e21] text-emerald-100 rounded-t-3xl border-t border-emerald-700/60 shadow-2xl max-h-[82vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-900/70 bg-[#042217]/70 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-base overflow-hidden shrink-0 border border-emerald-500/30">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                '🕌'
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
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 font-bold flex items-center justify-center text-sm shrink-0"
            aria-label="Tutup menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          {/* DASHBOARD UTAMA */}
          {!isPegawaiMode && <DashboardMenu onItemClick={onClose} pathname={pathname} />}

          {/* LAYANAN PUBLIK (Khusus Super Admin & Admin Bimas) */}
          {(isSuperAdmin || isAdminBimas) && (
            <LayananPublikMenu
              onItemClick={onClose}
              pathname={pathname}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
            />
          )}

          {/* LAYANAN INTERNAL KUA */}
          {(isSuperAdmin || isAdminBimas || isAdminKua) && (
            <LayananInternalMenu
              onItemClick={onClose}
              pathname={pathname}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
            />
          )}

          {/* KEPEGAWAIAN */}
          <KepegawaianMenu
            onItemClick={onClose}
            pathname={pathname}
            activeMode={activeMode}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />

          {/* DATA KEBIMASISLAMAN */}
          <KebimasislamanMenu
            onItemClick={onClose}
            pathname={pathname}
            activeMode={activeMode}
            activeSubMenu={activeSubMenu}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
            handleSelectNestedMenu={handleSelectNestedMenu}
          />

          {/* MANAJEMEN PROFIL KUA (Khusus Admin KUA) */}
          <ManajemenKuaMenu
            onItemClick={onClose}
            pathname={pathname}
            activeMode={activeMode}
            kuaLabel={kuaLabel}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
            handleOpenProfilKua={handleOpenProfilKua}
          />

          {/* MANAJEMEN (Khusus Super Admin) */}
          <ManajemenSuperAdminMenu
            onItemClick={onClose}
            pathname={pathname}
            activeMode={activeMode}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        </div>

        <div className="px-5 py-3 border-t border-emerald-900/70 bg-[#042217]/50 text-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <p className="text-[10px] text-emerald-400/70">© 2026 Kemenag Kab. Pohuwato</p>
        </div>
      </div>
    </div>
  );
}