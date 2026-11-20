'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type MasjidSubMenuKey = 'masjid' | 'sdm_masjid' | 'arah_kiblat';
export type JenisLembaga = 'MASJID' | 'MUSHALLA';

interface MasjidRecord {
  id: string;
  jenis_lembaga?: JenisLembaga | null;
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

interface SdmRecord {
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

interface KiblatRecord {
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
}

const JAMAAH_OPTIONS = ['50 - 100', '100 - 150', '150 - 200', '200 - 1000', '> 1000'];

const SUBMENU_ITEMS: { key: MasjidSubMenuKey; title: string; subtitle: string; icon: string }[] = [
  {
    key: 'masjid',
    title: 'Data Masjid & Mushalla (SIMAS)',
    subtitle: 'Data resmi Masjid & Mushalla terdaftar hasil import Excel SIMAS Kemenag RI dengan filter Lembaga, Kecamatan & Tipologi.',
    icon: '🕌',
  },
  {
    key: 'sdm_masjid',
    title: 'SDM Masjid & Mushalla',
    subtitle: 'Pengelolaan pengurus, sekretaris, imam, khatib, muazin, remaja, dan jumlah jamaah.',
    icon: '👥',
  },
  {
    key: 'arah_kiblat',
    title: 'Kalibrasi Arah Kiblat',
    subtitle: 'Pencatatan koordinat, azimut bangunan & kiblat, penyimpangan otomatis, tanggal ukur, dan foto kalibrasi.',
    icon: '🧭',
  },
];

function detectJenisLembaga(
  idSimas?: string | null,
  idBaru?: string | null,
  row?: Record<string, any>
): JenisLembaga {
  const s1 = String(idSimas || '').trim();
  const s2 = String(idBaru || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  if (s1.startsWith('01.') || s2.startsWith('01.')) return 'MASJID';
  if (row && ('ID Mushalla' in row || 'Nama Mushalla' in row)) return 'MUSHALLA';
  return 'MASJID';
}

function getEffectiveJenis(m: MasjidRecord): JenisLembaga {
  if (m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID') {
    return m.jenis_lembaga;
  }
  return detectJenisLembaga(m.id_masjid_simas, m.id_baru_simas);
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntOrZero(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function splitListField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  return String(val)
    .split(/[\n;|,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hitungPenyimpangan(
  azimutBangunan: number | null,
  azimutKiblat: number | null
): {
  selisih: number | null;
  status: string;
} {
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

const parseSubMenuParam = (raw: string | null): MasjidSubMenuKey => {
  if (raw === 'sdm_masjid' || raw === 'arah_kiblat' || raw === 'masjid') {
    return raw;
  }
  return 'masjid';
};

function extractKecamatanFromKuaWilayah(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = String(raw)
    .trim()
    .replace(/^KUA\s+Kecamatan\s+/i, '')
    .replace(/^KUA\s+Kec\.?\s+/i, '')
    .replace(/^KUA\s+/i, '')
    .trim();
  return cleaned || null;
}

export default function KebimasislamanPage() {
  const router = useRouter();

  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [kuaKecamatanLock, setKuaKecamatanLock] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<MasjidSubMenuKey>('masjid');

  const [masjidList, setMasjidList] = useState<MasjidRecord[]>([]);
  const [sdmMap, setSdmMap] = useState<Record<string, SdmRecord>>({});
  const [kiblatMap, setKiblatMap] = useState<Record<string, KiblatRecord>>({});
  const [kecamatanMaster, setKecamatanMaster] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter Data Masjid & Mushalla (Jenis Lembaga + Kecamatan + Tipologi + Pencarian)
  const [searchMasjid, setSearchMasjid] = useState('');
  const [filterJenis, setFilterJenis] = useState<'ALL' | JenisLembaga>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterTipologi, setFilterTipologi] = useState('ALL');

  // Filter SDM & Arah Kiblat
  const [searchSub, setSearchSub] = useState('');
  const [filterSubJenis, setFilterSubJenis] = useState<'ALL' | JenisLembaga>('ALL');
  const [filterSubKecamatan, setFilterSubKecamatan] = useState('ALL');
  const [filterKiblatStatus, setFilterKiblatStatus] = useState('ALL');

  // Modal Tambah/Edit Masjid & Mushalla
  const [showMasjidModal, setShowMasjidModal] = useState(false);
  const [editMasjidId, setEditMasjidId] = useState<string | null>(null);
  const [mJenisLembaga, setMJenisLembaga] = useState<JenisLembaga>('MASJID');
  const [mIdSimas, setMIdSimas] = useState('');
  const [mIdBaru, setMIdBaru] = useState('');
  const [mNama, setMNama] = useState('');
  const [mKecamatan, setMKecamatan] = useState('');
  const [mTipologi, setMTipologi] = useState('Masjid Jami');
  const [mStatusTanah, setMStatusTanah] = useState('Wakaf');
  const [mAlamat, setMAlamat] = useState('');
  const [mTahunBerdiri, setMTahunBerdiri] = useState('');
  const [mLuasTanah, setMLuasTanah] = useState('');
  const [mLuasBangunan, setMLuasBangunan] = useState('');
  const [mTelepon, setMTelepon] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mLat, setMLat] = useState('');
  const [mLng, setMLng] = useState('');

  // Modal Form SDM Masjid & Mushalla
  const [showSdmModal, setShowSdmModal] = useState(false);
  const [sdmSelectedMasjidId, setSdmSelectedMasjidId] = useState('');
  const [sdmJumlahPengurus, setSdmJumlahPengurus] = useState<number>(0);
  const [sdmKetuaPengurus, setSdmKetuaPengurus] = useState('');
  const [sdmNoHpKetua, setSdmNoHpKetua] = useState('');
  const [sdmNamaSekretaris, setSdmNamaSekretaris] = useState('');
  const [sdmNoHpSekretaris, setSdmNoHpSekretaris] = useState('');
  const [imamInput, setImamInput] = useState('');
  const [sdmImamList, setSdmImamList] = useState<string[]>([]);
  const [khatibInput, setKhatibInput] = useState('');
  const [sdmKhatibList, setSdmKhatibList] = useState<string[]>([]);
  const [muazinInput, setMuazinInput] = useState('');
  const [sdmMuazinList, setSdmMuazinList] = useState<string[]>([]);
  const [sdmJumlahRemaja, setSdmJumlahRemaja] = useState<number>(0);
  const [sdmKetuaRemaja, setSdmKetuaRemaja] = useState('');
  const [sdmKategoriJamaah, setSdmKategoriJamaah] = useState('50 - 100');

  // Modal Form Kalibrasi Arah Kiblat
  const [showKiblatModal, setShowKiblatModal] = useState(false);
  const [kiblatSelectedMasjidId, setKiblatSelectedMasjidId] = useState('');
  const [kLatitude, setKLatitude] = useState('');
  const [kLintangUtara, setKLintangUtara] = useState('');
  const [kLongitude, setKLongitude] = useState('');
  const [kBujurTimur, setKBujurTimur] = useState('');
  const [kAzimutBangunan, setKAzimutBangunan] = useState('');
  const [kElevasiTempat, setKElevasiTempat] = useState('');
  const [kAzimutKiblat, setKAzimutKiblat] = useState('');
  const [kTanggalPengukuran, setKTanggalPengukuran] = useState('');
  const [kFotoUrl, setKFotoUrl] = useState('');
  const [kFotoFile, setKFotoFile] = useState<File | null>(null);
  const [kFotoPreview, setKFotoPreview] = useState('');
  const [kCatatan, setKCatatan] = useState('');

  // Modal Import Excel (SIMAS / SDM / Arah Kiblat)
  const [importMode, setImportMode] = useState<MasjidSubMenuKey | null>(null);
  const [importRowsPreview, setImportRowsPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');

  // Modal Hapus
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const activeSubMenuMeta = useMemo(
    () => SUBMENU_ITEMS.find((m) => m.key === activeSubMenu) || SUBMENU_ITEMS[0],
    [activeSubMenu]
  );

  const triggerToast = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const navigateSubMenu = useCallback((key: MasjidSubMenuKey) => {
    setActiveSubMenu(key);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('menu', key);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setActiveSubMenu(parseSubMenuParam(params.get('menu')));

    const onPop = () => {
      const nextParams = new URLSearchParams(window.location.search);
      setActiveSubMenu(parseSubMenuParam(nextParams.get('menu')));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [kecRes, masjidRes, sdmRes, kiblatRes] = await Promise.all([
        supabase.from('MasterKecamatan').select('namaKecamatan').order('namaKecamatan'),
        supabase.from('masjid_mushalla').select('*').order('nama_masjid', { ascending: true }),
        supabase.from('masjid_sdm').select('*'),
        supabase.from('masjid_arah_kiblat').select('*'),
      ]);

      if (kecRes.data) {
        const names = Array.from(
          new Set(
            kecRes.data
              .map((k: any) => String(k.namaKecamatan || '').trim())
              .filter(Boolean)
          )
        );
        setKecamatanMaster(names);
      }

      const loadedMasjid: MasjidRecord[] = (masjidRes.data || []).map((m: any) => {
        const cleanedKec = m.kecamatan ? String(m.kecamatan).trim() : null;
        const cleanedTip = m.tipologi ? String(m.tipologi).trim() : null;
        const jenis =
          m.jenis_lembaga === 'MUSHALLA' || m.jenis_lembaga === 'MASJID'
            ? m.jenis_lembaga
            : detectJenisLembaga(m.id_masjid_simas, m.id_baru_simas);
        return {
          ...m,
          jenis_lembaga: jenis,
          kecamatan: cleanedKec,
          tipologi: cleanedTip,
        };
      });
      setMasjidList(loadedMasjid);

      const sMap: Record<string, SdmRecord> = {};
      (sdmRes.data || []).forEach((row: any) => {
        const key = row.masjid_id || row.id_masjid_simas || row.nama_masjid;
        if (key) {
          sMap[key] = {
            ...row,
            jumlah_pengurus: Number(row.jumlah_pengurus || 0),
            ketua_pengurus: row.ketua_pengurus || '',
            no_hp_ketua: row.no_hp_ketua || '',
            nama_sekretaris: row.nama_sekretaris || '',
            no_hp_sekretaris: row.no_hp_sekretaris || '',
            daftar_imam: splitListField(row.daftar_imam),
            daftar_khatib: splitListField(row.daftar_khatib),
            daftar_muazin: splitListField(row.daftar_muazin),
            jumlah_remaja: Number(row.jumlah_remaja || 0),
            ketua_remaja: row.ketua_remaja || '',
            kategori_jamaah: row.kategori_jamaah || '50 - 100',
          };
        }
      });
      setSdmMap(sMap);

      const kMap: Record<string, KiblatRecord> = {};
      (kiblatRes.data || []).forEach((row: any) => {
        const key = row.masjid_id || row.id_masjid_simas || row.nama_masjid;
        if (key) {
          kMap[key] = {
            ...row,
            latitude: parseNumberOrNull(row.latitude),
            lintang_utara: row.lintang_utara || '',
            longitude: parseNumberOrNull(row.longitude),
            bujur_timur: row.bujur_timur || '',
            azimut_bangunan: parseNumberOrNull(row.azimut_bangunan),
            elevasi_tempat: parseNumberOrNull(row.elevasi_tempat),
            azimut_kiblat: parseNumberOrNull(row.azimut_kiblat),
            penyimpangan: parseNumberOrNull(row.penyimpangan),
            status_penyimpangan: row.status_penyimpangan || 'Terverifikasi',
            tanggal_pengukuran: row.tanggal_pengukuran ? String(row.tanggal_pengukuran).slice(0, 10) : '',
            foto_kalibrasi_url: row.foto_kalibrasi_url || '',
            catatan: row.catatan || '',
          };
        }
      });
      setKiblatMap(kMap);
    } catch (err: any) {
      triggerToast('error', 'Gagal Memuat Data', err?.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('role, jabatan_admin, kua_wilayah')
        .eq('id', user.id)
        .single();

      const savedMode = localStorage.getItem('active_mode');
      const mode =
        savedMode ||
        (prof?.role === 'super_admin'
          ? 'super_admin'
          : prof?.jabatan_admin || (prof?.kua_wilayah ? 'admin_kua' : 'pegawai'));

      if (mode === 'pegawai') {
        router.push('/pegawai');
        return;
      }

      const isGlobalAdmin =
        mode === 'super_admin' ||
        mode === 'admin_bimas' ||
        prof?.role === 'super_admin';

      const lockedKec = !isGlobalAdmin
        ? extractKecamatanFromKuaWilayah(prof?.kua_wilayah)
        : null;

      setActiveMode(mode);
      setKuaKecamatanLock(lockedKec);

      if (lockedKec) {
        setFilterKecamatan(lockedKec);
        setFilterSubKecamatan(lockedKec);
      }

      await loadAllData();
    }
    init();
  }, [router, loadAllData]);

  const getSdmForMasjid = useCallback(
    (m: MasjidRecord): SdmRecord | undefined => {
      return (
        sdmMap[m.id] ||
        (m.id_masjid_simas ? sdmMap[m.id_masjid_simas] : undefined) ||
        sdmMap[m.nama_masjid]
      );
    },
    [sdmMap]
  );

  const getKiblatForMasjid = useCallback(
    (m: MasjidRecord): KiblatRecord | undefined => {
      return (
        kiblatMap[m.id] ||
        (m.id_masjid_simas ? kiblatMap[m.id_masjid_simas] : undefined) ||
        kiblatMap[m.nama_masjid]
      );
    },
    [kiblatMap]
  );

  // Data Masjid & Mushalla terlingkup hak akses (Semua Pohuwato untuk Bimas/Super Admin, 1 Kecamatan untuk Admin KUA)
  const scopedMasjidList = useMemo(() => {
    if (!kuaKecamatanLock) return masjidList;
    const target = kuaKecamatanLock.toLowerCase();
    return masjidList.filter(
      (m) => (m.kecamatan || '').trim().toLowerCase() === target
    );
  }, [masjidList, kuaKecamatanLock]);

  const jumlahMasjidOnly = useMemo(
    () => scopedMasjidList.filter((m) => getEffectiveJenis(m) === 'MASJID').length,
    [scopedMasjidList]
  );

  const jumlahMushallaOnly = useMemo(
    () => scopedMasjidList.filter((m) => getEffectiveJenis(m) === 'MUSHALLA').length,
    [scopedMasjidList]
  );

  const kecamatanOptions = useMemo(() => {
    if (kuaKecamatanLock) return [kuaKecamatanLock];
    const set = new Set<string>(kecamatanMaster);
    scopedMasjidList.forEach((m) => {
      if (m.kecamatan) set.add(m.kecamatan.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [kecamatanMaster, scopedMasjidList, kuaKecamatanLock]);

  const tipologiOptions = useMemo(() => {
    const base = [
      'Masjid Agung',
      'Masjid Besar',
      'Masjid Jami',
      'Masjid di Tempat Publik',
      'Mushalla Perumahan',
      'Mushalla Perkantoran',
      'Mushalla Pendidikan',
      'Mushalla di tempat Publik',
    ];
    const set = new Set<string>(base);
    scopedMasjidList.forEach((m) => {
      if (m.tipologi) set.add(m.tipologi.trim());
    });
    return Array.from(set);
  }, [scopedMasjidList]);

  const filteredMasjid = useMemo(() => {
    const q = searchMasjid.trim().toLowerCase();
    return scopedMasjidList.filter((m) => {
      const jenis = getEffectiveJenis(m);
      if (filterJenis !== 'ALL' && jenis !== filterJenis) return false;
      if (
        filterKecamatan !== 'ALL' &&
        (m.kecamatan || '').trim().toLowerCase() !== filterKecamatan.trim().toLowerCase()
      ) {
        return false;
      }
      if (filterTipologi !== 'ALL' && (m.tipologi || '') !== filterTipologi) return false;
      if (!q) return true;
      return (
        m.nama_masjid?.toLowerCase().includes(q) ||
        m.id_masjid_simas?.toLowerCase().includes(q) ||
        m.id_baru_simas?.toLowerCase().includes(q) ||
        m.kecamatan?.toLowerCase().includes(q) ||
        m.tipologi?.toLowerCase().includes(q) ||
        m.alamat?.toLowerCase().includes(q)
      );
    });
  }, [scopedMasjidList, searchMasjid, filterJenis, filterKecamatan, filterTipologi]);

  // Basis lembaga terfilter Jenis & Kecamatan pada sub-menu SDM & Arah Kiblat
  const baseSubScopedMasjid = useMemo(() => {
    return scopedMasjidList.filter((m) => {
      if (filterSubJenis !== 'ALL' && getEffectiveJenis(m) !== filterSubJenis) return false;
      if (
        filterSubKecamatan !== 'ALL' &&
        (m.kecamatan || '').trim().toLowerCase() !== filterSubKecamatan.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [scopedMasjidList, filterSubJenis, filterSubKecamatan]);

  // Ringkasan statistik SDM mengikuti filter Jenis & Kecamatan aktif
  const sdmSummaryStats = useMemo(() => {
    let sudahInput = 0;
    baseSubScopedMasjid.forEach((m) => {
      const s = getSdmForMasjid(m);
      if (s && (s.ketua_pengurus || s.nama_sekretaris || s.jumlah_pengurus > 0 || (s.daftar_imam && s.daftar_imam.length > 0))) {
        sudahInput += 1;
      }
    });
    const total = baseSubScopedMasjid.length;
    return {
      total,
      sudahInput,
      belumInput: Math.max(0, total - sudahInput),
    };
  }, [baseSubScopedMasjid, getSdmForMasjid]);

  // Ringkasan statistik Kalibrasi Arah Kiblat mengikuti filter Jenis & Kecamatan aktif
  const kiblatSummaryStats = useMemo(() => {
    let sudahKalibrasi = 0;
    let sesuaiPresisi = 0;
    let perluKoreksi = 0;
    baseSubScopedMasjid.forEach((m) => {
      const k = getKiblatForMasjid(m);
      if (k && k.azimut_kiblat !== null && k.azimut_kiblat !== undefined) {
        sudahKalibrasi += 1;
        if (k.status_penyimpangan === 'Sesuai / Presisi') {
          sesuaiPresisi += 1;
        } else if (k.status_penyimpangan === 'Perlu Koreksi') {
          perluKoreksi += 1;
        }
      }
    });
    const total = baseSubScopedMasjid.length;
    return {
      total,
      sudahKalibrasi,
      belumKalibrasi: Math.max(0, total - sudahKalibrasi),
      sesuaiPresisi,
      perluKoreksi,
    };
  }, [baseSubScopedMasjid, getKiblatForMasjid]);

  const filteredSubMasjid = useMemo(() => {
    const q = searchSub.trim().toLowerCase();
    return baseSubScopedMasjid.filter((m) => {
      if (activeSubMenu === 'arah_kiblat' && filterKiblatStatus !== 'ALL') {
        const k = getKiblatForMasjid(m);
        if (filterKiblatStatus === 'SUDAH' && (!k || k.azimut_kiblat === null)) return false;
        if (filterKiblatStatus === 'BELUM' && k && k.azimut_kiblat !== null) return false;
        if (
          (filterKiblatStatus === 'Sesuai / Presisi' || filterKiblatStatus === 'Perlu Koreksi') &&
          k?.status_penyimpangan !== filterKiblatStatus
        ) {
          return false;
        }
      }
      if (!q) return true;
      const sdm = getSdmForMasjid(m);
      return (
        m.nama_masjid?.toLowerCase().includes(q) ||
        m.id_masjid_simas?.toLowerCase().includes(q) ||
        m.kecamatan?.toLowerCase().includes(q) ||
        sdm?.ketua_pengurus?.toLowerCase().includes(q) ||
        sdm?.nama_sekretaris?.toLowerCase().includes(q)
      );
    });
  }, [
    baseSubScopedMasjid,
    searchSub,
    filterKiblatStatus,
    activeSubMenu,
    getKiblatForMasjid,
    getSdmForMasjid,
  ]);

  const liveKiblatCalc = useMemo(() => {
    const azB = parseNumberOrNull(kAzimutBangunan);
    const azK = parseNumberOrNull(kAzimutKiblat);
    return hitungPenyimpangan(azB, azK);
  }, [kAzimutBangunan, kAzimutKiblat]);

  // ==================== MODAL & CRUD MASJID / MUSHALLA ====================
  const openAddMasjid = () => {
    setEditMasjidId(null);
    setMJenisLembaga(filterJenis === 'MUSHALLA' ? 'MUSHALLA' : 'MASJID');
    setMIdSimas('');
    setMIdBaru('');
    setMNama('');
    setMKecamatan(kuaKecamatanLock || kecamatanOptions[0] || '');
    setMTipologi(filterJenis === 'MUSHALLA' ? 'Mushalla Perumahan' : 'Masjid Jami');
    setMStatusTanah('Wakaf');
    setMAlamat('');
    setMTahunBerdiri('');
    setMLuasTanah('');
    setMLuasBangunan('');
    setMTelepon('');
    setMEmail('');
    setMLat('');
    setMLng('');
    setShowMasjidModal(true);
  };

  const openEditMasjid = (m: MasjidRecord) => {
    setEditMasjidId(m.id);
    setMJenisLembaga(getEffectiveJenis(m));
    setMIdSimas(m.id_masjid_simas || '');
    setMIdBaru(m.id_baru_simas || '');
    setMNama(m.nama_masjid || '');
    setMKecamatan(m.kecamatan || '');
    setMTipologi(m.tipologi || 'Masjid Jami');
    setMStatusTanah(m.status_tanah || 'Wakaf');
    setMAlamat(m.alamat || '');
    setMTahunBerdiri(m.tahun_berdiri || '');
    setMLuasTanah(m.luas_tanah || '');
    setMLuasBangunan(m.luas_bangunan || '');
    setMTelepon(m.telepon || '');
    setMEmail(m.email || '');
    setMLat(m.latitude_simas !== null ? String(m.latitude_simas) : '');
    setMLng(m.longitude_simas !== null ? String(m.longitude_simas) : '');
    setShowMasjidModal(true);
  };

  const handleSaveMasjid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mNama.trim()) return;
    setProcessing(true);

    const payload: any = {
      jenis_lembaga: mJenisLembaga,
      id_masjid_simas: mIdSimas.trim() || null,
      id_baru_simas: mIdBaru.trim() || null,
      nama_masjid: mNama.trim(),
      kecamatan: (kuaKecamatanLock || mKecamatan.trim()) || null,
      tipologi: mTipologi.trim() || null,
      status_tanah: mStatusTanah.trim() || null,
      alamat: mAlamat.trim() || null,
      tahun_berdiri: mTahunBerdiri.trim() || null,
      luas_tanah: mLuasTanah.trim() || null,
      luas_bangunan: mLuasBangunan.trim() || null,
      telepon: mTelepon.trim() || null,
      email: mEmail.trim() || null,
      latitude_simas: parseNumberOrNull(mLat),
      longitude_simas: parseNumberOrNull(mLng),
      sumber_data: editMasjidId ? undefined : 'SIMAS / Manual',
      updated_at: new Date().toISOString(),
    };
    if (payload.sumber_data === undefined) delete payload.sumber_data;

    const { error } = editMasjidId
      ? await supabase.from('masjid_mushalla').update(payload).eq('id', editMasjidId)
      : await supabase.from('masjid_mushalla').insert([payload]);

    setProcessing(false);
    if (error) {
      triggerToast('error', 'Gagal Menyimpan Data', error.message);
    } else {
      setShowMasjidModal(false);
      triggerToast(
        'success',
        editMasjidId ? 'Data Diperbarui' : 'Data Ditambahkan',
        `"${mNama.trim()}" berhasil disimpan.`
      );
      await loadAllData();
    }
  };

  const handleDeleteMasjid = async () => {
    if (!deleteTarget) return;
    setProcessing(true);
    const { error } = await supabase.from('masjid_mushalla').delete().eq('id', deleteTarget.id);
    setProcessing(false);
    setDeleteTarget(null);
    if (error) {
      triggerToast('error', 'Gagal Menghapus', error.message);
    } else {
      triggerToast('success', 'Berhasil Dihapus', `"${deleteTarget.nama}" telah dihapus.`);
      await loadAllData();
    }
  };

  // ==================== MODAL & CRUD SDM ====================
  const openSdmForm = (m?: MasjidRecord) => {
    const targetMasjid = m || filteredSubMasjid[0] || scopedMasjidList[0];
    const masjidId = targetMasjid?.id || '';
    const existing = targetMasjid ? getSdmForMasjid(targetMasjid) : undefined;

    setSdmSelectedMasjidId(masjidId);
    setSdmJumlahPengurus(existing?.jumlah_pengurus || 0);
    setSdmKetuaPengurus(existing?.ketua_pengurus || '');
    setSdmNoHpKetua(existing?.no_hp_ketua || '');
    setSdmNamaSekretaris(existing?.nama_sekretaris || '');
    setSdmNoHpSekretaris(existing?.no_hp_sekretaris || '');
    setImamInput('');
    setSdmImamList(existing?.daftar_imam || []);
    setKhatibInput('');
    setSdmKhatibList(existing?.daftar_khatib || []);
    setMuazinInput('');
    setSdmMuazinList(existing?.daftar_muazin || []);
    setSdmJumlahRemaja(existing?.jumlah_remaja || 0);
    setSdmKetuaRemaja(existing?.ketua_remaja || '');
    setSdmKategoriJamaah(existing?.kategori_jamaah || '50 - 100');
    setShowSdmModal(true);
  };

  const handleSelectSdmMasjid = (newMasjidId: string) => {
    setSdmSelectedMasjidId(newMasjidId);
    const found = scopedMasjidList.find((item) => item.id === newMasjidId);
    const existing = found ? getSdmForMasjid(found) : undefined;
    setSdmJumlahPengurus(existing?.jumlah_pengurus || 0);
    setSdmKetuaPengurus(existing?.ketua_pengurus || '');
    setSdmNoHpKetua(existing?.no_hp_ketua || '');
    setSdmNamaSekretaris(existing?.nama_sekretaris || '');
    setSdmNoHpSekretaris(existing?.no_hp_sekretaris || '');
    setSdmImamList(existing?.daftar_imam || []);
    setSdmKhatibList(existing?.daftar_khatib || []);
    setSdmMuazinList(existing?.daftar_muazin || []);
    setSdmJumlahRemaja(existing?.jumlah_remaja || 0);
    setSdmKetuaRemaja(existing?.ketua_remaja || '');
    setSdmKategoriJamaah(existing?.kategori_jamaah || '50 - 100');
  };

  const addPersonTag = (
    rawText: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const pieces = splitListField(rawText);
    if (pieces.length === 0) return;
    setList([...list, ...pieces]);
    clearInput('');
  };

  const handleSaveSdm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjidList.find((m) => m.id === sdmSelectedMasjidId);
    if (!targetMasjid) {
      triggerToast('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    setProcessing(true);
    const finalImam = imamInput.trim() ? [...sdmImamList, ...splitListField(imamInput)] : sdmImamList;
    const finalKhatib = khatibInput.trim() ? [...sdmKhatibList, ...splitListField(khatibInput)] : sdmKhatibList;
    const finalMuazin = muazinInput.trim() ? [...sdmMuazinList, ...splitListField(muazinInput)] : sdmMuazinList;

    const payload = {
      masjid_id: targetMasjid.id,
      id_masjid_simas: targetMasjid.id_masjid_simas || null,
      nama_masjid: targetMasjid.nama_masjid,
      kecamatan: targetMasjid.kecamatan || null,
      jumlah_pengurus: Number(sdmJumlahPengurus || 0),
      ketua_pengurus: sdmKetuaPengurus.trim() || null,
      no_hp_ketua: sdmNoHpKetua.trim() || null,
      nama_sekretaris: sdmNamaSekretaris.trim() || null,
      no_hp_sekretaris: sdmNoHpSekretaris.trim() || null,
      daftar_imam: finalImam,
      daftar_khatib: finalKhatib,
      daftar_muazin: finalMuazin,
      jumlah_remaja: Number(sdmJumlahRemaja || 0),
      ketua_remaja: sdmKetuaRemaja.trim() || null,
      kategori_jamaah: sdmKategoriJamaah || '50 - 100',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('masjid_sdm')
      .upsert(payload, { onConflict: 'masjid_id' });

    setProcessing(false);
    if (error) {
      triggerToast('error', 'Gagal Menyimpan SDM', error.message);
    } else {
      setShowSdmModal(false);
      triggerToast('success', 'SDM Tersimpan', `Data SDM "${targetMasjid.nama_masjid}" berhasil disimpan.`);
      await loadAllData();
    }
  };

  // ==================== MODAL & CRUD ARAH KIBLAT ====================
  const openKiblatForm = (m?: MasjidRecord) => {
    const targetMasjid = m || filteredSubMasjid[0] || scopedMasjidList[0];
    const existing = targetMasjid ? getKiblatForMasjid(targetMasjid) : undefined;

    setKiblatSelectedMasjidId(targetMasjid?.id || '');
    setKLatitude(
      existing?.latitude !== null && existing?.latitude !== undefined
        ? String(existing.latitude)
        : targetMasjid?.latitude_simas !== null && targetMasjid?.latitude_simas !== undefined
        ? String(targetMasjid.latitude_simas)
        : ''
    );
    setKLintangUtara(existing?.lintang_utara || '');
    setKLongitude(
      existing?.longitude !== null && existing?.longitude !== undefined
        ? String(existing.longitude)
        : targetMasjid?.longitude_simas !== null && targetMasjid?.longitude_simas !== undefined
        ? String(targetMasjid.longitude_simas)
        : ''
    );
    setKBujurTimur(existing?.bujur_timur || '');
    setKAzimutBangunan(
      existing?.azimut_bangunan !== null && existing?.azimut_bangunan !== undefined
        ? String(existing.azimut_bangunan)
        : ''
    );
    setKElevasiTempat(
      existing?.elevasi_tempat !== null && existing?.elevasi_tempat !== undefined
        ? String(existing.elevasi_tempat)
        : ''
    );
    setKAzimutKiblat(
      existing?.azimut_kiblat !== null && existing?.azimut_kiblat !== undefined
        ? String(existing.azimut_kiblat)
        : ''
    );
    setKTanggalPengukuran(existing?.tanggal_pengukuran || new Date().toISOString().slice(0, 10));
    setKFotoUrl(existing?.foto_kalibrasi_url || '');
    setKFotoFile(null);
    setKFotoPreview(existing?.foto_kalibrasi_url || '');
    setKCatatan(existing?.catatan || '');
    setShowKiblatModal(true);
  };

  const handleSelectKiblatMasjid = (newMasjidId: string) => {
    setKiblatSelectedMasjidId(newMasjidId);
    const found = scopedMasjidList.find((item) => item.id === newMasjidId);
    const existing = found ? getKiblatForMasjid(found) : undefined;
    setKLatitude(
      existing?.latitude !== null && existing?.latitude !== undefined
        ? String(existing.latitude)
        : found?.latitude_simas !== null && found?.latitude_simas !== undefined
        ? String(found.latitude_simas)
        : ''
    );
    setKLintangUtara(existing?.lintang_utara || '');
    setKLongitude(
      existing?.longitude !== null && existing?.longitude !== undefined
        ? String(existing.longitude)
        : found?.longitude_simas !== null && found?.longitude_simas !== undefined
        ? String(found.longitude_simas)
        : ''
    );
    setKBujurTimur(existing?.bujur_timur || '');
    setKAzimutBangunan(
      existing?.azimut_bangunan !== null && existing?.azimut_bangunan !== undefined
        ? String(existing.azimut_bangunan)
        : ''
    );
    setKElevasiTempat(
      existing?.elevasi_tempat !== null && existing?.elevasi_tempat !== undefined
        ? String(existing.elevasi_tempat)
        : ''
    );
    setKAzimutKiblat(
      existing?.azimut_kiblat !== null && existing?.azimut_kiblat !== undefined
        ? String(existing.azimut_kiblat)
        : ''
    );
    setKTanggalPengukuran(existing?.tanggal_pengukuran || new Date().toISOString().slice(0, 10));
    setKFotoUrl(existing?.foto_kalibrasi_url || '');
    setKFotoFile(null);
    setKFotoPreview(existing?.foto_kalibrasi_url || '');
    setKCatatan(existing?.catatan || '');
  };

  const handleFotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Format File Tidak Sesuai', 'Pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    setKFotoFile(file);
    const localUrl = URL.createObjectURL(file);
    setKFotoPreview(localUrl);
  };

  const handleSaveKiblat = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMasjid = scopedMasjidList.find((m) => m.id === kiblatSelectedMasjidId);
    if (!targetMasjid) {
      triggerToast('error', 'Pilih Masjid / Mushalla', 'Silakan pilih masjid atau mushalla terlebih dahulu.');
      return;
    }

    setProcessing(true);
    try {
      let uploadedPhotoUrl = kFotoUrl || null;

      if (kFotoFile) {
        const { blob, ext } = await compressCalibrationImage(kFotoFile);
        const safeId = (targetMasjid.id_masjid_simas || targetMasjid.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filePath = `${safeId}_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('kalibrasi-kiblat')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          throw new Error(`Upload foto gagal: ${uploadErr.message}`);
        }

        const { data: pubData } = supabase.storage
          .from('kalibrasi-kiblat')
          .getPublicUrl(filePath);
        uploadedPhotoUrl = pubData.publicUrl;
      }

      const latNum = parseNumberOrNull(kLatitude);
      const lngNum = parseNumberOrNull(kLongitude);
      const azB = parseNumberOrNull(kAzimutBangunan);
      const azK = parseNumberOrNull(kAzimutKiblat);
      const elevNum = parseNumberOrNull(kElevasiTempat);
      const calc = hitungPenyimpangan(azB, azK);

      const payload = {
        masjid_id: targetMasjid.id,
        id_masjid_simas: targetMasjid.id_masjid_simas || null,
        nama_masjid: targetMasjid.nama_masjid,
        kecamatan: targetMasjid.kecamatan || null,
        latitude: latNum,
        lintang_utara: kLintangUtara.trim() || null,
        longitude: lngNum,
        bujur_timur: kBujurTimur.trim() || null,
        azimut_bangunan: azB,
        elevasi_tempat: elevNum,
        azimut_kiblat: azK,
        penyimpangan: calc.selisih,
        status_penyimpangan: calc.status,
        tanggal_pengukuran: kTanggalPengukuran || new Date().toISOString().slice(0, 10),
        foto_kalibrasi_url: uploadedPhotoUrl,
        catatan: kCatatan.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('masjid_arah_kiblat')
        .upsert(payload, { onConflict: 'masjid_id' });

      if (error) {
        throw new Error(error.message);
      }

      setShowKiblatModal(false);
      triggerToast(
        'success',
        'Kalibrasi Arah Kiblat Tersimpan',
        `Data arah kiblat "${targetMasjid.nama_masjid}" berhasil disimpan.`
      );
      await loadAllData();
    } catch (err: any) {
      triggerToast('error', 'Gagal Menyimpan Arah Kiblat', err?.message || 'Terjadi kesalahan.');
    } finally {
      setProcessing(false);
    }
  };

  // ==================== IMPORT EXCEL (SIMAS MASJID & MUSHALLA / SDM / ARAH KIBLAT) ====================
  const openImportModal = (mode: MasjidSubMenuKey) => {
    setImportMode(mode);
    setImportFileName('');
    setImportRowsPreview([]);
  };

  const downloadExcelTemplate = (mode: 'sdm_masjid' | 'arah_kiblat') => {
    const sampleMasjid = masjidList[0];
    if (mode === 'sdm_masjid') {
      const templateData = [
        {
          'ID Masjid': sampleMasjid?.id_masjid_simas || '01.3.28.04.05.000001',
          'Nama Masjid': sampleMasjid?.nama_masjid || 'BAITURRAHMAN',
          'Kecamatan': sampleMasjid?.kecamatan || 'Paguat',
          'Jumlah Pengurus': 12,
          'Ketua Pengurus': 'H. Ahmad Fauzi',
          'No HP Ketua': '081234567890',
          'Nama Sekretaris': 'Muhamad Rizki',
          'No HP Sekretaris': '085234567891',
          'Imam': 'Ust. Abdullah; Ust. Rahman',
          'Khatib': 'Ust. Mansur; Ust. Saleh',
          'Muazin': 'Bapak Karim; Bapak Hasan',
          'Jumlah Remaja': 25,
          'Ketua Remaja': 'Rizal Pratama',
          'Jumlah Jamaah': '200 - 1000',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_SDM');
      XLSX.writeFile(wb, 'Template_Import_SDM_Masjid_Mushalla.xlsx');
    } else {
      const templateData = [
        {
          'ID Masjid': sampleMasjid?.id_masjid_simas || '01.3.28.04.05.000001',
          'Nama Masjid': sampleMasjid?.nama_masjid || 'BAITURRAHMAN',
          'Kecamatan': sampleMasjid?.kecamatan || 'Paguat',
          'Latitude': 0.507535,
          'Lintang Utara': "00° 30' 27.13\" LU",
          'Longitude': 122.076154,
          'Bujur Timur': "122° 04' 34.15\" BT",
          'Azimut Bangunan': 291.85,
          'Elevasi Tempat': 18,
          'Azimut Kiblat': 292.25,
          'Tanggal Pengukuran': '2026-11-19',
          'Catatan': 'Pengukuran kalibrasi arah kiblat mihrab',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Arah_Kiblat');
      XLSX.writeFile(wb, 'Template_Import_Arah_Kiblat.xlsx');
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importMode) return;

    setImportFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        triggerToast('error', 'File Kosong', 'Tidak ditemukan baris data pada file Excel.');
        setImportRowsPreview([]);
        return;
      }

      if (importMode === 'masjid') {
        const mapped = rawRows
          .map((r) => {
            const nama = String(
              r['Nama Masjid'] ||
                r['Nama Mushalla'] ||
                r['nama_masjid'] ||
                r['Nama Masjid / Mushalla'] ||
                ''
            ).trim();
            if (!nama) return null;

            const idSimas =
              String(r['ID Masjid'] || r['ID Mushalla'] || r['id_masjid_simas'] || '').trim() ||
              null;
            const idBaru = String(r['ID Baru'] || r['id_baru_simas'] || '').trim() || null;
            const jenisLembaga = detectJenisLembaga(idSimas, idBaru, r);

            return {
              jenis_lembaga: jenisLembaga,
              id_masjid_simas: idSimas,
              id_baru_simas: idBaru,
              nama_masjid: nama,
              provinsi: String(r['Provinsi'] || r['provinsi'] || 'Gorontalo').trim(),
              kabupaten_kota: String(
                r['Kabupaten/Kota'] || r['Kabupaten'] || r['kabupaten_kota'] || 'Kabupaten Pohuwato'
              ).trim(),
              kecamatan: String(r['Kecamatan'] || r['kecamatan'] || '').trim() || null,
              tipologi: String(r['Tipologi'] || r['tipologi'] || '').trim() || null,
              status_tanah: String(r['Status Tanah'] || r['status_tanah'] || '').trim() || null,
              alamat: String(r['Alamat'] || r['alamat'] || '').trim() || null,
              tahun_berdiri:
                r['Tahun Berdiri'] !== '' && r['Tahun Berdiri'] !== undefined
                  ? String(r['Tahun Berdiri']).trim()
                  : null,
              luas_tanah:
                r['Luas Tanah'] !== '' && r['Luas Tanah'] !== undefined
                  ? String(r['Luas Tanah']).trim()
                  : null,
              luas_bangunan:
                r['Luas Bangunan'] !== '' && r['Luas Bangunan'] !== undefined
                  ? String(r['Luas Bangunan']).trim()
                  : null,
              telepon:
                r['Telepon'] !== '' && r['Telepon'] !== undefined
                  ? String(r['Telepon']).trim()
                  : null,
              email: r['Email'] ? String(r['Email']).trim() : null,
              latitude_simas: parseNumberOrNull(r['Latitude'] ?? r['latitude']),
              longitude_simas: parseNumberOrNull(r['Longitude'] ?? r['longitude']),
              sumber_data: 'SIMAS',
            };
          })
          .filter(Boolean);

        setImportRowsPreview(mapped);
      } else if (importMode === 'sdm_masjid') {
        const mapped = rawRows
          .map((r) => {
            const idSimas = String(
              r['ID Masjid'] || r['ID Mushalla'] || r['id_masjid_simas'] || ''
            ).trim();
            const namaMasjid = String(
              r['Nama Masjid'] || r['Nama Mushalla'] || r['nama_masjid'] || ''
            ).trim();
            const kec = String(r['Kecamatan'] || r['kecamatan'] || '').trim();

            const matched = scopedMasjidList.find(
              (m) =>
                (idSimas && m.id_masjid_simas === idSimas) ||
                (namaMasjid &&
                  m.nama_masjid.toLowerCase() === namaMasjid.toLowerCase() &&
                  (!kec || (m.kecamatan || '').toLowerCase() === kec.toLowerCase()))
            );

            if (!matched && !namaMasjid) return null;

            return {
              masjid_id: matched?.id || null,
              id_masjid_simas: matched?.id_masjid_simas || idSimas || null,
              nama_masjid: matched?.nama_masjid || namaMasjid,
              kecamatan: matched?.kecamatan || kec || null,
              jumlah_pengurus: parseIntOrZero(r['Jumlah Pengurus'] ?? r['jumlah_pengurus']),
              ketua_pengurus:
                String(r['Ketua Pengurus'] || r['ketua_pengurus'] || '').trim() || null,
              no_hp_ketua:
                String(r['No HP Ketua'] || r['Nomor HP Ketua'] || r['no_hp_ketua'] || '').trim() ||
                null,
              nama_sekretaris:
                String(r['Nama Sekretaris'] || r['nama_sekretaris'] || '').trim() || null,
              no_hp_sekretaris:
                String(
                  r['No HP Sekretaris'] || r['Nomor HP Sekretaris'] || r['no_hp_sekretaris'] || ''
                ).trim() || null,
              daftar_imam: splitListField(r['Imam'] ?? r['daftar_imam']),
              daftar_khatib: splitListField(r['Khatib'] ?? r['daftar_khatib']),
              daftar_muazin: splitListField(r['Muazin'] ?? r['daftar_muazin']),
              jumlah_remaja: parseIntOrZero(
                r['Jumlah Remaja'] ?? r['Remaja'] ?? r['jumlah_remaja']
              ),
              ketua_remaja: String(r['Ketua Remaja'] || r['ketua_remaja'] || '').trim() || null,
              kategori_jamaah:
                String(
                  r['Jumlah Jamaah'] || r['Kategori Jamaah'] || r['kategori_jamaah'] || '50 - 100'
                ).trim() || '50 - 100',
              _matched: Boolean(matched),
            };
          })
          .filter(Boolean);

        setImportRowsPreview(mapped);
      } else if (importMode === 'arah_kiblat') {
        const mapped = rawRows
          .map((r) => {
            const idSimas = String(
              r['ID Masjid'] || r['ID Mushalla'] || r['id_masjid_simas'] || ''
            ).trim();
            const namaMasjid = String(
              r['Nama Masjid'] || r['Nama Mushalla'] || r['nama_masjid'] || ''
            ).trim();
            const kec = String(r['Kecamatan'] || r['kecamatan'] || '').trim();

            const matched = scopedMasjidList.find(
              (m) =>
                (idSimas && m.id_masjid_simas === idSimas) ||
                (namaMasjid &&
                  m.nama_masjid.toLowerCase() === namaMasjid.toLowerCase() &&
                  (!kec || (m.kecamatan || '').toLowerCase() === kec.toLowerCase()))
            );

            if (!matched && !namaMasjid) return null;

            const latVal = parseNumberOrNull(r['Latitude'] ?? r['latitude']);
            const lngVal = parseNumberOrNull(r['Longitude'] ?? r['longitude']);
            const azB = parseNumberOrNull(r['Azimut Bangunan'] ?? r['azimut_bangunan']);
            const azK = parseNumberOrNull(r['Azimut Kiblat'] ?? r['azimut_kiblat']);
            const elevVal = parseNumberOrNull(r['Elevasi Tempat'] ?? r['elevasi_tempat']);
            const calc = hitungPenyimpangan(azB, azK);

            const tglRaw = r['Tanggal Pengukuran'] || r['tanggal_pengukuran'] || '';
            const tglStr = tglRaw
              ? String(tglRaw).slice(0, 10)
              : new Date().toISOString().slice(0, 10);

            return {
              masjid_id: matched?.id || null,
              id_masjid_simas: matched?.id_masjid_simas || idSimas || null,
              nama_masjid: matched?.nama_masjid || namaMasjid,
              kecamatan: matched?.kecamatan || kec || null,
              latitude: latVal,
              lintang_utara:
                String(r['Lintang Utara'] || r['lintang_utara'] || '').trim() || null,
              longitude: lngVal,
              bujur_timur: String(r['Bujur Timur'] || r['bujur_timur'] || '').trim() || null,
              azimut_bangunan: azB,
              elevasi_tempat: elevVal,
              azimut_kiblat: azK,
              penyimpangan: calc.selisih,
              status_penyimpangan: calc.status,
              tanggal_pengukuran: tglStr,
              catatan: String(r['Catatan'] || r['catatan'] || '').trim() || null,
              _matched: Boolean(matched),
            };
          })
          .filter(Boolean);

        setImportRowsPreview(mapped);
      }
    } catch (err: any) {
      triggerToast('error', 'Gagal Membaca File Excel', err?.message || 'Format file tidak didukung.');
    }
  };

  const handleExecuteImport = async () => {
    if (!importMode || importRowsPreview.length === 0) return;
    setProcessing(true);

    try {
      const nowIso = new Date().toISOString();

      if (importMode === 'masjid') {
        const cleanRows = importRowsPreview.map((item) => ({
          ...item,
          updated_at: nowIso,
        }));

        const withIdSimas = cleanRows.filter((r) => Boolean(r.id_masjid_simas));
        const withoutIdSimas = cleanRows.filter((r) => !r.id_masjid_simas);

        if (withIdSimas.length > 0) {
          const { error } = await supabase
            .from('masjid_mushalla')
            .upsert(withIdSimas, { onConflict: 'id_masjid_simas' });
          if (error) throw new Error(error.message);
        }

        if (withoutIdSimas.length > 0) {
          const { error } = await supabase.from('masjid_mushalla').insert(withoutIdSimas);
          if (error) throw new Error(error.message);
        }

        const countMasjid = cleanRows.filter((r) => r.jenis_lembaga === 'MASJID').length;
        const countMushalla = cleanRows.filter((r) => r.jenis_lembaga === 'MUSHALLA').length;

        triggerToast(
          'success',
          'Import SIMAS Berhasil',
          `${cleanRows.length} data terimport (${countMasjid} Masjid, ${countMushalla} Mushalla).`
        );
      } else if (importMode === 'sdm_masjid') {
        const validRows = importRowsPreview
          .filter((r) => Boolean(r.masjid_id))
          .map(({ _matched, ...rest }) => ({
            ...rest,
            updated_at: nowIso,
          }));

        if (validRows.length === 0) {
          throw new Error(
            'Tidak ada baris yang cocok dengan data Masjid/Mushalla di database. Pastikan ID atau Nama + Kecamatan sesuai data SIMAS.'
          );
        }

        const { error } = await supabase
          .from('masjid_sdm')
          .upsert(validRows, { onConflict: 'masjid_id' });
        if (error) throw new Error(error.message);

        triggerToast(
          'success',
          'Import SDM Berhasil',
          `${validRows.length} data SDM berhasil diimport.`
        );
      } else if (importMode === 'arah_kiblat') {
        const validRows = importRowsPreview
          .filter((r) => Boolean(r.masjid_id))
          .map(({ _matched, ...rest }) => ({
            ...rest,
            updated_at: nowIso,
          }));

        if (validRows.length === 0) {
          throw new Error(
            'Tidak ada baris yang cocok dengan data Masjid/Mushalla di database. Pastikan ID atau Nama + Kecamatan sesuai data SIMAS.'
          );
        }

        const { error } = await supabase
          .from('masjid_arah_kiblat')
          .upsert(validRows, { onConflict: 'masjid_id' });
        if (error) throw new Error(error.message);

        triggerToast(
          'success',
          'Import Arah Kiblat Berhasil',
          `${validRows.length} data kalibrasi arah kiblat berhasil diimport.`
        );
      }

      setImportMode(null);
      setImportRowsPreview([]);
      setImportFileName('');
      await loadAllData();
    } catch (err: any) {
      triggerToast('error', 'Import Gagal', err?.message || 'Terjadi kesalahan saat import.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">
          {toast && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] max-w-md sm:w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                  toast.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {toast.type === 'success' ? '✓' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
                <p className="text-xs text-gray-700 mt-0.5 font-medium break-words">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-700 font-bold p-1 shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            {/* HEADER HALAMAN */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span>Data Kebimasislaman • Masjid & Mushalla</span>
                  </div>
                  {kuaKecamatanLock && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <span>🔒 Wilayah Admin KUA: Kec. {kuaKecamatanLock}</span>
                    </div>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{activeSubMenuMeta.icon}</span>
                  <span>{activeSubMenuMeta.title}</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {activeSubMenuMeta.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeSubMenu === 'masjid' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openImportModal('masjid')}
                      className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      📥 Import Excel SIMAS
                    </button>
                    <button
                      type="button"
                      onClick={openAddMasjid}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                    >
                      + Tambah Masjid / Mushalla
                    </button>
                  </>
                )}

                {activeSubMenu === 'sdm_masjid' && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadExcelTemplate('sdm_masjid')}
                      className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition"
                    >
                      📄 Template Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => openImportModal('sdm_masjid')}
                      className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition"
                    >
                      📥 Import Excel SDM
                    </button>
                    <button
                      type="button"
                      onClick={() => openSdmForm()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                    >
                      + Input / Edit SDM
                    </button>
                  </>
                )}

                {activeSubMenu === 'arah_kiblat' && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadExcelTemplate('arah_kiblat')}
                      className="px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition"
                    >
                      📄 Template Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => openImportModal('arah_kiblat')}
                      className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition"
                    >
                      📥 Import Excel Kiblat
                    </button>
                    <button
                      type="button"
                      onClick={() => openKiblatForm()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                    >
                      + Input Kalibrasi Kiblat
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PILL NAVIGASI RINGKAS ANTAR SUB-SUBMENU */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5">
              {SUBMENU_ITEMS.map((item) => {
                const active = activeSubMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigateSubMenu(item.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {item.icon} {item.title}
                  </button>
                );
              })}
            </div>

            {/* ==================== SUB-MENU 1: DATA MASJID & MUSHALLA (SIMAS) ==================== */}
            {activeSubMenu === 'masjid' && (
              <>
                {/* RINGKASAN METRIK */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Total Masjid (01)</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{jumlahMasjidOnly}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Total Mushalla (02)</div>
                    <div className="text-xl font-bold text-teal-700 mt-1">{jumlahMushallaOnly}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Hasil Filter Saat Ini</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">{filteredMasjid.length}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Gabungan Terdaftar</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{scopedMasjidList.length}</div>
                  </div>
                </div>

                {/* FILTER MASJID / MUSHALLA + KECAMATAN + TIPOLOGI */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    <div className="relative lg:col-span-4">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={searchMasjid}
                        onChange={(e) => setSearchMasjid(e.target.value)}
                        placeholder="Cari nama, ID SIMAS, kecamatan, atau alamat..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <select
                        aria-label="Filter Masjid atau Mushalla"
                        value={filterJenis}
                        onChange={(e) => setFilterJenis(e.target.value as 'ALL' | JenisLembaga)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🕌 Semua (Masjid & Mushalla)</option>
                        <option value="MASJID">Masjid (Awalan 01)</option>
                        <option value="MUSHALLA">Mushalla (Awalan 02)</option>
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <select
                        aria-label="Filter Kecamatan"
                        value={kuaKecamatanLock || filterKecamatan}
                        disabled={Boolean(kuaKecamatanLock)}
                        onChange={(e) => setFilterKecamatan(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-600"
                      >
                        {!kuaKecamatanLock && <option value="ALL">📍 Semua Kecamatan</option>}
                        {kecamatanOptions.map((kec) => (
                          <option key={kec} value={kec}>
                            📍 {kec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <select
                        aria-label="Filter Tipologi"
                        value={filterTipologi}
                        onChange={(e) => setFilterTipologi(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🏛️ Semua Tipologi</option>
                        {tipologiOptions.map((tip) => (
                          <option key={tip} value={tip}>
                            {tip}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(searchMasjid ||
                    filterJenis !== 'ALL' ||
                    (!kuaKecamatanLock && filterKecamatan !== 'ALL') ||
                    filterTipologi !== 'ALL') && (
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchMasjid('');
                          setFilterJenis('ALL');
                          setFilterKecamatan(kuaKecamatanLock || 'ALL');
                          setFilterTipologi('ALL');
                        }}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        Reset Filter
                      </button>
                      <span className="text-gray-600">
                        Menampilkan <strong className="text-emerald-700">{filteredMasjid.length}</strong> data
                      </span>
                    </div>
                  )}
                </div>

                {/* LIST DATA MASJID & MUSHALLA */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">
                      Memuat data Masjid & Mushalla SIMAS...
                    </div>
                  ) : filteredMasjid.length === 0 ? (
                    <div className="p-10 text-center text-sm text-gray-500 space-y-2">
                      <div>Belum ada data Masjid atau Mushalla yang tampil.</div>
                      <button
                        type="button"
                        onClick={() => openImportModal('masjid')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        📥 Import File Excel SIMAS Sekarang
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* KARTU KHUSUS HP (< md) */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredMasjid.map((m, idx) => {
                          const jenis = getEffectiveJenis(m);
                          return (
                            <div key={m.id} className="p-4 space-y-2.5 bg-white">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                      #{idx + 1}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                        jenis === 'MUSHALLA'
                                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}
                                    </span>
                                    {m.kecamatan && (
                                      <span className="text-[10px] font-semibold bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md">
                                        {m.kecamatan}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-sm text-gray-900 mt-1.5 break-words">
                                    {m.nama_masjid}
                                  </h3>
                                  {m.tipologi && (
                                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                                      {m.tipologi}
                                    </p>
                                  )}
                                  {m.id_masjid_simas && (
                                    <p className="font-mono text-[10px] text-gray-500 mt-0.5">
                                      ID: {m.id_masjid_simas}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600 space-y-1">
                                {m.alamat && <div className="break-words">📍 {m.alamat}</div>}
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-700 pt-0.5">
                                  {m.status_tanah && (
                                    <span>
                                      Tanah: <strong>{m.status_tanah}</strong>
                                    </span>
                                  )}
                                  {m.tahun_berdiri && (
                                    <span>
                                      Thn: <strong>{m.tahun_berdiri}</strong>
                                    </span>
                                  )}
                                  {m.telepon && <span>📞 {m.telepon}</span>}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => openSdmForm(m)}
                                  className="py-2 px-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold"
                                >
                                  👥 SDM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openKiblatForm(m)}
                                  className="py-2 px-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold"
                                >
                                  🧭 Kiblat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditMasjid(m)}
                                  className="py-2 px-2 rounded-xl bg-gray-100 text-gray-800 border border-gray-200 text-[11px] font-bold"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* TABEL DESKTOP (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-5 py-3.5 font-semibold">No</th>
                              <th className="px-5 py-3.5 font-semibold">Nama & ID SIMAS</th>
                              <th className="px-5 py-3.5 font-semibold">Jenis, Kecamatan & Tipologi</th>
                              <th className="px-5 py-3.5 font-semibold">Alamat & Pertanahan</th>
                              <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredMasjid.map((m, idx) => {
                              const jenis = getEffectiveJenis(m);
                              return (
                                <tr key={m.id} className="hover:bg-gray-50 transition">
                                  <td className="px-5 py-3.5 text-xs text-gray-500">{idx + 1}</td>
                                  <td className="px-5 py-3.5">
                                    <div className="font-bold text-gray-900">{m.nama_masjid}</div>
                                    <div className="font-mono text-[11px] text-gray-500">
                                      {m.id_masjid_simas || '-'}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs space-y-1">
                                    <div>
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                          jenis === 'MUSHALLA'
                                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}
                                      >
                                        {jenis === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}
                                      </span>{' '}
                                      <span className="font-bold text-gray-800">
                                        {m.kecamatan || '-'}
                                      </span>
                                    </div>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                      {m.tipologi || 'Belum Diisi'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 max-w-md">
                                    <div className="line-clamp-2 text-gray-800">{m.alamat || '-'}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      {m.status_tanah ? `Status: ${m.status_tanah}` : ''}
                                      {m.tahun_berdiri ? ` • Berdiri: ${m.tahun_berdiri}` : ''}
                                      {m.telepon ? ` • Telp: ${m.telepon}` : ''}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openSdmForm(m)}
                                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                                    >
                                      SDM
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openKiblatForm(m)}
                                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold"
                                    >
                                      Arah Kiblat
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditMasjid(m)}
                                      className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ id: m.id, nama: m.nama_masjid })}
                                      className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold"
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
              </>
            )}

            {/* ==================== SUB-MENU 2: SDM MASJID & MUSHALLA ==================== */}
            {activeSubMenu === 'sdm_masjid' && (
              <>
                {/* RINGKASAN METRIK SDM */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Total Lembaga Wilayah</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{sdmSummaryStats.total}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Sudah Input SDM</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">{sdmSummaryStats.sudahInput}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Belum Input SDM</div>
                    <div className="text-xl font-bold text-amber-700 mt-1">{sdmSummaryStats.belumInput}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Hasil Filter Saat Ini</div>
                    <div className="text-xl font-bold text-teal-700 mt-1">{filteredSubMasjid.length}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="relative sm:col-span-6">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={searchSub}
                        onChange={(e) => setSearchSub(e.target.value)}
                        placeholder="Cari nama masjid/mushalla, ketua, sekretaris, atau kecamatan..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        aria-label="Filter Lembaga SDM"
                        value={filterSubJenis}
                        onChange={(e) => setFilterSubJenis(e.target.value as 'ALL' | JenisLembaga)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🕌 Semua (Masjid & Mushalla)</option>
                        <option value="MASJID">Masjid</option>
                        <option value="MUSHALLA">Mushalla</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        aria-label="Filter Kecamatan SDM"
                        value={kuaKecamatanLock || filterSubKecamatan}
                        disabled={Boolean(kuaKecamatanLock)}
                        onChange={(e) => setFilterSubKecamatan(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-600"
                      >
                        {!kuaKecamatanLock && <option value="ALL">📍 Semua Kecamatan</option>}
                        {kecamatanOptions.map((kec) => (
                          <option key={kec} value={kec}>
                            📍 {kec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">Memuat data SDM...</div>
                  ) : filteredSubMasjid.length === 0 ? (
                    <div className="p-10 text-center text-sm text-gray-500">
                      Belum ada data untuk ditampilkan. Import data SIMAS terlebih dahulu.
                    </div>
                  ) : (
                    <>
                      {/* KARTU HP (< md) */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredSubMasjid.map((m) => {
                          const sdm = getSdmForMasjid(m);
                          const jenis = getEffectiveJenis(m);
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
                                  Jamaah: {sdm?.kategori_jamaah || '-'}
                                </span>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                                <div>
                                  <strong>Ketua:</strong> {sdm?.ketua_pengurus || '-'}{' '}
                                  {sdm?.no_hp_ketua ? `(${sdm.no_hp_ketua})` : ''}
                                </div>
                                <div>
                                  <strong>Sekretaris:</strong> {sdm?.nama_sekretaris || '-'}{' '}
                                  {sdm?.no_hp_sekretaris ? `(${sdm.no_hp_sekretaris})` : ''}
                                </div>
                                <div>
                                  <strong>Pengurus:</strong> {sdm?.jumlah_pengurus ?? 0} •{' '}
                                  <strong>Remaja:</strong> {sdm?.jumlah_remaja ?? 0}{' '}
                                  {sdm?.ketua_remaja ? `(${sdm.ketua_remaja})` : ''}
                                </div>
                                <div>
                                  <strong>Imam:</strong>{' '}
                                  {sdm?.daftar_imam?.length ? sdm.daftar_imam.join(', ') : '-'}
                                </div>
                                <div>
                                  <strong>Khatib:</strong>{' '}
                                  {sdm?.daftar_khatib?.length ? sdm.daftar_khatib.join(', ') : '-'}
                                </div>
                                <div>
                                  <strong>Muazin:</strong>{' '}
                                  {sdm?.daftar_muazin?.length ? sdm.daftar_muazin.join(', ') : '-'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openSdmForm(m)}
                                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                              >
                                {sdm ? 'Edit Data SDM' : '+ Lengkapi Data SDM'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* TABEL DESKTOP (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-5 py-3.5 font-semibold">Nama & Kecamatan</th>
                              <th className="px-5 py-3.5 font-semibold">Ketua & Sekretaris</th>
                              <th className="px-5 py-3.5 font-semibold">Imam, Khatib & Muazin</th>
                              <th className="px-5 py-3.5 font-semibold">Pengurus, Remaja & Jamaah</th>
                              <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredSubMasjid.map((m) => {
                              const sdm = getSdmForMasjid(m);
                              const jenis = getEffectiveJenis(m);
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
                                      <span className="font-semibold text-gray-900">Ketua:</span>{' '}
                                      {sdm?.ketua_pengurus || '-'}{' '}
                                      {sdm?.no_hp_ketua ? `• ${sdm.no_hp_ketua}` : ''}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">Sekretaris:</span>{' '}
                                      {sdm?.nama_sekretaris || '-'}{' '}
                                      {sdm?.no_hp_sekretaris ? `• ${sdm.no_hp_sekretaris}` : ''}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5 max-w-xs">
                                    <div className="truncate">
                                      <strong>Imam:</strong>{' '}
                                      {sdm?.daftar_imam?.length ? sdm.daftar_imam.join(', ') : '-'}
                                    </div>
                                    <div className="truncate">
                                      <strong>Khatib:</strong>{' '}
                                      {sdm?.daftar_khatib?.length ? sdm.daftar_khatib.join(', ') : '-'}
                                    </div>
                                    <div className="truncate">
                                      <strong>Muazin:</strong>{' '}
                                      {sdm?.daftar_muazin?.length ? sdm.daftar_muazin.join(', ') : '-'}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                                    <div>
                                      Pengurus: <strong>{sdm?.jumlah_pengurus ?? 0}</strong>
                                    </div>
                                    <div>
                                      Remaja: <strong>{sdm?.jumlah_remaja ?? 0}</strong>{' '}
                                      {sdm?.ketua_remaja ? `(${sdm.ketua_remaja})` : ''}
                                    </div>
                                    <div>
                                      Jamaah:{' '}
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {sdm?.kategori_jamaah || '-'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => openSdmForm(m)}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                                    >
                                      {sdm ? 'Edit SDM' : 'Input SDM'}
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
              </>
            )}

            {/* ==================== SUB-MENU 3: KALIBRASI ARAH KIBLAT ==================== */}
            {activeSubMenu === 'arah_kiblat' && (
              <>
                {/* RINGKASAN METRIK KALIBRASI ARAH KIBLAT */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Sudah Dikalibrasi</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">
                      {kiblatSummaryStats.sudahKalibrasi}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Belum Dikalibrasi</div>
                    <div className="text-xl font-bold text-gray-600 mt-1">
                      {kiblatSummaryStats.belumKalibrasi}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Sesuai / Presisi</div>
                    <div className="text-xl font-bold text-teal-700 mt-1">
                      {kiblatSummaryStats.sesuaiPresisi}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-gray-500">Perlu Koreksi</div>
                    <div className="text-xl font-bold text-amber-700 mt-1">
                      {kiblatSummaryStats.perluKoreksi}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs">
                    <div className="text-[11px] font-semibold text-emerald-800">Hasil Filter Saat Ini</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {filteredSubMasjid.length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    <div className="relative lg:col-span-4">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={searchSub}
                        onChange={(e) => setSearchSub(e.target.value)}
                        placeholder="Cari nama masjid/mushalla atau kecamatan..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <select
                        aria-label="Filter Lembaga Kiblat"
                        value={filterSubJenis}
                        onChange={(e) => setFilterSubJenis(e.target.value as 'ALL' | JenisLembaga)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🕌 Semua</option>
                        <option value="MASJID">Masjid</option>
                        <option value="MUSHALLA">Mushalla</option>
                      </select>
                    </div>
                    <div className="lg:col-span-3">
                      <select
                        aria-label="Filter Kecamatan Kiblat"
                        value={kuaKecamatanLock || filterSubKecamatan}
                        disabled={Boolean(kuaKecamatanLock)}
                        onChange={(e) => setFilterSubKecamatan(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-600"
                      >
                        {!kuaKecamatanLock && <option value="ALL">📍 Semua Kecamatan</option>}
                        {kecamatanOptions.map((kec) => (
                          <option key={kec} value={kec}>
                            📍 {kec}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-3">
                      <select
                        aria-label="Filter Status Kalibrasi"
                        value={filterKiblatStatus}
                        onChange={(e) => setFilterKiblatStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🧭 Semua Status Kalibrasi</option>
                        <option value="SUDAH">Sudah Dikalibrasi</option>
                        <option value="BELUM">Belum Dikalibrasi</option>
                        <option value="Sesuai / Presisi">Sesuai / Presisi</option>
                        <option value="Perlu Koreksi">Perlu Koreksi</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">Memuat data arah kiblat...</div>
                  ) : filteredSubMasjid.length === 0 ? (
                    <div className="p-10 text-center text-sm text-gray-500">
                      Belum ada data untuk ditampilkan.
                    </div>
                  ) : (
                    <>
                      {/* KARTU HP (< md) */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredSubMasjid.map((m) => {
                          const k = getKiblatForMasjid(m);
                          const jenis = getEffectiveJenis(m);
                          const penyimpanganText = formatPenyimpangan(k?.penyimpangan ?? null);
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
                                    k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
                                    ? `Penyimpangan: ${penyimpanganText}`
                                    : 'Belum Diukur'}
                                </span>
                              </div>

                              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                                <div>
                                  <strong>Azimut Bangunan:</strong>{' '}
                                  {k?.azimut_bangunan !== null && k?.azimut_bangunan !== undefined
                                    ? `${k.azimut_bangunan}°`
                                    : '-'}{' '}
                                  • <strong>Azimut Kiblat:</strong>{' '}
                                  {k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
                                    ? `${k.azimut_kiblat}°`
                                    : '-'}
                                </div>
                                <div>
                                  <strong>Elevasi:</strong>{' '}
                                  {k?.elevasi_tempat !== null && k?.elevasi_tempat !== undefined
                                    ? `${k.elevasi_tempat} m`
                                    : '-'}{' '}
                                  • <strong>Tgl Ukur:</strong> {k?.tanggal_pengukuran || '-'}
                                </div>
                                {k?.foto_kalibrasi_url && (
                                  <div className="pt-1">
                                    <img
                                      src={k.foto_kalibrasi_url}
                                      alt={`Kalibrasi ${m.nama_masjid}`}
                                      className="w-full h-36 object-cover rounded-lg border border-gray-200"
                                    />
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => openKiblatForm(m)}
                                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                              >
                                {k ? 'Edit Kalibrasi Kiblat' : '+ Input Kalibrasi Kiblat'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* TABEL DESKTOP (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-5 py-3.5 font-semibold">Nama & Kecamatan</th>
                              <th className="px-5 py-3.5 font-semibold">Koordinat & Elevasi</th>
                              <th className="px-5 py-3.5 font-semibold">Azimut & Penyimpangan</th>
                              <th className="px-5 py-3.5 font-semibold">Tanggal & Foto</th>
                              <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredSubMasjid.map((m) => {
                              const k = getKiblatForMasjid(m);
                              const jenis = getEffectiveJenis(m);
                              const penyimpanganText = formatPenyimpangan(k?.penyimpangan ?? null);
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
                                        {k?.elevasi_tempat !== null && k?.elevasi_tempat !== undefined
                                          ? `${k.elevasi_tempat} m`
                                          : '-'}
                                      </strong>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 space-y-0.5">
                                    <div>
                                      Az. Bangunan:{' '}
                                      <strong>
                                        {k?.azimut_bangunan !== null && k?.azimut_bangunan !== undefined
                                          ? `${k.azimut_bangunan}°`
                                          : '-'}
                                      </strong>
                                    </div>
                                    <div>
                                      Az. Kiblat:{' '}
                                      <strong>
                                        {k?.azimut_kiblat !== null && k?.azimut_kiblat !== undefined
                                          ? `${k.azimut_kiblat}°`
                                          : '-'}
                                      </strong>
                                    </div>
                                    <div>
                                      Penyimpangan:{' '}
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                          k?.penyimpangan !== null && k?.penyimpangan !== undefined
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}
                                      >
                                        {penyimpanganText}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700">
                                    <div>{k?.tanggal_pengukuran || '-'}</div>
                                    {k?.foto_kalibrasi_url ? (
                                      <a
                                        href={k.foto_kalibrasi_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-1 text-emerald-700 font-semibold hover:underline"
                                      >
                                        <img
                                          src={k.foto_kalibrasi_url}
                                          alt="Foto Kalibrasi"
                                          className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                                        />
                                        <span>Lihat Foto</span>
                                      </a>
                                    ) : (
                                      <div className="text-[11px] text-gray-400 mt-0.5">Tanpa foto</div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => openKiblatForm(m)}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                                    >
                                      {k ? 'Edit Kalibrasi' : 'Input Kalibrasi'}
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
              </>
            )}
          </div>

          {/* ==================== MODAL TAMBAH / EDIT MASJID & MUSHALLA ==================== */}
          {showMasjidModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {editMasjidId ? 'Edit Data Masjid / Mushalla' : 'Tambah Data Masjid / Mushalla'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Lengkapi identitas lembaga sesuai data SIMAS Kemenag RI.
                </p>

                <form onSubmit={handleSaveMasjid} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Jenis Lembaga
                      </label>
                      <select
                        value={mJenisLembaga}
                        onChange={(e) => setMJenisLembaga(e.target.value as JenisLembaga)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 bg-white"
                      >
                        <option value="MASJID">Masjid (01)</option>
                        <option value="MUSHALLA">Mushalla (02)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        ID SIMAS
                      </label>
                      <input
                        type="text"
                        value={mIdSimas}
                        onChange={(e) => setMIdSimas(e.target.value)}
                        placeholder="01... / 02..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        ID Baru
                      </label>
                      <input
                        type="text"
                        value={mIdBaru}
                        onChange={(e) => setMIdBaru(e.target.value)}
                        placeholder="01... / 02..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
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
                      value={mNama}
                      onChange={(e) => setMNama(e.target.value)}
                      placeholder="Contoh: Masjid Agung Baiturrahim atau Mushalla Nurul Huda"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Kecamatan
                      </label>
                      <input
                        type="text"
                        list="kecamatan-masjid-list"
                        value={kuaKecamatanLock || mKecamatan}
                        disabled={Boolean(kuaKecamatanLock)}
                        onChange={(e) => setMKecamatan(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-600"
                      />
                      <datalist id="kecamatan-masjid-list">
                        {kecamatanOptions.map((k) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Tipologi
                      </label>
                      <input
                        type="text"
                        list="tipologi-masjid-list"
                        value={mTipologi}
                        onChange={(e) => setMTipologi(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                      <datalist id="tipologi-masjid-list">
                        {tipologiOptions.map((tip) => (
                          <option key={tip} value={tip} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Status Tanah
                      </label>
                      <input
                        type="text"
                        value={mStatusTanah}
                        onChange={(e) => setMStatusTanah(e.target.value)}
                        placeholder="Wakaf / SHM"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Tahun Berdiri
                      </label>
                      <input
                        type="text"
                        value={mTahunBerdiri}
                        onChange={(e) => setMTahunBerdiri(e.target.value)}
                        placeholder="1995"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Telepon
                      </label>
                      <input
                        type="text"
                        value={mTelepon}
                        onChange={(e) => setMTelepon(e.target.value)}
                        placeholder="08..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Luas Tanah (m²)
                      </label>
                      <input
                        type="text"
                        value={mLuasTanah}
                        onChange={(e) => setMLuasTanah(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Luas Bangunan (m²)
                      </label>
                      <input
                        type="text"
                        value={mLuasBangunan}
                        onChange={(e) => setMLuasBangunan(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Latitude (SIMAS)
                      </label>
                      <input
                        type="text"
                        value={mLat}
                        onChange={(e) => setMLat(e.target.value)}
                        placeholder="0.507535"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Longitude (SIMAS)
                      </label>
                      <input
                        type="text"
                        value={mLng}
                        onChange={(e) => setMLng(e.target.value)}
                        placeholder="122.076154"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Alamat Lengkap
                    </label>
                    <textarea
                      rows={2}
                      value={mAlamat}
                      onChange={(e) => setMAlamat(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowMasjidModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================== MODAL FORM SDM ==================== */}
          {showSdmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Form SDM Masjid & Mushalla</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Catat struktur pengurus, sekretaris, imam, khatib, muazin, remaja, dan jumlah jamaah.
                </p>

                <form onSubmit={handleSaveSdm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Pilih Masjid / Mushalla *
                    </label>
                    <select
                      required
                      value={sdmSelectedMasjidId}
                      onChange={(e) => handleSelectSdmMasjid(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white"
                    >
                      <option value="">-- Pilih Masjid / Mushalla --</option>
                      {scopedMasjidList.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{getEffectiveJenis(m) === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}] {m.nama_masjid}{' '}
                          {m.kecamatan ? `(${m.kecamatan})` : ''}
                          {m.alamat ? ` - ${m.alamat}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Jumlah Pengurus:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={sdmJumlahPengurus}
                        onChange={(e) => setSdmJumlahPengurus(parseIntOrZero(e.target.value))}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ketua Pengurus: *
                      </label>
                      <input
                        type="text"
                        value={sdmKetuaPengurus}
                        onChange={(e) => setSdmKetuaPengurus(e.target.value)}
                        placeholder="Nama Ketua Pengurus / DKM"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nomor HP Ketua:
                      </label>
                      <input
                        type="tel"
                        value={sdmNoHpKetua}
                        onChange={(e) => setSdmNoHpKetua(e.target.value)}
                        placeholder="08..."
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nama Sekretaris:
                      </label>
                      <input
                        type="text"
                        value={sdmNamaSekretaris}
                        onChange={(e) => setSdmNamaSekretaris(e.target.value)}
                        placeholder="Nama Sekretaris"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nomor HP Sekretaris:
                      </label>
                      <input
                        type="tel"
                        value={sdmNoHpSekretaris}
                        onChange={(e) => setSdmNoHpSekretaris(e.target.value)}
                        placeholder="08..."
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  {/* IMAM */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Imam: *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={imamInput}
                        onChange={(e) => setImamInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPersonTag(imamInput, sdmImamList, setSdmImamList, setImamInput);
                          }
                        }}
                        placeholder="Ketik nama imam, lalu tekan Enter"
                        className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => addPersonTag(imamInput, sdmImamList, setSdmImamList, setImamInput)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold"
                      >
                        + Tambah
                      </button>
                    </div>
                    <div className="mt-2 min-h-[38px] border border-dashed border-gray-200 rounded-xl p-2 flex flex-wrap gap-1.5 items-center">
                      {sdmImamList.length === 0 ? (
                        <span className="text-xs text-gray-400 mx-auto">Belum ada imam yang dicatat.</span>
                      ) : (
                        sdmImamList.map((name, idx) => (
                          <span
                            key={`${name}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => setSdmImamList(sdmImamList.filter((_, i) => i !== idx))}
                              className="text-emerald-700 hover:text-red-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* KHATIB */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Khatib:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={khatibInput}
                        onChange={(e) => setKhatibInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPersonTag(khatibInput, sdmKhatibList, setSdmKhatibList, setKhatibInput);
                          }
                        }}
                        placeholder="Ketik nama khatib, lalu tekan Enter"
                        className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addPersonTag(khatibInput, sdmKhatibList, setSdmKhatibList, setKhatibInput)
                        }
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold"
                      >
                        + Tambah
                      </button>
                    </div>
                    <div className="mt-2 min-h-[38px] border border-dashed border-gray-200 rounded-xl p-2 flex flex-wrap gap-1.5 items-center">
                      {sdmKhatibList.length === 0 ? (
                        <span className="text-xs text-gray-400 mx-auto">Belum ada khatib yang dicatat.</span>
                      ) : (
                        sdmKhatibList.map((name, idx) => (
                          <span
                            key={`${name}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() =>
                                setSdmKhatibList(sdmKhatibList.filter((_, i) => i !== idx))
                              }
                              className="text-emerald-700 hover:text-red-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MUAZIN */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Muazin:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={muazinInput}
                        onChange={(e) => setMuazinInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPersonTag(
                              muazinInput,
                              sdmMuazinList,
                              setSdmMuazinList,
                              setMuazinInput
                            );
                          }
                        }}
                        placeholder="Ketik nama muazin, lalu tekan Enter"
                        className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addPersonTag(
                            muazinInput,
                            sdmMuazinList,
                            setSdmMuazinList,
                            setMuazinInput
                          )
                        }
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold"
                      >
                        + Tambah
                      </button>
                    </div>
                    <div className="mt-2 min-h-[38px] border border-dashed border-gray-200 rounded-xl p-2 flex flex-wrap gap-1.5 items-center">
                      {sdmMuazinList.length === 0 ? (
                        <span className="text-xs text-gray-400 mx-auto">Belum ada muazin yang dicatat.</span>
                      ) : (
                        sdmMuazinList.map((name, idx) => (
                          <span
                            key={`${name}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() =>
                                setSdmMuazinList(sdmMuazinList.filter((_, i) => i !== idx))
                              }
                              className="text-emerald-700 hover:text-red-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Jumlah Remaja:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={sdmJumlahRemaja}
                        onChange={(e) => setSdmJumlahRemaja(parseIntOrZero(e.target.value))}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ketua Remaja: *
                      </label>
                      <input
                        type="text"
                        value={sdmKetuaRemaja}
                        onChange={(e) => setSdmKetuaRemaja(e.target.value)}
                        placeholder="Nama Ketua Remaja"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Jumlah Jamaah:
                    </label>
                    <select
                      value={sdmKategoriJamaah}
                      onChange={(e) => setSdmKategoriJamaah(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white"
                    >
                      {JAMAAH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowSdmModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Menyimpan...' : 'Simpan SDM'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================== MODAL FORM KALIBRASI ARAH KIBLAT ==================== */}
          {showKiblatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Form Kalibrasi Arah Kiblat</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Penyimpangan dihitung otomatis dari selisih Azimut Bangunan dan Azimut Kiblat (+ / -).
                </p>

                <form onSubmit={handleSaveKiblat} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Pilih Masjid / Mushalla *
                    </label>
                    <select
                      required
                      value={kiblatSelectedMasjidId}
                      onChange={(e) => handleSelectKiblatMasjid(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white"
                    >
                      <option value="">-- Pilih Masjid / Mushalla --</option>
                      {scopedMasjidList.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{getEffectiveJenis(m) === 'MUSHALLA' ? 'Mushalla' : 'Masjid'}] {m.nama_masjid}{' '}
                          {m.kecamatan ? `(${m.kecamatan})` : ''}
                          {m.alamat ? ` - ${m.alamat}` : ''}
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
                        value={kLatitude}
                        onChange={(e) => setKLatitude(e.target.value)}
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
                        value={kLintangUtara}
                        onChange={(e) => setKLintangUtara(e.target.value)}
                        placeholder="00° 30' 27.13&quot; LU"
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
                        value={kLongitude}
                        onChange={(e) => setKLongitude(e.target.value)}
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
                        value={kBujurTimur}
                        onChange={(e) => setKBujurTimur(e.target.value)}
                        placeholder="122° 04' 34.15&quot; BT"
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
                        value={kAzimutBangunan}
                        onChange={(e) => setKAzimutBangunan(e.target.value)}
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
                        value={kElevasiTempat}
                        onChange={(e) => setKElevasiTempat(e.target.value)}
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
                        value={kAzimutKiblat}
                        onChange={(e) => setKAzimutKiblat(e.target.value)}
                        placeholder="292.25"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-gray-900"
                      />
                    </div>
                  </div>

                  {/* PENYIMPANGAN OTOMATIS + TANGGAL PENGUKURAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-emerald-900 uppercase">
                        Penyimpangan (Otomatis)
                      </div>
                      <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                        {formatPenyimpangan(liveKiblatCalc.selisih)}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Status: <strong>{liveKiblatCalc.status}</strong> (Azimut Bangunan − Azimut Kiblat)
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Tanggal Pengukuran
                      </label>
                      <input
                        type="date"
                        value={kTanggalPengukuran}
                        onChange={(e) => setKTanggalPengukuran(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900"
                      />
                    </div>
                  </div>

                  {/* UPLOAD FOTO KALIBRASI */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Foto Kalibrasi (Otomatis Dikompresi ≤ 1280px & ±200 KB)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFotoFileChange}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white"
                    />
                    {kFotoPreview && (
                      <div className="mt-2">
                        <img
                          src={kFotoPreview}
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
                      value={kCatatan}
                      onChange={(e) => setKCatatan(e.target.value)}
                      placeholder="Keterangan lokasi pengukuran, alat yang digunakan, atau kondisi mihrab..."
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowKiblatModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Menyimpan...' : 'Simpan Kalibrasi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================== MODAL IMPORT EXCEL ==================== */}
          {importMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {importMode === 'masjid'
                    ? 'Import Excel SIMAS (Masjid & Mushalla)'
                    : importMode === 'sdm_masjid'
                    ? 'Import Excel SDM (Per Kolom)'
                    : 'Import Excel Kalibrasi Arah Kiblat (Per Kolom)'}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  {importMode === 'masjid'
                    ? 'Pilih file .xlsx / .xls / .csv hasil export SIMAS. Sistem otomatis mendeteksi Masjid (01) maupun Mushalla (02).'
                    : 'Pilih file .xlsx / .xls / .csv sesuai template kolom yang tersedia.'}
                </p>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelFileChange}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 bg-white"
                  />

                  {importFileName && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                      <div>
                        File: <strong>{importFileName}</strong>
                      </div>
                      <div>
                        Baris terbaca: <strong className="text-emerald-700">{importRowsPreview.length}</strong> data siap proses
                        {importMode === 'masjid' && importRowsPreview.length > 0 && (
                          <span className="text-gray-600">
                            {' '}
                            (Masjid:{' '}
                            <strong>{importRowsPreview.filter((r) => r.jenis_lembaga === 'MASJID').length}</strong>{' '}
                            • Mushalla:{' '}
                            <strong>{importRowsPreview.filter((r) => r.jenis_lembaga === 'MUSHALLA').length}</strong>)
                          </span>
                        )}
                        {importMode !== 'masjid' && (
                          <span className="text-gray-500">
                            {' '}
                            (Cocok dgn data terdaftar:{' '}
                            <strong>{importRowsPreview.filter((r) => r._matched).length}</strong>)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {importRowsPreview.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="min-w-full text-xs divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Nama</th>
                            <th className="px-3 py-2 font-semibold">Kecamatan</th>
                            <th className="px-3 py-2 font-semibold">
                              {importMode === 'masjid'
                                ? 'Jenis & Tipologi'
                                : importMode === 'sdm_masjid'
                                ? 'Ketua / Jamaah'
                                : 'Penyimpangan'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importRowsPreview.slice(0, 15).map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-gray-900">{row.nama_masjid}</td>
                              <td className="px-3 py-2 text-gray-600">{row.kecamatan || '-'}</td>
                              <td className="px-3 py-2 text-emerald-800 font-semibold">
                                {importMode === 'masjid'
                                  ? `${row.jenis_lembaga === 'MUSHALLA' ? 'Mushalla' : 'Masjid'} • ${
                                      row.tipologi || '-'
                                    }`
                                  : importMode === 'sdm_masjid'
                                  ? `${row.ketua_pengurus || '-'} (${row.kategori_jamaah || '-'})`
                                  : formatPenyimpangan(row.penyimpangan)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setImportMode(null);
                        setImportRowsPreview([]);
                        setImportFileName('');
                      }}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={processing || importRowsPreview.length === 0}
                      onClick={handleExecuteImport}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Mengimport...' : `Import ${importRowsPreview.length} Data`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== MODAL KONFIRMASI HAPUS ==================== */}
          {deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  ⚠️
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Yakin ingin menghapus <strong className="text-gray-900">"{deleteTarget.nama}"</strong>?
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
                    disabled={processing}
                    onClick={handleDeleteMasjid}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {processing ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}