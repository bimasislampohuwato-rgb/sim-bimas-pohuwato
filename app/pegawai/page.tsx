import { getPegawaiPageData } from '@/app/pegawai/_actions/pegawai';
import DaftarPegawaiClient from './DaftarPegawaiClient';

export default async function DaftarPegawaiPage() {
  const { data, error } = await getPegawaiPageData();

  if (error === 'Unauthorized') {
    return (
      <meta http-equiv="refresh" content="0;url=/login" />
    );
  }

  return (
    <DaftarPegawaiClient
      initialData={data}
      initialError={error}
    />
  );
}