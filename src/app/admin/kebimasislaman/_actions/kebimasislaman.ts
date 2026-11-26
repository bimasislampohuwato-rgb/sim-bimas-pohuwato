'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface MasjidMushallaItem {
  id: string;
  jenis_lembaga: 'MASJID' | 'MUSHALLA' | null;
  id_masjid_simas: string | null;
  id_baru_simas: string | null;
  nama_masjid: string;
  provinsi: string | null;
  kabupaten_kota: string | null;
  kecamatan: string | null;
  tipologi: string | null;
  status_tanah: string | null;
  alamat: string | null;
  tahun_berdiri: string | null;
  luas_tanah: string | null;
  luas_bangunan: string | null;
  telepon: string | null;
  email: string | null;
  latitude_simas: number | null;
  longitude_simas: number | null;
  sumber_data: string | null;
  updated_at?: string;
}

export interface SdmDataItem {
  id?: string;
  masjid_id: string | null;
  id_masjid_simas: string | null;
  nama_masjid: string | null;
  kecamatan: string | null;
  jumlah_pengurus: number;
  ketua_pengurus: string | null;
  no_hp_ketua: string | null;
  nama_sekretaris: string | null;
  no_hp_sekretaris: string | null;
  daftar_imam: string[];
  daftar_khatib: string[];
  daftar_muazin: string[];
  jumlah_remaja: number;
  ketua_remaja: string | null;
  kategori_jamaah: string | null;
}

export interface KiblatDataItem {
  id?: string;
  masjid_id: string | null;
  id_masjid_simas: string | null;
  nama_masjid: string | null;
  kecamatan: string | null;
  latitude: number | null;
  lintang_utara: string | null;
  longitude: number | null;
  bujur_timur: string | null;
  azimut_bangunan: number | null;
  elevasi_tempat: number | null;
  azimut_kiblat: number | null;
  penyimpangan: number | null;
  status_penyimpangan: string | null;
  tanggal_pengukuran: string | null;
  foto_kalibrasi_url: string | null;
  catatan: string | null;
  nomor_register: string | null;
  kode_verifikasi: string | null;
  status_verifikasi: string | null;
  tanggal_terbit_sertifikat: string | null;
}

export interface KecamatanItem {
  namaKecamatan: string;
}

export interface PejabatUtamaItem {
  id: string;
  nama: string;
  jabatan: string;
  urutan: number;
}

export interface KebimasislamanData {
  masjidList: MasjidMushallaItem[];
  sdmMap: Record<string, SdmDataItem>;
  kiblatMap: Record<string, KiblatDataItem>;
  kecamatanMaster: string[];
  pejabatUtamaList: PejabatUtamaItem[];
}

