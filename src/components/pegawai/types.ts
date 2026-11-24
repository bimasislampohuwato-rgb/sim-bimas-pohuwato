export interface RiwayatJabatanItem {
  pangkatGolongan: string;
  jabatan: string;
  unitKerja: string;
  nomorSk: string;
  tanggalSk: string;
  tmt: string;
  angkaKredit: string;
  fileSk: File | null;
}

export interface RiwayatPendidikanItem {
  jenjang: string;
  namaSekolah: string;
  tahunLulus: string;
}

export interface DataKeluargaItem {
  hubungan: string;
  nama: string;
  tempatTanggalLahir: string;
  pekerjaan: string;
}

export const MASTER_GOLONGAN = [
  'II/a (Pengatur Muda)', 'II/b (Pengatur Muda Tk. I)', 'II/c (Pengatur)', 'II/d (Pengatur Tk. I)',
  'III/a (Penata Muda)', 'III/b (Penata Muda Tk. I)', 'III/c (Penata)', 'III/d (Penata Tk. I)',
  'IV/a (Pembina)', 'IV/b (Pembina Tk. I)',
];

export const MASTER_PENDIDIKAN = ['SD / Sederajat', 'SMP / Sederajat', 'SMA / MA / Sederajat', 'D-III', 'S-1 / D-IV', 'S-2', 'S-3'];

export function emptyJabatan(): RiwayatJabatanItem {
  return { pangkatGolongan: '', jabatan: '', unitKerja: '', nomorSk: '', tanggalSk: '', tmt: '', angkaKredit: '', fileSk: null };
}

export function emptyPendidikan(): RiwayatPendidikanItem {
  return { jenjang: '', namaSekolah: '', tahunLulus: '' };
}

export function emptyKeluarga(hubungan = 'Suami/Istri'): DataKeluargaItem {
  return { hubungan, nama: '', tempatTanggalLahir: '', pekerjaan: '' };
}