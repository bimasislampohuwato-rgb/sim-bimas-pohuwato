'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CollapsibleMenu } from './LayananPublikMenu';
import { MASJID_NESTED_MENUS, isMasjidMenuKey, type MasjidMenuKey } from '../hooks/useSidebar';
import type { MenuKey } from '../hooks/useSidebar';

interface KebimasislamanMenuProps {
  onItemClick?: () => void;
  pathname: string;
  activeMode: string;
  activeSubMenu: MasjidMenuKey;
  openMenus: { dataKebimasislaman: boolean; masjidNested: boolean };
  toggleMenu: (key: MenuKey) => void;
  handleSelectNestedMenu: (key: MasjidMenuKey, onItemClick?: () => void) => void;
}

const isSuperAdmin = (activeMode: string) => activeMode === 'super_admin';
const isAdminBimas = (activeMode: string) => activeMode === 'admin_bimas';
const isAdminKua = (activeMode: string) => activeMode === 'admin_kua';

export function KebimasislamanMenu({
  onItemClick,
  pathname,
  activeMode,
  activeSubMenu,
  openMenus,
  toggleMenu,
  handleSelectNestedMenu,
}: KebimasislamanMenuProps) {
  const hasAccess = isSuperAdmin(activeMode) || isAdminBimas(activeMode) || isAdminKua(activeMode);

  if (!hasAccess) return null;

  return (
    <CollapsibleMenu
      title="Data Kebimasislaman"
      icon={<BookOpen className="w-4 h-4" />}
      open={openMenus.dataKebimasislaman}
      onToggle={() => toggleMenu('dataKebimasislaman')}
      pathname={pathname}
    >
      <button
        type="button"
        onClick={() => toggleMenu('masjidNested')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
          pathname.startsWith('/admin/kebimasislaman')
            ? 'bg-emerald-900/70 text-white'
            : 'text-emerald-200/90 hover:bg-emerald-800/40 hover:text-white'
        }`}
      >
        <span>• Masjid & Mushalla</span>
        <span className={`text-[9px] transition-transform ${openMenus.masjidNested ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {openMenus.masjidNested && (
        <div className="ml-3 pl-3 border-l border-emerald-700/60 space-y-1">
          {MASJID_NESTED_MENUS.map((sub) => {
            const isActive =
              pathname.startsWith('/admin/kebimasislaman') && activeSubMenu === sub.key;
            return (
              <Link
                key={sub.key}
                href={`/admin/kebimasislaman?menu=${sub.key}`}
                onClick={() => handleSelectNestedMenu(sub.key, onItemClick)}
                className={`block px-2.5 py-1.5 rounded-lg text-[11px] transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
                }`}
              >
                ◦ {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </CollapsibleMenu>
  );
}