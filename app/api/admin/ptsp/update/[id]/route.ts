import { updateAdminPtspStatus } from '@/app/admin/ptsp/_actions/admin-ptsp';
import { requireApiAdmin } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const payload = await request.json();
    const { success, error } = await updateAdminPtspStatus(id, payload);
    if (!success) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memperbarui' }, { status: 500 });
  }
}