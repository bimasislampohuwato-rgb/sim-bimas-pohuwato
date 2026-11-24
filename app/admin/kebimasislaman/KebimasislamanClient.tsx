'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';
import MasjidMushallaTab from './MasjidMushallaTab';
import SdmMasjidTab from './SdmMasjidTab';
import ArahKiblatTab from './ArahKiblatTab';
import { saveProfilKua, getProfilKuaData } from '@/app/admin/kebimasislaman/_actions/kebimasislaman';
import type {
  MasjidMushallaItem,
  SdmDataItem,
  KiblatDataItem,
  KecamatanItem,
  PejabatUtamaItem,
  KebimasislamanData,
} from '@/app/admin/kebimasislaman/_actions/kebimasislaman';

export type MasjidSubMenuKey = 'masjid' | 'sdm_masjid' | 'arah_kiblat';

const SUBMENU_ITEMS: { key: MasjidSubMenuKey; title: string; subtitle: string; icon: string }[] = [
  {
    key: 'masjid',
    title: 'Data Masjid & Mushalla (SIMAS)',
    subtitle:
      'Data resmi Masjid & Mushalla terdaftar hasil import Excel SIMAS Kemenag RI dengan filter Lembaga, Kecamatan & Tipologi.',
    icon: '🕌',
  },
  {
    key: 'sdm_masjid',
    title: 'SDM Masjid & Mushalla',
    subtitle:
      'Pendataan pengurus, imam, khatib, muazin, remaja masjid, serta kategori jamaah per Masjid & Mushalla.',
    icon: '👥',
  },
  {
    key: 'arah_kiblat',
    title: 'Kalibrasi Arah Kiblat & Sertifikat',
    subtitle:
      'Pengukuran koordinat, azimut bangunan & kiblat, penyimpangan otomatis, penetapan nomor register, dan cetak sertifikat.',
    icon: '🧭',
  },
];

function detectJenis(
  idSimas?: string | null,
  idBaru?: string | null,
  jenisDb?: string | null
): 'MASJID' | 'MUSHALLA' {
  if (jenisDb === 'MUSHALLA' || jenisDb === 'MASJID') return jenisDb;
  const s1 = String(idSimas || '').trim();
  const s2 = String(idBaru || '').trim();
  if (s1.startsWith('02.') || s2.startsWith('02.')) return 'MUSHALLA';
  return 'MASJID';
}

function splitListField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(val)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function readCell(row: Record<string, any>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  const lowerMap: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    lowerMap[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
  });
  for (const k of keys) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lowerMap[norm] !== undefined && lowerMap[norm] !== null && String(lowerMap[norm]).trim() !== '') {
      return String(lowerMap[norm]).trim();
    }
  }
  return '';
}

function hitungPenyimpangan(
  azimutBangunan: number | null,
  azimutKiblat: number | null
): { selisih: number | null; status: string } {
  if (azimutBangunan === null || azimutKiblat === null) {
    return { selisih: null, status: 'Belum Dihitung' };
  }
  const selisih = Number((azimutBangunan - azimutKiblat).toFixed(4));
  const status = Math.abs(selisih) <= 1.0 ? 'Sesuai / Presisi' : 'Perlu Koreksi';
  return { selisih, status };
}

interface KebimasislamanClientProps {
  initialData: KebimasislamanData | null;
  initialError: string | null;
}

