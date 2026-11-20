'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';
import MasjidMushallaTab, {
  type MasjidMushallaItem,
  type JenisLembagaMasjid,
} from './MasjidMushallaTab';
import SdmMasjidTab, { type SdmDataItem } from './SdmMasjidTab';
import ArahKiblatTab, {
  type KiblatDataItem,
  type PejabatUtamaItem,
} from './ArahKiblatTab';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
): JenisLembagaMasjid {
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

export default function KebimasislamanPage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [kuaKecamatanLock, setKuaKecamatanLock] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<MasjidSubMenuKey>('masjid');

  const [masjidList, setMasjidList] = useState<MasjidMushallaItem[]>([]);
  const [sdmMap, setSdmMap] = useState<Record<string, SdmDataItem>>({});
  const [kiblatMap, setKiblatMap] = useState<Record<string, KiblatDataItem>>({});
  const [kecamatanMaster, setKecamatanMaster] = useState<string[]>([]);
  const [pejabatUtamaList, setPejabatUtamaList] = useState<PejabatUtamaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [importMode, setImportMode] = useState<MasjidSubMenuKey | null>(null);
  const [importRowsPreview, setImportRowsPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);

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

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('activeRoleMode') || 'pegawai';
      setActiveMode(savedMode);
      const savedKec = localStorage.getItem('kuaKecamatan') || '';
      if (savedMode === 'admin_kua' && savedKec.trim()) {
        setKuaKecamatanLock(savedKec.trim());
      } else {
        setKuaKecamatanLock(null);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [kecRes, masjidRes, sdmRes, kiblatRes, pjRes] = await Promise.all([
        supabase.from('MasterKecamatan').select('namaKecamatan').order('namaKecamatan'),
        supabase.from('masjid_mushalla').select('*').order('nama_masjid', { ascending: true }),
        supabase.from('masjid_sdm').select('*'),
        supabase.from('masjid_arah_kiblat').select('*'),
        supabase.from('pejabat_utama').select('*').order('urutan', { ascending: true }),
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

      if (pjRes.data) {
        setPejabatUtamaList(pjRes.data as PejabatUtamaItem[]);
      }

      const loadedMasjid: MasjidMushallaItem[] = (masjidRes.data || []).map((m: any) => ({
        ...m,
        jenis_lembaga: detectJenis(m.id_masjid_simas, m.id_baru_simas, m.jenis_lembaga),
        kecamatan: m.kecamatan ? String(m.kecamatan).trim() : null,
        tipologi: m.tipologi ? String(m.tipologi).trim() : null,
      }));
      setMasjidList(loadedMasjid);

      const sMap: Record<string, SdmDataItem> = {};
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

      const kMap: Record<string, KiblatDataItem> = {};
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
            tanggal_pengukuran: row.tanggal_pengukuran
              ? String(row.tanggal_pengukuran).slice(0, 10)
              : '',
            foto_kalibrasi_url: row.foto_kalibrasi_url || '',
            catatan: row.catatan || '',
            nomor_register: row.nomor_register || null,
            kode_verifikasi: row.kode_verifikasi || null,
            status_verifikasi:
              row.status_verifikasi ||
              (row.nomor_register ? 'TERVERIFIKASI' : 'MENUNGGU_REGISTER'),
            tanggal_terbit_sertifikat: row.tanggal_terbit_sertifikat
              ? String(row.tanggal_terbit_sertifikat).slice(0, 10)
              : null,
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
    loadAllData();
  }, [loadAllData]);

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
            const idSimas = readCell(row, ['id_masjid_simas', 'ID Masjid SIMAS', 'ID SIMAS']) || null;
            const idBaru = readCell(row, ['id_baru_simas', 'ID Baru SIMAS']) || null;
            const kec =
              kuaKecamatanLock ||
              readCell(row, ['kecamatan', 'Kecamatan']) ||
              null;
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
        const { error } = await supabase.from('masjid_mushalla').insert(payloads as any[]);
        if (error) throw new Error(error.message);
      } else if (importMode === 'sdm_masjid') {
        const payloads = importRowsPreview
          .map((row) => {
            const simasKey = readCell(row, ['id_masjid_simas', 'ID Masjid SIMAS', 'ID SIMAS']).toLowerCase();
            const namaKey = readCell(row, ['nama_masjid', 'Nama Masjid', 'Nama']).toLowerCase();
            const matched: MasjidMushallaItem | undefined =
              (simasKey ? bySimas.get(simasKey) : undefined) ||
              (namaKey ? byNama.get(namaKey) : undefined);
            const namaFinal = matched?.nama_masjid || readCell(row, ['nama_masjid', 'Nama Masjid']);
            if (!matched && !namaFinal) return null;

            return {
              masjid_id: matched?.id || null,
              id_masjid_simas: matched?.id_masjid_simas || (simasKey || null),
              nama_masjid: namaFinal,
              kecamatan: matched?.kecamatan || readCell(row, ['kecamatan', 'Kecamatan']) || null,
              jumlah_pengurus: Number(readCell(row, ['jumlah_pengurus', 'Jumlah Pengurus']) || 0),
              ketua_pengurus: readCell(row, ['ketua_pengurus', 'Ketua Pengurus']),
              no_hp_ketua: readCell(row, ['no_hp_ketua', 'No HP Ketua']),
              nama_sekretaris: readCell(row, ['nama_sekretaris', 'Nama Sekretaris']),
              no_hp_sekretaris: readCell(row, ['no_hp_sekretaris', 'No HP Sekretaris']),
              daftar_imam: readCell(row, ['daftar_imam', 'Imam']),
              daftar_khatib: readCell(row, ['daftar_khatib', 'Khatib']),
              daftar_muazin: readCell(row, ['daftar_muazin', 'Muazin']),
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
        const { error } = await supabase
          .from('masjid_sdm')
          .upsert(payloads as any[], { onConflict: 'masjid_id' });
        if (error) throw new Error(error.message);
      } else if (importMode === 'arah_kiblat') {
        const payloads = importRowsPreview
          .map((row) => {
            const simasKey = readCell(row, ['id_masjid_simas', 'ID Masjid SIMAS', 'ID SIMAS']).toLowerCase();
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
        const { error } = await supabase
          .from('masjid_arah_kiblat')
          .upsert(payloads as any[], { onConflict: 'masjid_id' });
        if (error) throw new Error(error.message);
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900">
      <div className="hidden">
        <Sidebar {...({ activeMenu: 'kebimasislaman' } as any)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Kebimasislaman</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Pengelolaan Data Masjid &amp; Mushalla SIMAS, SDM Keagamaan, dan Kalibrasi Arah Kiblat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700"
            >
              Ganti Peran ({activeMode})
            </button>
          </div>
        </header>
        <div className="hidden">
          <HeaderBar {...({ title: 'Kebimasislaman' } as any)} />
        </div>

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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          {kuaKecamatanLock && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs text-emerald-900 flex items-center justify-between gap-2">
              <span>
                Mode <strong>Admin KUA</strong> aktif — data otomatis difokuskan ke Kecamatan{' '}
                <strong>{kuaKecamatanLock}</strong>.
              </span>
            </div>
          )}

          {/* Navigasi Sub-Menu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SUBMENU_ITEMS.map((item) => {
              const active = activeSubMenu === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSubMenu(item.key)}
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