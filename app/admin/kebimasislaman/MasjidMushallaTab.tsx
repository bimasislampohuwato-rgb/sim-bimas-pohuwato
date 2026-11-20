'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type JenisLembagaMasjid = 'MASJID' | 'MUSHALLA';

export interface MasjidMushallaItem {
  id: string;
  jenis_lembaga?: JenisLembagaMasjid | null;
  id_masjid_simas: string | null;
  id_baru_simas: string | null;
  nama_masjid: string;
  provinsi: string | null;
  kabupaten_kota: string | null;
  kecamatan: string | null;
  tipologi: string | null;
  status_tanah: string | null;
  alamat: string | null;
  tahun_berdiri: string | null;
  luas_tanah: string | null;
  luas_bangunan: string | null;
  telepon: string | null;
  email: string | null;
  latitude_simas: number | null;
  longitude_simas: number | null;
  sumber_data: string | null;
  updated_at?: string;
}

interface MasjidMushallaTabProps {
  masjidList: MasjidMushallaItem[];
  kecamatanOptions: string[];
  kuaKecamatanLock: string | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
  onOpenImportMasjid: () => void;
}

const TIPOLOGI_OPTIONS = [
  'Masjid Jami',
  'Masjid Agung',
  'Masjid Besar',
  'Masjid Raya',
  'Masjid bersejarah',
  'Masjid di tempat publik',
  'Mushalla',
];

const STATUS_TANAH_OPTIONS = [
  'Wakaf',
  'SHM',
  'Hak Guna Bangunan',
  'Hak Pakai',
  'Milik Pemerintah / Desa',
  'Belum Bersertifikat',
];

