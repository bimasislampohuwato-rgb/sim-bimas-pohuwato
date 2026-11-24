import { getPtspTambahPageData } from '@/app/ptsp/tambah/_actions/ptsp-tambah';
import PtspTambahClient from './PtspTambahClient';

export default async function PtspTambahPage() {
  const { data, error } = await getPtspTambahPageData();

  return (
    <PtspTambahClient
      initialData={data}
      initialError={error}
    />
  );
}