'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CollapsibleMenu } from './LayananPublikMenu';
import type { MenuKey } from '../hooks/useSidebar';

interface ManajemenKuaMenuProps {
  onItemClick?: () => void;
  pathname: string;
  activeMode: string;
  kuaLabel: string;
  openMenus: { manajemen: boolean };
  toggleMenu: (key: MenuKey) => void;
  handleOpenProfilKua: (onItemClick?: () => void) => void;
}

const isAdminKua = (activeMode: string) => activeMode === 'admin_kua';

export function ManajemenKuaMenu({
  onItemClick,
  pathname,
  activeMode,
  kuaLabel,
  openMenus,
  toggleMenu,
  handleOpenProfilKua,
}: ManajemenKuaMenuProps) {
  if (!isAdminKua(activeMode)) return null;

  return (
    <CollapsibleMenu
      title="Manajemen"
      icon={<Settings className="w-4 h-4" />}
      open={openMenus.manajemen}
      onToggle={() => toggleMenu('manajemen')}
      pathname={pathname}
    >
      <Link
        href="/admin/master?section=profil_kantor"
        onClick={() => handleOpenProfilKua(onItemClick)}
        className={`block px-3 py-2 rounded-lg text-xs transition ${
          pathname === '/admin/master'
            ? 'bg-emerald-600 text-white font-bold shadow-md'
            : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
        }`}
      >
        • Profil KUA {kuaLabel ? `(${kuaLabel})` : ''}
      </Link>
    </CollapsibleMenu>
  );
}