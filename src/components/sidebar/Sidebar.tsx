'use client';

import { Suspense } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNav } from './MobileNav';
import { MoreDrawer } from './MoreDrawer';

export function SidebarContent() {
  return (
    <>
      <DesktopSidebar />
      <MobileNav />
      <MoreDrawer onClose={() => {}} />
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarContent />
    </Suspense>
  );
}

export default Sidebar;