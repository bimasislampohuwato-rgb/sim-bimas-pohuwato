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
  nama_tanpa_gelar: string;
  gelar_depan: string;
  gelar_belakang: string;
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
  tmt_cpns: string;
  tmt_pns: string;
  pendidikan_terakhir: string;
  jurusan: string;
  tahun_lulus: string;
  status_perkawinan: string;
  nama_pasangan: string;
  jumlah_anak: number;
}

export interface RiwayatJabatanFormItem {
  pangkatGolongan: string;
  jabatan: string;
  unitKerja: string;
  nomorSk: string;
  tanggalSk: string;
  tmt: string;
  angkaKredit: string;
}

export interface RiwayatPendidikanFormItem {
  jenjang: string;
  namaSekolah: string;
  tahunLulus: string;
}

export interface DataKeluargaFormItem {
  hubungan: string;
  nama: string;
  tempatTanggalLahir: string;
  pekerjaan: string;
}

export interface PegawaiEditPageData {
  pegawai: PegawaiDetailData | null;
  masterJabatanList: string[];
  masterKuaList: string[];
  riwayatJabatan: RiwayatJabatanFormItem[];
  riwayatPendidikan: RiwayatPendidikanFormItem[];
  dataKeluarga: DataKeluargaFormItem[];
}

