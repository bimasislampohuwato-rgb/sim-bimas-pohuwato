'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { MenuKey } from '../hooks/useSidebar';

interface CollapsibleMenuProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  pathname: string;
}

export function CollapsibleMenu({ title, icon, open, onToggle, children, pathname }: CollapsibleMenuProps) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </div>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && (
        <div className="ml-4 pl-4 mt-1 border-l border-emerald-800/80 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface LayananPublikMenuProps {
  onItemClick?: () => void;
  pathname: string;
  openMenus: { layananPublik: boolean };
  toggleMenu: (key: MenuKey) => void;
}

export function LayananPublikMenu({ onItemClick, pathname, openMenus, toggleMenu }: LayananPublikMenuProps) {
  return (
    <CollapsibleMenu
      title="Layanan Publik (PTSP)"
      icon={<FileText className="w-4 h-4" />}
      open={openMenus.layananPublik}
      onToggle={() => toggleMenu('layananPublik')}
      pathname={pathname}
    >
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
    </CollapsibleMenu>
  );
}