function detectJenisLembaga(m: MasjidMushallaItem): JenisLembagaMasjid {
  if (m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID') {
    return m.jenis_lembaga;
  }
  const s1 = String(m.id_masjid_simas || '').trim();
  const s2 = String(m.id_baru_simas || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function MasjidMushallaTab({
  masjidList,
  kecamatanOptions,
  kuaKecamatanLock,
  loading,
  onRefresh,
  onNotify,
  onOpenImportMasjid,
}: MasjidMushallaTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'ALL' | JenisLembagaMasjid>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterTipologi, setFilterTipologi] = useState('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [jenisLembaga, setJenisLembaga] = useState<JenisLembagaMasjid>('MASJID');
  const [idSimas, setIdSimas] = useState('');
  const [idBaru, setIdBaru] = useState('');
  const [namaMasjid, setNamaMasjid] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [tipologi, setTipologi] = useState('Masjid Jami');
  const [statusTanah, setStatusTanah] = useState('Wakaf');
  const [alamat, setAlamat] = useState('');
  const [tahunBerdiri, setTahunBerdiri] = useState('');
  const [luasTanah, setLuasTanah] = useState('');
  const [luasBangunan, setLuasBangunan] = useState('');
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [latSimas, setLatSimas] = useState('');
  const [lngSimas, setLngSimas] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scopedList = useMemo(() => {
    if (!kuaKecamatanLock) return masjidList;
    const target = kuaKecamatanLock.toLowerCase();
    return masjidList.filter((m) => (m.kecamatan || '').trim().toLowerCase() === target);
  }, [masjidList, kuaKecamatanLock]);

  const activeKecamatanFilter = kuaKecamatanLock || filterKecamatan;

  const tipologiOptions = useMemo(() => {
    const set = new Set<string>(TIPOLOGI_OPTIONS);
    scopedList.forEach((m) => {
      if (m.tipologi && m.tipologi.trim()) set.add(m.tipologi.trim());
    });
    return Array.from(set);
  }, [scopedList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedList.filter((m) => {
      const jenis = detectJenisLembaga(m);
      if (filterJenis !== 'ALL' && jenis !== filterJenis) return false;
      if (activeKecamatanFilter !== 'ALL') {
        if ((m.kecamatan || '').trim().toLowerCase() !== activeKecamatanFilter.toLowerCase()) {
          return false;
        }
      }
      if (filterTipologi !== 'ALL') {
        if ((m.tipologi || '').trim() !== filterTipologi) return false;
      }
      if (!q) return true;
      return (
        m.nama_masjid.toLowerCase().includes(q) ||
        (m.kecamatan || '').toLowerCase().includes(q) ||
        (m.alamat || '').toLowerCase().includes(q) ||
        (m.tipologi || '').toLowerCase().includes(q) ||
        (m.id_masjid_simas || '').toLowerCase().includes(q) ||
        (m.id_baru_simas || '').toLowerCase().includes(q)
      );
    });
  }, [scopedList, filterJenis, activeKecamatanFilter, filterTipologi, searchQuery]);

  const stats = useMemo(() => {
    let masjidCount = 0;
    let mushallaCount = 0;
    scopedList.forEach((m) => {
      if (detectJenisLembaga(m) === 'MUSHALLA') mushallaCount += 1;
      else masjidCount += 1;
    });
    return {
      total: scopedList.length,
      masjid: masjidCount,
      mushalla: mushallaCount,
      tampil: filteredList.length,
    };
  }, [scopedList, filteredList.length]);

  const openCreateModal = () => {
    setEditId(null);
    setJenisLembaga('MASJID');
    setIdSimas('');
    setIdBaru('');
    setNamaMasjid('');
    setKecamatan(kuaKecamatanLock || kecamatanOptions[0] || '');
    setTipologi('Masjid Jami');
    setStatusTanah('Wakaf');
    setAlamat('');
    setTahunBerdiri('');
    setLuasTanah('');
    setLuasBangunan('');
    setTelepon('');
    setEmail('');
    setLatSimas('');
    setLngSimas('');
    setShowFormModal(true);
  };

  const openEditModal = (m: MasjidMushallaItem) => {
    const jenis = detectJenisLembaga(m);
    setEditId(m.id);
    setJenisLembaga(jenis);
    setIdSimas(m.id_masjid_simas || '');
    setIdBaru(m.id_baru_simas || '');
    setNamaMasjid(m.nama_masjid || '');
    setKecamatan(kuaKecamatanLock || m.kecamatan || '');
    setTipologi(m.tipologi || (jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid Jami'));
    setStatusTanah(m.status_tanah || 'Wakaf');
    setAlamat(m.alamat || '');
    setTahunBerdiri(m.tahun_berdiri || '');
    setLuasTanah(m.luas_tanah || '');
    setLuasBangunan(m.luas_bangunan || '');
    setTelepon(m.telepon || '');
    setEmail(m.email || '');
    setLatSimas(m.latitude_simas != null ? String(m.latitude_simas) : '');
    setLngSimas(m.longitude_simas != null ? String(m.longitude_simas) : '');
    setShowFormModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMasjid.trim()) {
      onNotify('error', 'Nama Wajib Diisi', 'Silakan masukkan nama masjid atau mushalla.');
      return;
    }

    setSaving(true);
    try {
      const effectiveKec = (kuaKecamatanLock || kecamatan || '').trim() || null;
      const payload: Record<string, any> = {
        jenis_lembaga: jenisLembaga,
        id_masjid_simas: idSimas.trim() || null,
        id_baru_simas: idBaru.trim() || null,
        nama_masjid: namaMasjid.trim(),
        provinsi: 'Gorontalo',
        kabupaten_kota: 'Pohuwato',
        kecamatan: effectiveKec,
        tipologi: tipologi.trim() || null,
        status_tanah: statusTanah.trim() || null,
        alamat: alamat.trim() || null,
        tahun_berdiri: tahunBerdiri.trim() || null,
        luas_tanah: luasTanah.trim() || null,
        luas_bangunan: luasBangunan.trim() || null,
        telepon: telepon.trim() || null,
        email: email.trim() || null,
        latitude_simas: parseNumberOrNull(latSimas),
        longitude_simas: parseNumberOrNull(lngSimas),
        sumber_data: 'SIMAS / Input Manual',
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error } = await supabase
          .from('masjid_mushalla')
          .update(payload)
          .eq('id', editId);
        if (error) throw new Error(error.message);
        onNotify('success', 'Data Diperbarui', `"${namaMasjid.trim()}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from('masjid_mushalla').insert(payload);
        if (error) throw new Error(error.message);
        onNotify('success', 'Data Ditambahkan', `"${namaMasjid.trim()}" berhasil ditambahkan.`);
      }

      setShowFormModal(false);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan Data', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('masjid_mushalla')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw new Error(error.message);

      const deletedName = deleteTarget.nama;
      setDeleteTarget(null);
      onNotify('success', 'Data Dihapus', `"${deletedName}" berhasil dihapus.`);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menghapus Data', err?.message || 'Terjadi kesalahan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenImportMasjid}
          className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition"
        >
          Import Excel SIMAS
        </button>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
        >
          + Tambah Masjid / Mushalla
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Total Terdaftar</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">Jumlah Masjid</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">{stats.masjid}</div>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-teal-700">Jumlah Mushalla</div>
          <div className="text-xl font-bold text-teal-800 mt-0.5">{stats.mushalla}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Hasil Filter</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.tampil}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, ID SIMAS, alamat, kecamatan..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Jenis Lembaga"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as 'ALL' | JenisLembagaMasjid)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="MASJID">Masjid</option>
              <option value="MUSHALLA">Mushalla</option>
            </select>
          </div>
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Kecamatan"
              value={activeKecamatanFilter}
              disabled={Boolean(kuaKecamatanLock)}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 disabled:bg-gray-100"
            >
              {!kuaKecamatanLock && <option value="ALL">Semua Kecamatan</option>}
              {kecamatanOptions.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Tipologi"
              value={filterTipologi}
              onChange={(e) => setFilterTipologi(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Tipologi</option>
              {tipologiOptions.map((tip) => (
                <option key={tip} value={tip}>
                  {tip}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Memuat data Masjid &amp; Mushalla...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Belum ada data Masjid atau Mushalla sesuai filter.
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredList.map((m) => {
                const jenis = detectJenisLembaga(m);
                return (
                  <div key={m.id} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800">
                          {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">{m.nama_masjid}</h3>
                        <p className="text-[11px] font-mono text-gray-500">
                          SIMAS: {m.id_masjid_simas || m.id_baru_simas || '-'}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {m.tipologi || '-'}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <strong>Alamat:</strong> {m.alamat || '-'}
                      </div>
                      <div>
                        <strong>Tanah:</strong> {m.status_tanah || '-'} •{' '}
                        <strong>Berdiri:</strong> {m.tahun_berdiri || '-'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: m.id, nama: m.nama_masjid })}
                        className="py-2 px-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Nama &amp; ID SIMAS</th>
                    <th className="px-5 py-3.5 font-semibold">Kecamatan &amp; Tipologi</th>
                    <th className="px-5 py-3.5 font-semibold">Alamat &amp; Status Tanah</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredList.map((m) => {
                    const jenis = detectJenisLembaga(m);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-900">{m.nama_masjid}</div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • ID:{' '}
                            <span className="font-mono">
                              {m.id_masjid_simas || m.id_baru_simas || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                          <div className="font-semibold text-gray-900">{m.kecamatan || '-'}</div>
                          <div>{m.tipologi || '-'}</div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 max-w-md">
                          <div>{m.alamat || '-'}</div>
                          <div className="text-[11px] text-gray-500">
                            Tanah: {m.status_tanah || '-'} • Thn: {m.tahun_berdiri || '-'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(m)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: m.id, nama: m.nama_masjid })}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editId ? 'Edit Masjid / Mushalla' : 'Tambah Masjid / Mushalla'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Lengkapi identitas SIMAS, lokasi kecamatan, tipologi, dan status tanah.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Jenis Lembaga *
                  </label>
                  <select
                    value={jenisLembaga}
                    onChange={(e) => setJenisLembaga(e.target.value as JenisLembagaMasjid)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 bg-white"
                  >
                    <option value="MASJID">Masjid</option>
                    <option value="MUSHALLA">Mushalla</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    ID Masjid SIMAS
                  </label>
                  <input
                    type="text"
                    value={idSimas}
                    onChange={(e) => setIdSimas(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    ID Baru SIMAS
                  </label>
                  <input
                    type="text"
                    value={idBaru}
                    onChange={(e) => setIdBaru(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nama Masjid / Mushalla *
                </label>
                <input
                  type="text"
                  required
                  value={namaMasjid}
                  onChange={(e) => setNamaMasjid(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Kecamatan
                  </label>
                  <select
                    value={kuaKecamatanLock || kecamatan}
                    disabled={Boolean(kuaKecamatanLock)}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white disabled:bg-gray-100"
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {kecamatanOptions.map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tipologi
                  </label>
                  <select
                    value={tipologi}
                    onChange={(e) => setTipologi(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
                  >
                    {tipologiOptions.map((tip) => (
                      <option key={tip} value={tip}>
                        {tip}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Status Tanah
                  </label>
                  <select
                    value={statusTanah}
                    onChange={(e) => setStatusTanah(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white"
                  >
                    {STATUS_TANAH_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tahun Berdiri
                  </label>
                  <input
                    type="text"
                    value={tahunBerdiri}
                    onChange={(e) => setTahunBerdiri(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Luas Tanah
                  </label>
                  <input
                    type="text"
                    value={luasTanah}
                    onChange={(e) => setLuasTanah(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Luas Bangunan
                  </label>
                  <input
                    type="text"
                    value={luasBangunan}
                    onChange={(e) => setLuasBangunan(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Telepon / HP
                  </label>
                  <input
                    type="text"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Latitude SIMAS
                  </label>
                  <input
                    type="text"
                    value={latSimas}
                    onChange={(e) => setLatSimas(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Longitude SIMAS
                  </label>
                  <input
                    type="text"
                    value={lngSimas}
                    onChange={(e) => setLngSimas(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
            <p className="text-xs text-gray-600 mb-6">
              Yakin ingin menghapus <strong className="text-gray-900">&quot;{deleteTarget.nama}&quot;</strong>?
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}