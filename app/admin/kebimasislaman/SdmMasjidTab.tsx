'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type JenisLembagaSdm = 'MASJID' | 'MUSHALLA';

export interface SdmMasjidItem {
  id: string;
  jenis_lembaga?: JenisLembagaSdm | null;
  id_masjid_simas: string | null;
  id_baru_simas: string | null;
  nama_masjid: string;
  kecamatan: string | null;
  alamat: string | null;
}

export interface SdmDataItem {
  id?: string;
  masjid_id: string | null;
  id_masjid_simas: string | null;
  nama_masjid: string;
  kecamatan: string | null;
  jumlah_pengurus: number;
  ketua_pengurus: string;
  no_hp_ketua: string;
  nama_sekretaris: string;
  no_hp_sekretaris: string;
  daftar_imam: string[];
  daftar_khatib: string[];
  daftar_muazin: string[];
  jumlah_remaja: number;
  ketua_remaja: string;
  kategori_jamaah: string;
}

interface SdmMasjidTabProps {
  masjidList: SdmMasjidItem[];
  sdmMap: Record<string, SdmDataItem>;
  kecamatanOptions: string[];
  kuaKecamatanLock: string | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
  onOpenImportSdm: () => void;
  onDownloadTemplateSdm: () => void;
}

const KATEGORI_JAMAAH_OPTIONS = ['< 50', '50 - 100', '100 - 200', '200 - 1000', '> 1000'];

