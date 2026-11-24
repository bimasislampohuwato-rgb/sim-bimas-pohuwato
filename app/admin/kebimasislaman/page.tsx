import { getKebimasislamanData } from '@/app/admin/kebimasislaman/_actions/kebimasislaman';
import KebimasislamanClient from './KebimasislamanClient';

export default async function KebimasislamanPage() {
  const { data, error } = await getKebimasislamanData();

  return (
    <KebimasislamanClient
      initialData={data}
      initialError={error}
    />
  );
}