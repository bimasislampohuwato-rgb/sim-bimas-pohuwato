import { getAdminPtspPageData } from '@/app/admin/ptsp/_actions/admin-ptsp';
import AdminPtspClient from './AdminPtspClient';

export default async function AdminPtspPage() {
  const { data, error } = await getAdminPtspPageData();

  if (error === 'Unauthorized') {
    return (
      <meta http-equiv="refresh" content="0;url=/login" />
    );
  }

  return (
    <AdminPtspClient
      initialData={data}
      initialError={error}
    />
  );
}