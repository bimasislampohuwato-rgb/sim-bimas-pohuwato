import { updatePegawai } from '@/app/pegawai/edit/[id]/_actions/pegawai-edit';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const { success, error } = await updatePegawai(id, payload);
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal memperbarui' }, { status: 500 });
  }
}