function detectJenisLembaga(m: SdmMasjidItem): JenisLembagaSdm {
  if (m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID') {
    return m.jenis_lembaga;
  }
  const s1 = String(m.id_masjid_simas || '').trim();
  const s2 = String(m.id_baru_simas || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
}

function parseListInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListDisplay(arr?: string[] | null): string {
  if (!arr || arr.length === 0) return '-';
  return arr.join(', ');
}

export default function SdmMasjidTab({
  masjidList,
  sdmMap,
  kecamatanOptions,
  kuaKecamatanLock,
  loading,
  onRefresh,
  onNotify,
  onOpenImportSdm,
  onDownloadTemplateSdm,
}: SdmMasjidTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'ALL' | JenisLembagaSdm>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterStatusSdm, setFilterStatusSdm] = useState<'ALL' | 'SUDAH' | 'BELUM'>('ALL');
  const [filterKategoriJamaah, setFilterKategoriJamaah] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [selectedMasjidId, setSelectedMasjidId] = useState('');
  const [jumlahPengurus, setJumlahPengurus] = useState('0');
  const [ketuaPengurus, setKetuaPengurus] = useState('');
  const [noHpKetua, setNoHpKetua] = useState('');
  const [namaSekretaris, setNamaSekretaris] = useState('');
  const [noHpSekretaris, setNoHpSekretaris] = useState('');
  const [daftarImamText, setDaftarImamText] = useState('');
  const [daftarKhatibText, setDaftarKhatibText] = useState('');
  const [daftarMuazinText, setDaftarMuazinText] = useState('');
  const [jumlahRemaja, setJumlahRemaja] = useState('0');
  const [ketuaRemaja, setKetuaRemaja] = useState('');
  const [kategoriJamaah, setKategoriJamaah] = useState('50 - 100');
  const [saving, setSaving] = useState(false);

  const getSdmForMasjid = (m: SdmMasjidItem): SdmDataItem | undefined => {
    return (
      sdmMap[m.id] ||
      (m.id_masjid_simas ? sdmMap[m.id_masjid_simas] : undefined) ||
      sdmMap[m.nama_masjid]
    );
  };

  const hasSdmRecord = (s?: SdmDataItem): boolean => {
    if (!s) return false;
    return Boolean(
      s.id ||
        s.ketua_pengurus?.trim() ||
        s.nama_sekretaris?.trim() ||
        s.ketua_remaja?.trim() ||
        (s.jumlah_pengurus || 0) > 0 ||
        (s.jumlah_remaja || 0) > 0 ||
        (s.daftar_imam && s.daftar_imam.length > 0) ||
        (s.daftar_khatib && s.daftar_khatib.length > 0) ||
        (s.daftar_muazin && s.daftar_muazin.length > 0)
    );
  };

  const scopedMasjid = useMemo(() => {
    if (!kuaKecamatanLock) return masjidList;
    const target = kuaKecamatanLock.trim().toLowerCase();
    return masjidList.filter((m) => (m.kecamatan || '').trim().toLowerCase() === target);
  }, [masjidList, kuaKecamatanLock]);

  const activeKecamatanFilter = kuaKecamatanLock || filterKecamatan;

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedMasjid.filter((m) => {
      const jenis = detectJenisLembaga(m);
      if (filterJenis !== 'ALL' && jenis !== filterJenis) return false;

      if (activeKecamatanFilter !== 'ALL') {
        if ((m.kecamatan || '').trim().toLowerCase() !== activeKecamatanFilter.toLowerCase()) {
          return false;
        }
      }

      const s = getSdmForMasjid(m);
      const terdata = hasSdmRecord(s);
      if (filterStatusSdm === 'SUDAH' && !terdata) return false;
      if (filterStatusSdm === 'BELUM' && terdata) return false;

      if (filterKategoriJamaah !== 'ALL') {
        if ((s?.kategori_jamaah || '').trim() !== filterKategoriJamaah) return false;
      }

      if (!q) return true;
      return (
        m.nama_masjid.toLowerCase().includes(q) ||
        (m.kecamatan || '').toLowerCase().includes(q) ||
        (m.alamat || '').toLowerCase().includes(q) ||
        (m.id_masjid_simas || '').toLowerCase().includes(q) ||
        (s?.ketua_pengurus || '').toLowerCase().includes(q) ||
        (s?.nama_sekretaris || '').toLowerCase().includes(q) ||
        (s?.ketua_remaja || '').toLowerCase().includes(q) ||
        (s?.daftar_imam || []).join(' ').toLowerCase().includes(q) ||
        (s?.daftar_khatib || []).join(' ').toLowerCase().includes(q) ||
        (s?.daftar_muazin || []).join(' ').toLowerCase().includes(q)
      );
    });
  }, [
    scopedMasjid,
    filterJenis,
    activeKecamatanFilter,
    filterStatusSdm,
    filterKategoriJamaah,
    searchQuery,
    sdmMap,
  ]);

  const summaryStats = useMemo(() => {
    const totalLembaga = scopedMasjid.length;
    let sudahTerdata = 0;
    let totalPengurus = 0;
    let totalRemaja = 0;

    scopedMasjid.forEach((m) => {
      const s = getSdmForMasjid(m);
      if (hasSdmRecord(s)) sudahTerdata += 1;
      totalPengurus += Number(s?.jumlah_pengurus || 0);
      totalRemaja += Number(s?.jumlah_remaja || 0);
    });

    return {
      totalLembaga,
      sudahTerdata,
      belumTerdata: Math.max(0, totalLembaga - sudahTerdata),
      totalPengurus,
      totalRemaja,
    };
  }, [scopedMasjid, sdmMap]);

  const fillFormFromMasjid = (m?: SdmMasjidItem) => {
    const target = m || filteredList[0] || scopedMasjid[0];
    const existing = target ? getSdmForMasjid(target) : undefined;

    setSelectedMasjidId(target?.id || '');
    setJumlahPengurus(String(existing?.jumlah_pengurus ?? 0));
    setKetuaPengurus(existing?.ketua_pengurus || '');
    setNoHpKetua(existing?.no_hp_ketua || '');
    setNamaSekretaris(existing?.nama_sekretaris || '');
    setNoHpSekretaris(existing?.no_hp_sekretaris || '');
    setDaftarImamText((existing?.daftar_imam || []).join(', '));
    setDaftarKhatibText((existing?.daftar_khatib || []).join(', '));
    setDaftarMuazinText((existing?.daftar_muazin || []).join(', '));
    setJumlahRemaja(String(existing?.jumlah_remaja ?? 0));
    setKetuaRemaja(existing?.ketua_remaja || '');
    setKategoriJamaah(existing?.kategori_jamaah || '50 - 100');
  };

  const openCreateOrEdit = (m?: SdmMasjidItem) => {
    fillFormFromMasjid(m);
    setShowModal(true);
  };

  const handleSaveSdm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjid.find((m) => m.id === selectedMasjidId);
    if (!targetMasjid) {
      onNotify('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        masjid_id: targetMasjid.id,
        id_masjid_simas: targetMasjid.id_masjid_simas || targetMasjid.id_baru_simas || null,
        nama_masjid: targetMasjid.nama_masjid,
        kecamatan: targetMasjid.kecamatan || null,
        jumlah_pengurus: Math.max(0, Number(jumlahPengurus || 0)),
        ketua_pengurus: ketuaPengurus.trim(),
        no_hp_ketua: noHpKetua.trim(),
        nama_sekretaris: namaSekretaris.trim(),
        no_hp_sekretaris: noHpSekretaris.trim(),
        daftar_imam: parseListInput(daftarImamText),
        daftar_khatib: parseListInput(daftarKhatibText),
        daftar_muazin: parseListInput(daftarMuazinText),
        jumlah_remaja: Math.max(0, Number(jumlahRemaja || 0)),
        ketua_remaja: ketuaRemaja.trim(),
        kategori_jamaah: kategoriJamaah || '50 - 100',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('masjid_sdm')
        .upsert(payload, { onConflict: 'masjid_id' });

      if (error) throw new Error(error.message);

      setShowModal(false);
      onNotify(
        'success',
        'Data SDM Tersimpan',
        `Pendataan SDM untuk "${targetMasjid.nama_masjid}" berhasil disimpan.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan SDM', err?.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar Aksi Atas */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDownloadTemplateSdm}
          className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
        >
          Template Excel SDM
        </button>
        <button
          type="button"
          onClick={onOpenImportSdm}
          className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition"
        >
          Import Excel SDM
        </button>
        <button
          type="button"
          onClick={() => openCreateOrEdit()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
        >
          + Input / Update SDM
        </button>
      </div>

      {/* Ringkasan Statistik SDM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Sudah Terdata SDM</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">
            {summaryStats.sudahTerdata}{' '}
            <span className="text-xs font-medium text-gray-500">
              / {summaryStats.totalLembaga}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700">Belum Terdata SDM</div>
          <div className="text-xl font-bold text-amber-800 mt-0.5">
            {summaryStats.belumTerdata}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">Akumulasi Pengurus</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">
            {summaryStats.totalPengurus.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700">Akumulasi Remaja Masjid</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">
            {summaryStats.totalRemaja.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Panel Filter & Pencarian */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari masjid, ketua, imam, khatib, muazin, remaja..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Jenis Lembaga SDM"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as 'ALL' | JenisLembagaSdm)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="MASJID">Masjid</option>
              <option value="MUSHALLA">Mushalla</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Kecamatan SDM"
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
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Status Pendataan SDM"
              value={filterStatusSdm}
              onChange={(e) =>
                setFilterStatusSdm(e.target.value as 'ALL' | 'SUDAH' | 'BELUM')
              }
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Status SDM</option>
              <option value="SUDAH">Sudah Terdata</option>
              <option value="BELUM">Belum Terdata</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Kategori Jamaah"
              value={filterKategoriJamaah}
              onChange={(e) => setFilterKategoriJamaah(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Jamaah</option>
              {KATEGORI_JAMAAH_OPTIONS.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daftar / Tabel SDM */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Memuat data SDM masjid &amp; mushalla...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Tidak ada data SDM yang sesuai dengan filter saat ini.
          </div>
        ) : (
          <>
            {/* Tampilan Mobile (< md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredList.map((m) => {
                const s = getSdmForMasjid(m);
                const jenis = detectJenisLembaga(m);
                const terdata = hasSdmRecord(s);
                return (
                  <div key={m.id} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800">
                          {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">{m.nama_masjid}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          terdata
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {terdata ? 'Terdata' : 'Belum'}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <strong>Pengurus:</strong> {s?.jumlah_pengurus ?? 0} org • Ketua:{' '}
                        <strong>{s?.ketua_pengurus || '-'}</strong>{' '}
                        {s?.no_hp_ketua ? `(${s.no_hp_ketua})` : ''}
                      </div>
                      <div>
                        <strong>Sekretaris:</strong> {s?.nama_sekretaris || '-'}{' '}
                        {s?.no_hp_sekretaris ? `(${s.no_hp_sekretaris})` : ''}
                      </div>
                      <div>
                        <strong>Imam:</strong> {formatListDisplay(s?.daftar_imam)}
                      </div>
                      <div>
                        <strong>Khatib:</strong> {formatListDisplay(s?.daftar_khatib)}
                      </div>
                      <div>
                        <strong>Muazin:</strong> {formatListDisplay(s?.daftar_muazin)}
                      </div>
                      <div>
                        <strong>Remaja Masjid:</strong> {s?.jumlah_remaja ?? 0} org • Ketua:{' '}
                        <strong>{s?.ketua_remaja || '-'}</strong>
                      </div>
                      <div>
                        <strong>Kategori Jamaah:</strong>{' '}
                        <span className="font-semibold text-emerald-800">
                          {s?.kategori_jamaah || '-'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateOrEdit(m)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                    >
                      {terdata ? 'Edit Data SDM' : '+ Input Data SDM'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Desktop (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Nama &amp; Kecamatan</th>
                    <th className="px-5 py-3.5 font-semibold">Pengurus &amp; Pimpinan</th>
                    <th className="px-5 py-3.5 font-semibold">Imam, Khatib &amp; Muazin</th>
                    <th className="px-5 py-3.5 font-semibold">Remaja &amp; Jamaah</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredList.map((m) => {
                    const s = getSdmForMasjid(m);
                    const jenis = detectJenisLembaga(m);
                    const terdata = hasSdmRecord(s);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5 align-top">
                          <div className="font-bold text-gray-900">{m.nama_masjid}</div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                terdata
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {terdata ? 'SDM Terdata' : 'Belum Terdata'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 align-top">
                          <div>
                            Jumlah Pengurus: <strong>{s?.jumlah_pengurus ?? 0}</strong>
                          </div>
                          <div>
                            Ketua: <strong>{s?.ketua_pengurus || '-'}</strong>{' '}
                            {s?.no_hp_ketua ? `• ${s.no_hp_ketua}` : ''}
                          </div>
                          <div>
                            Sekretaris: <strong>{s?.nama_sekretaris || '-'}</strong>{' '}
                            {s?.no_hp_sekretaris ? `• ${s.no_hp_sekretaris}` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 max-w-xs align-top">
                          <div>
                            <strong>Imam:</strong> {formatListDisplay(s?.daftar_imam)}
                          </div>
                          <div>
                            <strong>Khatib:</strong> {formatListDisplay(s?.daftar_khatib)}
                          </div>
                          <div>
                            <strong>Muazin:</strong> {formatListDisplay(s?.daftar_muazin)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 align-top">
                          <div>
                            Remaja Masjid: <strong>{s?.jumlah_remaja ?? 0}</strong>
                          </div>
                          <div>
                            Ketua Remaja: <strong>{s?.ketua_remaja || '-'}</strong>
                          </div>
                          <div>
                            Kategori Jamaah:{' '}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              {s?.kategori_jamaah || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap align-top">
                          <button
                            type="button"
                            onClick={() => openCreateOrEdit(m)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
                          >
                            {terdata ? 'Edit SDM' : 'Input SDM'}
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

      {/* Modal Form Input / Edit SDM Masjid */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Form Pendataan SDM Masjid &amp; Mushalla
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Lengkapi data kepengurusan, imam, khatib, muazin, remaja masjid, dan kategori jamaah.
            </p>

            <form onSubmit={handleSaveSdm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pilih Masjid / Mushalla *
                </label>
                <select
                  required
                  value={selectedMasjidId}
                  onChange={(e) => {
                    const found = scopedMasjid.find((item) => item.id === e.target.value);
                    fillFormFromMasjid(found);
                  }}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white"
                >
                  <option value="">-- Pilih Masjid / Mushalla --</option>
                  {scopedMasjid.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{detectJenisLembaga(m) === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}]{' '}
                      {m.nama_masjid} {m.kecamatan ? `(${m.kecamatan})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Jumlah Pengurus
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={jumlahPengurus}
                    onChange={(e) => setJumlahPengurus(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Ketua Pengurus
                  </label>
                  <input
                    type="text"
                    value={ketuaPengurus}
                    onChange={(e) => setKetuaPengurus(e.target.value)}
                    placeholder="Nama Ketua DKM / Pengurus"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    No. HP Ketua
                  </label>
                  <input
                    type="text"
                    value={noHpKetua}
                    onChange={(e) => setNoHpKetua(e.target.value)}
                    placeholder="08..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Nama Sekretaris
                  </label>
                  <input
                    type="text"
                    value={namaSekretaris}
                    onChange={(e) => setNamaSekretaris(e.target.value)}
                    placeholder="Nama Sekretaris"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    No. HP Sekretaris
                  </label>
                  <input
                    type="text"
                    value={noHpSekretaris}
                    onChange={(e) => setNoHpSekretaris(e.target.value)}
                    placeholder="08..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Daftar Imam
                  </label>
                  <textarea
                    rows={2}
                    value={daftarImamText}
                    onChange={(e) => setDaftarImamText(e.target.value)}
                    placeholder="Pisahkan dengan koma"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Daftar Khatib
                  </label>
                  <textarea
                    rows={2}
                    value={daftarKhatibText}
                    onChange={(e) => setDaftarKhatibText(e.target.value)}
                    placeholder="Pisahkan dengan koma"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Daftar Muazin
                  </label>
                  <textarea
                    rows={2}
                    value={daftarMuazinText}
                    onChange={(e) => setDaftarMuazinText(e.target.value)}
                    placeholder="Pisahkan dengan koma"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Jumlah Remaja Masjid
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={jumlahRemaja}
                    onChange={(e) => setJumlahRemaja(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Ketua Remaja Masjid
                  </label>
                  <input
                    type="text"
                    value={ketuaRemaja}
                    onChange={(e) => setKetuaRemaja(e.target.value)}
                    placeholder="Nama Ketua Remaja"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Kategori Jamaah
                  </label>
                  <select
                    value={kategoriJamaah}
                    onChange={(e) => setKategoriJamaah(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 bg-white"
                  >
                    {KATEGORI_JAMAAH_OPTIONS.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data SDM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}