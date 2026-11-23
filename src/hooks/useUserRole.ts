'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type UserRole = 'pegawai' | 'admin_kua' | 'admin_bimas' | 'super_admin';

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('pegawai');
  const [kuaLabel, setKuaLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const savedMode = localStorage.getItem('active_mode');
        if (savedMode) {
          setRole(savedMode as UserRole);
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
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
            setRole(defaultMode as UserRole);
            const profKua = prof.nama_kua || prof.unit_kerja || '';
            if (profKua) setKuaLabel(profKua);
          }
        }
      } catch (e) {
        console.error('Gagal memuat role:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return { role, kuaLabel, loading, setRole };
}
