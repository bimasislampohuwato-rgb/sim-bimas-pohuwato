import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main() {
  console.log('🌱 Memulai proses seeding data master Kemenag Pohuwato...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  // 1. Seeding 13 Kecamatan di Kabupaten Pohuwato
  const kecamatanList = [
    { namaKecamatan: 'Marisa', kodeKecamatan: '75.04.01' },
    { namaKecamatan: 'Buntulia', kodeKecamatan: '75.04.08' },
    { namaKecamatan: 'Paguat', kodeKecamatan: '75.04.02' },
    { namaKecamatan: 'Dengilo', kodeKecamatan: '75.04.10' },
    { namaKecamatan: 'Duhiadaa', kodeKecamatan: '75.04.09' },
    { namaKecamatan: 'Patilanggio', kodeKecamatan: '75.04.13' },
    { namaKecamatan: 'Randangan', kodeKecamatan: '75.04.03' },
    { namaKecamatan: 'Taluditi', kodeKecamatan: '75.04.11' },
    { namaKecamatan: 'Wanggarasi', kodeKecamatan: '75.04.12' },
    { namaKecamatan: 'Lemito', kodeKecamatan: '75.04.04' },
    { namaKecamatan: 'Popayato', kodeKecamatan: '75.04.05' },
    { namaKecamatan: 'Popayato Timur', kodeKecamatan: '75.04.06' },
    { namaKecamatan: 'Popayato Barat', kodeKecamatan: '75.04.07' },
  ];

  for (const kec of kecamatanList) {
    await client.query(
      `INSERT INTO "MasterKecamatan" (id, "namaKecamatan", "kodeKecamatan", "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) 
       ON CONFLICT ("namaKecamatan") DO UPDATE SET "kodeKecamatan" = $2, "updatedAt" = NOW();`,
      [kec.namaKecamatan, kec.kodeKecamatan]
    );
  }
  console.log('✔ 13 Kecamatan di Kabupaten Pohuwato berhasil di-seed!');

  // 2. Seeding Master Jabatan
  const jabatanList = [
    { namaJabatan: 'Kepala Kantor Kementerian Agama', deskripsi: 'Pimpinan instansi vertikal Kemenag Kabupaten Pohuwato' },
    { namaJabatan: 'Kepala Seksi Bimbingan Masyarakat Islam', deskripsi: 'Koordinator bidang urusan agama dan syariah islam' },
    { namaJabatan: 'Kepala KUA / Penghulu', deskripsi: 'Pejabat pembuat akta nikah dan kepala Kantor Urusan Agama kecamatan' },
    { namaJabatan: 'Penyuluh Agama Islam', deskripsi: 'Pegawai fungsional penyuluh bimbingan keagamaan masyarakat' },
    { namaJabatan: 'Staf Pelayanan Terpadu Satu Pintu (PTSP)', deskripsi: 'Petugas layanan administrasi publik dan perizinan' },
  ];

  for (const jab of jabatanList) {
    await client.query(
      `INSERT INTO "MasterJabatan" (id, "namaJabatan", deskripsi, "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) 
       ON CONFLICT ("namaJabatan") DO UPDATE SET deskripsi = $2, "updatedAt" = NOW();`,
      [jab.namaJabatan, jab.deskripsi]
    );
  }
  console.log('✔ Master Jabatan berhasil di-seed!');
  console.log('🎉 Seeding selesai dengan sukses!');

  await client.end();
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seeding:', e);
    process.exit(1);
  });