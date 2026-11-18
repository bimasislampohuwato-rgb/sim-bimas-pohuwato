'use server';

import { createClient } from '@supabase/supabase-js';

// Fungsi helper untuk mengambil client Supabase yang aman di Server Action
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Konfigurasi Supabase URL atau API Key belum lengkap di file .env');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Fungsi untuk Mengambil Daftar Pegawai
export async function getPegawaiList() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pegawai')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching pegawai:', error);
    return { success: false, data: [], message: error.message };
  }
}

// Fungsi untuk Menyimpan Pegawai Lengkap + Riwayat
export async function createPegawaiLengkap(data: any) {
  try {
    const supabase = getSupabaseClient();

    // Insert ke Tabel Utama Pegawai
    const { data: insertedPegawai, error: errorPegawai } = await supabase
      .from('pegawai')
      .insert([
        {
          nik: data.nik,
          nip: data.nip,
          nama_tanpa_gelar: data.namaTanpaGelar,
          gelar_depan: data.gelarDepan,
          gelar_belakang: data.gelarBelakang,
          nama_lengkap: data.namaLengkap,
          jenis_kelamin: data.jenisKelamin,
          tempat_lahir: data.tempatLahir,
          tanggal_lahir: data.tanggalLahir || null,
          agama: data.agama,
          kewarganegaraan: data.kewarganegaraan,
          alamat: data.alamat,
          no_hp: data.noHp,
          status_perkawinan: data.statusPerkawinan,
          tmt_cpns: data.tmtCpns || null,
          tmt_pns: data.tmtPns || null,
        }
      ])
      .select()
      .single();

    if (errorPegawai) throw errorPegawai;

    const pegawaiId = insertedPegawai.id;

    // Insert Riwayat Jabatan
    if (data.riwayatJabatan && data.riwayatJabatan.length > 0) {
      const payloadJabatan = data.riwayatJabatan.map((item: any) => ({
        pegawai_id: pegawaiId,
        pangkat_golongan: item.pangkatGolongan,
        jabatan: item.jabatan,
        unit_kerja: item.unitKerja,
        nomor_sk: item.nomorSk,
        tanggal_sk: item.tanggalSk || null,
        tmt: item.tmt || null,
        angka_kredit: item.angkaKredit ? parseFloat(item.angkaKredit) : 0,
      }));
      await supabase.from('riwayat_jabatan').insert(payloadJabatan);
    }

    // Insert Riwayat Pendidikan
    if (data.riwayatPendidikan && data.riwayatPendidikan.length > 0) {
      const payloadPendidikan = data.riwayatPendidikan.map((item: any) => ({
        pegawai_id: pegawaiId,
        jenjang: item.jenjang,
        nama_sekolah: item.namaSekolah,
        tahun_lulus: item.tahunLulus,
      }));
      await supabase.from('riwayat_pendidikan').insert(payloadPendidikan);
    }

    // Insert Data Keluarga
    if (data.dataKeluarga && data.dataKeluarga.length > 0) {
      const payloadKeluarga = data.dataKeluarga.map((item: any) => ({
        pegawai_id: pegawaiId,
        hubungan: item.hubungan,
        nama: item.nama,
        tempat_tanggal_lahir: item.tempatTanggalLahir,
        pekerjaan: item.pekerjaan,
      }));
      await supabase.from('data_keluarga').insert(payloadKeluarga);
    }

    return { success: true, message: 'Data pegawai beserta riwayat berhasil disimpan ke database!' };
  } catch (error: any) {
    console.error('Error saving pegawai:', error);
    return { success: false, message: error.message || 'Gagal menyimpan ke database.' };
  }
}

// 3. Fungsi untuk Mengupdate Data Pegawai Lengkap + Riwayat
export async function updatePegawaiLengkap(id: string, data: any) {
  try {
    const supabase = getSupabaseClient();

    // 1. Update Tabel Utama Pegawai
    const { error: errorPegawai } = await supabase
      .from('pegawai')
      .update({
        nik: data.nik,
        nip: data.nip,
        nama_tanpa_gelar: data.namaTanpaGelar,
        gelar_depan: data.gelarDepan,
        gelar_belakang: data.gelarBelakang,
        nama_lengkap: data.namaLengkap,
        jenis_kelamin: data.jenisKelamin,
        tempat_lahir: data.tempatLahir,
        tanggal_lahir: data.tanggalLahir || null,
        agama: data.agama,
        kewarganegaraan: data.kewarganegaraan,
        alamat: data.alamat,
        no_hp: data.noHp,
        status_perkawinan: data.statusPerkawinan,
        tmt_cpns: data.tmtCpns || null,
        tmt_pns: data.tmtPns || null,
      })
      .eq('id', id);

    if (errorPegawai) throw errorPegawai;

    // 2. Strategi Relasi Riwayat (Hapus data lama, masukkan data baru/update)
    // Riwayat Jabatan
    await supabase.from('riwayat_jabatan').delete().eq('pegawai_id', id);
    if (data.riwayatJabatan && data.riwayatJabatan.length > 0) {
      const payloadJabatan = data.riwayatJabatan.map((item: any) => ({
        pegawai_id: id,
        pangkat_golongan: item.pangkatGolongan,
        jabatan: item.jabatan,
        unit_kerja: item.unitKerja,
        nomor_sk: item.nomorSk,
        tanggal_sk: item.tanggalSk || null,
        tmt: item.tmt || null,
        angka_kredit: item.angkaKredit ? parseFloat(item.angkaKredit) : 0,
      }));
      await supabase.from('riwayat_jabatan').insert(payloadJabatan);
    }

    // Riwayat Pendidikan
    await supabase.from('riwayat_pendidikan').delete().eq('pegawai_id', id);
    if (data.riwayatPendidikan && data.riwayatPendidikan.length > 0) {
      const payloadPendidikan = data.riwayatPendidikan.map((item: any) => ({
        pegawai_id: id,
        jenjang: item.jenjang,
        nama_sekolah: item.namaSekolah,
        tahun_lulus: item.tahunLulus,
      }));
      await supabase.from('riwayat_pendidikan').insert(payloadPendidikan);
    }

    // Data Keluarga
    await supabase.from('data_keluarga').delete().eq('pegawai_id', id);
    if (data.dataKeluarga && data.dataKeluarga.length > 0) {
      const payloadKeluarga = data.dataKeluarga.map((item: any) => ({
        pegawai_id: id,
        hubungan: item.hubungan,
        nama: item.nama,
        tempat_tanggal_lahir: item.tempatTanggalLahir,
        pekerjaan: item.pekerjaan,
      }));
      await supabase.from('data_keluarga').insert(payloadKeluarga);
    }

    return { success: true, message: 'Data pegawai beserta riwayat berhasil diperbarui!' };
  } catch (error: any) {
    console.error('Error updating pegawai:', error);
    return { success: false, message: error.message || 'Gagal memperbarui data ke database.' };
  }
}