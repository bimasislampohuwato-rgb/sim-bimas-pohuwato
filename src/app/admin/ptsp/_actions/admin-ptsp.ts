'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface PtspPermohonanItem {
  id: string;
  nomor_tiket: string;
  nama_pemohon: string;
  nik_pemohon: string;
  no_hp: string;
  email: string | null;
  jenis_layanan: string;
  keterangan_permohonan: string;
  file_lampiran_url: string | null;
  status: string;
  catatan_admin: string | null;
  created_at: string;
  updated_at: string;
  petugas_ditunjuk: string | null;
  no_hp_petugas: string | null;
  link_surat_tugas: string | null;
  kecamatan: string | null;
}

export interface MasterLayananItem {
  nama_layanan: string;
}

export interface AdminPtspPageData {
  permohonanList: PtspPermohonanItem[];
  masterLayananList: string[];
}

export async function getAdminPtspPageData(): Promise<{ data: AdminPtspPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Unauthorized' };
    }

    const [permohonanRes, layananRes] = await Promise.all([
      supabase
        .from('ptsp_permohonan')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('ptsp_master_layanan')
        .select('nama_layanan')
        .order('nama_layanan', { ascending: true }),
    ]);

    if (permohonanRes.error) throw permohonanRes.error;

    const masterLayananList = layananRes.data
      ?.map((row: any) => row.nama_layanan)
      .filter((name: string) => Boolean(name && name.trim())) || [];

    return {
      data: {
        permohonanList: (permohonanRes.data || []) as PtspPermohonanItem[],
        masterLayananList,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data PTSP Admin' };
  }
}

export async function updateAdminPtspStatus(id: string, payload: {
  status?: string;
  catatan_admin?: string | null;
  petugas_ditunjuk?: string | null;
  no_hp_petugas?: string | null;
  link_surat_tugas?: string | null;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('ptsp_permohonan')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/ptsp');
    revalidatePath('/admin/ptsp');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}