export async function getPegawaiEditPageData(
  pegawaiId: string
): Promise<{ data: PegawaiEditPageData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const [pegawaiRes, jabData, kuaData, riwayatJabatanRes, riwayatPendidikanRes, keluargaRes] = await Promise.all([
      supabase.from('pegawai').select('*').eq('id', pegawaiId).single(),
      supabase.from('MasterJabatan').select('namaJabatan').order('namaJabatan', { ascending: true }),
      supabase.from('KuaProfile').select('namaKua').order('namaKua', { ascending: true }),
      supabase.from('riwayat_jabatan').select('*').eq('pegawai_id', pegawaiId),
      supabase.from('riwayat_pendidikan').select('*').eq('pegawai_id', pegawaiId),
      supabase.from('data_keluarga').select('*').eq('pegawai_id', pegawaiId),
    ]);

    if (pegawaiRes.error) {
      if (pegawaiRes.error.code === 'PGRST116') {
        return { data: null, error: 'Profil pegawai tidak ditemukan di database.' };
      }
      throw pegawaiRes.error;
    }

    if (jabData.error) throw jabData.error;
    if (kuaData.error) throw kuaData.error;
    if (riwayatJabatanRes.error) throw riwayatJabatanRes.error;
    if (riwayatPendidikanRes.error) throw riwayatPendidikanRes.error;
    if (keluargaRes.error) throw keluargaRes.error;

    const pegawai = pegawaiRes.data;

    return {
      data: {
        pegawai: {
          id: pegawai.id,
          nama_lengkap: pegawai.nama_lengkap || pegawai.nama_tanpa_gelar || pegawai.nama || '',
          nama_tanpa_gelar: pegawai.nama_tanpa_gelar || pegawai.namaTanpaGelar || pegawai.nama || '',
          gelar_depan: pegawai.gelar_depan || pegawai.gelarDepan || '',
          gelar_belakang: pegawai.gelar_belakang || pegawai.gelarBelakang || '',
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
          tmt_cpns: pegawai.tmt_cpns || '',
          tmt_pns: pegawai.tmt_pns || '',
          pendidikan_terakhir: pegawai.pendidikan_terakhir || '',
          jurusan: pegawai.jurusan || '',
          tahun_lulus: pegawai.tahun_lulus || '',
          status_perkawinan: pegawai.status_perkawinan || 'Menikah',
          nama_pasangan: pegawai.nama_pasangan || '',
          jumlah_anak: pegawai.jumlah_anak || 0,
        },
        masterJabatanList: jabData.data?.map((j) => j.namaJabatan) || [],
        masterKuaList: kuaData.data?.map((k) => k.namaKua) || [],
        riwayatJabatan:
          riwayatJabatanRes.data?.map((r) => ({
            pangkatGolongan: r.pangkat_golongan || '',
            jabatan: r.jabatan || '',
            unitKerja: r.unit_kerja || '',
            nomorSk: r.nomor_sk || '',
            tanggalSk: r.tanggal_sk || '',
            tmt: r.tmt || '',
            angkaKredit: r.angka_kredit || '',
          })) || [],
        riwayatPendidikan:
          riwayatPendidikanRes.data?.map((p) => ({
            jenjang: p.jenjang || '',
            namaSekolah: p.nama_sekolah || '',
            tahunLulus: p.tahun_lulus || '',
          })) || [],
        dataKeluarga:
          keluargaRes.data?.map((k) => ({
            hubungan: k.hubungan || 'Suami/Istri',
            nama: k.nama || '',
            tempatTanggalLahir: k.tempat_tanggal_lahir || '',
            pekerjaan: k.pekerjaan || '',
          })) || [],
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
  tmt_cpns: string | null;
  tmt_pns: string | null;
  pendidikan_terakhir: string | null;
  jurusan: string | null;
  tahun_lulus: string | null;
  status_perkawinan: string | null;
  nama_pasangan: string | null;
  jumlah_anak: number;
  riwayatJabatan?: RiwayatJabatanFormItem[];
  riwayatPendidikan?: RiwayatPendidikanFormItem[];
  dataKeluarga?: DataKeluargaFormItem[];
}

export async function updatePegawai(
  pegawaiId: string,
  payload: UpdatePegawaiPayload
): Promise<{ success: boolean; error: string | null }> {
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
        tmt_cpns: payload.tmt_cpns,
        tmt_pns: payload.tmt_pns,
        pendidikan_terakhir: payload.pendidikan_terakhir,
        jurusan: payload.jurusan,
        tahun_lulus: payload.tahun_lulus,
        status_perkawinan: payload.status_perkawinan,
        nama_pasangan: payload.nama_pasangan,
        jumlah_anak: payload.jumlah_anak,
      })
      .eq('id', pegawaiId);

    if (error) throw new Error(error.message);

    if (payload.riwayatJabatan !== undefined) {
      const { error: delJabError } = await supabase.from('riwayat_jabatan').delete().eq('pegawai_id', pegawaiId);
      if (delJabError) throw new Error(delJabError.message);

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
        const { error: insJabError } = await supabase.from('riwayat_jabatan').insert(jabatanRecords);
        if (insJabError) throw new Error(insJabError.message);
      }
    }

    if (payload.riwayatPendidikan !== undefined) {
      const { error: delPendError } = await supabase.from('riwayat_pendidikan').delete().eq('pegawai_id', pegawaiId);
      if (delPendError) throw new Error(delPendError.message);

      const pendidikanRecords = payload.riwayatPendidikan
        .filter((r) => r.jenjang || r.namaSekolah)
        .map((r) => ({
          pegawai_id: pegawaiId,
          jenjang: r.jenjang || null,
          nama_sekolah: r.namaSekolah || null,
          tahun_lulus: r.tahunLulus || null,
        }));

      if (pendidikanRecords.length > 0) {
        const { error: insPendError } = await supabase.from('riwayat_pendidikan').insert(pendidikanRecords);
        if (insPendError) throw new Error(insPendError.message);
      }
    }

    if (payload.dataKeluarga !== undefined) {
      const { error: delKelError } = await supabase.from('data_keluarga').delete().eq('pegawai_id', pegawaiId);
      if (delKelError) throw new Error(delKelError.message);

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
        const { error: insKelError } = await supabase.from('data_keluarga').insert(keluargaRecords);
        if (insKelError) throw new Error(insKelError.message);
      }
    }

    revalidatePath('/pegawai');
    revalidatePath(`/pegawai/detail/${pegawaiId}`);
    revalidatePath(`/pegawai/edit/${pegawaiId}`);
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}