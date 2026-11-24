import { getPtspLacakPageData } from '@/app/ptsp/lacak/_actions/ptsp-lacak';
import PtspLacakClient from './PtspLacakClient';

export default async function PtspLacakPage() {
  const { data, error } = await getPtspLacakPageData();

  return (
    <PtspLacakClient
      initialData={data}
      initialError={error}
    />
  );
}