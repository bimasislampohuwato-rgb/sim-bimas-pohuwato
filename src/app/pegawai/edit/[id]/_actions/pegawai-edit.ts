'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface MasterJabatanItem {
  id: string;
  namaJabatan: string;
  kategori?: string | null;
  deskripsi?: string | null;
}

export interface KuaProfileItem {
  id: string;
  namaKua: string;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  kecamatanId?: string | null;
}

export interface PegawaiDetailData {
  id: string;
  nama_lengkap: string;
  nip: string;
  nik: string;
  jenis_kelamin: string;
  agama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  no_hp: string;
  email: string;
  alamat: string;
  jabatan: string;
  unit_kerja: string;
  pangkat_gol: string;
  tmt_jabatan: string;
  pendidikan_terakhir: string;
  jurusan: string;
  tahun_lulus: string;
  status_perkawinan: string;
  nama_pasangan: string;
  jumlah_anak: number;
}

export interface PegawaiEditPageData {
  pegawai: PegawaiDetailData | null;
  masterJabatanList: string[];
  masterKuaList: string[];
}

export async function getPegawaiEditPageData(pegawaiId: string): Promise<{ data: PegawaiEditPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const [pegawaiRes, jabData, kuaData] = await Promise.all([
      supabase
        .from('pegawai')
        .select('*')
        .eq('id', pegawaiId)
        .single(),
      supabase
        .from('MasterJabatan')
        .select('namaJabatan')
        .order('namaJabatan', { ascending: true }),
      supabase
        .from('KuaProfile')
        .select('namaKua')
        .order('namaKua', { ascending: true }),
    ]);

    if (pegawaiRes.error) {
      if (pegawaiRes.error.code === 'PGRST116') {
        return { data: null, error: 'Profil pegawai tidak ditemukan di database.' };
      }
      throw pegawaiRes.error;
    }

    if (jabData.error) throw jabData.error;
    if (kuaData.error) throw kuaData.error;

    const pegawai = pegawaiRes.data;

    return {
      data: {
        pegawai: {
          id: pegawai.id,
          nama_lengkap: pegawai.nama_lengkap || pegawai.nama_tanpa_gelar || pegawai.nama || '',
          nip: pegawai.nip || '',
          nik: pegawai.nik || '',
          jenis_kelamin: pegawai.jenis_kelamin || 'L',
          agama: pegawai.agama || 'Islam',
          tempat_lahir: pegawai.tempat_lahir || '',
          tanggal_lahir: pegawai.tanggal_lahir || '',
          no_hp: pegawai.no_hp || pegawai.nomorHp || pegawai.kontak || '',
          email: pegawai.email || '',
          alamat: pegawai.alamat || '',
          jabatan: pegawai.jabatan || '',
          unit_kerja: pegawai.unit_kerja || '',
          pangkat_gol: pegawai.pangkat_gol || '',
          tmt_jabatan: pegawai.tmt_jabatan || '',
          pendidikan_terakhir: pegawai.pendidikan_terakhir || '',
          jurusan: pegawai.jurusan || '',
          tahun_lulus: pegawai.tahun_lulus || '',
          status_perkawinan: pegawai.status_perkawinan || 'Menikah',
          nama_pasangan: pegawai.nama_pasangan || '',
          jumlah_anak: pegawai.jumlah_anak || 0,
        },
        masterJabatanList: jabData.data?.map((j) => j.namaJabatan) || [],
        masterKuaList: kuaData.data?.map((k) => k.namaKua) || [],
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data edit pegawai' };
  }
}

export interface UpdatePegawaiPayload {
  nama_lengkap: string;
  nama_tanpa_gelar: string;
  nip: string;
  nik: string | null;
  jenis_kelamin: string;
  agama: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  no_hp: string;
  email: string | null;
  alamat: string | null;
  jabatan: string;
  unit_kerja: string;
  pangkat_gol: string | null;
  tmt_jabatan: string | null;
  pendidikan_terakhir: string | null;
  jurusan: string | null;
  tahun_lulus: string | null;
  status_perkawinan: string | null;
  nama_pasangan: string | null;
  jumlah_anak: number;
}

export async function updatePegawai(pegawaiId: string, payload: UpdatePegawaiPayload): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('pegawai')
      .update({
        nama_lengkap: payload.nama_lengkap,
        nama_tanpa_gelar: payload.nama_tanpa_gelar,
        nip: payload.nip,
        nik: payload.nik,
        jenis_kelamin: payload.jenis_kelamin,
        agama: payload.agama,
        tempat_lahir: payload.tempat_lahir,
        tanggal_lahir: payload.tanggal_lahir,
        no_hp: payload.no_hp,
        email: payload.email,
        alamat: payload.alamat,
        jabatan: payload.jabatan,
        unit_kerja: payload.unit_kerja,
        pangkat_gol: payload.pangkat_gol,
        tmt_jabatan: payload.tmt_jabatan,
        pendidikan_terakhir: payload.pendidikan_terakhir,
        jurusan: payload.jurusan,
        tahun_lulus: payload.tahun_lulus,
        status_perkawinan: payload.status_perkawinan,
        nama_pasangan: payload.nama_pasangan,
        jumlah_anak: payload.jumlah_anak,
      })
      .eq('id', pegawaiId);

    if (error) throw new Error(error.message);

    revalidatePath('/pegawai');
    revalidatePath(`/pegawai/detail/${pegawaiId}`);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}