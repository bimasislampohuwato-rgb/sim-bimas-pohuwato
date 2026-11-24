import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const supabase = await createClient();

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

    if (pegawaiError) {
      return NextResponse.json({ success: false, message: pegawaiError.message }, { status: 400 });
    }

    const pegawaiId = pegawaiData.id;

    if (payload.riwayatJabatan?.length > 0) {
      const jabatanRecords = payload.riwayatJabatan
        .filter((r: any) => r.jabatan || r.pangkatGolongan)
        .map((r: any) => ({
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
        if (jabError) {
          return NextResponse.json({ success: false, message: jabError.message }, { status: 400 });
        }
      }
    }

    if (payload.riwayatPendidikan?.length > 0) {
      const pendidikanRecords = payload.riwayatPendidikan
        .filter((r: any) => r.jenjang || r.namaSekolah)
        .map((r: any) => ({
          pegawai_id: pegawaiId,
          jenjang: r.jenjang || null,
          nama_sekolah: r.namaSekolah || null,
          tahun_lulus: r.tahunLulus || null,
        }));

      if (pendidikanRecords.length > 0) {
        const { error: pendError } = await supabase.from('riwayat_pendidikan').insert(pendidikanRecords);
        if (pendError) {
          return NextResponse.json({ success: false, message: pendError.message }, { status: 400 });
        }
      }
    }

    if (payload.dataKeluarga?.length > 0) {
      const keluargaRecords = payload.dataKeluarga
        .filter((r: any) => r.nama)
        .map((r: any) => ({
          pegawai_id: pegawaiId,
          hubungan: r.hubungan || null,
          nama: r.nama || null,
          tempat_tanggal_lahir: r.tempatTanggalLahir || null,
          pekerjaan: r.pekerjaan || null,
        }));

      if (keluargaRecords.length > 0) {
        const { error: kelError } = await supabase.from('data_keluarga').insert(keluargaRecords);
        if (kelError) {
          return NextResponse.json({ success: false, message: kelError.message }, { status: 400 });
        }
      }
    }

    revalidatePath('/pegawai');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Terjadi kesalahan.' }, { status: 500 });
  }
}