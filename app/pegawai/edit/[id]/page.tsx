import { getPegawaiEditPageData } from '@/app/pegawai/edit/[id]/_actions/pegawai-edit';
import PegawaiEditClient from './PegawaiEditClient';

export default async function PegawaiEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data, error } = await getPegawaiEditPageData(resolvedParams.id);

  return (
    <PegawaiEditClient
      initialData={data}
      initialError={error}
      pegawaiId={resolvedParams.id}
    />
  );
}