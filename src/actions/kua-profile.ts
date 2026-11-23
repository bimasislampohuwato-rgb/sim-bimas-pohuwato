'use server';

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Konfigurasi Supabase belum lengkap.');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function getKuaProfile(kecamatanId?: string) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('KuaProfile')
      .select('*, kecamatan:MasterKecamatan(namaKecamatan, kodeKecamatan)');

    if (kecamatanId) {
      query = query.eq('kecamatanId', kecamatanId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return { success: true, data: data || null };
  } catch (error: any) {
    console.error('Error fetching KUA profile:', error);
    return { success: false, data: null, message: error.message };
  }
}

export async function updateKuaProfile(id: string, payload: Record<string, any>) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('KuaProfile')
      .update({ ...payload, updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { success: true, message: 'Profil KUA berhasil diperbarui.' };
  } catch (error: any) {
    console.error('Error updating KUA profile:', error);
    return { success: false, message: error.message || 'Gagal memperbarui profil KUA.' };
  }
}