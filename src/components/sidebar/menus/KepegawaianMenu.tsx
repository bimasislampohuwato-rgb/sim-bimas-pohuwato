'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CollapsibleMenu } from './LayananPublikMenu';
import type { MenuKey } from '../hooks/useSidebar';

interface KepegawaianMenuProps {
  onItemClick?: () => void;
  pathname: string;
  activeMode: string;
  openMenus: { kepegawaian: boolean };
  toggleMenu: (key: MenuKey) => void;
}

const isPegawaiMode = (activeMode: string) => activeMode === 'pegawai';
const isAdminKua = (activeMode: string) => activeMode === 'admin_kua';

export function KepegawaianMenu({ onItemClick, pathname, activeMode, openMenus, toggleMenu }: KepegawaianMenuProps) {
  return (
    <div className={isPegawaiMode(activeMode) ? '' : 'pt-2'}>
      <CollapsibleMenu
        title="Kepegawaian"
        icon={<Users className="w-4 h-4" />}
        open={openMenus.kepegawaian}
        onToggle={() => toggleMenu('kepegawaian')}
        pathname={pathname}
      >
        <Link
          href="/pegawai"
          onClick={onItemClick}
          className={`block px-3 py-2 rounded-lg text-xs transition ${
            pathname.startsWith('/pegawai')
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
              : 'text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white'
          }`}
        >
          {isPegawaiMode(activeMode)
            ? '• Profil Saya'
            : isAdminKua(activeMode)
            ? '• Daftar Pegawai KUA'
            : '• Daftar Pegawai'}
        </Link>
      </CollapsibleMenu>
    </div>
  );
}