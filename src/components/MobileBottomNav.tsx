'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active: boolean;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  onMoreClick: () => void;
  moreOpen: boolean;
}

export default function MobileBottomNav({ items, onMoreClick, moreOpen }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navigasi Mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#062e21] text-emerald-100 border-t border-emerald-800/80 shadow-2xl select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid grid-cols-${items.length + 1} items-center px-2 py-1.5 gap-1.5`}>
        {items.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
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
          onClick={onMoreClick}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition ${
            moreOpen
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/40'
          }`}
        >
          <Menu className="w-5 h-5 leading-none mb-1" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
