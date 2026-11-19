'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type KebimasKategori =
  | 'masjid_mushalla'
  | 'arah_kiblat'
  | 'ormas_islam'
  | 'paham_keagamaan'
  | 'majelis_taklim'
  | 'data_lain';

interface TabConfig {
  key: KebimasKategori;
  label: string;
  shortLabel: string;
  icon: string;
  namaLabel: string;
  namaPlaceholder: string;
  pjLabel: string;
  pjPlaceholder: string;
  extra1Label: string;
  extra1Placeholder: string;
  extra2Label: string;
  extra2Placeholder: string;
  statusOptions: string[];
  adminOnly?: boolean;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    key: 'masjid_mushalla',
    label: 'Masjid & Mushalla',
    shortLabel: 'Masjid/Mushalla',
    icon: '🕌',
    namaLabel: 'Nama Masjid / Mushalla',
    namaPlaceholder: 'Contoh: Masjid Agung Baiturrahim',
    pjLabel: 'Ketua DKM / Pengurus',
    pjPlaceholder: 'Contoh: H. Ahmad Fauzi',
    extra1Label: 'Tipologi (Masjid / Mushalla / Jami)',
    extra1Placeholder: 'Contoh: Masjid Jami',
    extra2Label: 'Tahun Berdiri / Luas Tanah',
    extra2Placeholder: 'Contoh: 1998 / 450 m²',
    statusOptions: ['Terverifikasi', 'Terdaftar', 'Perlu Pembinaan'],
  },
  {
    key: 'arah_kiblat',
    label: 'Arah Kiblat Masjid & Mushalla',
    shortLabel: 'Arah Kiblat',
    icon: '🧭',
    namaLabel: 'Nama Masjid / Mushalla yang Diukur',
    namaPlaceholder: 'Contoh: Mushalla Al-Hidayah Marisa',
    pjLabel: 'Petugas Pengukur / Tim Hisab Rukyat',
    pjPlaceholder: 'Contoh: Tim Bimas Islam & Kemenag',
    extra1Label: 'Hasil Sudut / Azimuth & Deviasi',
    extra1Placeholder: 'Contoh: 292°15\' (Selisih 1,5°)',
    extra2Label: 'Rujukan / Keterangan Lokasi',
    extra2Placeholder: 'Contoh: Pengukuran ulang titik mihrab',
    statusOptions: ['Sesuai', 'Perlu Koreksi', 'Terverifikasi'],
  },
  {
    key: 'ormas_islam',
    label: 'Ormas Islam',
    shortLabel: 'Ormas Islam',
    icon: '🤝',
    namaLabel: 'Nama Organisasi Kemasyarakatan Islam',
    namaPlaceholder: 'Contoh: Pengurus Cabang ...',
    pjLabel: 'Ketua / Penanggung Jawab',
    pjPlaceholder: 'Nama ketua / pengurus',
    extra1Label: 'Tingkat Kepengurusan',
    extra1Placeholder: 'Contoh: Cabang / Daerah / PAC',
    extra2Label: 'Legalitas / SK / Nomor Induk',
    extra2Placeholder: 'Contoh: Terdaftar / SK No. ...',
    statusOptions: ['Terdaftar', 'Terverifikasi', 'Perlu Pembinaan'],
  },
  {
    key: 'paham_keagamaan',
    label: 'Paham Aliran Keagamaan',
    shortLabel: 'Paham Keagamaan',
    icon: '🛡️',
    namaLabel: 'Nama Paham / Kelompok / Komunitas',
    namaPlaceholder: 'Nama kelompok / paham yang dipantau',
    pjLabel: 'Tokoh / Penanggung Jawab / Koordinator',
    pjPlaceholder: 'Nama tokoh / kontak koordinasi',
    extra1Label: 'Fokus Pemantauan / Karakteristik',
    extra1Placeholder: 'Contoh: Kajian / Aktivitas rutin',
    extra2Label: 'Instansi / Unsur Terkait',
    extra2Placeholder: 'Contoh: Kemenag / FKUB / Pemerintah Desa',
    statusOptions: ['Dalam Pemantauan', 'Perlu Pembinaan', 'Terverifikasi'],
    adminOnly: true,
  },
  {
    key: 'majelis_taklim',
    label: 'Majelis Taklim',
    shortLabel: 'Majelis Taklim',
    icon: '📖',
    namaLabel: 'Nama Majelis Taklim',
    namaPlaceholder: 'Contoh: Majelis Taklim Nurul Iman',
    pjLabel: 'Pimpinan / Ustaz / Ketua Pengurus',
    pjPlaceholder: 'Nama pimpinan / ketua majelis',
    extra1Label: 'Jadwal & Rutinitas Pengajian',
    extra1Placeholder: 'Contoh: Setiap Jumat Pagi',
    extra2Label: 'Perkiraan Jumlah Jamaah',
    extra2Placeholder: 'Contoh: 45 Jamaah',
    statusOptions: ['Terdaftar', 'Terverifikasi', 'Perlu Pembinaan'],
  },
  {
    key: 'data_lain',
    label: 'Data Lain',
    shortLabel: 'Data Lain',
    icon: '🗂️',
    namaLabel: 'Judul / Nama Data Kebimasislaman',
    namaPlaceholder: 'Nama entitas / program / pendataan tambahan',
    pjLabel: 'Penanggung Jawab / Pengelola',
    pjPlaceholder: 'Nama penanggung jawab',
    extra1Label: 'Sub-Kategori / Jenis Data',
    extra1Placeholder: 'Contoh: Rumah Ibadah / Kegiatan / Pendataan',
    extra2Label: 'Atribut Tambahan',
    extra2Placeholder: 'Informasi tambahan sesuai kebutuhan',
    statusOptions: ['Terverifikasi', 'Terdaftar', 'Dalam Pemantauan'],
  },
];

