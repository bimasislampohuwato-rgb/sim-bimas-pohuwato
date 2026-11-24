'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PegawaiItem {
  id: string;
  nip: string | null;
  nama_lengkap: string | null;
  nama_tanpa_gelar: string | null;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  nik: string | null;
  jabatan: string | null;
  unit_kerja: string | null;
  no_hp: string | null;
  nomorHp: string | null;
  email: string | null;
  foto_url: string | null;
  created_at?: string;
  updated_at?: string;
  nama?: string;
}

export interface UserProfile {
  id: string;
  role: string | null;
  jabatan_admin: string | null;
  kua_wilayah: string | null;
  nip: string | null;
  email: string | null;
}

export interface PegawaiPageData {
  pegawaiList: PegawaiItem[];
  currentUser: UserProfile | null;
  activeMode: string;
}

export async function getPegawaiPageData(): Promise<{ data: PegawaiPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      return { data: null, error: 'Profile not found' };
    }

    const savedMode = 'pegawai'; // default, can be enhanced with localStorage sync via client
    const mode = profile.role === 'super_admin' ? 'super_admin' : profile.jabatan_admin || 'pegawai';

    let query = supabase.from('pegawai').select('*').order('nama_lengkap', { ascending: true });

    if (mode === 'pegawai') {
      if (profile.nip) {
        query = query.eq('nip', profile.nip);
      } else {
        query = query.eq('email', profile.email || '');
      }
    } else if (mode === 'admin_kua') {
      if (profile.kua_wilayah) {
        query = query.eq('unit_kerja', profile.kua_wilayah);
      }
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        pegawaiList: (data || []) as PegawaiItem[],
        currentUser: {
          id: profile.id,
          role: profile.role,
          jabatan_admin: profile.jabatan_admin,
          kua_wilayah: profile.kua_wilayah,
          nip: profile.nip,
          email: profile.email,
        },
        activeMode: mode,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data' };
  }
}

export async function deletePegawai(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('pegawai').delete().eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/pegawai');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}