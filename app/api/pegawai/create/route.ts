import { createPegawaiLengkap } from '@/app/pegawai/tambah/_actions/pegawai-tambah';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { success, error } = await createPegawaiLengkap(payload);
    if (!success) {
      return NextResponse.json({ success: false, message: error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Gagal membuat pegawai' }, { status: 500 });
  }
}