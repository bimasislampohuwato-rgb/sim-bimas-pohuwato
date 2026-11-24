'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface KuaProfileData {
  id: string;
  namaKua: string | null;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  kepalaKua: string | null;
  kepalaKuaNip: string | null;
  kecamatanId: string | null;
  createdAt?: string;
  updatedAt?: string;
  kecamatan?: {
    namaKecamatan: string | null;
    kodeKecamatan: string | null;
  } | null;
}

export interface KuaProfilPageData {
  kuaProfile: KuaProfileData | null;
  riwayatKepala: Array<{
    id: number;
    nama: string;
    periode: string;
    nip: string;
  }>;
}

export async function getKuaProfilPageData(): Promise<{ data: KuaProfilPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: kuaProfile, error } = await supabase
      .from('KuaProfile')
      .select('*, kecamatan:MasterKecamatan(namaKecamatan, kodeKecamatan)')
      .maybeSingle();

    if (error) throw error;

    // Static riwayat kepala KUA (could be moved to DB later)
    const riwayatKepala = [
      { id: 1, nama: 'H. Rais Abaidata, S.Ag, M.H', periode: '2023 - Sekarang', nip: '197501012000031002' },
      { id: 2, nama: 'Drs. H. Mohamad Randa', periode: '2019 - 2023', nip: '197005121998031001' },
      { id: 3, nama: 'Arfan Adam, S.Hi', periode: '2015 - 2019', nip: '198003152005011004' },
    ];

    return {
      data: {
        kuaProfile: kuaProfile as KuaProfileData | null,
        riwayatKepala,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data profil KUA' };
  }
}

export async function updateKuaProfil(id: string, payload: {
  namaKua?: string;
  alamat?: string;
  telepon?: string | null;
  email?: string | null;
  website?: string | null;
  kepalaKua?: string | null;
  kepalaKuaNip?: string | null;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('KuaProfile')
      .update({ ...payload, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/kua/profil');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}