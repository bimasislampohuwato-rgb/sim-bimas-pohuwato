'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const MASJID_NESTED_MENUS = [
  { key: 'masjid', label: 'Data Masjid (SIMAS)' },
  { key: 'sdm_masjid', label: 'SDM Masjid' },
  { key: 'arah_kiblat', label: 'Arah Kiblat' },
] as const;

type MasjidMenuKey = (typeof MASJID_NESTED_MENUS)[number]['key'];

function isMasjidMenuKey(val: string | null): val is MasjidMenuKey {
  return val === 'masjid' || val === 'sdm_masjid' || val === 'arah_kiblat';
}

export type MenuKey = 'layananPublik' | 'layananInternal' | 'kepegawaian' | 'dataKebimasislaman' | 'masjidNested' | 'manajemen';

export interface SidebarState {
  logoUrl: string;
  activeMode: string;
  kuaLabel: string;
  activeSubMenu: MasjidMenuKey;
  loadingRole: boolean;
  moreOpen: boolean;
  pathname: string;
  openMenus: {
    layananPublik: boolean;
    layananInternal: boolean;
    kepegawaian: boolean;
    dataKebimasislaman: boolean;
    masjidNested: boolean;
    manajemen: boolean;
  };
}

export interface SidebarActions {
  setActiveMode: (mode: string) => void;
  setMoreOpen: (open: boolean) => void;
  setActiveSubMenu: (key: MasjidMenuKey) => void;
  toggleMenu: (menuKey: MenuKey) => void;
  handleSelectNestedMenu: (menuKey: MasjidMenuKey, onItemClick?: () => void) => void;
  handleOpenProfilKua: (onItemClick?: () => void) => void;
}

export function useSidebar(): SidebarState & SidebarActions {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [logoUrl, setLogoUrl] = useState('');
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [kuaLabel, setKuaLabel] = useState<string>('');
  const [activeSubMenu, setActiveSubMenu] = useState<MasjidMenuKey>('masjid');
  const [loadingRole, setLoadingRole] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<{
    layananPublik: boolean;
    layananInternal: boolean;
    kepegawaian: boolean;
    dataKebimasislaman: boolean;
    masjidNested: boolean;
    manajemen: boolean;
  }>({
    layananPublik: true,
    layananInternal: false,
    kepegawaian: true,
    dataKebimasislaman: pathname.startsWith('/admin/kebimasislaman'),
    masjidNested: true,
    manajemen: true,
  });

  // Sync activeSubMenu from URL searchParams
  useEffect(() => {
    const queryMenu = searchParams?.get('menu') || null;
    if (isMasjidMenuKey(queryMenu)) {
      setActiveSubMenu(queryMenu);
      return;
    }
    if (typeof window !== 'undefined') {
      const winMenu = new URLSearchParams(window.location.search).get('menu');
      if (isMasjidMenuKey(winMenu)) {
        setActiveSubMenu(winMenu);
        return;
      }
    }
    if (pathname.startsWith('/admin/kebimasislaman')) {
      setActiveSubMenu('masjid');
    }
  }, [pathname, searchParams]);

  // Listen for cross-tab/window menu changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMenuSync = (ev: Event) => {
      const customEv = ev as CustomEvent<{ menu?: string }>;
      const nextMenu =
        customEv.detail?.menu || new URLSearchParams(window.location.search).get('menu');
      if (isMasjidMenuKey(nextMenu)) {
        setActiveSubMenu(nextMenu);
      }
    };
    window.addEventListener('kebimasislaman:menu-change', handleMenuSync);
    window.addEventListener('popstate', handleMenuSync);
    return () => {
      window.removeEventListener('kebimasislaman:menu-change', handleMenuSync);
      window.removeEventListener('popstate', handleMenuSync);
    };
  }, []);

  // Initialize sidebar data (logo, role, KUA)
  useEffect(() => {
    async function initSidebar() {
      const { data: logoData } = await supabase
        .from('app_settings')
        .select('value_text')
        .eq('key_name', 'logo_bimas_url')
        .single();
      if (logoData && logoData.value_text) {
        setLogoUrl(logoData.value_text);
      }

      try {
        const savedKec =
          localStorage.getItem('kuaKecamatan') || localStorage.getItem('kua_wilayah') || '';
        if (savedKec.trim()) {
          setKuaLabel(savedKec.trim());
        }
      } catch {
        // ignore storage errors
      }

      const savedMode = localStorage.getItem('active_mode');
      if (savedMode) {
        setActiveMode(savedMode);
        setLoadingRole(false);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role, jabatan_admin, nama_kua, unit_kerja')
            .eq('id', user.id)
            .single();

          if (prof) {
            const defaultMode =
              prof.role === 'super_admin'
                ? 'super_admin'
                : prof.jabatan_admin || 'pegawai';
            setActiveMode(defaultMode);
            const profKua = prof.nama_kua || prof.unit_kerja || '';
            if (profKua) setKuaLabel(profKua);
          }
        }
        setLoadingRole(false);
      }
    }

    initSidebar();
  }, []);

  // Auto-expand kebimasislaman menu on relevant paths
  useEffect(() => {
    setMoreOpen(false);
    if (pathname.startsWith('/admin/kebimasislaman')) {
      setOpenMenus((prev) => ({
        ...prev,
        dataKebimasislaman: true,
        masjidNested: true,
      }));
    }
  }, [pathname]);

  const toggleMenu = useCallback((menuKey: MenuKey) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  }, []);

  const handleSelectNestedMenu = useCallback(
    (menuKey: MasjidMenuKey, onItemClick?: () => void) => {
      setActiveSubMenu(menuKey);
      setOpenMenus((prev) => ({
        ...prev,
        dataKebimasislaman: true,
        masjidNested: true,
      }));
      if (typeof window !== 'undefined' && pathname === '/admin/kebimasislaman') {
        const url = new URL(window.location.href);
        url.searchParams.set('menu', menuKey);
        window.history.replaceState({}, '', url.toString());
        window.dispatchEvent(
          new CustomEvent('kebimasislaman:menu-change', { detail: { menu: menuKey } })
        );
      }
      onItemClick?.();
    },
    [pathname]
  );

  const handleOpenProfilKua = useCallback((onItemClick?: () => void) => {
    if (typeof window !== 'undefined' && pathname === '/admin/kebimasislaman') {
      window.dispatchEvent(new CustomEvent('kebimasislaman:open-profil-kua'));
    }
    onItemClick?.();
  }, [pathname]);

  return {
    // State
    logoUrl,
    activeMode,
    kuaLabel,
    activeSubMenu,
    loadingRole,
    moreOpen,
    pathname,
    openMenus,
    // Actions
    setActiveMode,
    setMoreOpen,
    setActiveSubMenu,
    toggleMenu,
    handleSelectNestedMenu,
    handleOpenProfilKua,
  };
}

export { MASJID_NESTED_MENUS, isMasjidMenuKey };
export type { MasjidMenuKey };