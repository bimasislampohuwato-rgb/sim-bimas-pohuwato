'use client';

import { useState } from 'react';

interface MenuGroupProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function MenuGroup({ title, icon, children, defaultOpen = false }: MenuGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-800/30 transition"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-base">{icon}</span>}
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
