'use server';

import { createClient } from '@/lib/supabase/server';

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
  petugas_ditunjuk: string | null;
  no_hp_petugas: string | null;
  link_surat_tugas: string | null;
  created_at: string;
  updated_at: string;
}

export interface PtspLacakPageData {
  logoUrl: string;
}

export async function getPtspLacakPageData(): Promise<{ data: PtspLacakPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data: logoData } = await supabase
      .from('app_settings')
      .select('value_text')
      .eq('key_name', 'logo_bimas_url')
      .single();

    return {
      data: {
        logoUrl: logoData?.value_text || '',
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data halaman lacak PTSP' };
  }
}

export async function getPermohonanByTiket(nomorTiket: string): Promise<{ data: PtspPermohonanItem | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('ptsp_permohonan')
      .select('*')
      .ilike('nomor_tiket', nomorTiket.trim())
      .single();

    if (error || !data) {
      return { data: null, error: 'Nomor tiket permohonan tidak ditemukan. Silakan periksa kembali.' };
    }

    return { data: data as PtspPermohonanItem, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal mencari nomor tiket' };
  }
}