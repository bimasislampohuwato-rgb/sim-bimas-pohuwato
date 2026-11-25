'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface MajelisTaklimItem {
  id?: string;
  no_urut?: number | null;
  nomor_skt: string;
  nama_majelis_taklim: string;
  ketua_pimpinan?: string | null;
  tahun_berdiri?: number | null;
  provinsi?: string | null;
  kabupaten_kota?: string | null;
  kecamatan?: string | null;
  kelurahan?: string | null;
  alamat?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telepon_pengurus?: string | null;
  telepon_lembaga?: string | null;
  email?: string | null;
  jumlah_jamaah?: string | null;
  jumlah_jamaah_fix?: number | null;
  jamaah_usia?: string | null;
  jamaah_kelamin?: string | null;
  jamaah_khusus?: string | null;
  waktu_belajar?: string | null;
  frekuensi_belajar?: string | null;
  kegiatan?: string | null;
  kegiatan_unggulan?: string | null;
  materi_kajian?: string | null;
  rujukan_materi?: string | null;
  penyelenggara?: string | null;
  sarana_belajar?: string | null;
  fasilitas?: string | null;
  afiliasi?: string | null;
  no_akte_notaris?: string | null;
  jumlah_pengurus?: number | null;
  jumlah_pengajar_angka?: number | null;
  pengajar_info?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  sk_pengurus_url?: string | null;
  foto_kegiatan_url?: string | null;
}

interface MajelisTaklimTabProps {
  kecamatanOptions: string[];
  kuaKecamatanLock?: string | null;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
}

function cleanCellText(val: any): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/\s+/g, ' ').trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'nan') {
    return null;
  }
  return str;
}

