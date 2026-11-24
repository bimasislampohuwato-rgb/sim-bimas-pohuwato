'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

// 1. Ambil daftar pegawai yang belum punya akun login di tabel profiles
export async function getPegawaiTanpaAkun() {
  try {
    const { data: pegawaiList, error: pegError } = await supabaseAdmin.from('Nama').select('*');
    if (pegError) throw pegError;

    const { data: profilesList, error: profError } = await supabaseAdmin.from('profiles').select('nip, email');
    if (profError) throw profError;

    const existingNips = new Set(profilesList?.map((p) => p.nip).filter(Boolean));
    const existingEmails = new Set(profilesList?.map((p) => p.email).filter(Boolean));

    const tanpaAkun =
      pegawaiList?.filter((peg) => {
        const nip = peg.nip;
        return nip && !existingNips.has(nip) && !existingEmails.has(nip);
      }) || [];

    return { success: true, data: tanpaAkun };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 2. Buat akun satuan
export async function createAkunPegawai(params: {
  nip: string;
  namaLengkap: string;
  jabatanAdmin?: string;
  kuaWilayah?: string;
}) {
  try {
    const emailSimulasi = `${params.nip}@kemenagpohuwato.go.id`;
    const passwordDefault = 'Kemenag2026!';
    const jabatanNormalized = params.jabatanAdmin || null;
    const kuaNormalized = jabatanNormalized === 'admin_kua' ? params.kuaWilayah || null : null;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailSimulasi,
      password: passwordDefault,
      email_confirm: true,
      user_metadata: { nama_lengkap: params.namaLengkap },
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    const { error: profError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: emailSimulasi,
      nip: params.nip,
      nama_lengkap: params.namaLengkap,
      role: 'nama',
      jabatan_admin: jabatanNormalized,
      kua_wilayah: kuaNormalized,
    });

    if (profError) throw profError;

    return { success: true, message: `Akun untuk ${params.namaLengkap} berhasil dibuat.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 3. BUAT AKUN MASSAL OTOMATIS
export async function createAkunMassalPegawai() {
  try {
    const resTanpaAkun = await getPegawaiTanpaAkun();
    if (!resTanpaAkun.success || !resTanpaAkun.data || resTanpaAkun.data.length === 0) {
      return { success: false, message: 'Tidak ada pegawai yang belum memiliki akun.' };
    }

    const pegawaiList = resTanpaAkun.data;
    let successCount = 0;

    for (const peg of pegawaiList) {
      const nip = peg.nip;
      const nama = peg.nama_lengkap || peg.namaTanpaGelar || 'Pegawai Kemenag';
      if (!nip) continue;

      const emailSimulasi = `${nip}@kemenagpohuwato.go.id`;
      const passwordDefault = 'Kemenag2026!';

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailSimulasi,
        password: passwordDefault,
        email_confirm: true,
        user_metadata: { nama_lengkap: nama },
      });

      if (!authError && authData.user) {
        const userId = authData.user.id;
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email: emailSimulasi,
          nip: nip,
          nama_lengkap: nama,
          role: 'nama',
          jabatan_admin: null,
          kua_wilayah: null,
        });
        successCount++;
      }
    }

    return { success: true, message: `Berhasil membuat ${successCount} akun login pegawai secara massal!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 4. Update Role / Jabatan Admin
export async function updateRolePegawai(params: {
  userId: string;
  namaLengkap: string;
  jabatanAdmin?: string;
  kuaWilayah?: string;
}) {
  try {
    const jabatanNormalized = params.jabatanAdmin || null;
    const kuaNormalized = jabatanNormalized === 'admin_kua' ? params.kuaWilayah || null : null;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        nama_lengkap: params.namaLengkap,
        jabatan_admin: jabatanNormalized,
        kua_wilayah: kuaNormalized,
      })
      .eq('id', params.userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: 'Hak akses Successfully diperbarui.', data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 5. Reset Password Satuan
export async function resetPasswordSingle(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: 'Kemenag2026!',
    });
    if (error) throw error;
    return { success: true, message: 'Kata sandi Successfully dikembalikan ke default: Kemenag2026!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 6. Reset Password Massal
export async function resetPasswordMassal() {
  try {
    const { data: profiles, error: profError } = await supabaseAdmin.from('profiles').select('id, role');
    if (profError) throw profError;

    let count = 0;
    for (const p of profiles || []) {
      if (p.role === 'super_admin') continue;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(p.id, {
        password: 'Kemenag2026!',
      });
      if (!error) count++;
    }

    return { success: true, message: `Berhasil mereset kata sandi untuk ${count} akun pengguna!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 7. Hapus Akun User
export async function deleteAkunUser(userId: string) {
  try {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    const { error: profError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profError) throw profError;

    return { success: true, message: 'Akun login Successfully dihapus dari sistem.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}