function detectJenis(
  idSimas?: string | null,
  idBaru?: string | null,
  jenisDb?: string | null
): 'MASJID' | 'MUSHALLA' {
  if (jenisDb === 'MUSHALLA' || jenisDb === 'MASJID') return jenisDb;
  const s1 = String(idSimas || '').trim();
  const s2 = String(idBaru || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
}

function splitListField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(val)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getKebimasislamanData(): Promise<{ data: KebimasislamanData | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const [kecRes, masjidRes, sdmRes, kiblatRes, pjRes] = await Promise.all([
      supabase.from('MasterKecamatan').select('namaKecamatan').order('namaKecamatan'),
      supabase.from('masjid_mushalla').select('*').order('nama_masjid', { ascending: true }),
      supabase.from('masjid_sdm').select('*'),
      supabase.from('masjid_arah_kiblat').select('*'),
      supabase.from('pejabat_utama').select('*').order('urutan', { ascending: true }),
    ]);

    let kecamatanMaster: string[] = [];
    if (kecRes.data) {
      const names = Array.from(
        new Set(
          kecRes.data
            .map((k: any) => String(k.namaKecamatan || '').trim())
            .filter(Boolean)
        )
      );
      kecamatanMaster = names;
    }

    const pejabatUtamaList: PejabatUtamaItem[] = pjRes.data as PejabatUtamaItem[] || [];

    const masjidList: MasjidMushallaItem[] = (masjidRes.data || []).map((m: any) => ({
      ...m,
      jenis_lembaga: detectJenis(m.id_masjid_simas, m.id_baru_simas, m.jenis_lembaga),
      kecamatan: m.kecamatan ? String(m.kecamatan).trim() : null,
      tipologi: m.tipologi ? String(m.tipologi).trim() : null,
    }));

    const sdmMap: Record<string, SdmDataItem> = {};
    (sdmRes.data || []).forEach((row: any) => {
      const key = row.masjid_id || row.id_masjid_simas || row.nama_masjid;
      if (key) {
        sdmMap[key] = {
          ...row,
          jumlah_pengurus: Number(row.jumlah_pengurus || 0),
          ketua_pengurus: row.ketua_pengurus || '',
          no_hp_ketua: row.no_hp_ketua || '',
          nama_sekretaris: row.nama_sekretaris || '',
          no_hp_sekretaris: row.no_hp_sekretaris || '',
          daftar_imam: splitListField(row.daftar_imam),
          daftar_khatib: splitListField(row.daftar_khatib),
          daftar_muazin: splitListField(row.daftar_muazin),
          jumlah_remaja: Number(row.jumlah_remaja || 0),
          ketua_remaja: row.ketua_remaja || '',
          kategori_jamaah: row.kategori_jamaah || '50 - 100',
        };
      }
    });

    const kiblatMap: Record<string, KiblatDataItem> = {};
    (kiblatRes.data || []).forEach((row: any) => {
      const key = row.masjid_id || row.id_masjid_simas || row.nama_masjid;
      if (key) {
        kiblatMap[key] = {
          ...row,
          latitude: parseNumberOrNull(row.latitude),
          lintang_utara: row.lintang_utara || '',
          longitude: parseNumberOrNull(row.longitude),
          bujur_timur: row.bujur_timur || '',
          azimut_bangunan: parseNumberOrNull(row.azimut_bangunan),
          elevasi_tempat: parseNumberOrNull(row.elevasi_tempat),
          azimut_kiblat: parseNumberOrNull(row.azimut_kiblat),
          penyimpangan: parseNumberOrNull(row.penyimpangan),
          status_penyimpangan: row.status_penyimpangan || 'Terverifikasi',
          tanggal_pengukuran: row.tanggal_pengukuran
            ? String(row.tanggal_pengukuran).slice(0, 10)
            : '',
          foto_kalibrasi_url: row.foto_kalibrasi_url || '',
          catatan: row.catatan || '',
          nomor_register: row.nomor_register || null,
          kode_verifikasi: row.kode_verifikasi || null,
          status_verifikasi:
            row.status_verifikasi ||
            (row.nomor_register ? 'TERVERIFIKASI' : 'MENUNGGU_REGISTER'),
          tanggal_terbit_sertifikat: row.tanggal_terbit_sertifikat
            ? String(row.tanggal_terbit_sertifikat).slice(0, 10)
            : null,
        };
      }
    });

    return {
      data: {
        masjidList,
        sdmMap,
        kiblatMap,
        kecamatanMaster,
        pejabatUtamaList,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data' };
  }
}

export async function getProfilKuaData(targetName: string): Promise<{
  data: {
    id: string;
    namaKua: string;
    alamat: string;
    telepon: string;
    email: string;
    pimpinan: string;
    nama_pimpinan: string;
    nip_pimpinan: string;
    kop_baris_1: string;
    kop_baris_2: string;
    kop_baris_3: string;
    kop_baris_4: string;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let kuaRow: any = null;
    if (targetName) {
      const { data: kuaRows } = await supabase
        .from('KuaProfile')
        .select('*')
        .ilike('namaKua', `%${targetName}%`)
        .limit(1);
      if (Array.isArray(kuaRows) && kuaRows.length > 0) {
        kuaRow = kuaRows[0];
      }
    }

    let pkRow: any = null;
    const { data: pkRows } = await supabase.from('profil_kantor').select('*').limit(50);
    if (Array.isArray(pkRows) && targetName) {
      pkRow = pkRows.find(
        (r: any) =>
          (kuaRow?.id && String(r.kua_id) === String(kuaRow.id)) ||
          String(r.nama_kantor || '').toLowerCase().includes(targetName.toLowerCase())
      );
    }

    const resolvedNamaKua =
      pkRow?.nama_kantor ||
      kuaRow?.namaKua ||
      (targetName.toLowerCase().startsWith('kua')
        ? targetName
        : `KUA Kecamatan ${targetName || 'Saya'}`);

    return {
      data: {
        id: pkRow?.id || '',
        namaKua: resolvedNamaKua,
        alamat: pkRow?.alamat || kuaRow?.alamat || '',
        telepon: pkRow?.nomor_kontak || kuaRow?.telepon || '',
        email: pkRow?.email || kuaRow?.email || '',
        pimpinan: pkRow?.pimpinan || 'Kepala KUA',
        nama_pimpinan: pkRow?.nama_pimpinan || '',
        nip_pimpinan: pkRow?.nip_pimpinan || '',
        kop_baris_1: pkRow?.kop_baris_1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
        kop_baris_2: pkRow?.kop_baris_2 || 'KANTOR KEMENTERIAN AGAMA KABUPATEN POHUWATO',
        kop_baris_3: pkRow?.kop_baris_3 || resolvedNamaKua.toUpperCase(),
        kop_baris_4: pkRow?.kop_baris_4 || pkRow?.alamat || kuaRow?.alamat || '',
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat profil KUA' };
  }
}

export async function saveProfilKua(formData: {
  id: string;
  namaKua: string;
  alamat: string;
  telepon: string;
  email: string;
  pimpinan: string;
  nama_pimpinan: string;
  nip_pimpinan: string;
  kop_baris_1: string;
  kop_baris_2: string;
  kop_baris_3: string;
  kop_baris_4: string;
}): Promise<{ success: boolean; error: string | null }> {
  if (!formData.namaKua.trim()) {
    return { success: false, error: 'Nama KUA wajib diisi.' };
  }

  try {
    const now = new Date();
    const unitKey = `kua_${formData.namaKua
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`;

    const data = {
      unit_key: unitKey,
      jenis_unit: 'kua',
      nama_kantor: formData.namaKua.trim(),
      alamat: formData.alamat.trim(),
      nomor_kontak: formData.telepon.trim(),
      email: formData.email.trim(),
      pimpinan: formData.pimpinan.trim(),
      nama_pimpinan: formData.nama_pimpinan.trim(),
      nip_pimpinan: formData.nip_pimpinan.trim(),
      kop_baris_1: formData.kop_baris_1.trim(),
      kop_baris_2: formData.kop_baris_2.trim(),
      kop_baris_3: formData.kop_baris_3.trim(),
      kop_baris_4: formData.kop_baris_4.trim(),
    };

    const id =
      formData.id && formData.id.trim()
        ? formData.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `pk_kua_${Date.now()}`;

    await prisma.profil_kantor.upsert({
      where: { id },
      create: { id, ...data, created_at: now },
      update: { ...data, updated_at: now },
    });

    revalidatePath('/admin/kebimasislaman');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}