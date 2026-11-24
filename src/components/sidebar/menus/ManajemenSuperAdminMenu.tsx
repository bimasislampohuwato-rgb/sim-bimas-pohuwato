'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CollapsibleMenu } from './LayananPublikMenu';
import type { MenuKey } from '../hooks/useSidebar';

interface ManajemenSuperAdminMenuProps {
  onItemClick?: () => void;
  pathname: string;
  activeMode: string;
  openMenus: { manajemen: boolean };
  toggleMenu: (key: MenuKey) => void;
}

const isSuperAdmin = (activeMode: string) => activeMode === 'super_admin';

export function ManajemenSuperAdminMenu({
  onItemClick,
  pathname,
  activeMode,
  openMenus,
  toggleMenu,
}: ManajemenSuperAdminMenuProps) {
  if (!isSuperAdmin(activeMode)) return null;

  return (
    <CollapsibleMenu
      title="Manajemen"
      icon={<Settings className="w-4 h-4" />}
      open={openMenus.manajemen}
      onToggle={() => toggleMenu('manajemen')}
      pathname={pathname}
    >
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
    </CollapsibleMenu>
  );
}