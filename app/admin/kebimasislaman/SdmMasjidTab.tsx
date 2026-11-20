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

const JAMAAH_OPTIONS = ['50 - 100', '100 - 150', '150 - 200', '200 - 1000', '> 1000'];

function detectJenisLembaga(m: SdmMasjidItem): JenisLembagaSdm {
  if (m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID') {
    return m.jenis_lembaga;
  }
  const s1 = String(m.id_masjid_simas || '').trim();
  const s2 = String(m.id_baru_simas || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
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
  const [filterJamaah, setFilterJamaah] = useState('ALL');

  // State Modal Form SDM
  const [showModal, setShowModal] = useState(false);
  const [selectedMasjidId, setSelectedMasjidId] = useState('');
  const [jumlahPengurus, setJumlahPengurus] = useState<number>(0);
  const [ketuaPengurus, setKetuaPengurus] = useState('');
  const [noHpKetua, setNoHpKetua] = useState('');
  const [namaSekretaris, setNamaSekretaris] = useState('');
  const [noHpSekretaris, setNoHpSekretaris] = useState('');
  const [imamInput, setImamInput] = useState('');
  const [imamList, setImamList] = useState<string[]>([]);
  const [khatibInput, setKhatibInput] = useState('');
  const [khatibList, setKhatibList] = useState<string[]>([]);
  const [muazinInput, setMuazinInput] = useState('');
  const [muazinList, setMuazinList] = useState<string[]>([]);
  const [jumlahRemaja, setJumlahRemaja] = useState<number>(0);
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

  const scopedMasjid = useMemo(() => {
    if (!kuaKecamatanLock) return masjidList;
    const target = kuaKecamatanLock.toLowerCase();
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
      if (filterJamaah !== 'ALL' && (s?.kategori_jamaah || '50 - 100') !== filterJamaah) {
        return false;
      }
      if (!q) return true;
      return (
        m.nama_masjid.toLowerCase().includes(q) ||
        (m.kecamatan || '').toLowerCase().includes(q) ||
        (s?.ketua_pengurus || '').toLowerCase().includes(q) ||
        (s?.nama_sekretaris || '').toLowerCase().includes(q) ||
        (s?.daftar_imam || []).some((x) => x.toLowerCase().includes(q)) ||
        (s?.daftar_khatib || []).some((x) => x.toLowerCase().includes(q)) ||
        (s?.daftar_muazin || []).some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [scopedMasjid, filterJenis, activeKecamatanFilter, filterJamaah, searchQuery, sdmMap]);

  const summaryStats = useMemo(() => {
    let totalPengurus = 0;
    let totalRemaja = 0;
    let terdata = 0;
    scopedMasjid.forEach((m) => {
      const s = getSdmForMasjid(m);
      if (s) {
        terdata += 1;
        totalPengurus += Number(s.jumlah_pengurus || 0);
        totalRemaja += Number(s.jumlah_remaja || 0);
      }
    });
    return {
      totalLembaga: scopedMasjid.length,
      terdata,
      totalPengurus,
      totalRemaja,
    };
  }, [scopedMasjid, sdmMap]);

  const fillFormFromMasjid = (m?: SdmMasjidItem) => {
    const target = m || filteredList[0] || scopedMasjid[0];
    const existing = target ? getSdmForMasjid(target) : undefined;
    setSelectedMasjidId(target?.id || '');
    setJumlahPengurus(Number(existing?.jumlah_pengurus || 0));
    setKetuaPengurus(existing?.ketua_pengurus || '');
    setNoHpKetua(existing?.no_hp_ketua || '');
    setNamaSekretaris(existing?.nama_sekretaris || '');
    setNoHpSekretaris(existing?.no_hp_sekretaris || '');
    setImamList(existing?.daftar_imam ? [...existing.daftar_imam] : []);
    setImamInput('');
    setKhatibList(existing?.daftar_khatib ? [...existing.daftar_khatib] : []);
    setKhatibInput('');
    setMuazinList(existing?.daftar_muazin ? [...existing.daftar_muazin] : []);
    setMuazinInput('');
    setJumlahRemaja(Number(existing?.jumlah_remaja || 0));
    setKetuaRemaja(existing?.ketua_remaja || '');
    setKategoriJamaah(existing?.kategori_jamaah || '50 - 100');
  };

  const openModal = (m?: SdmMasjidItem) => {
    fillFormFromMasjid(m);
    setShowModal(true);
  };

  const addChip = (
    rawValue: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const parts = rawValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const merged = Array.from(new Set([...currentList, ...parts]));
    setList(merged);
    setInput('');
  };

  const handleSaveSdm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjid.find((m) => m.id === selectedMasjidId);
    if (!targetMasjid) {
      onNotify('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    const finalImam = imamInput.trim()
      ? Array.from(new Set([...imamList, imamInput.trim()]))
      : imamList;
    const finalKhatib = khatibInput.trim()
      ? Array.from(new Set([...khatibList, khatibInput.trim()]))
      : khatibList;
    const finalMuazin = muazinInput.trim()
      ? Array.from(new Set([...muazinList, muazinInput.trim()]))
      : muazinList;

    setSaving(true);
    try {
      const payload = {
        masjid_id: targetMasjid.id,
        id_masjid_simas: targetMasjid.id_masjid_simas || null,
        nama_masjid: targetMasjid.nama_masjid,
        kecamatan: targetMasjid.kecamatan || null,
        jumlah_pengurus: Number(jumlahPengurus || 0),
        ketua_pengurus: ketuaPengurus.trim(),
        no_hp_ketua: noHpKetua.trim(),
        nama_sekretaris: namaSekretaris.trim(),
        no_hp_sekretaris: noHpSekretaris.trim(),
        daftar_imam: finalImam.join(', '),
        daftar_khatib: finalKhatib.join(', '),
        daftar_muazin: finalMuazin.join(', '),
        jumlah_remaja: Number(jumlahRemaja || 0),
        ketua_remaja: ketuaRemaja.trim(),
        kategori_jamaah: kategoriJamaah,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('masjid_sdm')
        .upsert(payload, { onConflict: 'masjid_id' });

      if (error) throw new Error(error.message);

      setShowModal(false);
      onNotify('success', 'Data SDM Tersimpan', `Data SDM "${targetMasjid.nama_masjid}" berhasil disimpan.`);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan SDM', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
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
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
        >
          + Input / Edit SDM Masjid
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Total Lembaga</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summaryStats.totalLembaga}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">SDM Sudah Terdata</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">{summaryStats.terdata}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Akumulasi Pengurus</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summaryStats.totalPengurus}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Akumulasi Remaja Masjid</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summaryStats.totalRemaja}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama masjid, ketua, sekretaris, imam, khatib..."
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
          <div className="lg:col-span-3">
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
          <div className="lg:col-span-3">
            <select
              aria-label="Filter Kategori Jamaah"
              value={filterJamaah}
              onChange={(e) => setFilterJamaah(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Kategori Jamaah</option>
              {JAMAAH_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} Jamaah
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Memuat data SDM masjid...</div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Belum ada data SDM masjid/mushalla untuk ditampilkan.
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredList.map((m) => {
                const s = getSdmForMasjid(m);
                const jenis = detectJenisLembaga(m);
                return (
                  <div key={m.id} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800">
                          {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">{m.nama_masjid}</h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {s?.kategori_jamaah || '50 - 100'}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <strong>Ketua:</strong> {s?.ketua_pengurus || '-'}{' '}
                        {s?.no_hp_ketua ? `(${s.no_hp_ketua})` : ''} •{' '}
                        <strong>Pengurus:</strong> {s?.jumlah_pengurus ?? 0}
                      </div>
                      <div>
                        <strong>Imam:</strong>{' '}
                        {s?.daftar_imam && s.daftar_imam.length > 0 ? s.daftar_imam.join(', ') : '-'}
                      </div>
                      <div>
                        <strong>Khatib:</strong>{' '}
                        {s?.daftar_khatib && s.daftar_khatib.length > 0 ? s.daftar_khatib.join(', ') : '-'}
                      </div>
                      <div>
                        <strong>Muazin:</strong>{' '}
                        {s?.daftar_muazin && s.daftar_muazin.length > 0 ? s.daftar_muazin.join(', ') : '-'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openModal(m)}
                      className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      {s ? 'Edit Data SDM' : '+ Input Data SDM'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Nama &amp; Kecamatan</th>
                    <th className="px-5 py-3.5 font-semibold">Pengurus &amp; Remaja</th>
                    <th className="px-5 py-3.5 font-semibold">Imam, Khatib &amp; Muazin</th>
                    <th className="px-5 py-3.5 font-semibold">Jamaah</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredList.map((m) => {
                    const s = getSdmForMasjid(m);
                    const jenis = detectJenisLembaga(m);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-900">{m.nama_masjid}</div>
                          <div className="text-xs text-emerald-700 font-medium">
                            {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                          <div>
                            Ketua: <strong>{s?.ketua_pengurus || '-'}</strong>{' '}
                            {s?.no_hp_ketua ? `(${s.no_hp_ketua})` : ''}
                          </div>
                          <div>
                            Sekretaris: <strong>{s?.nama_sekretaris || '-'}</strong>{' '}
                            {s?.no_hp_sekretaris ? `(${s.no_hp_sekretaris})` : ''}
                          </div>
                          <div>
                            Jml Pengurus: <strong>{s?.jumlah_pengurus ?? 0}</strong> • Remaja:{' '}
                            <strong>{s?.jumlah_remaja ?? 0}</strong>{' '}
                            {s?.ketua_remaja ? `(Ket: ${s.ketua_remaja})` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 max-w-xs">
                          <div>
                            <span className="font-semibold text-gray-900">Imam:</span>{' '}
                            {s?.daftar_imam && s.daftar_imam.length > 0
                              ? s.daftar_imam.join(', ')
                              : '-'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">Khatib:</span>{' '}
                            {s?.daftar_khatib && s.daftar_khatib.length > 0
                              ? s.daftar_khatib.join(', ')
                              : '-'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">Muazin:</span>{' '}
                            {s?.daftar_muazin && s.daftar_muazin.length > 0
                              ? s.daftar_muazin.join(', ')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {s?.kategori_jamaah || '50 - 100'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openModal(m)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                          >
                            {s ? 'Edit SDM' : 'Input SDM'}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Form SDM Masjid / Mushalla</h3>
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
                      [{detectJenisLembaga(m) === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}] {m.nama_masjid}{' '}
                      {m.kecamatan ? `(${m.kecamatan})` : ''}
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
                    onChange={(e) => setJumlahPengurus(Number(e.target.value || 0))}
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
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              {/* Imam */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Daftar Imam (Tekan Enter atau Tambah)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imamInput}
                    onChange={(e) => setImamInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChip(imamInput, imamList, setImamList, setImamInput);
                      }
                    }}
                    placeholder="Nama imam, pisahkan koma jika banyak"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => addChip(imamInput, imamList, setImamList, setImamInput)}
                    className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
                  >
                    + Tambah
                  </button>
                </div>
                {imamList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {imamList.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setImamList((prev) => prev.filter((x) => x !== name))}
                          className="text-emerald-700 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Khatib */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Daftar Khatib
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={khatibInput}
                    onChange={(e) => setKhatibInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChip(khatibInput, khatibList, setKhatibList, setKhatibInput);
                      }
                    }}
                    placeholder="Nama khatib"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => addChip(khatibInput, khatibList, setKhatibList, setKhatibInput)}
                    className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
                  >
                    + Tambah
                  </button>
                </div>
                {khatibList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {khatibList.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setKhatibList((prev) => prev.filter((x) => x !== name))}
                          className="text-emerald-700 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Muazin */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Daftar Muazin
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={muazinInput}
                    onChange={(e) => setMuazinInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChip(muazinInput, muazinList, setMuazinList, setMuazinInput);
                      }
                    }}
                    placeholder="Nama muazin"
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => addChip(muazinInput, muazinList, setMuazinList, setMuazinInput)}
                    className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
                  >
                    + Tambah
                  </button>
                </div>
                {muazinList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {muazinList.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => setMuazinList((prev) => prev.filter((x) => x !== name))}
                          className="text-emerald-700 hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                    onChange={(e) => setJumlahRemaja(Number(e.target.value || 0))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Ketua Remaja
                  </label>
                  <input
                    type="text"
                    value={ketuaRemaja}
                    onChange={(e) => setKetuaRemaja(e.target.value)}
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
                    {JAMAAH_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} Jamaah
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