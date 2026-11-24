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

export interface PegawaiTambahPageData {
  masterJabatanList: string[];
  masterKuaList: string[];
}

export async function getPegawaiTambahPageData(): Promise<{ data: PegawaiTambahPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const [jabData, kuaData] = await Promise.all([
      supabase
        .from('MasterJabatan')
        .select('namaJabatan')
        .order('namaJabatan', { ascending: true }),
      supabase
        .from('KuaProfile')
        .select('namaKua')
        .order('namaKua', { ascending: true }),
    ]);

    if (jabData.error) throw jabData.error;
    if (kuaData.error) throw kuaData.error;

    return {
      data: {
        masterJabatanList: jabData.data?.map((j) => j.namaJabatan) || [],
        masterKuaList: kuaData.data?.map((k) => k.namaKua) || [],
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data form pegawai' };
  }
}

export interface PegawaiLengkapPayload {
  nik: string;
  nip: string;
  namaTanpaGelar: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  agama: string;
  tempatLahir: string;
  tanggalLahir: string;
  noHp: string;
  statusPerkawinan: string;
  tmtCpns?: string | null;
  tmtPns?: string | null;
  alamat: string;
  riwayatJabatan: Array<{
    pangkatGolongan: string;
    jabatan: string;
    unitKerja: string;
    nomorSk: string;
    tanggalSk: string;
    tmt: string;
    angkaKredit: string;
  }>;
  riwayatPendidikan: Array<{
    jenjang: string;
    namaSekolah: string;
    tahunLulus: string;
  }>;
  dataKeluarga: Array<{
    hubungan: string;
    nama: string;
    tempatTanggalLahir: string;
    pekerjaan: string;
  }>;
}

export async function createPegawaiLengkap(payload: PegawaiLengkapPayload): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  try {
    // Insert main pegawai record
    const { data: pegawaiData, error: pegawaiError } = await supabase
      .from('pegawai')
      .insert([
        {
          nik: payload.nik,
          nip: payload.nip,
          namaTanpaGelar: payload.namaTanpaGelar,
          gelarDepan: payload.gelarDepan,
          gelarBelakang: payload.gelarBelakang,
          nama_lengkap: payload.namaLengkap,
          jenis_kelamin: payload.jenisKelamin,
          agama: payload.agama,
          tempat_lahir: payload.tempatLahir,
          tanggal_lahir: payload.tanggalLahir,
          no_hp: payload.noHp,
          status_perkawinan: payload.statusPerkawinan,
          tmt_cpns: payload.tmtCpns,
          tmt_pns: payload.tmtPns,
          alamat: payload.alamat,
        },
      ])
      .select()
      .single();

    if (pegawaiError) throw new Error(pegawaiError.message);

    const pegawaiId = pegawaiData.id;

    // Insert riwayat jabatan
    if (payload.riwayatJabatan.length > 0) {
      const jabatanRecords = payload.riwayatJabatan
        .filter((r) => r.jabatan || r.pangkatGolongan)
        .map((r) => ({
          pegawai_id: pegawaiId,
          pangkat_golongan: r.pangkatGolongan || null,
          jabatan: r.jabatan || null,
          unit_kerja: r.unitKerja || null,
          nomor_sk: r.nomorSk || null,
          tanggal_sk: r.tanggalSk || null,
          tmt: r.tmt || null,
          angka_kredit: r.angkaKredit || null,
        }));

      if (jabatanRecords.length > 0) {
        const { error: jabError } = await supabase.from('riwayat_jabatan').insert(jabatanRecords);
        if (jabError) throw new Error(jabError.message);
      }
    }

    // Insert riwayat pendidikan
    if (payload.riwayatPendidikan.length > 0) {
      const pendidikanRecords = payload.riwayatPendidikan
        .filter((r) => r.jenjang || r.namaSekolah)
        .map((r) => ({
          pegawai_id: pegawaiId,
          jenjang: r.jenjang || null,
          nama_sekolah: r.namaSekolah || null,
          tahun_lulus: r.tahunLulus || null,
        }));

      if (pendidikanRecords.length > 0) {
        const { error: pendError } = await supabase.from('riwayat_pendidikan').insert(pendidikanRecords);
        if (pendError) throw new Error(pendError.message);
      }
    }

    // Insert data keluarga
    if (payload.dataKeluarga.length > 0) {
      const keluargaRecords = payload.dataKeluarga
        .filter((r) => r.nama)
        .map((r) => ({
          pegawai_id: pegawaiId,
          hubungan: r.hubungan || null,
          nama: r.nama || null,
          tempat_tanggal_lahir: r.tempatTanggalLahir || null,
          pekerjaan: r.pekerjaan || null,
        }));

      if (keluargaRecords.length > 0) {
        const { error: kelError } = await supabase.from('data_keluarga').insert(keluargaRecords);
        if (kelError) throw new Error(kelError.message);
      }
    }

    revalidatePath('/pegawai');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}