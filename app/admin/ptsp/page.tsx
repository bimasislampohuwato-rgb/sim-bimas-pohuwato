'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const NEEDS_ACTION_STATUSES = ['Menunggu Verifikasi', 'Diproses'];

export default function AdminPtspPage() {
  const router = useRouter();
  const [permohonanList, setPermohonanList] = useState<any[]>([]);
  const [masterLayananList, setMasterLayananList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Tampilan
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedLayanan, setSelectedLayanan] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [catatanAdmin, setCatatanAdmin] = useState('');

  // Field Tambahan Tindak Lanjut / Penugasan (khusus status Selesai)
  const [petugasDitunjuk, setPetugasDitunjuk] = useState('');
  const [noHpPetugas, setNoHpPetugas] = useState('');
  const [linkSuratTugas, setLinkSuratTugas] = useState('');

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      await loadPermohonan();
    }
    init();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadPermohonan() {
    setLoading(true);
    const [permohonanRes, layananRes] = await Promise.all([
      supabase
        .from('ptsp_permohonan')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('ptsp_master_layanan')
        .select('nama_layanan')
        .order('nama_layanan', { ascending: true }),
    ]);

    if (permohonanRes.error) {
      console.error('Error load PTSP:', permohonanRes.error.message);
    } else if (permohonanRes.data) {
      setPermohonanList(permohonanRes.data);
    }

    if (!layananRes.error && layananRes.data) {
      setMasterLayananList(
        layananRes.data
          .map((row: any) => row.nama_layanan)
          .filter((name: string) => Boolean(name && name.trim()))
      );
    }

    setLoading(false);
  }

  const getMonthKey = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(dateObj.getTime())) return monthKey;
    return dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    permohonanList.forEach((item) => {
      const key = getMonthKey(item.created_at);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [permohonanList]);

  const layananOptions = useMemo(() => {
    const names = new Set<string>(masterLayananList);
    permohonanList.forEach((item) => {
      if (item.jenis_layanan && item.jenis_layanan.trim()) {
        names.add(item.jenis_layanan.trim());
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
  }, [masterLayananList, permohonanList]);

  const isNeedsAction = (status?: string) => {
    const normalized = status || 'Menunggu Verifikasi';
    return NEEDS_ACTION_STATUSES.includes(normalized);
  };

  const getPriorityRank = (status?: string) => {
    const normalized = status || 'Menunggu Verifikasi';
    if (normalized === 'Menunggu Verifikasi') return 0;
    if (normalized === 'Diproses') return 1;
    return 2;
  };

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = permohonanList.filter((item) => {
      const statusVal = item.status || 'Menunggu Verifikasi';

      if (selectedMonth !== 'ALL') {
        if (getMonthKey(item.created_at) !== selectedMonth) return false;
      }

      if (selectedLayanan !== 'ALL') {
        if ((item.jenis_layanan || '') !== selectedLayanan) return false;
      }

      if (selectedPriorityFilter === 'NEEDS_ACTION') {
        if (!isNeedsAction(statusVal)) return false;
      } else if (selectedPriorityFilter !== 'ALL') {
        if (statusVal !== selectedPriorityFilter) return false;
      }

      if (!query) return true;

      return (
        item.nomor_tiket?.toLowerCase().includes(query) ||
        item.nama_pemohon?.toLowerCase().includes(query) ||
        item.nik_pemohon?.toLowerCase().includes(query) ||
        item.jenis_layanan?.toLowerCase().includes(query)
      );
    });

    return [...matches].sort((a, b) => {
      const rankDiff = getPriorityRank(a.status) - getPriorityRank(b.status);
      if (rankDiff !== 0) return rankDiff;

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [permohonanList, searchQuery, selectedMonth, selectedLayanan, selectedPriorityFilter]);

  const needsActionCount = useMemo(
    () => permohonanList.filter((item) => isNeedsAction(item.status)).length,
    [permohonanList]
  );

  const hasActiveFilters =
    selectedMonth !== 'ALL' ||
    selectedLayanan !== 'ALL' ||
    selectedPriorityFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMonth('ALL');
    setSelectedLayanan('ALL');
    setSelectedPriorityFilter('ALL');
  };

  const openActionModal = (item: any) => {
    setSelectedItem(item);
    setNewStatus(item.status || 'Menunggu Verifikasi');
    setCatatanAdmin(item.catatan_admin || '');
    setPetugasDitunjuk(item.petugas_ditunjuk || '');
    setNoHpPetugas(item.no_hp_petugas || '');
    setLinkSuratTugas(item.link_surat_tugas || '');
    setShowModal(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setProcessing(true);

    const updatePayload: any = {
      status: newStatus,
      catatan_admin: catatanAdmin,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'Selesai') {
      updatePayload.petugas_ditunjuk = petugasDitunjuk;
      updatePayload.no_hp_petugas = noHpPetugas;
      updatePayload.link_surat_tugas = linkSuratTugas;
    }

    const { error } = await supabase
      .from('ptsp_permohonan')
      .update(updatePayload)
      .eq('id', selectedItem.id);

    setProcessing(false);
    setShowModal(false);

    if (error) {
      triggerToast('error', 'Gagal Memperbarui', error.message);
    } else {
      triggerToast('success', 'Status Diperbarui', `Permohonan ${selectedItem.nomor_tiket} berhasil diperbarui.`);
      loadPermohonan();

      // KIRIM NOTIFIKASI EMAIL OTOMATIS JIKA STATUS DIUBAH JADI SELESAI & PEMOHON PUNYA EMAIL
      if (selectedItem.email && newStatus === 'Selesai') {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedItem.email,
            namaPemohon: selectedItem.nama_pemohon,
            nomorTiket: selectedItem.nomor_tiket,
            jenisLayanan: selectedItem.jenis_layanan,
            status: 'selesai',
            namaPetugas: petugasDitunjuk,
            noHpPetugas: noHpPetugas,
            linkSuratTugas: linkSuratTugas,
            catatanAdmin: catatanAdmin,
            trackingUrl: `${window.location.origin}/ptsp/lacak?tiket=${selectedItem.nomor_tiket}`,
          }),
        }).catch((err) => console.error('Gagal mengirim email selesai:', err));
      }

      // Kirim WhatsApp ke Pemohon
      if (newStatus === 'Selesai') {
        sendWhatsAppToPemohon(selectedItem, petugasDitunjuk, noHpPetugas, linkSuratTugas, catatanAdmin);
      }
    }
  };

  const sendWhatsAppToPemohon = (item: any, petugas: string, hpPetugas: string, suratTugas: string, catatan: string) => {
    let phone = item.no_hp.trim();
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    let pesan = `*PERMOHONAN PTSP SELESAI - KEMENAG POHUWATO*\n\n` +
      `Halo Bpk/Ibu *${item.nama_pemohon}*,\n` +
      `Permohonan layanan *${item.jenis_layanan}* dengan Nomor Tiket *${item.nomor_tiket}* telah *SELESAI* diproses.\n\n`;

    if (petugas) {
      pesan += `*Informasi Petugas Ditunjuk:*\n` +
        `- Nama Petugas: *${petugas}*\n` +
        (hpPetugas ? `- No WA Petugas: ${hpPetugas}\n` : '') +
        (suratTugas ? `- Surat Tugas: ${suratTugas}\n` : '') +
        `\n`;
    }

    if (catatan) {
      pesan += `*Catatan Petugas:* ${catatan}\n\n`;
    }

    pesan += `Anda dapat memeriksa rincian lengkap melalui halaman lacak tiket:\n` +
      `http://localhost:3000/ptsp/lacak\n\n` +
      `Terima kasih telah menggunakan layanan PTSP Online Bimas Islam Kantor Kementerian Agama Kabupaten Pohuwato.`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`;
    window.open(waUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const val = status || 'Menunggu Verifikasi';
    if (val === 'Selesai') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (val === 'Diproses') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (val === 'Ditolak') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const getRowHighlightClass = (status: string) => {
    const val = status || 'Menunggu Verifikasi';
    if (val === 'Menunggu Verifikasi') {
      return 'bg-amber-50/45 hover:bg-amber-50/80 border-l-4 border-l-amber-500';
    }
    if (val === 'Diproses') {
      return 'bg-blue-50/35 hover:bg-blue-50/70 border-l-4 border-l-blue-500';
    }
    return 'hover:bg-gray-50 border-l-4 border-l-transparent';
  };

  const getMobileCardHighlightClass = (status: string) => {
    const val = status || 'Menunggu Verifikasi';
    if (val === 'Menunggu Verifikasi') {
      return 'bg-amber-50/45 border-l-4 border-l-amber-500';
    }
    if (val === 'Diproses') {
      return 'bg-blue-50/35 border-l-4 border-l-blue-500';
    }
    return 'bg-white border-l-4 border-l-transparent';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">

          {toast && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] max-w-md sm:w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toast.type === 'success' ? '✓' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
                <p className="text-xs text-gray-700 mt-0.5 font-medium break-words">{toast.message}</p>
              </div>
              <button type="button" onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1 shrink-0">✕</button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Verifikasi PTSP Publik</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Verifikasi berkas masuk dan permohonan layanan keagamaan masyarakat</p>
              </div>
              <Link
                href="/admin/ptsp/layanan"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>⚙️</span> Kelola Master Jenis Layanan & Persyaratan
              </Link>
            </div>

            {/* PANEL PENCARIAN, FILTER BULAN, LAYANAN & PRIORITAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="relative md:col-span-5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">🔍</span>
                  <input
                    type="text"
                    placeholder="Cari nomor tiket, nama pemohon, NIK, atau layanan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    aria-label="Filter Bulan"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">📅 Semua Bulan</option>
                    {monthOptions.map((mKey) => (
                      <option key={mKey} value={mKey}>
                        {formatMonthLabel(mKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <select
                    aria-label="Filter Jenis Layanan"
                    value={selectedLayanan}
                    onChange={(e) => setSelectedLayanan(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">🗂️ Semua Jenis Layanan</option>
                    {layananOptions.map((layananName) => (
                      <option key={layananName} value={layananName}>
                        {layananName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* FILTER CEPAT STATUS & RINGKASAN PRIORITAS */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pt-2.5 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedPriorityFilter === 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Semua ({permohonanList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter('NEEDS_ACTION')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedPriorityFilter === 'NEEDS_ACTION'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⚡ Perlu Ditindaklanjuti ({needsActionCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter('Menunggu Verifikasi')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedPriorityFilter === 'Menunggu Verifikasi'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Menunggu Verifikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter('Diproses')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedPriorityFilter === 'Diproses'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Diproses
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityFilter('Selesai')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedPriorityFilter === 'Selesai'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Selesai
                  </button>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    Urutan: Ajuan Perlu Tindak Lanjut & Terbaru di Atas
                  </span>
                  <span>
                    Tampil: <strong className="text-emerald-700">{filteredData.length} Berkas</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm">Memuat permohonan...</div>
              ) : filteredData.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 text-sm space-y-2">
                  <div>
                    {hasActiveFilters
                      ? 'Tidak ada permohonan PTSP yang sesuai dengan filter.'
                      : 'Belum ada permohonan PTSP masuk.'}
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition"
                    >
                      Tampilkan Semua Permohonan
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* TAMPILAN KARTU KHUSUS LAYAR HP (< md) */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredData.map((item, idx) => {
                      const statusLabel = item.status || 'Menunggu Verifikasi';
                      const urgent = isNeedsAction(statusLabel);

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-4 space-y-3 transition ${getMobileCardHighlightClass(statusLabel)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  #{idx + 1}
                                </span>
                                <span className="font-mono font-bold text-emerald-800 text-xs break-all">
                                  {item.nomor_tiket}
                                </span>
                                {urgent && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                    Perlu Tindak Lanjut
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                              </p>
                            </div>
                            <span className={`shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full border ${getStatusBadge(statusLabel)}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-sm text-gray-900 break-words">{item.nama_pemohon}</div>
                            <div className="font-mono text-gray-600 break-all">NIK: {item.nik_pemohon}</div>
                            <div className="text-emerald-700 font-medium">📞 {item.no_hp}</div>
                            {item.email && <div className="text-gray-500 break-all">✉️ {item.email}</div>}
                          </div>

                          <div>
                            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 break-words">
                              {item.jenis_layanan}
                            </span>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => openActionModal(item)}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold transition text-center border ${
                                urgent
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                              }`}
                            >
                              Verifikasi / Proses
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TAMPILAN TABEL DESKTOP (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">No</th>
                          <th className="px-6 py-3.5 font-semibold">Tiket & Tanggal</th>
                          <th className="px-6 py-3.5 font-semibold">Pemohon & NIK</th>
                          <th className="px-6 py-3.5 font-semibold">Jenis Layanan</th>
                          <th className="px-6 py-3.5 font-semibold">Status & Prioritas</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredData.map((item, idx) => {
                          const statusLabel = item.status || 'Menunggu Verifikasi';
                          const urgent = isNeedsAction(statusLabel);

                          return (
                            <tr key={item.id || idx} className={`transition ${getRowHighlightClass(statusLabel)}`}>
                              <td className="px-6 py-4 text-gray-500 text-xs font-semibold">{idx + 1}</td>
                              <td className="px-6 py-4">
                                <div className="font-mono font-bold text-emerald-800 text-xs">{item.nomor_tiket}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  {new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{item.nama_pemohon}</div>
                                <div className="font-mono text-xs text-gray-500">NIK: {item.nik_pemohon}</div>
                                <div className="text-[11px] text-emerald-700">📞 {item.no_hp}</div>
                                {item.email && <div className="text-[11px] text-gray-500">✉️ {item.email}</div>}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {item.jenis_layanan}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-1.5">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadge(statusLabel)}`}>
                                    {statusLabel}
                                  </span>
                                  {urgent && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                      ⚡ Perlu Ditindaklanjuti
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openActionModal(item)}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                                    urgent
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                  }`}
                                >
                                  Verifikasi / Proses
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

          </div>

          {/* MODAL VERIFIKASI & PENUGASAN */}
          {showModal && selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Verifikasi Permohonan PTSP</h3>
                <p className="text-xs text-gray-500 mb-4 font-mono">Tiket: {selectedItem.nomor_tiket}</p>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 space-y-2 text-xs">
                  <div><strong>Pemohon:</strong> {selectedItem.nama_pemohon} (NIK: {selectedItem.nik_pemohon})</div>
                  <div><strong>Layanan:</strong> {selectedItem.jenis_layanan}</div>
                  <div><strong>Email Pemohon:</strong> {selectedItem.email || 'Tidak diisi'}</div>
                  <div><strong>Keterangan:</strong> {selectedItem.keterangan_permohonan}</div>
                  {selectedItem.file_lampiran_url && (
                    <div>
                      <strong>Lampiran Pemohon:</strong>{' '}
                      <a href={selectedItem.file_lampiran_url} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">
                        Unduh Berkas 📄
                      </a>
                    </div>
                  )}
                </div>

                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status Permohonan</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="Menunggu Verifikasi">⏳ Menunggu Verifikasi</option>
                      <option value="Diproses">⚙️ Sedang Diproses</option>
                      <option value="Selesai">✅ Selesai</option>
                      <option value="Ditolak">❌ Ditolak</option>
                    </select>
                  </div>

                  {/* FORM KHUSUS JIKA STATUS SELESAI (PENUGASAN) */}
                  {newStatus === 'Selesai' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="text-xs font-bold text-emerald-900 uppercase">📋 Form Tindak Lanjut & Penugasan Resmi</div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Nama Petugas / Rohaniwan yang Ditunjuk</label>
                        <input
                          type="text"
                          value={petugasDitunjuk}
                          onChange={(e) => setPetugasDitunjuk(e.target.value)}
                          placeholder="Contoh: Ust. H. Abdul Rahman, S.Ag"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Nomor HP / WhatsApp Petugas</label>
                        <input
                          type="tel"
                          value={noHpPetugas}
                          onChange={(e) => setNoHpPetugas(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-emerald-800 mb-1">Link Surat Tugas / Dokumen (Google Drive)</label>
                        <input
                          type="url"
                          value={linkSuratTugas}
                          onChange={(e) => setLinkSuratTugas(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Catatan / Keterangan Petugas</label>
                    <textarea
                      rows={3}
                      value={catatanAdmin}
                      onChange={(e) => setCatatanAdmin(e.target.value)}
                      placeholder="Masukkan catatan atau instruksi lanjutan..."
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                    <button type="submit" disabled={processing} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                      {processing ? 'Menyimpan...' : 'Simpan Status & Penugasan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}