'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { ProfilKantorData } from '@/components/master-data/types';

export async function saveProfilKantorRecord(
  payload: ProfilKantorData,
  id?: string | null,
  settingsKey?: string
): Promise<{ success: boolean; data?: ProfilKantorData | null; error?: string | null }> {
  try {
    const nowIso = new Date().toISOString();
    let savedRecord: ProfilKantorData | null = null;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('profil_kantor')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      savedRecord = data as ProfilKantorData;
    } else {
      const newId =
        typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID
          ? globalThis.crypto.randomUUID()
          : 'pk_' + Date.now();
      const { data, error } = await supabaseAdmin
        .from('profil_kantor')
        .insert([{ id: newId, ...payload, created_at: nowIso }])
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      savedRecord = data as ProfilKantorData;
    }

    if (settingsKey && savedRecord) {
      const { error: settingsError } = await supabaseAdmin
        .from('app_settings')
        .upsert(
          { key_name: settingsKey, value_text: JSON.stringify(savedRecord) },
          { onConflict: 'key_name' }
        );
      if (settingsError) return { success: false, error: settingsError.message };
    }

    revalidatePath('/admin/master');
    return { success: true, data: savedRecord, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan profil kantor.' };
  }
}