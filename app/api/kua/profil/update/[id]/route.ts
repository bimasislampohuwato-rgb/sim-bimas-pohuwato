import { updateKuaProfil } from '@/app/kua/profil/_actions/kua-profil';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const { success, error } = await updateKuaProfil(id, payload);
    if (!success) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memperbarui' }, { status: 500 });
  }
}