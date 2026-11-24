import { getPegawaiTambahPageData } from '@/app/pegawai/tambah/_actions/pegawai-tambah';
import PegawaiTambahClient from './PegawaiTambahClient';

export default async function PegawaiTambahPage() {
  const { data, error } = await getPegawaiTambahPageData();

  return (
    <PegawaiTambahClient
      initialData={data}
      initialError={error}
    />
  );
}