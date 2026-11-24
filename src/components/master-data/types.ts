'use client';

export interface PegawaiRefItem {
  id: string;
  nama_lengkap?: string;
  nama?: string;
  namaTanpaGelar?: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  nip?: string;
  jabatan?: string;
  unitKerja?: string;
  unit_kerja?: string;
}

export interface ProfilKantorData {
  id?: string;
  unit_key: string;
  jenis_unit: 'kantor_kemenag' | 'kua' | 'unit_lain';
  kua_id?: string | null;
  nama_kantor: string;
  alamat: string;
  nomor_kontak: string;
  website: string;
  email: string;
  pimpinan: string;
  nama_pimpinan: string;
  nip_pimpinan: string;
  kop_baris_1: string;
  kop_baris_2: string;
  kop_baris_3: string;
  kop_baris_4: string;
  updated_at?: string;
}

export type MasterSubSectionKey =
  | 'profil_kantor'
  | 'jabatan'
  | 'kategori_jabatan'
  | 'kua'
  | 'kecamatan'
  | 'logo_instansi';

export type ModalEntity = 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan';

export interface SubMenuItem {
  key: MasterSubSectionKey;
  step: string;
  label: string;
  desc: string;
  icon: string;
  countText?: string;
  superOnly?: boolean;
}

export interface DeleteTarget {
  id: string;
  nama: string;
  entity: ModalEntity;
}

export interface ToastData {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export interface KuaFormData {
  namaKua: string;
  alamat: string;
  telepon: string;
  email: string;
  kecamatanId: string;
}

export interface JabatanFormData {
  namaJabatan: string;
  kategori: string;
  deskripsi: string;
}

export interface KategoriJabatanFormData {
  namaKategori: string;
  deskripsi: string;
}

export interface KecamatanFormData {
  kodeKecamatan: string;
  namaKecamatan: string;
}

export interface UserScope {
  kuaId: string | null;
  namaKua: string;
}