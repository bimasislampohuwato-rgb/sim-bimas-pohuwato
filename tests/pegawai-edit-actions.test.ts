import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();
  return { mockFrom, mockGetUser };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { getPegawaiEditPageData, updatePegawai } from '../src/app/pegawai/edit/[id]/_actions/pegawai-edit';

function makeChain(result: any) {
  const chain: any = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.update = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.order = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function setupTables(handlers: Record<string, any>) {
  const chains: Record<string, any> = {};
  mockFrom.mockImplementation((table: string) => {
    if (!chains[table]) chains[table] = makeChain(handlers[table] ?? { data: null, error: null });
    return chains[table];
  });
  return chains;
}

beforeEach(() => {
  mockFrom.mockReset();
  mockGetUser.mockReset();
});

describe('getPegawaiEditPageData', () => {
  it('mengambil pegawai, master, dan tiga riwayat', async () => {
    setupTables({
      pegawai: {
        data: {
          id: 'p1',
          nama_lengkap: 'Budi, S.Ag.',
          nama_tanpa_gelar: 'Budi',
          gelar_belakang: 'S.Ag.',
          nip: '198001012005011001',
          nik: '7504010101010001',
          jenis_kelamin: 'L',
          agama: 'Islam',
          tempat_lahir: 'Marisa',
          tanggal_lahir: '1980-01-01',
          no_hp: '081234567890',
          email: 'budi@example.com',
          alamat: 'Jl. Merdeka',
          jabatan: 'Penyuluh',
          unit_kerja: 'KUA Marisa',
          pangkat_gol: 'III/a',
          tmt_jabatan: '2020-01-01',
          pendidikan_terakhir: 'S-1',
          jurusan: 'PGMI',
          tahun_lulus: '2018',
          status_perkawinan: 'Kawin',
          nama_pasangan: 'Siti',
          jumlah_anak: 2,
        },
        error: null,
      },
      MasterJabatan: { data: [{ namaJabatan: 'Penyuluh Agama Islam Ahli Pertama' }], error: null },
      KuaProfile: { data: [{ namaKua: 'KUA Kecamatan Marisa' }], error: null },
      riwayat_jabatan: {
        data: [
          { pangkat_golongan: 'III/a', jabatan: 'Penyuluh', unit_kerja: 'KUA Marisa', nomor_sk: 'SK/1', tanggal_sk: '2020-01-01', tmt: '2020-01-01', angka_kredit: '150' },
        ],
        error: null,
      },
      riwayat_pendidikan: {
        data: [{ jenjang: 'S-1', nama_sekolah: 'IAIN Gorontalo', tahun_lulus: '2018' }],
        error: null,
      },
      data_keluarga: {
        data: [{ hubungan: 'Suami/Istri', nama: 'Siti', tempat_tanggal_lahir: 'Marisa, 1985', pekerjaan: 'Ibu Rumah Tangga' }],
        error: null,
      },
    });

    const { data, error } = await getPegawaiEditPageData('p1');

    expect(error).toBeNull();
    expect(data?.pegawai?.nama_lengkap).toBe('Budi, S.Ag.');
    expect(data?.pegawai?.nama_tanpa_gelar).toBe('Budi');
    expect(data?.masterJabatanList).toContain('Penyuluh Agama Islam Ahli Pertama');
    expect(data?.masterKuaList).toContain('KUA Kecamatan Marisa');
    expect(data?.riwayatJabatan[0].jabatan).toBe('Penyuluh');
    expect(data?.riwayatJabatan[0].angkaKredit).toBe('150');
    expect(data?.riwayatPendidikan[0].namaSekolah).toBe('IAIN Gorontalo');
    expect(data?.dataKeluarga[0].nama).toBe('Siti');
    expect(mockFrom).toHaveBeenCalledWith('pegawai');
    expect(mockFrom).toHaveBeenCalledWith('riwayat_jabatan');
    expect(mockFrom).toHaveBeenCalledWith('riwayat_pendidikan');
    expect(mockFrom).toHaveBeenCalledWith('data_keluarga');
  });

  it('mengembalikan error jika pegawai tidak ditemukan (PGRST116)', async () => {
    setupTables({
      pegawai: { data: null, error: { code: 'PGRST116', message: 'not found' } },
    });

    const { data, error } = await getPegawaiEditPageData('missing');

    expect(data).toBeNull();
    expect(error).toContain('tidak ditemukan');
  });
});

describe('updatePegawai', () => {
  it('memperbarui tabel pegawai dan mengganti seluruh riwayat (replace-strategy)', async () => {
    const chains = setupTables({
      pegawai: { data: null, error: null },
      riwayat_jabatan: { data: null, error: null },
      riwayat_pendidikan: { data: null, error: null },
      data_keluarga: { data: null, error: null },
    });

    const { success, error } = await updatePegawai('p1', {
      nama_lengkap: 'Budi, S.Ag.',
      nama_tanpa_gelar: 'Budi',
      nip: '198001012005011001',
      nik: '7504010101010001',
      jenis_kelamin: 'L',
      agama: 'Islam',
      tempat_lahir: 'Marisa',
      tanggal_lahir: '1980-01-01',
      no_hp: '081234567890',
      email: null,
      alamat: 'Jl. Merdeka',
      jabatan: 'Penyuluh',
      unit_kerja: 'KUA Marisa',
      pangkat_gol: 'III/a',
      tmt_jabatan: '2020-01-01',
      tmt_cpns: '2015-01-01',
      tmt_pns: '2018-01-01',
      pendidikan_terakhir: 'S-1',
      jurusan: 'PGMI',
      tahun_lulus: '2018',
      status_perkawinan: 'Kawin',
      nama_pasangan: 'Siti',
      jumlah_anak: 2,
      riwayatJabatan: [
        { pangkatGolongan: 'III/a', jabatan: 'Penyuluh', unitKerja: 'KUA Marisa', nomorSk: 'SK/1', tanggalSk: '2020-01-01', tmt: '2020-01-01', angkaKredit: '150' },
      ],
      riwayatPendidikan: [{ jenjang: 'S-1', namaSekolah: 'IAIN Gorontalo', tahunLulus: '2018' }],
      dataKeluarga: [{ hubungan: 'Suami/Istri', nama: 'Siti', tempatTanggalLahir: 'Marisa, 1985', pekerjaan: 'Ibu Rumah Tangga' }],
    });

    expect(error).toBeNull();
    expect(success).toBe(true);

    // pegawai: update().eq()
    expect(chains['pegawai'].update).toHaveBeenCalled();
    expect(chains['pegawai'].eq).toHaveBeenCalled();

    // riwayat_jabatan: delete().eq() lalu insert()
    expect(chains['riwayat_jabatan'].delete).toHaveBeenCalled();
    expect(chains['riwayat_jabatan'].insert).toHaveBeenCalled();

    expect(chains['riwayat_pendidikan'].delete).toHaveBeenCalled();
    expect(chains['riwayat_pendidikan'].insert).toHaveBeenCalled();

    expect(chains['data_keluarga'].delete).toHaveBeenCalled();
    expect(chains['data_keluarga'].insert).toHaveBeenCalled();
  });

  it('mengembalikan gagal jika update pegawai error', async () => {
    setupTables({
      pegawai: { data: null, error: { message: 'DB down' } },
    });

    const { success, error } = await updatePegawai('p1', {
      nama_lengkap: 'X',
      nama_tanpa_gelar: 'X',
      nip: '1',
      nik: null,
      jenis_kelamin: 'L',
      agama: 'Islam',
      tempat_lahir: null,
      tanggal_lahir: null,
      no_hp: '',
      email: null,
      alamat: null,
      jabatan: '',
      unit_kerja: '',
      pangkat_gol: null,
      tmt_jabatan: null,
      tmt_cpns: null,
      tmt_pns: null,
      pendidikan_terakhir: null,
      jurusan: null,
      tahun_lulus: null,
      status_perkawinan: null,
      nama_pasangan: null,
      jumlah_anak: 0,
    });

    expect(success).toBe(false);
    expect(error).toContain('DB down');
  });
});