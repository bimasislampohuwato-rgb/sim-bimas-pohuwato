'use client';

import { Building2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CollapsibleMenu } from './LayananPublikMenu';
import type { MenuKey } from '../hooks/useSidebar';

interface LayananInternalMenuProps {
  onItemClick?: () => void;
  pathname: string;
  openMenus: { layananInternal: boolean };
  toggleMenu: (key: MenuKey) => void;
}

export function LayananInternalMenu({ onItemClick, pathname, openMenus, toggleMenu }: LayananInternalMenuProps) {
  return (
    <CollapsibleMenu
      title="Layanan Internal (KUA)"
      icon={<Building2 className="w-4 h-4" />}
      open={openMenus.layananInternal}
      onToggle={() => toggleMenu('layananInternal')}
      pathname={pathname}
    >
      <a
        href="#"
        onClick={onItemClick}
        className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition"
      >
        • Permohonan Buku Nikah
      </a>
      <a
        href="#"
        onClick={onItemClick}
        className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition"
      >
        • Permohonan Blangko N
      </a>
      <a
        href="#"
        onClick={onItemClick}
        className="block px-3 py-2 rounded-lg text-xs text-emerald-300/80 hover:bg-emerald-800/40 hover:text-white transition"
      >
        • Permohonan Blangko NB
      </a>
    </CollapsibleMenu>
  );
}