export default function KebimasislamanClient({ initialData, initialError }: KebimasislamanClientProps) {
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [kuaKecamatanLock, setKuaKecamatanLock] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<MasjidSubMenuKey>('masjid');

  const [masjidList, setMasjidList] = useState<MasjidMushallaItem[]>(initialData?.masjidList || []);
  const [sdmMap, setSdmMap] = useState<Record<string, SdmDataItem>>(initialData?.sdmMap || {});
  const [kiblatMap, setKiblatMap] = useState<Record<string, KiblatDataItem>>(initialData?.kiblatMap || {});
  const [kecamatanMaster, setKecamatanMaster] = useState<string[]>(initialData?.kecamatanMaster || []);
  const [pejabatUtamaList, setPejabatUtamaList] = useState<PejabatUtamaItem[]>(initialData?.pejabatUtamaList || []);
  const [loading, setLoading] = useState(!initialData);

  const [importMode, setImportMode] = useState<MasjidSubMenuKey | null>(null);
  const [importRowsPreview, setImportRowsPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const [showProfilKuaModal, setShowProfilKuaModal] = useState(false);
  const [savingProfilKua, setSavingProfilKua] = useState(false);
  const [profilKuaForm, setProfilKuaForm] = useState({
    id: '' as string,
    namaKua: '',
    alamat: '',
    telepon: '',
    email: '',
    pimpinan: 'Kepala KUA',
    nama_pimpinan: '',
    nip_pimpinan: '',
    kop_baris_1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    kop_baris_2: 'KANTOR KEMENTERIAN AGAMA KABUPATEN POHUWATO',
    kop_baris_3: '',
    kop_baris_4: '',
  });

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const triggerToast = useCallback(
    (type: 'success' | 'error', title: string, message: string) => {
      setToast({ type, title, message });
      window.setTimeout(() => {
        setToast((prev) => (prev?.title === title ? null : prev));
      }, 4500);
    },
    []
  );

  const selectSubMenu = useCallback((key: MasjidSubMenuKey) => {
    setActiveSubMenu(key);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('menu', key);
      window.history.replaceState({}, '', url.toString());
      window.dispatchEvent(
        new CustomEvent('kebimasislaman:menu-change', { detail: { menu: key } })
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedMode =
        localStorage.getItem('active_mode') || localStorage.getItem('activeRoleMode') || 'pegawai';
      setActiveMode(savedMode);
      const savedKec =
        localStorage.getItem('kuaKecamatan') || localStorage.getItem('kua_wilayah') || '';
      if (savedMode === 'admin_kua' && savedKec.trim()) {
        setKuaKecamatanLock(savedKec.trim());
      } else {
        setKuaKecamatanLock(null);
      }
    } catch {
      // ignore storage errors
    }

    if (typeof window !== 'undefined') {
      const syncFromQuery = (ev?: Event) => {
        const customEv = ev as CustomEvent<{ menu?: string }> | undefined;
        const menuParam =
          customEv?.detail?.menu || new URLSearchParams(window.location.search).get('menu');
        if (menuParam === 'masjid' || menuParam === 'sdm_masjid' || menuParam === 'arah_kiblat') {
          setActiveSubMenu(menuParam);
        }
      };
      syncFromQuery();
      window.addEventListener('popstate', syncFromQuery);
      window.addEventListener('kebimasislaman:menu-change', syncFromQuery);
      return () => {
        window.removeEventListener('popstate', syncFromQuery);
        window.removeEventListener('kebimasislaman:menu-change', syncFromQuery);
      };
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kebimasislaman/refresh', { method: 'POST' });
      const result = await response.json();
      if (result.data) {
        setMasjidList(result.data.masjidList || []);
        setSdmMap(result.data.sdmMap || {});
        setKiblatMap(result.data.kiblatMap || {});
        setKecamatanMaster(result.data.kecamatanMaster || []);
        setPejabatUtamaList(result.data.pejabatUtamaList || []);
      }
    } catch (err: any) {
      triggerToast('error', 'Gagal Memuat Data', err?.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  const openProfilKuaModal = useCallback(async () => {
    const targetName =
      kuaKecamatanLock ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('kuaKecamatan') || localStorage.getItem('kua_wilayah') || ''
        : '');

    const { data, error } = await getProfilKuaData(targetName);
    if (error) {
      triggerToast('error', 'Gagal Memuat Profil KUA', error);
      return;
    }
    if (data) {
      setProfilKuaForm(data);
      setShowProfilKuaModal(true);
    }
  }, [kuaKecamatanLock, triggerToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpenKua = () => {
      openProfilKuaModal();
    };
    window.addEventListener('kebimasislaman:open-profil-kua', onOpenKua);
    return () => window.removeEventListener('kebimasislaman:open-profil-kua', onOpenKua);
  }, [openProfilKuaModal]);

  const handleSaveProfilKuaModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilKuaForm.namaKua.trim()) {
      triggerToast('error', 'Data Belum Lengkap', 'Nama KUA wajib diisi.');
      return;
    }
    setSavingProfilKua(true);
    try {
      const { success, error } = await saveProfilKua(profilKuaForm);
      if (error) throw new Error(error);
      setShowProfilKuaModal(false);
      triggerToast(
        'success',
        'Profil KUA Tersimpan',
        `Profil ${profilKuaForm.namaKua.trim()} berhasil diperbarui.`
      );
      await loadAllData();
    } catch (err: any) {
      triggerToast('error', 'Gagal Menyimpan Profil KUA', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSavingProfilKua(false);
    }
  };

  const activeSubMeta =
    SUBMENU_ITEMS.find((item) => item.key === activeSubMenu) || SUBMENU_ITEMS[0];

  const downloadExcelTemplate = (mode: 'sdm_masjid' | 'arah_kiblat') => {
    const sample = masjidList[0];
    const rows =
      mode === 'sdm_masjid'
        ? [
            {
              id_masjid_simas: sample?.id_masjid_simas || '01.5.30.03.01.00001',
              nama_masjid: sample?.nama_masjid || 'Masjid Agung Pohuwato',
              kecamatan: sample?.kecamatan || 'Marisa',
              jumlah_pengurus: 15,
              ketua_pengurus: 'H. Ahmad',
              no_hp_ketua: '081234567890',
              nama_sekretaris: 'Abdullah',
              no_hp_sekretaris: '081234567891',
              daftar_imam: 'Ust. Mahmud, Ust. Karim',
              daftar_khatib: 'Ust. Mahmud, Ust. Salim',
              daftar_muazin: 'Rahman, Yusuf',
              jumlah_remaja: 25,
              ketua_remaja: 'Rizky',
              kategori_jamaah: '200 - 1000',
            },
          ]
        : [
            {
              id_masjid_simas: sample?.id_masjid_simas || '01.5.30.03.01.00001',
              nama_masjid: sample?.nama_masjid || 'Masjid Agung Pohuwato',
              kecamatan: sample?.kecamatan || 'Marisa',
              latitude: sample?.latitude_simas ?? 0.507535,
              lintang_utara: `00° 30' 27.13" LU`,
              longitude: sample?.longitude_simas ?? 122.076154,
              bujur_timur: `122° 04' 34.15" BT`,
              azimut_bangunan: 291.85,
              elevasi_tempat: 18,
              azimut_kiblat: 292.25,
              tanggal_pengukuran: new Date().toISOString().slice(0, 10),
              catatan: 'Pengukuran mihrab utama',
            },
          ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(
      wb,
      mode === 'sdm_masjid'
        ? 'Template_SDM_Masjid_Pohuwato.xlsx'
        : 'Template_Kalibrasi_Kiblat_Pohuwato.xlsx'
    );
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[firstSheet], {
        defval: '',
      });
      setImportFileName(file.name);
      setImportRowsPreview(jsonRows);
    } catch (err: any) {
      triggerToast('error', 'Gagal Membaca Excel', err?.message || 'File Excel tidak valid.');
    }
  };

  const handleProcessImport = async () => {
    if (!importMode || importRowsPreview.length === 0) return;
    setImporting(true);
    try {
      const bySimas = new Map<string, MasjidMushallaItem>();
      const byNama = new Map<string, MasjidMushallaItem>();
      masjidList.forEach((m) => {
        if (m.id_masjid_simas) bySimas.set(m.id_masjid_simas.trim().toLowerCase(), m);
        if (m.id_baru_simas) bySimas.set(m.id_baru_simas.trim().toLowerCase(), m);
        byNama.set(m.nama_masjid.trim().toLowerCase(), m);
      });

      if (importMode === 'masjid') {
        const payloads = importRowsPreview
          .map((row) => {
            const nama = readCell(row, ['nama_masjid', 'Nama Masjid', 'Nama Lembaga', 'Nama']);
            if (!nama) return null;
            const idSimas =
              readCell(row, ['id_masjid_simas', 'ID Masjid SIMAS', 'ID SIMAS']) || null;
            const idBaru = readCell(row, ['id_baru_simas', 'ID Baru SIMAS']) || null;
            const kec = kuaKecamatanLock || readCell(row, ['kecamatan', 'Kecamatan']) || null;
            return {
              jenis_lembaga: detectJenis(idSimas, idBaru, readCell(row, ['jenis_lembaga', 'Jenis'])),
              id_masjid_simas: idSimas,
              id_baru_simas: idBaru,
              nama_masjid: nama,
              provinsi: 'Gorontalo',
              kabupaten_kota: 'Pohuwato',
              kecamatan: kec,
              tipologi: readCell(row, ['tipologi', 'Tipologi']) || null,
              status_tanah: readCell(row, ['status_tanah', 'Status Tanah']) || null,
              alamat: readCell(row, ['alamat', 'Alamat']) || null,
              tahun_berdiri: readCell(row, ['tahun_berdiri', 'Tahun Berdiri']) || null,
              luas_tanah: readCell(row, ['luas_tanah', 'Luas Tanah']) || null,
              luas_bangunan: readCell(row, ['luas_bangunan', 'Luas Bangunan']) || null,
              telepon: readCell(row, ['telepon', 'Telepon', 'No HP']) || null,
              email: readCell(row, ['email', 'Email']) || null,
              latitude_simas: parseNumberOrNull(readCell(row, ['latitude_simas', 'Latitude'])),
              longitude_simas: parseNumberOrNull(readCell(row, ['longitude_simas', 'Longitude'])),
              sumber_data: 'Import Excel SIMAS',
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (payloads.length === 0) {
          throw new Error('Tidak ada baris valid dengan kolom nama_masjid.');
        }
        const response = await fetch('/api/kebimasislaman/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'masjid', payloads }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
      } else if (importMode === 'sdm_masjid') {
        const payloads = importRowsPreview
          .map((row) => {
            const simasKey = readCell(row, [
              'id_masjid_simas',
              'ID Masjid SIMAS',
              'ID SIMAS',
            ]).toLowerCase();
            const namaKey = readCell(row, ['nama_masjid', 'Nama Masjid', 'Nama']).toLowerCase();
            const matched: MasjidMushallaItem | undefined =
              (simasKey ? bySimas.get(simasKey) : undefined) ||
              (namaKey ? byNama.get(namaKey) : undefined);
            const namaFinal =
              matched?.nama_masjid || readCell(row, ['nama_masjid', 'Nama Masjid']);
            if (!matched && !namaFinal) return null;

            return {
              masjid_id: matched?.id || null,
              id_masjid_simas: matched?.id_masjid_simas || simasKey || null,
              nama_masjid: namaFinal,
              kecamatan: matched?.kecamatan || readCell(row, ['kecamatan', 'Kecamatan']) || null,
              jumlah_pengurus: Number(readCell(row, ['jumlah_pengurus', 'Jumlah Pengurus']) || 0),
              ketua_pengurus: readCell(row, ['ketua_pengurus', 'Ketua Pengurus']),
              no_hp_ketua: readCell(row, ['no_hp_ketua', 'No HP Ketua']),
              nama_sekretaris: readCell(row, ['nama_sekretaris', 'Nama Sekretaris']),
              no_hp_sekretaris: readCell(row, ['no_hp_sekretaris', 'No HP Sekretaris']),
              daftar_imam: splitListField(readCell(row, ['daftar_imam', 'Imam'])),
              daftar_khatib: splitListField(readCell(row, ['daftar_khatib', 'Khatib'])),
              daftar_muazin: splitListField(readCell(row, ['daftar_muazin', 'Muazin'])),
              jumlah_remaja: Number(readCell(row, ['jumlah_remaja', 'Jumlah Remaja']) || 0),
              ketua_remaja: readCell(row, ['ketua_remaja', 'Ketua Remaja']),
              kategori_jamaah: readCell(row, ['kategori_jamaah', 'Kategori Jamaah']) || '50 - 100',
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (payloads.length === 0) {
          throw new Error('Tidak ada baris SDM yang cocok dengan data Masjid/Mushalla.');
        }
        const response = await fetch('/api/kebimasislaman/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'sdm_masjid', payloads }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
      } else if (importMode === 'arah_kiblat') {
        const payloads = importRowsPreview
          .map((row) => {
            const simasKey = readCell(row, [
              'id_masjid_simas',
              'ID Masjid SIMAS',
              'ID SIMAS',
            ]).toLowerCase();
            const namaKey = readCell(row, ['nama_masjid', 'Nama Masjid', 'Nama']).toLowerCase();
            const matched: MasjidMushallaItem | undefined =
              (simasKey ? bySimas.get(simasKey) : undefined) ||
              (namaKey ? byNama.get(namaKey) : undefined);
            if (!matched) return null;

            const latNum = parseNumberOrNull(readCell(row, ['latitude', 'Latitude']));
            const lngNum = parseNumberOrNull(readCell(row, ['longitude', 'Longitude']));
            const azB = parseNumberOrNull(readCell(row, ['azimut_bangunan', 'Azimut Bangunan']));
            const azK = parseNumberOrNull(readCell(row, ['azimut_kiblat', 'Azimut Kiblat']));
            const elev = parseNumberOrNull(readCell(row, ['elevasi_tempat', 'Elevasi']));
            const calc = hitungPenyimpangan(azB, azK);

            return {
              masjid_id: matched.id,
              id_masjid_simas: matched.id_masjid_simas || null,
              nama_masjid: matched.nama_masjid,
              kecamatan: matched.kecamatan || null,
              latitude: latNum,
              lintang_utara: readCell(row, ['lintang_utara', 'Lintang Utara']) || null,
              longitude: lngNum,
              bujur_timur: readCell(row, ['bujur_timur', 'Bujur Timur']) || null,
              azimut_bangunan: azB,
              elevasi_tempat: elev,
              azimut_kiblat: azK,
              penyimpangan: calc.selisih,
              status_penyimpangan: calc.status,
              tanggal_pengukuran:
                readCell(row, ['tanggal_pengukuran', 'Tanggal Pengukuran']) ||
                new Date().toISOString().slice(0, 10),
              catatan: readCell(row, ['catatan', 'Catatan']) || null,
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (payloads.length === 0) {
          throw new Error('Tidak ada baris kalibrasi yang cocok dengan data Masjid/Mushalla.');
        }
        const response = await fetch('/api/kebimasislaman/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'arah_kiblat', payloads }),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
      }

      setImportMode(null);
      setImportRowsPreview([]);
      setImportFileName('');
      triggerToast(
        'success',
        'Import Berhasil',
        `${importRowsPreview.length} baris data berhasil diproses.`
      );
      await loadAllData();
    } catch (err: any) {
      triggerToast('error', 'Gagal Import Excel', err?.message || 'Terjadi kesalahan saat import.');
    } finally {
      setImporting(false);
    }
  };

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h2 className="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h2>
              <p className="text-red-700">{initialError}</p>
              <button
                onClick={loadAllData}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
            <span
              className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <div className="text-xs">
              <div className="font-bold text-gray-900">{toast.title}</div>
              <div className="text-gray-600 mt-0.5">{toast.message}</div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Kebimasislaman</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Pengelolaan Data Masjid & Mushalla SIMAS, SDM Keagamaan, dan Kalibrasi Arah Kiblat
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {kuaKecamatanLock && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                  Admin KUA: <strong>{kuaKecamatanLock}</strong>
                </span>
              )}
              {activeMode === 'admin_kua' && (
                <button
                  type="button"
                  onClick={openProfilKuaModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs"
                >
                  <span>🏛️</span>
                  <span>Edit Profil KUA</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigasi Sub-Menu */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SUBMENU_ITEMS.map((item) => {
              const active = activeSubMenu === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectSubMenu(item.key)}
                  className={`text-left p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
                      : 'bg-white text-gray-900 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{item.title}</div>
                    <div
                      className={`text-xs mt-1 line-clamp-2 ${
                        active ? 'text-emerald-100' : 'text-gray-500'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Header Sub-Menu Aktif */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{activeSubMeta.icon}</span>
              <div>
                <h2 className="text-base font-bold text-gray-900">{activeSubMeta.title}</h2>
                <p className="text-xs text-gray-500">{activeSubMeta.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Konten Tab Aktif */}
          {activeSubMenu === 'masjid' && (
            <MasjidMushallaTab
              masjidList={masjidList}
              kecamatanOptions={kecamatanMaster}
              kuaKecamatanLock={kuaKecamatanLock}
              loading={loading}
              onRefresh={loadAllData}
              onNotify={triggerToast}
              onOpenImportMasjid={() => {
                setImportMode('masjid');
                setImportFileName('');
                setImportRowsPreview([]);
              }}
            />
          )}

          {activeSubMenu === 'sdm_masjid' && (
            <SdmMasjidTab
              masjidList={masjidList}
              sdmMap={sdmMap}
              kecamatanOptions={kecamatanMaster}
              kuaKecamatanLock={kuaKecamatanLock}
              loading={loading}
              onRefresh={loadAllData}
              onNotify={triggerToast}
              onOpenImportSdm={() => {
                setImportMode('sdm_masjid');
                setImportFileName('');
                setImportRowsPreview([]);
              }}
              onDownloadTemplateSdm={() => downloadExcelTemplate('sdm_masjid')}
            />
          )}

          {activeSubMenu === 'arah_kiblat' && (
            <ArahKiblatTab
              masjidList={masjidList}
              kiblatMap={kiblatMap}
              kecamatanOptions={kecamatanMaster}
              kuaKecamatanLock={kuaKecamatanLock}
              activeMode={activeMode}
              pejabatUtamaList={pejabatUtamaList}
              loading={loading}
              onRefresh={loadAllData}
              onNotify={triggerToast}
              onOpenImportKiblat={() => {
                setImportMode('arah_kiblat');
                setImportFileName('');
                setImportRowsPreview([]);
              }}
              onDownloadTemplateKiblat={() => downloadExcelTemplate('arah_kiblat')}
            />
          )}

          {/* Modal Edit Profil KUA */}
          {showProfilKuaModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 max-h-[90vh] overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Manajemen Profil KUA ({profilKuaForm.namaKua})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Perbarui identitas kantor, pimpinan, dan kop surat khusus untuk unit KUA Anda.
                  </p>
                </div>

                <form onSubmit={handleSaveProfilKuaModal} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nama KUA
                      </label>
                      <input
                        type="text"
                        required
                        value={profilKuaForm.namaKua}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, namaKua: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Alamat Kantor
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.alamat}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, alamat: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nomor Kontak
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.telepon}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, telepon: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profilKuaForm.email}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, email: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Jabatan Pimpinan
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.pimpinan}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, pimpinan: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nama Pimpinan
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.nama_pimpinan}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, nama_pimpinan: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        NIP Pimpinan
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.nip_pimpinan}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, nip_pimpinan: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Kop Baris 1
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.kop_baris_1}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, kop_baris_1: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Kop Baris 2
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.kop_baris_2}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, kop_baris_2: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Kop Baris 3
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.kop_baris_3}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, kop_baris_3: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Kop Baris 4
                      </label>
                      <input
                        type="text"
                        value={profilKuaForm.kop_baris_4}
                        onChange={(e) =>
                          setProfilKuaForm({ ...profilKuaForm, kop_baris_4: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowProfilKuaModal(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfilKua}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {savingProfilKua ? 'Menyimpan...' : 'Simpan Profil KUA'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Import Excel Bersama */}
          {importMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Import Data Excel (
                    {importMode === 'masjid'
                      ? 'Masjid & Mushalla SIMAS'
                      : importMode === 'sdm_masjid'
                      ? 'SDM Masjid'
                      : 'Kalibrasi Arah Kiblat'}
                    )
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pilih file .xlsx / .xls / .csv lalu tinjau jumlah baris sebelum disimpan.
                  </p>
                </div>

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileChange}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 bg-white"
                />

                {importFileName && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                    File: <strong>{importFileName}</strong> • Terbaca:{' '}
                    <strong>{importRowsPreview.length}</strong> baris data.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
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
                    disabled={importing || importRowsPreview.length === 0}
                    onClick={handleProcessImport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {importing ? 'Mengimport...' : 'Proses Import'}
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