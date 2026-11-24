'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface MasterLayananItem {
  id: string;
  nama_layanan: string;
  deskripsi_persyaratan: string | null;
  waktu_pengerjaan: string | null;
  link_berkas_syarat: string | null;
  created_at?: string;
}

export interface PtspTambahPageData {
  layananList: MasterLayananItem[];
  logoUrl: string;
}

export async function getPtspTambahPageData(): Promise<{ data: PtspTambahPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const [layananRes, logoRes] = await Promise.all([
      supabase
        .from('ptsp_master_layanan')
        .select('*')
        .order('created_at', { ascending: true }),
      supabase
        .from('app_settings')
        .select('value_text')
        .eq('key_name', 'logo_bimas_url')
        .single(),
    ]);

    if (layananRes.error) throw layananRes.error;

    return {
      data: {
        layananList: (layananRes.data || []) as MasterLayananItem[],
        logoUrl: logoRes.data?.value_text || '',
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data form PTSP' };
  }
}

export interface CreatePermohonanPayload {
  nama_pemohon: string;
  nik_pemohon: string;
  no_hp: string;
  email: string | null;
  jenis_layanan: string;
  keterangan_permohonan: string;
  file_lampiran_url: string | null;
}

export async function createPtspPermohonan(payload: CreatePermohonanPayload): Promise<{ success: boolean; nomorTiket?: string; error: string | null }> {
  const supabase = await createClient();

  try {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomorTiket = `PTSP-${dateStr}-${randomCode}`;

    const { error } = await supabase.from('ptsp_permohonan').insert([
      {
        nomor_tiket: nomorTiket,
        nama_pemohon: payload.nama_pemohon,
        nik_pemohon: payload.nik_pemohon,
        no_hp: payload.no_hp,
        email: payload.email,
        jenis_layanan: payload.jenis_layanan,
        keterangan_permohonan: payload.keterangan_permohonan,
        file_lampiran_url: payload.file_lampiran_url,
        status: 'Menunggu Verifikasi',
      },
    ]);

    if (error) throw new Error(error.message);

    revalidatePath('/ptsp');
    revalidatePath('/admin/ptsp');
    return { success: true, nomorTiket, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}

export async function uploadPtspLampiran(file: File): Promise<{ success: boolean; fileUrl?: string; error: string | null }> {
  // This is handled client-side for storage upload
  return { success: false, error: 'Upload handled client-side' };
}