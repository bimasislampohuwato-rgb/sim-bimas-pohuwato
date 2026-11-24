import { getKebimasislamanData } from '@/app/admin/kebimasislaman/_actions/kebimasislaman';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { data, error } = await getKebimasislamanData();
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat data' }, { status: 500 });
  }
}