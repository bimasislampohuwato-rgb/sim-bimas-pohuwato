'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface KuaProfileData {
  id: string;
  namaKua: string;
  alamat: string;
  telepon: string | null;
  email: string | null;
  kepalaKuaNip: string | null;
  kecamatanId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  kecamatan?: {
    namaKecamatan: string | null;
    kodeKecamatan: string | null;
  } | null;
}

export interface KuaProfilPageData {
  kuaProfile: KuaProfileData | null;
  riwayatKepala: Array<{
    id: number;
    nama: string;
    periode: string;
    nip: string;
  }>;
}

export async function getKuaProfilPageData(): Promise<{ data: KuaProfilPageData | null; error: string | null }> {
  try {
    const kuaProfile = await prisma.kuaProfile.findFirst({
      include: {
        MasterKecamatan: {
          select: { namaKecamatan: true, kodeKecamatan: true },
        },
      },
    });

    const riwayatKepala = [
      { id: 1, nama: 'H. Rais Abaidata, S.Ag, M.H', periode: '2023 - Sekarang', nip: '197501012000031002' },
      { id: 2, nama: 'Drs. H. Mohamad Randa', periode: '2019 - 2023', nip: '197005121998031001' },
      { id: 3, nama: 'Arfan Adam, S.Hi', periode: '2015 - 2019', nip: '198003152005011004' },
    ];

    return {
      data: {
        kuaProfile: kuaProfile
          ? {
              id: kuaProfile.id,
              namaKua: kuaProfile.namaKua,
              alamat: kuaProfile.alamat,
              telepon: kuaProfile.telepon,
              email: kuaProfile.email,
              kepalaKuaNip: kuaProfile.kepalaKuaNip,
              kecamatanId: kuaProfile.kecamatanId,
              createdAt: kuaProfile.createdAt,
              updatedAt: kuaProfile.updatedAt,
              kecamatan: kuaProfile.MasterKecamatan
                ? {
                    namaKecamatan: kuaProfile.MasterKecamatan.namaKecamatan,
                    kodeKecamatan: kuaProfile.MasterKecamatan.kodeKecamatan,
                  }
                : null,
            }
          : null,
        riwayatKepala,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Gagal memuat data profil KUA' };
  }
}

export async function updateKuaProfil(
  id: string,
  payload: {
    namaKua?: string;
    alamat?: string;
    telepon?: string | null;
    email?: string | null;
    kepalaKuaNip?: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  if (!id) {
    return { success: false, error: 'ID profil tidak valid.' };
  }

  try {
    await prisma.kuaProfile.update({
      where: { id },
      data: {
        ...(payload.namaKua !== undefined ? { namaKua: payload.namaKua } : {}),
        ...(payload.alamat !== undefined ? { alamat: payload.alamat } : {}),
        ...(payload.telepon !== undefined ? { telepon: payload.telepon } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.kepalaKuaNip !== undefined ? { kepalaKuaNip: payload.kepalaKuaNip } : {}),
        updatedAt: new Date(),
      },
    });

    revalidatePath('/kua/profil');
    return { success: true, error: null };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return { success: false, error: 'Profil KUA tidak ditemukan di database.' };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan.' };
  }
}