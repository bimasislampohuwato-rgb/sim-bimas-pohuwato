import { deletePegawai } from '@/app/pegawai/_actions/pegawai';
import { requireApiAdmin } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    const { success, error } = await deletePegawai(id);
    if (!success) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menghapus' }, { status: 500 });
  }
}