export default function KebimasislamanPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<string>('pegawai');
  const [activeTab, setActiveTab] = useState<KebimasKategori>('masjid_mushalla');

  const [records, setRecords] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Modal Tambah / Edit
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [namaObjek, setNamaObjek] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [alamatLokasi, setAlamatLokasi] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [noHp, setNoHp] = useState('');
  const [statusData, setStatusData] = useState('Terverifikasi');
  const [tanggalCatatan, setTanggalCatatan] = useState('');
  const [nomorTiketPtsp, setNomorTiketPtsp] = useState('');
  const [linkDokumen, setLinkDokumen] = useState('');
  const [extra1, setExtra1] = useState('');
  const [extra2, setExtra2] = useState('');
  const [catatanDetail, setCatatanDetail] = useState('');

  // Modal Hapus
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const currentTabConfig = useMemo(
    () => TAB_CONFIGS.find((t) => t.key === activeTab) || TAB_CONFIGS[0],
    [activeTab]
  );

  const visibleTabs = useMemo(() => {
    const canSeeSensitive = activeMode === 'super_admin' || activeMode === 'admin_bimas';
    return TAB_CONFIGS.filter((t) => (!t.adminOnly ? true : canSeeSensitive));
  }, [activeMode]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const savedMode = localStorage.getItem('active_mode');
      const mode =
        savedMode ||
        (prof?.role === 'super_admin' ? 'super_admin' : prof?.jabatan_admin || 'pegawai');

      if (mode === 'pegawai') {
        router.push('/pegawai');
        return;
      }

      setCurrentUser(prof);
      setActiveMode(mode);

      await Promise.all([loadKecamatanOptions(), loadRecords(prof, mode)]);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
    setSelectedStatus('ALL');
  }, [visibleTabs, activeTab]);

  async function loadKecamatanOptions() {
    const { data: kecData } = await supabase
      .from('MasterKecamatan')
      .select('namaKecamatan')
      .order('namaKecamatan', { ascending: true });

    if (kecData && kecData.length > 0) {
      const names = kecData
        .map((k: any) => k.namaKecamatan)
        .filter((n: string) => Boolean(n && n.trim()));
      setKecamatanList(Array.from(new Set(names)));
    }
  }

  async function loadRecords(prof: any, mode: string) {
    setLoading(true);
    setTableMissing(false);

    let query = supabase
      .from('kebimasislaman_data')
      .select('*')
      .order('updated_at', { ascending: false });

    if (mode === 'admin_kua' && prof?.kua_wilayah) {
      query = query.ilike('kecamatan', `%${prof.kua_wilayah.replace(/^KUA\s*(Kecamatan|Kec\.)?\s*/i, '').trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      if (
        error.code === '42P01' ||
        error.message.toLowerCase().includes('does not exist') ||
        error.message.toLowerCase().includes('schema cache')
      ) {
        setTableMissing(true);
        setRecords([]);
      } else {
        triggerToast('error', 'Gagal Memuat Data', error.message);
      }
    } else if (data) {
      setRecords(data);
    }

    setLoading(false);
  }

  const getMonthKey = (item: any) => {
    const raw = item.tanggal_catatan || item.created_at || item.updated_at;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(dateObj.getTime())) return monthKey;
    return dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const tabRecords = useMemo(
    () => records.filter((item) => item.kategori === activeTab),
    [records, activeTab]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TAB_CONFIGS.forEach((t) => {
      counts[t.key] = records.filter((r) => r.kategori === t.key).length;
    });
    return counts;
  }, [records]);

  const kecamatanFilterOptions = useMemo(() => {
    const set = new Set<string>(kecamatanList);
    tabRecords.forEach((item) => {
      if (item.kecamatan && item.kecamatan.trim()) {
        set.add(item.kecamatan.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [kecamatanList, tabRecords]);

  const monthFilterOptions = useMemo(() => {
    const set = new Set<string>();
    tabRecords.forEach((item) => {
      const mKey = getMonthKey(item);
      if (mKey) set.add(mKey);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [tabRecords]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tabRecords.filter((item) => {
      if (selectedKecamatan !== 'ALL' && (item.kecamatan || '') !== selectedKecamatan) {
        return false;
      }
      if (selectedStatus !== 'ALL' && (item.status_data || '') !== selectedStatus) {
        return false;
      }
      if (selectedMonth !== 'ALL' && getMonthKey(item) !== selectedMonth) {
        return false;
      }
      if (!q) return true;

      const extraStr = item.data_tambahan ? JSON.stringify(item.data_tambahan).toLowerCase() : '';
      return (
        item.nama_objek?.toLowerCase().includes(q) ||
        item.kecamatan?.toLowerCase().includes(q) ||
        item.alamat_lokasi?.toLowerCase().includes(q) ||
        item.penanggung_jawab?.toLowerCase().includes(q) ||
        item.no_hp?.toLowerCase().includes(q) ||
        item.nomor_tiket_ptsp?.toLowerCase().includes(q) ||
        item.catatan_detail?.toLowerCase().includes(q) ||
        extraStr.includes(q)
      );
    });
  }, [tabRecords, searchQuery, selectedKecamatan, selectedStatus, selectedMonth]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedKecamatan !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedMonth !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedKecamatan('ALL');
    setSelectedStatus('ALL');
    setSelectedMonth('ALL');
  };

  const openAddModal = () => {
    setEditId(null);
    setNamaObjek('');
    setKecamatan(kecamatanFilterOptions[0] || '');
    setAlamatLokasi('');
    setPenanggungJawab('');
    setNoHp('');
    setStatusData(currentTabConfig.statusOptions[0] || 'Terverifikasi');
    setTanggalCatatan(new Date().toISOString().slice(0, 10));
    setNomorTiketPtsp('');
    setLinkDokumen('');
    setExtra1('');
    setExtra2('');
    setCatatanDetail('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    const extra = item.data_tambahan && typeof item.data_tambahan === 'object' ? item.data_tambahan : {};
    setEditId(item.id);
    setNamaObjek(item.nama_objek || '');
    setKecamatan(item.kecamatan || '');
    setAlamatLokasi(item.alamat_lokasi || '');
    setPenanggungJawab(item.penanggung_jawab || '');
    setNoHp(item.no_hp || '');
    setStatusData(item.status_data || currentTabConfig.statusOptions[0] || 'Terverifikasi');
    setTanggalCatatan(
      item.tanggal_catatan
        ? String(item.tanggal_catatan).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setNomorTiketPtsp(item.nomor_tiket_ptsp || '');
    setLinkDokumen(item.link_dokumen || '');
    setExtra1(extra.extra1 || '');
    setExtra2(extra.extra2 || '');
    setCatatanDetail(item.catatan_detail || '');
    setShowModal(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaObjek.trim()) return;

    setProcessing(true);
    const nowIso = new Date().toISOString();

    const payload: any = {
      kategori: activeTab,
      nama_objek: namaObjek.trim(),
      kecamatan: kecamatan.trim() || null,
      alamat_lokasi: alamatLokasi.trim() || null,
      penanggung_jawab: penanggungJawab.trim() || null,
      no_hp: noHp.trim() || null,
      status_data: statusData,
      tanggal_catatan: tanggalCatatan || nowIso.slice(0, 10),
      nomor_tiket_ptsp: nomorTiketPtsp.trim() || null,
      link_dokumen: linkDokumen.trim() || null,
      catatan_detail: catatanDetail.trim() || null,
      data_tambahan: {
        extra1: extra1.trim() || '',
        extra2: extra2.trim() || '',
      },
      updated_at: nowIso,
    };

    let error = null;

    if (editId) {
      const res = await supabase
        .from('kebimasislaman_data')
        .update(payload)
        .eq('id', editId);
      error = res.error;
    } else {
      payload.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `kbm_${Date.now()}`;
      payload.created_at = nowIso;
      const res = await supabase.from('kebimasislaman_data').insert([payload]);
      error = res.error;
    }

    setProcessing(false);

    if (error) {
      triggerToast('error', 'Gagal Menyimpan Data', error.message);
    } else {
      setShowModal(false);
      triggerToast(
        'success',
        editId ? 'Data Diperbarui' : 'Data Ditambahkan',
        `"${namaObjek.trim()}" berhasil disimpan pada ${currentTabConfig.label}.`
      );
      await loadRecords(currentUser, activeMode);
    }
  };

  const confirmDelete = (item: any) => {
    setDeleteTarget({ id: item.id, nama: item.nama_objek || 'Data ini' });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);

    const { error } = await supabase
      .from('kebimasislaman_data')
      .delete()
      .eq('id', deleteTarget.id);

    setProcessing(false);
    setShowDeleteModal(false);

    if (error) {
      triggerToast('error', 'Gagal Menghapus', error.message);
    } else {
      triggerToast('success', 'Berhasil Dihapus', `"${deleteTarget.nama}" telah dihapus.`);
      setDeleteTarget(null);
      await loadRecords(currentUser, activeMode);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'Terverifikasi' || status === 'Terdaftar' || status === 'Sesuai') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (status === 'Dalam Pemantauan') {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (status === 'Perlu Koreksi' || status === 'Perlu Pembinaan') {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Layanan & Data Kebimasislaman
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Pengelolaan data Masjid & Mushalla, Arah Kiblat, Ormas Islam, Majelis Taklim, dan referensi pendukung PTSP
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                disabled={tableMissing}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 text-center"
              >
                + Tambah {currentTabConfig.shortLabel}
              </button>
            </div>

            {/* TAB KATEGORI KEBIMASISLAMAN */}
            <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-0.5">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-700 font-bold">
                      {tabCounts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {tableMissing ? (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-xs sm:text-sm text-amber-950 space-y-2">
                <div className="font-bold text-sm">Tabel `kebimasislaman_data` belum tersedia di Supabase</div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Buat tabel <code className="font-mono font-bold">kebimasislaman_data</code> pada database Supabase agar penyimpanan modul Kebimasislaman aktif sepenuhnya.
                </p>
              </div>
            ) : (
              <>
                {/* PANEL PENCARIAN & FILTER */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    <div className="relative lg:col-span-5">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Cari ${currentTabConfig.shortLabel.toLowerCase()}, penanggung jawab, kecamatan, atau no. tiket PTSP...`}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <select
                        aria-label="Filter Kecamatan"
                        value={selectedKecamatan}
                        onChange={(e) => setSelectedKecamatan(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">📍 Semua Kecamatan</option>
                        {kecamatanFilterOptions.map((kecName) => (
                          <option key={kecName} value={kecName}>
                            {kecName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <select
                        aria-label="Filter Status"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">🏷️ Semua Status</option>
                        {currentTabConfig.statusOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <select
                        aria-label="Filter Bulan"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="ALL">📅 Semua Bulan</option>
                        {monthFilterOptions.map((mKey) => (
                          <option key={mKey} value={mKey}>
                            {formatMonthLabel(mKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>
                    <div className="font-semibold text-gray-600">
                      Ditampilkan: <strong className="text-emerald-700">{filteredRecords.length} Data</strong>
                    </div>
                  </div>
                </div>

                {/* DAFTAR DATA: CARD VIEW DI HP (< md) & TABEL DI DESKTOP (>= md) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="px-6 py-12 text-center text-gray-500 text-sm">
                      Memuat data {currentTabConfig.label}...
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500 text-sm space-y-2">
                      <div>
                        {hasActiveFilters
                          ? 'Tidak ada data yang cocok dengan filter yang dipilih.'
                          : `Belum ada data pada kategori ${currentTabConfig.label}.`}
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition"
                        >
                          Tampilkan Semua
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* CARD VIEW KHUSUS HP (< md) */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredRecords.map((item, idx) => {
                          const extra =
                            item.data_tambahan && typeof item.data_tambahan === 'object'
                              ? item.data_tambahan
                              : {};
                          const statusLabel = item.status_data || currentTabConfig.statusOptions[0] || 'Terverifikasi';

                          return (
                            <div key={item.id || idx} className="p-4 space-y-3 bg-white">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                      #{idx + 1}
                                    </span>
                                    {item.kecamatan && (
                                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                        {item.kecamatan}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-sm text-gray-900 mt-1.5 break-words">
                                    {item.nama_objek}
                                  </h3>
                                </div>
                                <span
                                  className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full border ${getStatusBadgeClass(
                                    statusLabel
                                  )}`}
                                >
                                  {statusLabel}
                                </span>
                              </div>

                              <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-1 text-xs text-gray-600">
                                {item.penanggung_jawab && (
                                  <div>
                                    <span className="font-semibold text-gray-500">{currentTabConfig.pjLabel}:</span>{' '}
                                    <span className="font-medium text-gray-800 break-words">{item.penanggung_jawab}</span>
                                  </div>
                                )}
                                {extra.extra1 && (
                                  <div>
                                    <span className="font-semibold text-gray-500">{currentTabConfig.extra1Label}:</span>{' '}
                                    <span className="text-gray-800 break-words">{extra.extra1}</span>
                                  </div>
                                )}
                                {extra.extra2 && (
                                  <div>
                                    <span className="font-semibold text-gray-500">{currentTabConfig.extra2Label}:</span>{' '}
                                    <span className="text-gray-800 break-words">{extra.extra2}</span>
                                  </div>
                                )}
                                {item.alamat_lokasi && (
                                  <div className="text-gray-500 break-words">📍 {item.alamat_lokasi}</div>
                                )}
                                {item.no_hp && (
                                  <div className="text-emerald-700 font-medium">📞 {item.no_hp}</div>
                                )}
                                {item.nomor_tiket_ptsp && (
                                  <div className="font-mono text-[11px] text-emerald-800 pt-0.5">
                                    Tiket PTSP: {item.nomor_tiket_ptsp}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition text-center"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDelete(item)}
                                  className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition text-center"
                                >
                                  Hapus
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
                              <th className="px-6 py-3.5 font-semibold">No</th>
                              <th className="px-6 py-3.5 font-semibold">{currentTabConfig.namaLabel}</th>
                              <th className="px-6 py-3.5 font-semibold">Wilayah & Lokasi</th>
                              <th className="px-6 py-3.5 font-semibold">Rincian & Penanggung Jawab</th>
                              <th className="px-6 py-3.5 font-semibold">Status</th>
                              <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredRecords.map((item, idx) => {
                              const extra =
                                item.data_tambahan && typeof item.data_tambahan === 'object'
                                  ? item.data_tambahan
                                  : {};
                              const statusLabel =
                                item.status_data || currentTabConfig.statusOptions[0] || 'Terverifikasi';

                              return (
                                <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                                  <td className="px-6 py-4 text-gray-500 text-xs">{idx + 1}</td>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{item.nama_objek}</div>
                                    {extra.extra1 && (
                                      <div className="text-xs text-emerald-800 font-medium mt-0.5">
                                        {extra.extra1}
                                      </div>
                                    )}
                                    {item.nomor_tiket_ptsp && (
                                      <div className="font-mono text-[11px] text-gray-500 mt-0.5">
                                        PTSP: {item.nomor_tiket_ptsp}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-700">
                                    <div className="font-semibold text-gray-900">{item.kecamatan || '-'}</div>
                                    <div className="text-gray-500 mt-0.5">{item.alamat_lokasi || '-'}</div>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-700 space-y-0.5">
                                    <div className="font-medium text-gray-900">
                                      {item.penanggung_jawab || '-'}
                                    </div>
                                    {item.no_hp && <div className="text-emerald-700">📞 {item.no_hp}</div>}
                                    {extra.extra2 && <div className="text-gray-500">{extra.extra2}</div>}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadgeClass(
                                        statusLabel
                                      )}`}
                                    >
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(item)}
                                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => confirmDelete(item)}
                                      className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition"
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
          </div>

          {/* MODAL TAMBAH / EDIT DATA KEBIMASISLAMAN */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {editId ? 'Edit' : 'Tambah'} {currentTabConfig.label}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Simpan data referensi Kebimasislaman dan hubungkan dengan rujukan tiket PTSP bila diperlukan.
                </p>

                <form onSubmit={handleSaveRecord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      {currentTabConfig.namaLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={namaObjek}
                      onChange={(e) => setNamaObjek(e.target.value)}
                      placeholder={currentTabConfig.namaPlaceholder}
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Kecamatan
                      </label>
                      <input
                        type="text"
                        list="kecamatan-datalist"
                        value={kecamatan}
                        onChange={(e) => setKecamatan(e.target.value)}
                        placeholder="Pilih atau ketik kecamatan"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <datalist id="kecamatan-datalist">
                        {kecamatanFilterOptions.map((k) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Status Data
                      </label>
                      <select
                        value={statusData}
                        onChange={(e) => setStatusData(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {currentTabConfig.statusOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Alamat / Lokasi Lengkap
                    </label>
                    <input
                      type="text"
                      value={alamatLokasi}
                      onChange={(e) => setAlamatLokasi(e.target.value)}
                      placeholder="Desa / kelurahan / jalan / titik lokasi"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        {currentTabConfig.pjLabel}
                      </label>
                      <input
                        type="text"
                        value={penanggungJawab}
                        onChange={(e) => setPenanggungJawab(e.target.value)}
                        placeholder={currentTabConfig.pjPlaceholder}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Nomor HP / Kontak
                      </label>
                      <input
                        type="tel"
                        value={noHp}
                        onChange={(e) => setNoHp(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        {currentTabConfig.extra1Label}
                      </label>
                      <input
                        type="text"
                        value={extra1}
                        onChange={(e) => setExtra1(e.target.value)}
                        placeholder={currentTabConfig.extra1Placeholder}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        {currentTabConfig.extra2Label}
                      </label>
                      <input
                        type="text"
                        value={extra2}
                        onChange={(e) => setExtra2(e.target.value)}
                        placeholder={currentTabConfig.extra2Placeholder}
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Tanggal Pencatatan
                      </label>
                      <input
                        type="date"
                        value={tanggalCatatan}
                        onChange={(e) => setTanggalCatatan(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        No. Tiket PTSP (Opsional)
                      </label>
                      <input
                        type="text"
                        value={nomorTiketPtsp}
                        onChange={(e) => setNomorTiketPtsp(e.target.value)}
                        placeholder="PTSP-..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Link Dokumen (Opsional)
                      </label>
                      <input
                        type="url"
                        value={linkDokumen}
                        onChange={(e) => setLinkDokumen(e.target.value)}
                        placeholder="https://..."
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Catatan / Keterangan Tambahan
                    </label>
                    <textarea
                      rows={3}
                      value={catatanDetail}
                      onChange={(e) => setCatatanDetail(e.target.value)}
                      placeholder="Catatan hasil pengukuran, pembinaan, legalitas, atau keterangan lainnya..."
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Menyimpan...' : 'Simpan Data'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI HAPUS */}
          {showDeleteModal && deleteTarget && (
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
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={executeDelete}
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