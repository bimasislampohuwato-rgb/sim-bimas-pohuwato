'use client';

import Link from 'next/link';
import { BarChart3, FileText, Building2, Users } from 'lucide-react';
import { useSidebar } from './hooks/useSidebar';

interface MobileNavProps {
  onItemClick?: () => void;
}

export function MobileNav({ onItemClick }: MobileNavProps) {
  const { activeMode, moreOpen, setMoreOpen, pathname } = useSidebar();

  const isPegawaiMode = activeMode === 'pegawai';
  const isSuperAdmin = activeMode === 'super_admin';
  const isAdminBimas = activeMode === 'admin_bimas';
  const isAdminKua = activeMode === 'admin_kua';

  const primaryMobileItems = isPegawaiMode
    ? [
        {
          label: 'Profil Saya',
          href: '/pegawai',
          icon: <Users className="w-5 h-5" />,
          active: pathname.startsWith('/pegawai'),
        },
      ]
    : [
        {
          label: 'Dashboard',
          href: '/pegawai',
          icon: <BarChart3 className="w-5 h-5" />,
          active: pathname === '/pegawai',
        },
        {
          label: isSuperAdmin || isAdminBimas ? 'PTSP' : 'Profil KUA',
          href: isSuperAdmin || isAdminBimas ? '/admin/ptsp' : '/admin/master?section=profil_kantor',
          icon: isSuperAdmin || isAdminBimas ? <FileText className="w-5 h-5" /> : <Building2 className="w-5 h-5" />,
          active: pathname.startsWith('/admin/ptsp') || (isAdminKua && pathname === '/admin/master'),
        },
      ];

  const mobileGridColsClass = isPegawaiMode ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <nav
      aria-label="Navigasi Mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#062e21] text-emerald-100 border-t border-emerald-800/80 shadow-2xl select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid ${mobileGridColsClass} items-center px-2 py-1.5 gap-1.5`}>
        {primaryMobileItems.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            onClick={onItemClick}
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
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-semibold transition ${
            moreOpen
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/40'
          }`}
        >
          <span className="text-base leading-none mb-1">⋮</span>
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}