'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface PejabatUtamaItem {
  id?: string;
  jabatan?: string;
  nama_pejabat?: string;
  nama?: string;
  nip?: string;
  urutan?: number;
}

export interface SertifikatKiblatPayload {
  [key: string]: any;
}

function SertifikatKiblatModal({
  open,
  onClose,
  data,
  pejabatUtama,
}: {
  open: boolean;
  onClose: () => void;
  data: SertifikatKiblatPayload | null;
  pejabatUtama?: PejabatUtamaItem[];
}) {
  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-base text-gray-900">Sertifikat Kalibrasi Arah Kiblat</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
        <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-auto max-h-80">
          {JSON.stringify({ data, pejabatUtama }, null, 2)}
        </pre>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Cetak Sertifikat
          </button>
        </div>
      </div>
    </div>
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type JenisLembagaKiblat = 'MASJID' | 'MUSHALLA';

export interface KiblatMasjidItem {
  id: string;
  jenis_lembaga?: JenisLembagaKiblat | null;
  id_masjid_simas: string | null;
  id_baru_simas: string | null;
  nama_masjid: string;
  kecamatan: string | null;
  alamat: string | null;
  latitude_simas: number | null;
  longitude_simas: number | null;
}

export interface KiblatDataItem {
  id?: string;
  masjid_id: string | null;
  id_masjid_simas: string | null;
  nama_masjid: string;
  kecamatan: string | null;
  latitude: number | null;
  lintang_utara: string;
  longitude: number | null;
  bujur_timur: string;
  azimut_bangunan: number | null;
  elevasi_tempat: number | null;
  azimut_kiblat: number | null;
  penyimpangan: number | null;
  status_penyimpangan: string;
  tanggal_pengukuran: string;
  foto_kalibrasi_url: string;
  catatan: string;
  nomor_register?: string | null;
  kode_verifikasi?: string | null;
  status_verifikasi?: 'MENUNGGU_REGISTER' | 'TERVERIFIKASI' | string | null;
  tanggal_terbit_sertifikat?: string | null;
}

interface ArahKiblatTabProps {
  masjidList: KiblatMasjidItem[];
  kiblatMap: Record<string, KiblatDataItem>;
  kecamatanOptions: string[];
  kuaKecamatanLock: string | null;
  activeMode: string;
  pejabatUtamaList: PejabatUtamaItem[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotify: (type: 'success' | 'error', title: string, message: string) => void;
  onOpenImportKiblat: () => void;
  onDownloadTemplateKiblat: () => void;
}

function detectJenisLembaga(m: KiblatMasjidItem): JenisLembagaKiblat {
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

function hitungPenyimpangan(
  azimutBangunan: number | null,
  azimutKiblat: number | null
): { selisih: number | null; status: string } {
  if (azimutBangunan === null || azimutKiblat === null) {
    return { selisih: null, status: 'Belum Dihitung' };
  }
  const rawSelisih = azimutBangunan - azimutKiblat;
  const selisih = Number(rawSelisih.toFixed(4));
  const absSelisih = Math.abs(selisih);
  const status = absSelisih <= 1.0 ? 'Sesuai / Presisi' : 'Perlu Koreksi';
  return { selisih, status };
}

function formatPenyimpangan(val: number | null): string {
  if (val === null || Number.isNaN(val)) return '-';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}°`;
}

async function compressCalibrationImage(file: File): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menyiapkan kanvas kompresi gambar.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.72;
        const tryEncode = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengompresi foto kalibrasi.'));
                return;
              }
              if (blob.size > 320 * 1024 && quality > 0.42) {
                quality = Number((quality - 0.1).toFixed(2));
                tryEncode();
              } else {
                resolve({ blob, ext: 'jpg' });
              }
            },
            'image/jpeg',
            quality
          );
        };
        tryEncode();
      };
      img.onerror = () => reject(new Error('File gambar tidak valid atau rusak.'));
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export default function ArahKiblatTab({
  masjidList,
  kiblatMap,
  kecamatanOptions,
  kuaKecamatanLock,
  activeMode,
  pejabatUtamaList,
  loading,
  onRefresh,
  onNotify,
  onOpenImportKiblat,
  onDownloadTemplateKiblat,
}: ArahKiblatTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'ALL' | JenisLembagaKiblat>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedMasjidId, setSelectedMasjidId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [lintangUtara, setLintangUtara] = useState('');
  const [longitude, setLongitude] = useState('');
  const [bujurTimur, setBujurTimur] = useState('');
  const [azimutBangunan, setAzimutBangunan] = useState('');
  const [elevasiTempat, setElevasiTempat] = useState('');
  const [azimutKiblat, setAzimutKiblat] = useState('');
  const [tanggalPengukuran, setTanggalPengukuran] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const [registerModal, setRegisterModal] = useState<{
    kiblatId: string;
    namaLembaga: string;
    kecamatan: string | null;
    nomorRegister: string;
    kodeVerifikasi: string;
    tanggalTerbit: string;
  } | null>(null);
  const [savingRegister, setSavingRegister] = useState(false);

  const [sertifikatData, setSertifikatData] = useState<SertifikatKiblatPayload | null>(null);

  const canAssignRegister =
    activeMode === 'super_admin' || activeMode === 'admin_bimas';

  const getKiblatForMasjid = (m: KiblatMasjidItem): KiblatDataItem | undefined => {
    return (
      kiblatMap[m.id] ||
      (m.id_masjid_simas ? kiblatMap[m.id_masjid_simas] : undefined) ||
      kiblatMap[m.nama_masjid]
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
      const k = getKiblatForMasjid(m);
      const sudahDiukur = k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined;
      if (filterStatus === 'SUDAH' && !sudahDiukur) return false;
      if (filterStatus === 'BELUM' && sudahDiukur) return false;
      if (filterStatus === 'Sesuai / Presisi' && k?.status_penyimpangan !== 'Sesuai / Presisi') {
        return false;
      }
      if (filterStatus === 'Perlu Koreksi' && k?.status_penyimpangan !== 'Perlu Koreksi') {
        return false;
      }
      if (!q) return true;
      return (
        m.nama_masjid.toLowerCase().includes(q) ||
        (m.kecamatan || '').toLowerCase().includes(q) ||
        (m.alamat || '').toLowerCase().includes(q) ||
        (m.id_masjid_simas || '').toLowerCase().includes(q) ||
        (k?.nomor_register || '').toLowerCase().includes(q)
      );
    });
  }, [scopedMasjid, filterJenis, activeKecamatanFilter, filterStatus, searchQuery, kiblatMap]);

  const summaryStats = useMemo(() => {
    const total = scopedMasjid.length;
    let sudah = 0;
    let sertifikatSiap = 0;
    scopedMasjid.forEach((m) => {
      const k = getKiblatForMasjid(m);
      if (k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined) sudah += 1;
      if (k?.nomor_register && k.nomor_register.trim().length > 0) sertifikatSiap += 1;
    });
    return {
      total,
      sudah,
      belum: Math.max(0, total - sudah),
      sertifikatSiap,
    };
  }, [scopedMasjid, kiblatMap]);

  const liveCalc = useMemo(() => {
    return hitungPenyimpangan(parseNumberOrNull(azimutBangunan), parseNumberOrNull(azimutKiblat));
  }, [azimutBangunan, azimutKiblat]);

  const fillFormFromMasjid = (m?: KiblatMasjidItem) => {
    const target = m || filteredList[0] || scopedMasjid[0];
    const existing = target ? getKiblatForMasjid(target) : undefined;
    setSelectedMasjidId(target?.id || '');
    setLatitude(
      existing?.latitude !== null && existing?.latitude !== undefined
        ? String(existing.latitude)
        : target?.latitude_simas !== null && target?.latitude_simas !== undefined
        ? String(target.latitude_simas)
        : ''
    );
    setLintangUtara(existing?.lintang_utara || '');
    setLongitude(
      existing?.longitude !== null && existing?.longitude !== undefined
        ? String(existing.longitude)
        : target?.longitude_simas !== null && target?.longitude_simas !== undefined
        ? String(target.longitude_simas)
        : ''
    );
    setBujurTimur(existing?.bujur_timur || '');
    setAzimutBangunan(
      existing?.azimut_bangunan !== null && existing?.azimut_bangunan !== undefined
        ? String(existing.azimut_bangunan)
        : ''
    );
    setElevasiTempat(
      existing?.elevasi_tempat !== null && existing?.elevasi_tempat !== undefined
        ? String(existing.elevasi_tempat)
        : ''
    );
    setAzimutKiblat(
      existing?.azimut_kiblat !== null && existing?.azimut_kiblat !== undefined
        ? String(existing.azimut_kiblat)
        : ''
    );
    setTanggalPengukuran(existing?.tanggal_pengukuran || new Date().toISOString().slice(0, 10));
    setFotoUrl(existing?.foto_kalibrasi_url || '');
    setFotoFile(null);
    setFotoPreview(existing?.foto_kalibrasi_url || '');
    setCatatan(existing?.catatan || '');
  };

  const openCreateOrEdit = (m?: KiblatMasjidItem) => {
    fillFormFromMasjid(m);
    setShowFormModal(true);
  };

  const handleFotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify('error', 'Format File Tidak Sesuai', 'Pilih file gambar JPG, PNG, atau WebP.');
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSaveKalibrasi = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjid.find((m) => m.id === selectedMasjidId);
    if (!targetMasjid) {
      onNotify('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      let uploadedPhotoUrl = fotoUrl || null;
      if (fotoFile) {
        const { blob, ext } = await compressCalibrationImage(fotoFile);
        const safeId = (targetMasjid.id_masjid_simas || targetMasjid.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filePath = `${safeId}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('kalibrasi-kiblat')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw new Error(`Upload foto gagal: ${uploadErr.message}`);
        const { data: pubData } = supabase.storage.from('kalibrasi-kiblat').getPublicUrl(filePath);
        uploadedPhotoUrl = pubData.publicUrl;
      }

      const latNum = parseNumberOrNull(latitude);
      const lngNum = parseNumberOrNull(longitude);
      const azB = parseNumberOrNull(azimutBangunan);
      const azK = parseNumberOrNull(azimutKiblat);
      const elevNum = parseNumberOrNull(elevasiTempat);
      const calc = hitungPenyimpangan(azB, azK);

      const payload = {
        masjid_id: targetMasjid.id,
        id_masjid_simas: targetMasjid.id_masjid_simas || null,
        nama_masjid: targetMasjid.nama_masjid,
        kecamatan: targetMasjid.kecamatan || null,
        latitude: latNum,
        lintang_utara: lintangUtara.trim() || null,
        longitude: lngNum,
        bujur_timur: bujurTimur.trim() || null,
        azimut_bangunan: azB,
        elevasi_tempat: elevNum,
        azimut_kiblat: azK,
        penyimpangan: calc.selisih,
        status_penyimpangan: calc.status,
        tanggal_pengukuran: tanggalPengukuran || new Date().toISOString().slice(0, 10),
        foto_kalibrasi_url: uploadedPhotoUrl,
        catatan: catatan.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('masjid_arah_kiblat')
        .upsert(payload, { onConflict: 'masjid_id' });
      if (error) throw new Error(error.message);

      setShowFormModal(false);
      onNotify('success', 'Kalibrasi Tersimpan', `Data arah kiblat "${targetMasjid.nama_masjid}" tersimpan.`);
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan Kalibrasi', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  const openRegisterModal = (m: KiblatMasjidItem, k: KiblatDataItem | undefined) => {
    if (!k?.id) {
      onNotify('error', 'Data Kalibrasi Belum Ada', 'Simpan data kalibrasi terlebih dahulu sebelum mengisi nomor register.');
      return;
    }
    setRegisterModal({
      kiblatId: k.id,
      namaLembaga: m.nama_masjid,
      kecamatan: m.kecamatan || null,
      nomorRegister: k.nomor_register || '',
      kodeVerifikasi: k.kode_verifikasi || '',
      tanggalTerbit: k.tanggal_terbit_sertifikat || new Date().toISOString().slice(0, 10),
    });
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModal) return;
    const cleanReg = registerModal.nomorRegister.trim();
    if (!cleanReg) {
      onNotify('error', 'Nomor Register Kosong', 'Silakan isi nomor register terlebih dahulu.');
      return;
    }

    setSavingRegister(true);
    try {
      const urutMatch = cleanReg.match(/B-(\d+)/i);
      const kodeVerif =
        registerModal.kodeVerifikasi.trim() ||
        `KLB-2026-${urutMatch ? urutMatch[1].padStart(4, '0') : '0001'}`;

      const { error } = await supabase
        .from('masjid_arah_kiblat')
        .update({
          nomor_register: cleanReg,
          kode_verifikasi: kodeVerif,
          status_verifikasi: 'TERVERIFIKASI',
          tanggal_terbit_sertifikat: registerModal.tanggalTerbit || new Date().toISOString().slice(0, 10),
        })
        .eq('id', registerModal.kiblatId);

      if (error) throw error;
      setRegisterModal(null);
      onNotify('success', 'Nomor Register Tersimpan', 'Sertifikat kini dapat diunduh.');
      await onRefresh();
    } catch (err: any) {
      onNotify('error', 'Gagal Menyimpan No. Register', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSavingRegister(false);
    }
  };

  const handleOpenSertifikat = (m: KiblatMasjidItem, k: KiblatDataItem | undefined, index: number) => {
    const noReg = (k?.nomor_register || '').trim();
    if (!noReg) {
      onNotify('error', 'Nomor Register Belum Ada', 'Sertifikat baru dapat diunduh setelah Nomor Register ditetapkan.');
      return;
    }

    const urutMatch = noReg.match(/B-(\d+)/i);
    const urutStr = urutMatch ? urutMatch[1].padStart(4, '0') : String(index + 1).padStart(4, '0');
    const kodeVerif = (k?.kode_verifikasi || '').trim() || `KLB-2026-${urutStr}`;

    const koordParts = [
      k?.lintang_utara ? `LU: ${k.lintang_utara}` : '',
      k?.bujur_timur ? `BT: ${k.bujur_timur}` : '',
    ].filter(Boolean);
    const koordFallback =
      k?.latitude != null || k?.longitude != null
        ? `${k?.latitude ?? m.latitude_simas ?? '-'}, ${k?.longitude ?? m.longitude_simas ?? '-'}`
        : null;

    setSertifikatData({
      nomorRegister: noReg,
      kodeVerifikasi: kodeVerif,
      jenisLembaga: detectJenisLembaga(m),
      namaLembaga: m.nama_masjid,
      idSimas: m.id_masjid_simas || m.id_baru_simas || null,
      alamatLengkap: m.alamat || null,
      kecamatan: m.kecamatan || null,
      tanggalPengukuran: k?.tanggal_pengukuran || null,
      tanggalTerbit: k?.tanggal_terbit_sertifikat || null,
      koordinatText: koordParts.length > 0 ? koordParts.join(' • ') : koordFallback,
      azimutBangunanText:
        k?.azimut_bangunan !== null && k?.azimut_bangunan !== undefined
          ? `${k.azimut_bangunan}°`
          : null,
      elevasiText:
        k?.elevasi_tempat !== null && k?.elevasi_tempat !== undefined
          ? `${k.elevasi_tempat} m`
          : null,
      azimutKiblatText:
        k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
          ? `${k.azimut_kiblat}°`
          : null,
      penyimpanganText:
        k?.penyimpangan !== null && k?.penyimpangan !== undefined
          ? formatPenyimpangan(k.penyimpangan)
          : null,
      statusPenyimpangan: k?.status_penyimpangan || null,
      catatan: k?.catatan || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDownloadTemplateKiblat}
          className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
        >
          Template Excel Kiblat
        </button>
        <button
          type="button"
          onClick={onOpenImportKiblat}
          className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition"
        >
          Import Excel Kiblat
        </button>
        <button
          type="button"
          onClick={() => openCreateOrEdit()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
        >
          + Input Kalibrasi Kiblat
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-500">Total Lembaga</div>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{summaryStats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">Sudah Dikalibrasi</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">{summaryStats.sudah}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700">Belum Dikalibrasi</div>
          <div className="text-xl font-bold text-amber-800 mt-0.5">{summaryStats.belum}</div>
        </div>
        <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700">Sertifikat Siap Unduh</div>
          <div className="text-xl font-bold text-sky-800 mt-0.5">{summaryStats.sertifikatSiap}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="lg:col-span-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama masjid/mushalla, no. register, kecamatan..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="lg:col-span-2">
            <select
              aria-label="Filter Jenis Lembaga"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as 'ALL' | JenisLembagaKiblat)}
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
              aria-label="Filter Status Kalibrasi"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
            >
              <option value="ALL">Semua Status Kalibrasi</option>
              <option value="SUDAH">Sudah Dikalibrasi</option>
              <option value="BELUM">Belum Dikalibrasi</option>
              <option value="Sesuai / Presisi">Sesuai / Presisi</option>
              <option value="Perlu Koreksi">Perlu Koreksi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Memuat data kalibrasi arah kiblat...</div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Belum ada data kalibrasi arah kiblat yang cocok dengan filter.
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredList.map((m, idx) => {
                const k = getKiblatForMasjid(m);
                const jenis = detectJenisLembaga(m);
                const hasCert = Boolean(k?.nomor_register && k.nomor_register.trim().length > 0);
                return (
                  <div key={m.id} className="p-4 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800">
                          {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • {m.kecamatan || '-'}
                        </div>
                        <h3 className="font-bold text-sm text-gray-900">{m.nama_masjid}</h3>
                        <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                          No. Reg: {k?.nomor_register || '-'}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {formatPenyimpangan(k?.penyimpangan ?? null)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <strong>Az. Bangunan:</strong>{' '}
                        {k?.azimut_bangunan != null ? `${k.azimut_bangunan}°` : '-'} •{' '}
                        <strong>Az. Kiblat:</strong>{' '}
                        {k?.azimut_kiblat != null ? `${k.azimut_kiblat}°` : '-'}
                      </div>
                      <div>
                        <strong>Elevasi:</strong>{' '}
                        {k?.elevasi_tempat != null ? `${k.elevasi_tempat} m` : '-'} •{' '}
                        <strong>Tgl Ukur:</strong> {k?.tanggal_pengukuran || '-'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateOrEdit(m)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        {k ? 'Edit Kalibrasi' : '+ Input Kalibrasi'}
                      </button>
                      {canAssignRegister && k && (
                        <button
                          type="button"
                          onClick={() => openRegisterModal(m, k)}
                          className="py-2 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                        >
                          {k.nomor_register ? 'Ubah No. Reg' : 'Isi No. Reg'}
                        </button>
                      )}
                      {hasCert && (
                        <button
                          type="button"
                          onClick={() => handleOpenSertifikat(m, k, idx)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-800 text-white text-xs font-bold"
                        >
                          Unduh Sertifikat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Nama &amp; Kecamatan</th>
                    <th className="px-5 py-3.5 font-semibold">Koordinat &amp; Elevasi</th>
                    <th className="px-5 py-3.5 font-semibold">Azimut &amp; Penyimpangan</th>
                    <th className="px-5 py-3.5 font-semibold">No. Register &amp; Foto</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredList.map((m, idx) => {
                    const k = getKiblatForMasjid(m);
                    const jenis = detectJenisLembaga(m);
                    const hasCert = Boolean(k?.nomor_register && k.nomor_register.trim().length > 0);
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
                            Lat: <strong>{k?.latitude ?? m.latitude_simas ?? '-'}</strong> • Lng:{' '}
                            <strong>{k?.longitude ?? m.longitude_simas ?? '-'}</strong>
                          </div>
                          <div>
                            LU: {k?.lintang_utara || '-'} • BT: {k?.bujur_timur || '-'}
                          </div>
                          <div>
                            Elevasi:{' '}
                            <strong>
                              {k?.elevasi_tempat != null ? `${k.elevasi_tempat} m` : '-'}
                            </strong>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                          <div>
                            Az. Bangunan:{' '}
                            <strong>
                              {k?.azimut_bangunan != null ? `${k.azimut_bangunan}°` : '-'}
                            </strong>
                          </div>
                          <div>
                            Az. Kiblat:{' '}
                            <strong>
                              {k?.azimut_kiblat != null ? `${k.azimut_kiblat}°` : '-'}
                            </strong>
                          </div>
                          <div>
                            Penyimpangan:{' '}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatPenyimpangan(k?.penyimpangan ?? null)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-700 space-y-1">
                          <div className="font-mono font-semibold text-gray-900">
                            {k?.nomor_register ? k.nomor_register : '-'}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            Tgl Ukur: {k?.tanggal_pengukuran || '-'}
                          </div>
                          {k?.foto_kalibrasi_url ? (
                            <a
                              href={k.foto_kalibrasi_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline text-xs"
                            >
                              <img
                                src={k.foto_kalibrasi_url}
                                alt="Foto Kalibrasi"
                                className="w-9 h-9 object-cover rounded-lg border border-gray-200"
                              />
                              <span>Lihat Foto</span>
                            </a>
                          ) : (
                            <div className="text-[11px] text-gray-400">Tanpa foto</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openCreateOrEdit(m)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                            >
                              {k ? 'Edit Kalibrasi' : 'Input Kalibrasi'}
                            </button>
                            {canAssignRegister && k && (
                              <button
                                type="button"
                                onClick={() => openRegisterModal(m, k)}
                                className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold"
                              >
                                {k.nomor_register ? 'Ubah No. Reg' : 'Isi No. Register'}
                              </button>
                            )}
                            {hasCert && (
                              <button
                                type="button"
                                onClick={() => handleOpenSertifikat(m, k, idx)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs"
                              >
                                Unduh Sertifikat
                              </button>
                            )}
                          </div>
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
            <h3 className="text-lg font-bold text-gray-900 mb-1">Form Kalibrasi Arah Kiblat</h3>
            <p className="text-xs text-gray-500 mb-4">
              Penyimpangan dihitung otomatis dari selisih Azimut Bangunan dan Azimut Kiblat (+ / -).
            </p>

            <form onSubmit={handleSaveKalibrasi} className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="0.507535"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Lintang Utara
                  </label>
                  <input
                    type="text"
                    value={lintangUtara}
                    onChange={(e) => setLintangUtara(e.target.value)}
                    placeholder={`00° 30' 27.13" LU`}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="122.076154"
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Bujur Timur
                  </label>
                  <input
                    type="text"
                    value={bujurTimur}
                    onChange={(e) => setBujurTimur(e.target.value)}
                    placeholder={`122° 04' 34.15" BT`}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Azimut Bangunan (°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={azimutBangunan}
                    onChange={(e) => setAzimutBangunan(e.target.value)}
                    placeholder="291.85"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Elevasi Tempat (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={elevasiTempat}
                    onChange={(e) => setElevasiTempat(e.target.value)}
                    placeholder="18"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Azimut Kiblat (°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={azimutKiblat}
                    onChange={(e) => setAzimutKiblat(e.target.value)}
                    placeholder="292.25"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">
                    Penyimpangan (Otomatis)
                  </div>
                  <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                    {formatPenyimpangan(liveCalc.selisih)}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Status: <strong>{liveCalc.status}</strong>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Tanggal Pengukuran
                  </label>
                  <input
                    type="date"
                    value={tanggalPengukuran}
                    onChange={(e) => setTanggalPengukuran(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Foto Kalibrasi
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFotoFileChange}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white"
                />
                {fotoPreview && (
                  <div className="mt-2">
                    <img
                      src={fotoPreview}
                      alt="Pratinjau Foto Kalibrasi"
                      className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Catatan Pengukuran
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                />
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
                  {saving ? 'Menyimpan...' : 'Simpan Kalibrasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {registerModal && canAssignRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveRegister}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-gray-900">Nomor Register Sertifikat</h3>
              <p className="text-xs text-gray-500">
                {registerModal.namaLembaga} • {registerModal.kecamatan || '-'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nomor Register
              </label>
              <input
                type="text"
                required
                value={registerModal.nomorRegister}
                onChange={(e) =>
                  setRegisterModal({ ...registerModal, nomorRegister: e.target.value })
                }
                placeholder="Contoh: B-0177/Kk.30.03/BA.01/01/2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal Terbit Sertifikat
              </label>
              <input
                type="date"
                value={registerModal.tanggalTerbit}
                onChange={(e) =>
                  setRegisterModal({ ...registerModal, tanggalTerbit: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegisterModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingRegister}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {savingRegister ? 'Menyimpan...' : 'Simpan & Aktifkan Sertifikat'}
              </button>
            </div>
          </form>
        </div>
      )}

      <SertifikatKiblatModal
        open={Boolean(sertifikatData)}
        onClose={() => setSertifikatData(null)}
        data={sertifikatData}
        pejabatUtama={pejabatUtamaList}
      />
    </div>
  );
}