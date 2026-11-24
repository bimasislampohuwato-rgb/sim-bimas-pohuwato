import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ApiUser {
  id: string;
  email: string | null;
  role: string | null;
  jabatanAdmin: string | null;
  kuaWilayah: string | null;
  isAdmin: boolean;
}

function authError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message, message }, { status });
}

export async function getApiUser(): Promise<ApiUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, jabatan_admin, kua_wilayah, email')
    .eq('id', user.id)
    .single();

  const isAdmin =
    profile?.role === 'super_admin' ||
    profile?.jabatan_admin === 'admin_bimas' ||
    profile?.jabatan_admin === 'admin_kua';

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? null,
    role: profile?.role ?? null,
    jabatanAdmin: profile?.jabatan_admin ?? null,
    kuaWilayah: profile?.kua_wilayah ?? null,
    isAdmin,
  };
}

export async function requireApiUser(): Promise<{ user: ApiUser } | { response: NextResponse }> {
  const user = await getApiUser();
  if (!user) {
    return { response: authError('Unauthorized: silakan login terlebih dahulu.', 401) };
  }
  return { user };
}

export async function requireApiAdmin(): Promise<{ user: ApiUser } | { response: NextResponse }> {
  const user = await getApiUser();
  if (!user) {
    return { response: authError('Unauthorized: silakan login terlebih dahulu.', 401) };
  }
  if (!user.isAdmin) {
    return { response: authError('Forbidden: membutuhkan hak akses admin.', 403) };
  }
  return { user };
}