function parseIntSafe(val: any): number | null {
  const cleaned = cleanCellText(val);
  if (!cleaned) return null;
  const match = cleaned.replace(/,/g, '').match(/-?\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isFinite(num) ? num : null;
}

function parseFloatSafe(val: any): number | null {
  const cleaned = cleanCellText(val);
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function resolveDocUrl(primaryVal: any, fallbackUrlVal: any): string | null {
  const fb = cleanCellText(fallbackUrlVal);
  if (fb && /^https?:\/\//i.test(fb)) return fb;

  const pr = cleanCellText(primaryVal);
  if (!pr) return null;
  if (/^https?:\/\//i.test(pr)) return pr;
  return `https://simpenais.kemenag.go.id/${pr.replace(/^\/+/, '')}`;
}

function parseSimpenaisExcelRows(rawRows: Record<string, any>[]): MajelisTaklimItem[] {
  const results: MajelisTaklimItem[] = [];

  for (const row of rawRows) {
    const namaMt = cleanCellText(
      row['Nama Majelis Taklim'] ?? row['nama_majelis_taklim'] ?? row['Nama MT']
    );
    const noSkt = cleanCellText(row['Nomor SKT'] ?? row['nomor_skt']);

    if (!namaMt && !noSkt) continue;

    const pengajarRaw = cleanCellText(row['Jumlah Pengajar'] ?? row['Pengajar']);
    const pengajarAngka = parseIntSafe(pengajarRaw);

    const skUrl = resolveDocUrl(
      row['SK Pengurus'],
      row['Unnamed: 41'] ?? row['SK Pengurus URL']
    );
    const fotoUrl = resolveDocUrl(
      row['Foto Kegiatan'],
      row['Unnamed: 42'] ?? row['Foto Kegiatan URL']
    );

    results.push({
      no_urut: parseIntSafe(row['No']),
      nomor_skt: noSkt || `TANPA-SKT-${results.length + 1}`,
      nama_majelis_taklim: namaMt || 'Majelis Taklim Tanpa Nama',
      ketua_pimpinan: cleanCellText(row['Nama Ketua/Pimpinan'] ?? row['Ketua/Pimpinan']),
      tahun_berdiri: parseIntSafe(row['Tahun Berdiri']),
      provinsi: cleanCellText(row['Provinsi']) || 'GORONTALO',
      kabupaten_kota: cleanCellText(row['Kabupaten/Kota']) || 'KAB. POHUWATO',
      kecamatan: cleanCellText(row['Kecamatan']),
      kelurahan: cleanCellText(row['Kelurahan']),
      alamat: cleanCellText(row['Alamat']),
      latitude: parseFloatSafe(row['Latitude']),
      longitude: parseFloatSafe(row['Longitude']),
      telepon_pengurus: cleanCellText(row['Telepon Pengurus']),
      telepon_lembaga: cleanCellText(row['Telepon Lembaga']),
      email: cleanCellText(row['Email']),
      jumlah_jamaah: cleanCellText(row['Jumlah Jamaah']),
      jumlah_jamaah_fix: parseIntSafe(row['Jumlah Jamaah Fix']),
      jamaah_usia: cleanCellText(row['Jamaah Berdasarkan Usia']),
      jamaah_kelamin: cleanCellText(row['Jamaah Berdasarkan Kelamin']),
      jamaah_khusus: cleanCellText(row['Jamaah Khusus']),
      waktu_belajar: cleanCellText(row['Waktu Belajar']),
      frekuensi_belajar: cleanCellText(row['Frekuensi Belajar']),
      kegiatan: cleanCellText(row['Kegiatan']),
      kegiatan_unggulan: cleanCellText(row['Kegiatan Unggulan']),
      materi_kajian: cleanCellText(row['Materi Kajian']),
      rujukan_materi: cleanCellText(row['Rujukan Materi']),
      penyelenggara: cleanCellText(row['Penyelenggara']),
      sarana_belajar: cleanCellText(row['Sarana Belajar']),
      fasilitas: cleanCellText(row['Fasilitas']),
      afiliasi: cleanCellText(row['Afiliasi']),
      no_akte_notaris: cleanCellText(row['No. Akte Notaris']),
      jumlah_pengurus: parseIntSafe(row['Jumlah Pengurus']) ?? 0,
      jumlah_pengajar_angka: pengajarAngka,
      pengajar_info: pengajarRaw,
      website: cleanCellText(row['Website']),
      instagram: cleanCellText(row['Instagram']),
      facebook: cleanCellText(row['Facebook']),
      twitter: cleanCellText(row['Twitter']),
      youtube: cleanCellText(row['Youtube']),
      tiktok: cleanCellText(row['Tiktok']),
      sk_pengurus_url: skUrl,
      foto_kegiatan_url: fotoUrl,
    });
  }

  return results;
}

const EMPTY_FORM: MajelisTaklimItem = {
  nomor_skt: '',
  nama_majelis_taklim: '',
  ketua_pimpinan: '',
  tahun_berdiri: new Date().getFullYear(),
  provinsi: 'GORONTALO',
  kabupaten_kota: 'KAB. POHUWATO',
  kecamatan: '',
  kelurahan: '',
  alamat: '',
  afiliasi: '',
  jumlah_pengurus: 0,
  pengajar_info: '',
  email: '',
  telepon_pengurus: '',
  kegiatan_unggulan: '',
  materi_kajian: '',
};

export default function MajelisTaklimTab({
  kecamatanOptions,
  kuaKecamatanLock = null,
  onNotify,
}: MajelisTaklimTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<MajelisTaklimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterAfiliasi, setFilterAfiliasi] = useState('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MajelisTaklimItem>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailItem, setDetailItem] = useState<MajelisTaklimItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MajelisTaklimItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMajelisTaklim = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('majelis_taklim')
      .select('*')
      .order('nama_majelis_taklim', { ascending: true });

    setLoading(false);
    if (error) {
      onNotify('error', 'Gagal Memuat Data', error.message);
      return;
    }
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchMajelisTaklim();
  }, []);

  const scopedItems = useMemo(() => {
    if (!kuaKecamatanLock) return items;
    const lockLower = kuaKecamatanLock.trim().toLowerCase();
    return items.filter((it) => (it.kecamatan || '').trim().toLowerCase() === lockLower);
  }, [items, kuaKecamatanLock]);

  const afiliasiOptions = useMemo(() => {
    const set = new Set<string>();
    scopedItems.forEach((it) => {
      if (it.afiliasi) set.add(it.afiliasi);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [scopedItems]);

  const activeKecamatan = kuaKecamatanLock || filterKecamatan;

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedItems.filter((it) => {
      if (activeKecamatan !== 'ALL') {
        if ((it.kecamatan || '').trim().toLowerCase() !== activeKecamatan.toLowerCase()) {
          return false;
        }
      }
      if (filterAfiliasi !== 'ALL') {
        if ((it.afiliasi || '').trim().toLowerCase() !== filterAfiliasi.toLowerCase()) {
          return false;
        }
      }
      if (!q) return true;
      return (
        (it.nama_majelis_taklim || '').toLowerCase().includes(q) ||
        (it.nomor_skt || '').toLowerCase().includes(q) ||
        (it.ketua_pimpinan || '').toLowerCase().includes(q) ||
        (it.kecamatan || '').toLowerCase().includes(q) ||
        (it.alamat || '').toLowerCase().includes(q)
      );
    });
  }, [scopedItems, activeKecamatan, filterAfiliasi, searchQuery]);

  const stats = useMemo(() => {
    const totalMt = scopedItems.length;
    const totalPengurus = scopedItems.reduce(
      (acc, cur) => acc + (Number(cur.jumlah_pengurus) || 0),
      0
    );
    const kecAktif = new Set(
      scopedItems.map((it) => (it.kecamatan || '').trim().toUpperCase()).filter(Boolean)
    ).size;
    const punyaDokumen = scopedItems.filter(
      (it) => Boolean(it.sk_pengurus_url || it.foto_kegiatan_url)
    ).length;

    return { totalMt, totalPengurus, kecAktif, punyaDokumen };
  }, [scopedItems]);

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const targetSheetName = workbook.SheetNames.includes('Data MT')
        ? 'Data MT'
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[targetSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });

      const parsedRows = parseSimpenaisExcelRows(rawJson);
      if (parsedRows.length === 0) {
        throw new Error('Tidak ditemukan baris data Majelis Taklim yang valid pada file Excel.');
      }

      const payloadWithTimestamp = parsedRows.map((r) => ({
        ...r,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('majelis_taklim')
        .upsert(payloadWithTimestamp, { onConflict: 'nomor_skt' });

      if (error) throw new Error(error.message);

      onNotify(
        'success',
        'Import SIMPENAIS Berhasil',
        `${parsedRows.length} data Majelis Taklim berhasil diimpor/diperbarui dari "${file.name}".`
      );
      await fetchMajelisTaklim();
    } catch (err: any) {
      onNotify(
        'error',
        'Gagal Import Excel',
        err?.message || 'Pastikan format file Excel sesuai ekspor SIMPENAIS.'
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      kecamatan: kuaKecamatanLock || kecamatanOptions[0] || '',
    });
    setShowFormModal(true);
  };

  const openEditModal = (item: MajelisTaklimItem) => {
    setEditingId(item.id || null);
    setFormData({ ...item });
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomor_skt.trim() || !formData.nama_majelis_taklim.trim()) {
      onNotify('error', 'Data Wajib Diisi', 'Nomor SKT dan Nama Majelis Taklim wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nomor_skt: formData.nomor_skt.trim(),
        nama_majelis_taklim: formData.nama_majelis_taklim.trim(),
        ketua_pimpinan: cleanCellText(formData.ketua_pimpinan),
        tahun_berdiri: parseIntSafe(formData.tahun_berdiri),
        provinsi: cleanCellText(formData.provinsi) || 'GORONTALO',
        kabupaten_kota: cleanCellText(formData.kabupaten_kota) || 'KAB. POHUWATO',
        kecamatan: kuaKecamatanLock || cleanCellText(formData.kecamatan),
        kelurahan: cleanCellText(formData.kelurahan),
        alamat: cleanCellText(formData.alamat),
        afiliasi: cleanCellText(formData.afiliasi),
        jumlah_pengurus: parseIntSafe(formData.jumlah_pengurus) ?? 0,
        pengajar_info: cleanCellText(formData.pengajar_info),
        jumlah_pengajar_angka: parseIntSafe(formData.pengajar_info),
        email: cleanCellText(formData.email),
        telepon_pengurus: cleanCellText(formData.telepon_pengurus),
        kegiatan_unggulan: cleanCellText(formData.kegiatan_unggulan),
        materi_kajian: cleanCellText(formData.materi_kajian),
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('majelis_taklim')
          .update(payload)
          .eq('id', editingId);
        if (error) throw new Error(error.message);
        onNotify('success', 'Berhasil Diperbarui', 'Data Majelis Taklim berhasil diperbarui.');
      } else {
        const { error } = await supabase
          .from('majelis_taklim')
          .upsert([payload], { onConflict: 'nomor_skt' });
        if (error) throw new Error(error.message);
        onNotify('success', 'Berhasil Disimpan', 'Data Majelis Taklim baru berhasil disimpan.');
      }

      setShowFormModal(false);
      await fetchMajelisTaklim();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan', err?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('majelis_taklim')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw new Error(error.message);
      setDeleteTarget(null);
      onNotify('success', 'Berhasil Dihapus', 'Data Majelis Taklim telah dihapus.');
      await fetchMajelisTaklim();
    } catch (err: any) {
      onNotify('error', 'Gagal Menghapus', err?.message || 'Terjadi kesalahan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Manajemen Majelis Taklim (SIMPENAIS)
          </h2>
          <p className="text-xs text-gray-500">
            Kelola data Majelis Taklim beserta import langsung file Excel ekspor SIMPENAIS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImportChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition disabled:opacity-60"
          >
            {importing ? 'Mengimpor Excel...' : '📥 Import Excel SIMPENAIS'}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            + Tambah Majelis Taklim
          </button>
        </div>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Total Majelis Taklim</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalMt}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">Kecamatan Tercakup</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">{stats.kecAktif}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700">Total Pengurus</div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">
            {stats.totalPengurus.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700">Memiliki Tautan SK/Foto</div>
          <div className="text-xl font-bold text-sky-900 mt-0.5">{stats.punyaDokumen}</div>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama majelis taklim, nomor SKT, ketua/pimpinan, atau alamat..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Kecamatan Majelis Taklim"
              value={activeKecamatan}
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
              aria-label="Filter Afiliasi"
              value={filterAfiliasi}
              onChange={(e) => setFilterAfiliasi(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Afiliasi</option>
              {afiliasiOptions.map((af) => (
                <option key={af} value={af}>
                  {af}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daftar / Tabel */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Memuat data Majelis Taklim...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Belum ada data Majelis Taklim. Klik <strong>Import Excel SIMPENAIS</strong> untuk memuat
            data dari file Excel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Nama &amp; Nomor SKT</th>
                  <th className="px-5 py-3.5 font-semibold">Ketua / Pimpinan &amp; Tahun</th>
                  <th className="px-5 py-3.5 font-semibold">Kecamatan &amp; Alamat</th>
                  <th className="px-5 py-3.5 font-semibold">Pengurus &amp; Pengajar</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredItems.map((it, idx) => (
                  <tr key={it.id || it.nomor_skt || idx} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-900">{it.nama_majelis_taklim}</div>
                      <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                        {it.nomor_skt}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700">
                      <div className="font-semibold text-gray-900">
                        {it.ketua_pimpinan || '-'}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        Berdiri: {it.tahun_berdiri || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700 max-w-xs">
                      <div className="font-bold text-emerald-800">{it.kecamatan || '-'}</div>
                      <div className="text-gray-600 truncate" title={it.alamat || ''}>
                        {it.alamat || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700">
                      <div>
                        Pengurus: <strong>{it.jumlah_pengurus ?? 0}</strong>
                      </div>
                      <div className="text-gray-600 truncate max-w-[180px]" title={it.pengajar_info || ''}>
                        Pengajar: <strong>{it.pengajar_info || '-'}</strong>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailItem(it)}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold"
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(it)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(it)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {editingId ? 'Edit Majelis Taklim' : 'Tambah Majelis Taklim'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Lengkapi data kelembagaan Majelis Taklim sesuai dokumen/SKT.
            </p>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nomor SKT *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomor_skt}
                    onChange={(e) => setFormData({ ...formData, nomor_skt: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tahun Berdiri
                  </label>
                  <input
                    type="number"
                    value={formData.tahun_berdiri ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tahun_berdiri: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Majelis Taklim *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_majelis_taklim}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_majelis_taklim: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ketua / Pimpinan
                  </label>
                  <input
                    type="text"
                    value={formData.ketua_pimpinan || ''}
                    onChange={(e) => setFormData({ ...formData, ketua_pimpinan: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Kecamatan
                  </label>
                  <select
                    value={kuaKecamatanLock || formData.kecamatan || ''}
                    disabled={Boolean(kuaKecamatanLock)}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white disabled:bg-gray-100"
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {kecamatanOptions.map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Jumlah Pengurus
                  </label>
                  <input
                    type="number"
                    value={formData.jumlah_pengurus ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jumlah_pengurus: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pengajar (Jumlah / Nama)
                  </label>
                  <input
                    type="text"
                    value={formData.pengajar_info || ''}
                    onChange={(e) => setFormData({ ...formData, pengajar_info: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Afiliasi</label>
                  <input
                    type="text"
                    value={formData.afiliasi || ''}
                    onChange={(e) => setFormData({ ...formData, afiliasi: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
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

      {/* Modal Detail */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b pb-3">
              <div>
                <div className="text-[11px] font-mono font-bold text-emerald-800">
                  {detailItem.nomor_skt}
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {detailItem.nama_majelis_taklim}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-gray-500 block">Ketua / Pimpinan</span>
                <strong className="text-gray-900">{detailItem.ketua_pimpinan || '-'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Tahun Berdiri</span>
                <strong className="text-gray-900">{detailItem.tahun_berdiri || '-'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Kecamatan</span>
                <strong className="text-gray-900">{detailItem.kecamatan || '-'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Afiliasi</span>
                <strong className="text-gray-900">{detailItem.afiliasi || '-'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Jumlah Pengurus</span>
                <strong className="text-gray-900">{detailItem.jumlah_pengurus ?? 0}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Pengajar</span>
                <strong className="text-gray-900">{detailItem.pengajar_info || '-'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Alamat</span>
                <strong className="text-gray-900">{detailItem.alamat || '-'}</strong>
              </div>
              {detailItem.kegiatan_unggulan && (
                <div className="col-span-2">
                  <span className="text-gray-500 block">Kegiatan Unggulan</span>
                  <strong className="text-gray-900">{detailItem.kegiatan_unggulan}</strong>
                </div>
              )}
              {detailItem.materi_kajian && (
                <div className="col-span-2">
                  <span className="text-gray-500 block">Materi Kajian</span>
                  <strong className="text-gray-900">{detailItem.materi_kajian}</strong>
                </div>
              )}
            </div>

            {(detailItem.sk_pengurus_url || detailItem.foto_kegiatan_url) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t text-xs">
                {detailItem.sk_pengurus_url && (
                  <a
                    href={detailItem.sk_pengurus_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:underline"
                  >
                    Lihat SK Pengurus
                  </a>
                )}
                {detailItem.foto_kegiatan_url && (
                  <a
                    href={detailItem.foto_kegiatan_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-semibold hover:underline"
                  >
                    Lihat Foto Kegiatan
                  </a>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center space-y-4">
            <h3 className="text-base font-bold text-gray-900">Hapus Majelis Taklim?</h3>
            <p className="text-xs text-gray-600">
              Yakin ingin menghapus <strong>{deleteTarget.nama_majelis_taklim}</strong> (
              <span className="font-mono">{deleteTarget.nomor_skt}</span>)?
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
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