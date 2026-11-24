import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const { mode, payloads } = await request.json();
    const supabase = await createClient();

    if (!mode || !Array.isArray(payloads) || payloads.length === 0) {
      return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });
    }

    let tableName = '';
    let onConflict = '';

    if (mode === 'masjid') {
      tableName = 'masjid_mushalla';
    } else if (mode === 'sdm_masjid') {
      tableName = 'masjid_sdm';
      onConflict = 'masjid_id';
    } else if (mode === 'arah_kiblat') {
      tableName = 'masjid_arah_kiblat';
      onConflict = 'masjid_id';
    } else if (mode === 'data_lain') {
      tableName = 'kebimas_data_lain';
      onConflict = 'nomor_tiket_ptsp';
    } else {
      return NextResponse.json({ error: 'Mode tidak dikenali' }, { status: 400 });
    }

    let error: Error | null = null;
    if (onConflict) {
      const { error: upsertError } = await supabase.from(tableName).upsert(payloads, { onConflict });
      error = upsertError;
    } else {
      const { error: insertError } = await supabase.from(tableName).insert(payloads);
      error = insertError;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/admin/kebimasislaman');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal import data' }, { status: 500 });
  }
}