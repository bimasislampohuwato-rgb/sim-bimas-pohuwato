import { getPtspPageData } from '@/app/ptsp/_actions/ptsp';
import PtspClient from './PtspClient';

export default async function PtspPage() {
  const { data, error } = await getPtspPageData();

  if (error === 'Unauthorized') {
    return (
      <meta http-equiv="refresh" content="0;url=/login" />
    );
  }

  return (
    <PtspClient
      initialData={data}
      initialError={error}
    />
  );
}