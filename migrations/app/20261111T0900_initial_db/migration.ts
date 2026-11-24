#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e58fdcdda522de06f16eec501d266baf4e239bdd06954cb62b5343de40d8a956/contract';
import endContract from '../../snapshots/e58fdcdda522de06f16eec501d266baf4e239bdd06954cb62b5343de40d8a956/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'DataLembagaKeagamaan',
        columns: [
          col('alamat', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jenisLembaga', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kecamatanId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaLembaga', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nomorSk', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('pimpinan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tahunBerdiri', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DataMasjid',
        columns: [
          col('alamatLengkap', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kecamatanId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kontakTakmir', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('luasTanah', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('namaMasjid', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaTakmir', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('statusTanah', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tahunBerdiri', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('tipeMasjid', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'KuaProfile',
        columns: [
          col('alamat', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kecamatanId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kepalaKuaNip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('namaKua', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('telepon', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LayananPtsp',
        columns: [
          col('berkasUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('catatanPetugas', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jenisLayanan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('keperluan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaPemohon', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nikPemohon', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nomorTiket', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('petugasId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MasterJabatan',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('deskripsi', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaJabatan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MasterKecamatan',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kodeKecamatan', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('namaKecamatan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Pegawai',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fotoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('gelarBelakang', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('gelarDepan', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jabatanId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kecamatanId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('namaLengkap', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nip', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nomorHp', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('statusKeaktifan', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PencatatanNikah',
        columns: [
          col('alamatAkad', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lokasiAkad', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaIstri', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('namaSuami', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nomorPendaftaran', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('penghuluId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('statusNikah', 'text', {
            notNull: true,
            default: lit('TERDAFTAR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tanggalAkad', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'KuaProfile',
        constraint: 'KuaProfile_kecamatanId_key',
        columns: ['kecamatanId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'LayananPtsp',
        constraint: 'LayananPtsp_nomorTiket_key',
        columns: ['nomorTiket'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'MasterJabatan',
        constraint: 'MasterJabatan_namaJabatan_key',
        columns: ['namaJabatan'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'MasterKecamatan',
        constraint: 'MasterKecamatan_namaKecamatan_key',
        columns: ['namaKecamatan'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'MasterKecamatan',
        constraint: 'MasterKecamatan_kodeKecamatan_key',
        columns: ['kodeKecamatan'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Pegawai',
        constraint: 'Pegawai_nip_key',
        columns: ['nip'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Pegawai',
        constraint: 'Pegawai_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PencatatanNikah',
        constraint: 'PencatatanNikah_nomorPendaftaran_key',
        columns: ['nomorPendaftaran'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DataLembagaKeagamaan',
        index: 'DataLembagaKeagamaan_kecamatanId_idx_b56575e3',
        columns: ['kecamatanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DataMasjid',
        index: 'DataMasjid_kecamatanId_idx_b56575e3',
        columns: ['kecamatanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LayananPtsp',
        index: 'LayananPtsp_petugasId_idx_c3b1f58e',
        columns: ['petugasId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Pegawai',
        index: 'Pegawai_jabatanId_idx_2ad10016',
        columns: ['jabatanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Pegawai',
        index: 'Pegawai_kecamatanId_idx_b56575e3',
        columns: ['kecamatanId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PencatatanNikah',
        index: 'PencatatanNikah_penghuluId_idx_53081b55',
        columns: ['penghuluId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DataLembagaKeagamaan',
        foreignKey: {
          name: 'DataLembagaKeagamaan_kecamatanId_fkey',
          columns: ['kecamatanId'],
          references: { schema: 'public', table: 'MasterKecamatan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DataMasjid',
        foreignKey: {
          name: 'DataMasjid_kecamatanId_fkey',
          columns: ['kecamatanId'],
          references: { schema: 'public', table: 'MasterKecamatan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'KuaProfile',
        foreignKey: {
          name: 'KuaProfile_kecamatanId_fkey',
          columns: ['kecamatanId'],
          references: { schema: 'public', table: 'MasterKecamatan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LayananPtsp',
        foreignKey: {
          name: 'LayananPtsp_petugasId_fkey',
          columns: ['petugasId'],
          references: { schema: 'public', table: 'Pegawai', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Pegawai',
        foreignKey: {
          name: 'Pegawai_jabatanId_fkey',
          columns: ['jabatanId'],
          references: { schema: 'public', table: 'MasterJabatan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Pegawai',
        foreignKey: {
          name: 'Pegawai_kecamatanId_fkey',
          columns: ['kecamatanId'],
          references: { schema: 'public', table: 'MasterKecamatan', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PencatatanNikah',
        foreignKey: {
          name: 'PencatatanNikah_penghuluId_fkey',
          columns: ['penghuluId'],
          references: { schema: 'public', table: 'Pegawai', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

