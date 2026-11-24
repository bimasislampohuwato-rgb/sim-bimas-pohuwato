'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface MenuItemProps {
  onItemClick?: () => void;
  pathname: string;
}

export function DashboardMenu({ onItemClick, pathname }: MenuItemProps) {
  return (
    <Link
      href="/pegawai"
      onClick={onItemClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
        pathname === '/pegawai'
          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
          : 'text-emerald-200/80 hover:bg-emerald-800/40 hover:text-white'
      }`}
    >
      <BarChart3 className="w-4 h-4" />
      <span>Dashboard Utama</span>
    </Link>
  );
}