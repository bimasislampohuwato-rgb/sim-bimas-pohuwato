'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/src/components/Sidebar';
import HeaderBar from '@/src/components/HeaderBar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface PegawaiRefItem {
  id: string;
  nama_lengkap?: string;
  nama?: string;
  namaTanpaGelar?: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  nip?: string;
  jabatan?: string;
  unitKerja?: string;
  unit_kerja?: string;
}

interface ProfilKantorData {
  id?: string;
  unit_key: string;
  jenis_unit: 'kantor_kemenag' | 'kua' | 'unit_lain';
  kua_id?: string | null;
  nama_kantor: string;
  alamat: string;
  nomor_kontak: string;
  website: string;
  email: string;
  pimpinan: string;
  nama_pimpinan: string;
  nip_pimpinan: string;
  kop_baris_1: string;
  kop_baris_2: string;
  kop_baris_3: string;
  kop_baris_4: string;
  updated_at?: string;
}

type MasterSubSectionKey =
  | 'profil_kantor'
  | 'jabatan'
  | 'kategori_jabatan'
  | 'kua'
  | 'kecamatan'
  | 'logo_instansi';

const KANTOR_KEMENAG_KEY = 'kantor_kemenag_pohuwato';

const DEFAULT_KEMENAG_PROFIL: ProfilKantorData = {
  unit_key: KANTOR_KEMENAG_KEY,
  jenis_unit: 'kantor_kemenag',
  kua_id: null,
  nama_kantor: 'Kantor Kementerian Agama Kabupaten Pohuwato',
  alamat: 'Jl. Kompleks Perkantoran Blok C, Marisa, Kabupaten Pohuwato, Provinsi Gorontalo',
  nomor_kontak: '',
  website: '',
  email: '',
  pimpinan: 'Kepala Kantor',
  nama_pimpinan: '',
  nip_pimpinan: '',
  kop_baris_1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
  kop_baris_2: 'KANTOR WILAYAH KEMENTERIAN AGAMA PROVINSI GORONTALO',
  kop_baris_3: 'KANTOR KEMENTERIAN AGAMA KABUPATEN POHUWATO',
  kop_baris_4: 'Jl. Kompleks Perkantoran Blok C, Marisa, Kab. Pohuwato',
};

function buildDefaultKuaProfil(kuaRow: any): ProfilKantorData {
  const namaKua = kuaRow?.namaKua || kuaRow?.nama_kua || 'KUA Kecamatan';
  const alamatKua = kuaRow?.alamat || 'Kabupaten Pohuwato, Provinsi Gorontalo';
  const kuaId = kuaRow?.id ? String(kuaRow.id) : null;
  const slugPart = (kuaId || namaKua)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    unit_key: `kua_${slugPart}`,
    jenis_unit: 'kua',
    kua_id: kuaId,
    nama_kantor: namaKua,
    alamat: alamatKua,
    nomor_kontak: kuaRow?.telepon || '',
    website: '',
    email: kuaRow?.email || '',
    pimpinan: 'Kepala KUA',
    nama_pimpinan: '',
    nip_pimpinan: '',
    kop_baris_1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    kop_baris_2: 'KANTOR KEMENTERIAN AGAMA KABUPATEN POHUWATO',
    kop_baris_3: String(namaKua).toUpperCase(),
    kop_baris_4: alamatKua,
  };
}

function resolvePegawaiNama(p: PegawaiRefItem): string {
  if (p.nama_lengkap && p.nama_lengkap.trim()) return p.nama_lengkap.trim();
  if (p.nama && p.nama.trim()) return p.nama.trim();
  const depan = p.gelarDepan ? `${p.gelarDepan.trim()} ` : '';
  const tengah = (p.namaTanpaGelar || '').trim();
  const belakang = p.gelarBelakang ? `, ${p.gelarBelakang.trim()}` : '';
  return `${depan}${tengah}${belakang}`.trim() || 'Pegawai Tanpa Nama';
}

function normalizeText(v?: string | null): string {
  return String(v || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default function MasterDataPage() {
  const router = useRouter();

  // Role & Scope Pengguna Login
  const [userRole, setUserRole] = useState<string>('admin');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [userKuaScope, setUserKuaScope] = useState<{
    kuaId: string | null;
    namaKua: string;
  }>({ kuaId: null, namaKua: '' });

  // Master Reference Lists
  const [jabatanList, setJabatanList] = useState<any[]>([]);
  const [kategoriJabatanList, setKategoriJabatanList] = useState<any[]>([]);
  const [kuaList, setKuaList] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<PegawaiRefItem[]>([]);

  // Modul Profil Kantor Multi-Unit (Kantor Kemenag + 13 KUA)
  const [profilUnits, setProfilUnits] = useState<ProfilKantorData[]>([DEFAULT_KEMENAG_PROFIL]);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string>(KANTOR_KEMENAG_KEY);
  const [profilKantor, setProfilKantor] = useState<ProfilKantorData>(DEFAULT_KEMENAG_PROFIL);
  const [savingProfilKantor, setSavingProfilKantor] = useState(false);

  // State Logo Instansi (Upload)
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [activeSubNav, setActiveSubNav] = useState<MasterSubSectionKey>('profil_kantor');

  // State Modal Tambah / Edit Master Referensi
  const [showModal, setShowModal] = useState(false);
  const [modalEntity, setModalEntity] = useState<'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan'>('jabatan');
  const [editId, setEditId] = useState<string | null>(null);

  // State Modal Konfirmasi Hapus Kustom
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nama: string;
    entity: 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan';
  } | null>(null);

  // Field Form Umum (Jabatan, Kategori Jabatan & Kecamatan)
  const [inputField1, setInputField1] = useState('');
  const [inputField2, setInputField2] = useState('');
  const [inputKategoriJabatan, setInputKategoriJabatan] = useState('');

  // Field Form Khusus KUA (Tabel KuaProfile)
  const [inputNamaKua, setInputNamaKua] = useState('');
  const [inputAlamatKua, setInputAlamatKua] = useState('');
  const [inputTeleponKua, setInputTeleponKua] = useState('');
  const [inputEmailKua, setInputEmailKua] = useState('');
  const [inputKecamatanIdKua, setInputKecamatanIdKua] = useState('');

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const roleValue = String(prof?.role || '').toLowerCase();
      const superAdminFlag = roleValue === 'super_admin';
      setUserRole(roleValue || 'admin');
      setIsSuperAdmin(superAdminFlag);

      let resolvedKuaId: string | null = prof?.kua_id || prof?.kuaId || null;
      let resolvedNamaKua: string =
        prof?.nama_kua || prof?.namaKua || prof?.unit_kerja || prof?.unitKerja || '';

      // Jika belum ada di profiles, cek di tabel pegawai berdasarkan user_id / email
      if (!superAdminFlag && (!resolvedKuaId || !resolvedNamaKua)) {
        const { data: pegByUser } = await supabase
          .from('pegawai')
          .select('*')
          .or(`user_id.eq.${user.id},email.eq.${user.email || ''}`)
          .limit(1);

        if (Array.isArray(pegByUser) && pegByUser.length > 0) {
          const pRow = pegByUser[0];
          resolvedKuaId = resolvedKuaId || pRow.kua_id || pRow.kuaId || null;
          resolvedNamaKua =
            resolvedNamaKua || pRow.nama_kua || pRow.namaKua || pRow.unit_kerja || pRow.unitKerja || '';
        }
      }

      setUserKuaScope({ kuaId: resolvedKuaId, namaKua: resolvedNamaKua });

      if (!superAdminFlag) {
        setActiveSubNav('profil_kantor');
      }

      await loadMasterData(superAdminFlag, { kuaId: resolvedKuaId, namaKua: resolvedNamaKua });
    }
    init();
  }, [router]);

  async function loadPegawaiOptions() {
    const candidateTables = ['pegawai', 'profil_pegawai', 'profiles'];
    for (const tbl of candidateTables) {
      const { data, error } = await supabase.from(tbl).select('*').limit(300);
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: PegawaiRefItem[] = data.map((row: any, idx: number) => ({
          id: String(row.id ?? `${tbl}_${idx}`),
          nama_lengkap: row.nama_lengkap || row.namaLengkap || row.nama || row.full_name || '',
          nama: row.nama || '',
          namaTanpaGelar: row.namaTanpaGelar || '',
          gelarDepan: row.gelarDepan || row.gelar_depan || '',
          gelarBelakang: row.gelarBelakang || row.gelar_belakang || '',
          nip: String(row.nip || row.nip_pegawai || row.nip_baru || '').trim(),
          jabatan: row.jabatan || row.nama_jabatan || '',
          unitKerja: row.unitKerja || row.unit_kerja || row.nama_kua || '',
        }));
        const sorted = mapped.sort((a, b) =>
          resolvePegawaiNama(a).localeCompare(resolvePegawaiNama(b), 'id')
        );
        setPegawaiList(sorted);
        return;
      }
    }
    setPegawaiList([]);
  }

  async function loadProfilKantorMultiUnit(
    superAdminFlag: boolean,
    scope: { kuaId: string | null; namaKua: string },
    kuaRowsFromMaster: any[]
  ) {
    // 1. Ambil data tersimpan dari tabel profil_kantor (jika ada)
    const { data: pkRows, error: pkErr } = await supabase
      .from('profil_kantor')
      .select('*')
      .limit(100);

    let savedUnits: ProfilKantorData[] = [];
    if (!pkErr && Array.isArray(pkRows) && pkRows.length > 0) {
      savedUnits = pkRows.map((row: any, idx: number) => {
        const isKua =
          row.jenis_unit === 'kua' ||
          Boolean(row.kua_id) ||
          normalizeText(row.nama_kantor).startsWith('kua');
        const derivedKey =
          row.unit_key ||
          (isKua
            ? `kua_${String(row.kua_id || row.nama_kantor || idx)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')}`
            : KANTOR_KEMENAG_KEY);

        return {
          id: row.id,
          unit_key: derivedKey,
          jenis_unit: isKua ? 'kua' : 'kantor_kemenag',
          kua_id: row.kua_id || null,
          nama_kantor:
            row.nama_kantor ||
            (isKua ? 'KUA Kecamatan' : DEFAULT_KEMENAG_PROFIL.nama_kantor),
          alamat: row.alamat || '',
          nomor_kontak: row.nomor_kontak || row.telepon || '',
          website: row.website || '',
          email: row.email || '',
          pimpinan: row.pimpinan || (isKua ? 'Kepala KUA' : 'Kepala Kantor'),
          nama_pimpinan: row.nama_pimpinan || '',
          nip_pimpinan: row.nip_pimpinan || '',
          kop_baris_1: row.kop_baris_1 || '',
          kop_baris_2: row.kop_baris_2 || '',
          kop_baris_3: row.kop_baris_3 || '',
          kop_baris_4: row.kop_baris_4 || '',
          updated_at: row.updated_at,
        };
      });
    }

    // 2. Juga cek app_settings untuk backward compatibility
    const { data: appSet } = await supabase
      .from('app_settings')
      .select('value_text')
      .eq('key_name', 'profil_kantor')
      .single();

    let legacyKemenagOverride: Partial<ProfilKantorData> = {};
    if (appSet?.value_text) {
      try {
        const parsed = JSON.parse(appSet.value_text);
        if (parsed && (!parsed.unit_key || parsed.unit_key === KANTOR_KEMENAG_KEY)) {
          legacyKemenagOverride = parsed;
        }
      } catch {
        // abaikan jika bukan JSON
      }
    }

    // 3. Susun daftar unit lengkap: Kantor Kemenag Kab. Pohuwato + seluruh KUA dari KuaProfile
    const unitMap = new Map<string, ProfilKantorData>();

    const kemenagSaved = savedUnits.find((u) => u.unit_key === KANTOR_KEMENAG_KEY);
    const kemenagFinal: ProfilKantorData = {
      ...DEFAULT_KEMENAG_PROFIL,
      ...legacyKemenagOverride,
      ...(kemenagSaved || {}),
      unit_key: KANTOR_KEMENAG_KEY,
      jenis_unit: 'kantor_kemenag',
    };
    unitMap.set(KANTOR_KEMENAG_KEY, kemenagFinal);

    for (const kuaRow of kuaRowsFromMaster || []) {
      const baseKuaUnit = buildDefaultKuaProfil(kuaRow);
      const matchedSaved = savedUnits.find(
        (u) =>
          u.unit_key === baseKuaUnit.unit_key ||
          (kuaRow.id && u.kua_id && String(u.kua_id) === String(kuaRow.id)) ||
          (normalizeText(u.nama_kantor) &&
            normalizeText(u.nama_kantor) === normalizeText(baseKuaUnit.nama_kantor))
      );

      unitMap.set(baseKuaUnit.unit_key, {
        ...baseKuaUnit,
        ...(matchedSaved || {}),
        unit_key: baseKuaUnit.unit_key,
        jenis_unit: 'kua',
        kua_id: kuaRow.id ? String(kuaRow.id) : matchedSaved?.kua_id || null,
      });
    }

    // Tambahkan unit KUA tambahan dari tabel profil_kantor bila belum ada di KuaProfile
    for (const su of savedUnits) {
      if (su.jenis_unit === 'kua' && !unitMap.has(su.unit_key)) {
        unitMap.set(su.unit_key, su);
      }
    }

    const allUnitsArray = Array.from(unitMap.values());

    if (superAdminFlag) {
      setProfilUnits(allUnitsArray);
      const currentActive =
        allUnitsArray.find((u) => u.unit_key === selectedUnitKey) || allUnitsArray[0];
      setSelectedUnitKey(currentActive.unit_key);
      setProfilKantor(currentActive);
      return;
    }

    // Mode Admin KUA: HANYA boleh melihat & mengedit profil KUA miliknya sendiri!
    const kuaOnlyUnits = allUnitsArray.filter((u) => u.jenis_unit === 'kua');
    const ownedKua =
      kuaOnlyUnits.find((u) => scope.kuaId && u.kua_id && String(u.kua_id) === String(scope.kuaId)) ||
      kuaOnlyUnits.find(
        (u) =>
          scope.namaKua &&
          (normalizeText(u.nama_kantor) === normalizeText(scope.namaKua) ||
            normalizeText(u.nama_kantor).includes(normalizeText(scope.namaKua)) ||
            normalizeText(scope.namaKua).includes(normalizeText(u.nama_kantor)))
      );

    if (ownedKua) {
      setProfilUnits([ownedKua]);
      setSelectedUnitKey(ownedKua.unit_key);
      setProfilKantor(ownedKua);
    } else {
      // Jika belum ter-mapping ke KUA tertentu, tampilkan form KUA milik user tanpa menampilkan KUA lain
      const fallbackOwnUnit: ProfilKantorData = {
        ...buildDefaultKuaProfil({
          id: scope.kuaId || 'own_kua',
          namaKua: scope.namaKua || 'KUA Unit Kerja Saya',
        }),
        kua_id: scope.kuaId,
      };
      setProfilUnits([fallbackOwnUnit]);
      setSelectedUnitKey(fallbackOwnUnit.unit_key);
      setProfilKantor(fallbackOwnUnit);
    }
  }

  async function loadMasterData(
    superAdminFlag: boolean = isSuperAdmin,
    scope: { kuaId: string | null; namaKua: string } = userKuaScope
  ) {
    setLoading(true);

    const [jabRes, katJabRes, kuaRes, kecRes, appSetRes] = await Promise.all([
      supabase.from('MasterJabatan').select('*').order('namaJabatan', { ascending: true }),
      supabase.from('MasterKategoriJabatan').select('*').order('namaKategori', { ascending: true }),
      supabase.from('KuaProfile').select('*').order('namaKua', { ascending: true }),
      supabase.from('MasterKecamatan').select('*').order('namaKecamatan', { ascending: true }),
      supabase.from('app_settings').select('*').eq('key_name', 'logo_bimas_url').single(),
    ]);

    const kuaRows = kuaRes.data || [];
    if (jabRes.data) setJabatanList(jabRes.data);
    if (katJabRes.data) setKategoriJabatanList(katJabRes.data);
    setKuaList(kuaRows);
    if (kecRes.data) setKecamatanList(kecRes.data);

    if (appSetRes.data) {
      setLogoUrl(appSetRes.data.value_text || '');
      setLogoPreviewUrl(appSetRes.data.value_text || '');
    }

    await Promise.all([
      loadPegawaiOptions(),
      loadProfilKantorMultiUnit(superAdminFlag, scope, kuaRows),
    ]);
    setLoading(false);
  }

  const handleSelectUnitProfil = (unitKey: string) => {
    if (!isSuperAdmin) {
      // Admin KUA tidak boleh berpindah ke unit atau KUA lain
      return;
    }
    const found = profilUnits.find((u) => u.unit_key === unitKey);
    if (found) {
      setSelectedUnitKey(found.unit_key);
      setProfilKantor(found);
    }
  };

  const handleSelectNamaPimpinan = (selectedNama: string) => {
    const matchedPegawai = pegawaiList.find(
      (p) => resolvePegawaiNama(p).toLowerCase() === selectedNama.toLowerCase()
    );
    setProfilKantor((prev) => ({
      ...prev,
      nama_pimpinan: selectedNama,
      nip_pimpinan: matchedPegawai?.nip ? matchedPegawai.nip : prev.nip_pimpinan,
    }));
  };

  const handleSaveProfilKantor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilKantor.nama_kantor.trim()) {
      triggerToast('error', 'Data Belum Lengkap', 'Nama Kantor / Satker / Unit wajib diisi.');
      return;
    }

    // Guard keamanan: non-super_admin hanya boleh menyimpan unit KUA miliknya sendiri
    if (!isSuperAdmin && profilKantor.jenis_unit !== 'kua') {
      triggerToast(
        'error',
        'Akses Dibatasi',
        'Admin KUA hanya diperkenankan mengelola profil KUA miliknya sendiri.'
      );
      return;
    }

    setSavingProfilKantor(true);
    const nowIso = new Date().toISOString();
    const payload: ProfilKantorData = {
      unit_key: profilKantor.unit_key || KANTOR_KEMENAG_KEY,
      jenis_unit: isSuperAdmin ? profilKantor.jenis_unit : 'kua',
      kua_id: profilKantor.kua_id ?? null,
      nama_kantor: profilKantor.nama_kantor.trim(),
      alamat: profilKantor.alamat.trim(),
      nomor_kontak: profilKantor.nomor_kontak.trim(),
      website: profilKantor.website.trim(),
      email: profilKantor.email.trim(),
      pimpinan: profilKantor.pimpinan.trim(),
      nama_pimpinan: profilKantor.nama_pimpinan.trim(),
      nip_pimpinan: profilKantor.nip_pimpinan.trim(),
      kop_baris_1: profilKantor.kop_baris_1.trim(),
      kop_baris_2: profilKantor.kop_baris_2.trim(),
      kop_baris_3: profilKantor.kop_baris_3.trim(),
      kop_baris_4: profilKantor.kop_baris_4.trim(),
      updated_at: nowIso,
    };

    try {
      let savedRecord: ProfilKantorData = { ...payload, id: profilKantor.id };
      let savedInTable = false;

      if (profilKantor.id) {
        const { data: updatedRow, error } = await supabase
          .from('profil_kantor')
          .update(payload)
          .eq('id', profilKantor.id)
          .select()
          .single();
        if (!error) {
          savedInTable = true;
          if (updatedRow) savedRecord = { ...payload, ...updatedRow };
        }
      } else {
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'pk_' + Date.now();
        const { data: insertedRow, error } = await supabase
          .from('profil_kantor')
          .insert([{ id: newId, ...payload, created_at: nowIso }])
          .select()
          .single();
        if (!error) {
          savedInTable = true;
          savedRecord = { ...payload, id: insertedRow?.id || newId };
        }
      }

      // Sinkronkan ke app_settings untuk Kantor Kemenag atau unit aktif
      const settingsKey =
        payload.unit_key === KANTOR_KEMENAG_KEY
          ? 'profil_kantor'
          : `profil_kantor_${payload.unit_key}`;
      const { error: settingsError } = await supabase.from('app_settings').upsert(
        {
          key_name: settingsKey,
          value_text: JSON.stringify(savedRecord),
        },
        { onConflict: 'key_name' }
      );

      if (!savedInTable && settingsError) {
        throw new Error(settingsError.message);
      }

      setProfilKantor(savedRecord);
      setProfilUnits((prev) => {
        const exists = prev.some((item) => item.unit_key === savedRecord.unit_key);
        if (exists) {
          return prev.map((item) =>
            item.unit_key === savedRecord.unit_key ? savedRecord : item
          );
        }
        return [...prev, savedRecord];
      });

      triggerToast(
        'success',
        'Profil Unit Tersimpan',
        `Profil "${savedRecord.nama_kantor}", pimpinan, dan 4 baris kop berhasil disimpan.`
      );
    } catch (err: any) {
      triggerToast('error', 'Gagal Menyimpan Profil Kantor', err?.message || 'Terjadi kesalahan.');
    } finally {
      setSavingProfilKantor(false);
    }
  };

  const openAddModal = (entity: 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan') => {
    setModalEntity(entity);
    setEditId(null);
    setInputField1('');
    setInputField2('');
    setInputKategoriJabatan(kategoriJabatanList.length > 0 ? kategoriJabatanList[0].namaKategori : '');
    setInputNamaKua('');
    setInputAlamatKua('');
    setInputTeleponKua('');
    setInputEmailKua('');
    setInputKecamatanIdKua(kecamatanList.length > 0 ? kecamatanList[0].id : '');
    setShowModal(true);
  };

  const openEditModal = (
    entity: 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan',
    item: any
  ) => {
    setModalEntity(entity);
    setEditId(item.id);
    if (entity === 'jabatan') {
      setInputField1(item.namaJabatan || '');
      setInputKategoriJabatan(item.kategori || '');
      setInputField2(item.deskripsi || '');
    } else if (entity === 'kategori_jabatan') {
      setInputField1(item.namaKategori || '');
      setInputField2(item.deskripsi || '');
    } else if (entity === 'kecamatan') {
      setInputField1(item.kodeKecamatan || '');
      setInputField2(item.namaKecamatan || '');
    } else if (entity === 'kua') {
      setInputNamaKua(item.namaKua || '');
      setInputAlamatKua(item.alamat || '');
      setInputTeleponKua(item.telepon || '');
      setInputEmailKua(item.email || '');
      setInputKecamatanIdKua(item.kecamatanId || '');
    }
    setShowModal(true);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    let tableName = '';
    let payload: any = {};

    if (modalEntity === 'jabatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterJabatan';
      payload = {
        namaJabatan: inputField1,
        kategori: inputKategoriJabatan,
        deskripsi: inputField2,
        updatedAt: new Date().toISOString(),
      };
      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'jab_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (modalEntity === 'kategori_jabatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterKategoriJabatan';
      payload = {
        namaKategori: inputField1,
        deskripsi: inputField2,
        updatedAt: new Date().toISOString(),
      };
      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kat_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (modalEntity === 'kecamatan') {
      if (!inputField1) {
        setProcessing(false);
        return;
      }
      tableName = 'MasterKecamatan';
      payload = {
        kodeKecamatan: inputField1,
        namaKecamatan: inputField2,
        updatedAt: new Date().toISOString(),
      };
      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kec_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    } else if (modalEntity === 'kua') {
      if (!inputNamaKua || !inputKecamatanIdKua) {
        triggerToast('error', 'Data Belum Lengkap', 'Nama Unit / KUA dan Kecamatan wajib diisi.');
        setProcessing(false);
        return;
      }
      tableName = 'KuaProfile';
      payload = {
        namaKua: inputNamaKua,
        alamat: inputAlamatKua || null,
        telepon: inputTeleponKua || null,
        email: inputEmailKua || null,
        kecamatanId: inputKecamatanIdKua,
        updatedAt: new Date().toISOString(),
      };
      if (!editId) {
        payload.id = crypto.randomUUID ? crypto.randomUUID() : 'kua_' + Date.now();
        payload.createdAt = new Date().toISOString();
      }
    }

    let error = null;
    let errorMessage = '';

    if (editId) {
      const res = await supabase.from(tableName).update(payload).eq('id', editId);
      error = res.error;
      if (error) errorMessage = error.message;
    } else {
      const res = await supabase.from(tableName).insert([payload]);
      error = res.error;
      if (error) {
        errorMessage = error.message;
        if (error.code === '23505' || error.message.includes('unique constraint')) {
          errorMessage = `Data duplikat terdeteksi (${error.details || error.message}).`;
        }
      }
    }

    setProcessing(false);

    if (!error) {
      triggerToast(
        'success',
        editId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
        'Data referensi berhasil disimpan.'
      );
      setShowModal(false);
      loadMasterData();
    } else {
      console.error('Save Master Error:', error);
      triggerToast('error', 'Gagal Menyimpan', errorMessage);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('error', 'Format Tidak Valid', 'Harap pilih file gambar logo (PNG, JPG, atau WebP).');
      e.target.value = '';
      return;
    }

    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      triggerToast('error', 'Ukuran File Terlalu Besar', 'Maksimal ukuran file logo adalah 1 MB.');
      e.target.value = '';
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogoFile) {
      triggerToast('error', 'Belum Ada File Dipilih', 'Silakan pilih file logo terlebih dahulu sebelum menyimpan.');
      return;
    }

    setProcessing(true);

    const fileExt = selectedLogoFile.name.split('.').pop() || 'png';
    const filePath = `instansi/logo_bimas.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media_sim')
      .upload(filePath, selectedLogoFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      triggerToast('error', 'Gagal Upload Logo', uploadError.message);
      setProcessing(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media_sim')
      .getPublicUrl(filePath);

    const finalLogoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key_name: 'logo_bimas_url', value_text: finalLogoUrl }, { onConflict: 'key_name' });

    setProcessing(false);

    if (error) {
      triggerToast('error', 'Gagal Menyimpan Logo', error.message);
    } else {
      setLogoUrl(finalLogoUrl);
      setSelectedLogoFile(null);
      triggerToast('success', 'Berhasil', 'Logo instansi berhasil diunggah dan diterapkan!');
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  const confirmDelete = (
    entity: 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan',
    id: string,
    namaItem: string
  ) => {
    setDeleteTarget({ id, nama: namaItem, entity });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);

    let tableName = '';
    if (deleteTarget.entity === 'jabatan') tableName = 'MasterJabatan';
    else if (deleteTarget.entity === 'kategori_jabatan') tableName = 'MasterKategoriJabatan';
    else if (deleteTarget.entity === 'kua') tableName = 'KuaProfile';
    else if (deleteTarget.entity === 'kecamatan') tableName = 'MasterKecamatan';

    const { error } = await supabase.from(tableName).delete().eq('id', deleteTarget.id);
    setProcessing(false);
    setShowDeleteModal(false);

    if (!error) {
      triggerToast('success', 'Berhasil Dihapus', 'Data referensi telah dihapus dari sistem.');
      loadMasterData();
    } else {
      triggerToast('error', 'Gagal Menghapus', error.message);
    }
  };

  // Saat klik sub-menu, langsung ganti tampilan aktif (berganti posisi/panel, bukan scroll ke bawah)
  const handleSelectSubMenu = (key: MasterSubSectionKey) => {
    if (!isSuperAdmin && key !== 'profil_kantor') {
      return;
    }
    setActiveSubNav(key);
  };

  const subMenuItems: {
    key: MasterSubSectionKey;
    step: string;
    label: string;
    desc: string;
    icon: string;
    countText?: string;
    superOnly?: boolean;
  }[] = useMemo(
    () => [
      {
        key: 'profil_kantor',
        step: '01',
        label: 'Profil Kantor',
        desc: isSuperAdmin
          ? 'Kantor Kemenag & seluruh KUA'
          : 'Profil KUA unit kerja Anda',
        icon: '🏛️',
        countText: isSuperAdmin ? `${profilUnits.length} Unit` : 'KUA Saya',
      },
      {
        key: 'jabatan',
        step: '02',
        label: 'Master Jabatan',
        desc: 'Daftar jabatan & kategori referensi',
        icon: '💼',
        countText: `${jabatanList.length} Data`,
        superOnly: true,
      },
      {
        key: 'kategori_jabatan',
        step: '03',
        label: 'Kategori Jabatan',
        desc: 'Pengelompokan jenis jabatan',
        icon: '🏷️',
        countText: `${kategoriJabatanList.length} Data`,
        superOnly: true,
      },
      {
        key: 'kua',
        step: '04',
        label: 'Master Unit KUA',
        desc: 'Profil KUA & unit kerja kecamatan',
        icon: '🕌',
        countText: `${kuaList.length} Data`,
        superOnly: true,
      },
      {
        key: 'kecamatan',
        step: '05',
        label: 'Master Kecamatan',
        desc: 'Kode & nama wilayah kecamatan',
        icon: '📍',
        countText: `${kecamatanList.length} Data`,
        superOnly: true,
      },
      {
        key: 'logo_instansi',
        step: '06',
        label: 'Logo Instansi',
        desc: 'Logo resmi sidebar & identitas visual',
        icon: '🖼️',
        countText: logoUrl ? 'Terpasang' : 'Default',
        superOnly: true,
      },
    ],
    [
      isSuperAdmin,
      profilUnits.length,
      jabatanList.length,
      kategoriJabatanList.length,
      kuaList.length,
      kecamatanList.length,
      logoUrl,
    ]
  );

  const visibleSubMenuItems = useMemo(
    () => subMenuItems.filter((item) => (isSuperAdmin ? true : !item.superOnly)),
    [subMenuItems, isSuperAdmin]
  );

  const getEntityTitle = (entity: 'jabatan' | 'kategori_jabatan' | 'kua' | 'kecamatan') => {
    if (entity === 'jabatan') return 'Jabatan';
    if (entity === 'kategori_jabatan') return 'Kategori Jabatan';
    if (entity === 'kua') return 'Unit Kerja / KUA';
    return 'Kecamatan';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative">
          {toast && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] max-w-md sm:w-full bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 flex items-start gap-3.5 animate-fade-in">
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
                <p className="text-xs text-gray-700 mt-0.5 font-medium break-words">
                  {toast.message}
                </p>
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
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-700 mb-1">
                  {isSuperAdmin
                    ? 'Administrasi Sistem • Referensi Utama'
                    : `Profil Unit Kerja • ${profilKantor.nama_kantor || 'KUA'}`}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isSuperAdmin ? 'Master Data Utama' : 'Profil Kantor KUA'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {isSuperAdmin
                    ? 'Pilih sub-menu di sisi kiri untuk mengganti tampilan modul Profil Kantor (Kemenag & 13 KUA), Jabatan, Kategori, Unit KUA, Kecamatan, dan Logo'
                    : 'Kelola identitas profil, pimpinan, dan kop surat KUA unit kerja Anda secara mandiri'}
                </p>
              </div>
            </div>

            {/* Layout 2 Kolom: Sub-menu Vertikal (Kiri) + Panel Bagian Aktif (Kanan) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* KOLOM KIRI: SUB-MENU NAVIGASI (GANTI TAMPILAN SAAT DIKLIK) */}
              <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">
                    Sub-Menu Bagian
                  </div>
                  <nav className="space-y-1">
                    {visibleSubMenuItems.map((item) => {
                      const isSelected = activeSubNav === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSelectSubMenu(item.key)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                              isSelected ? 'bg-white/20' : 'bg-gray-100'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{item.label}</span>
                              {item.countText && (
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-emerald-50 text-emerald-800'
                                  }`}
                                >
                                  {item.countText}
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-emerald-100' : 'text-gray-400'
                              }`}
                            >
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Ringkasan Singkat Unit / Pimpinan Aktif */}
                <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Unit &amp; Pimpinan Aktif
                  </div>
                  <div className="text-[11px] font-bold text-emerald-950">
                    {profilKantor.nama_kantor}
                  </div>
                  <div className="text-xs font-bold text-gray-900 pt-0.5">
                    {profilKantor.nama_pimpinan || '(Belum dipilih dari daftar pegawai)'}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-900">
                    NIP: {profilKantor.nip_pimpinan || '-'}
                  </div>
                </div>
              </aside>

              {/* KOLOM KANAN: TAMPILAN BAGIAN YANG SEDANG DIPILIH (BERGANTI TAMPILAN SAAT DIKLIK) */}
              <div className="lg:col-span-8 xl:col-span-9">
                {/* PANEL 1: MODUL PROFIL KANTOR (KANTOR KEMENAG & 13 KUA) */}
                {activeSubNav === 'profil_kantor' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Sub-Menu 01 • Profil Kantor, Satker &amp; KUA
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                          Modul Profil Kantor ({profilKantor.nama_kantor})
                        </h2>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {isSuperAdmin
                          ? 'Akses Super Admin: Kemenag & Seluruh KUA'
                          : 'Akses Terbatas: Hanya KUA Unit Anda'}
                      </span>
                    </div>

                    <form onSubmit={handleSaveProfilKantor} className="p-6 space-y-6">
                      {/* Pemilih Satker / Unit / KUA */}
                      <div className="p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="block text-xs font-bold text-gray-800 uppercase">
                            Pilih Kantor / Satker / Unit KUA
                          </label>
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg w-fit">
                            {profilKantor.jenis_unit === 'kantor_kemenag'
                              ? 'Induk: Kantor Kemenag Kab. Pohuwato'
                              : 'Unit KUA'}
                          </span>
                        </div>

                        {isSuperAdmin ? (
                          <div className="space-y-3">
                            <select
                              aria-label="Pilih Kantor / Satker / Unit KUA"
                              value={selectedUnitKey}
                              onChange={(e) => handleSelectUnitProfil(e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                              {profilUnits.map((unit) => (
                                <option key={unit.unit_key} value={unit.unit_key}>
                                  {unit.jenis_unit === 'kantor_kemenag'
                                    ? `[Kantor Induk] ${unit.nama_kantor}`
                                    : `[KUA] ${unit.nama_kantor}`}
                                </option>
                              ))}
                            </select>

                            {/* Chip pintasan cepat Kantor Kemenag + daftar KUA */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {profilUnits.map((unit) => {
                                const active = unit.unit_key === selectedUnitKey;
                                return (
                                  <button
                                    key={unit.unit_key}
                                    type="button"
                                    onClick={() => handleSelectUnitProfil(unit.unit_key)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                      active
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:text-emerald-800'
                                    }`}
                                  >
                                    {unit.nama_kantor}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              readOnly
                              value={profilKantor.nama_kantor}
                              className="w-full border border-gray-300 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900"
                            />
                            <p className="text-[11px] text-gray-500">
                              Profil KUA lain disembunyikan dan tidak dapat dilihat maupun diubah oleh admin KUA lain.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Identitas & Kontak Kantor (1 s.d. 3) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            1. Nama Kantor / Satker / Unit *
                          </label>
                          <input
                            type="text"
                            required
                            value={profilKantor.nama_kantor}
                            onChange={(e) =>
                              setProfilKantor({ ...profilKantor, nama_kantor: e.target.value })
                            }
                            placeholder="Contoh: Kantor Kementerian Agama Kabupaten Pohuwato / KUA Kecamatan..."
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            2. Alamat
                          </label>
                          <textarea
                            rows={2}
                            value={profilKantor.alamat}
                            onChange={(e) =>
                              setProfilKantor({ ...profilKantor, alamat: e.target.value })
                            }
                            placeholder="Masukkan alamat lengkap kantor / satker / unit..."
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            3a. Nomor Kontak
                          </label>
                          <input
                            type="text"
                            value={profilKantor.nomor_kontak}
                            onChange={(e) =>
                              setProfilKantor({ ...profilKantor, nomor_kontak: e.target.value })
                            }
                            placeholder="Contoh: (0443) 210xxx / 0812xxxxxxxx"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            3b. Website
                          </label>
                          <input
                            type="text"
                            value={profilKantor.website}
                            onChange={(e) =>
                              setProfilKantor({ ...profilKantor, website: e.target.value })
                            }
                            placeholder="Contoh: https://pohuwato.kemenag.go.id"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                            3c. Email
                          </label>
                          <input
                            type="email"
                            value={profilKantor.email}
                            onChange={(e) =>
                              setProfilKantor({ ...profilKantor, email: e.target.value })
                            }
                            placeholder="Contoh: kemenag.pohuwato@kemenag.go.id"
                            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Pimpinan (4), Nama Pimpinan (5), NIP Pimpinan Otomatis (6) */}
                      <div className="p-4 sm:p-5 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-4">
                        <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          Data Pimpinan Kantor / Unit
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                              4. Pimpinan
                            </label>
                            <input
                              type="text"
                              value={profilKantor.pimpinan}
                              onChange={(e) =>
                                setProfilKantor({ ...profilKantor, pimpinan: e.target.value })
                              }
                              placeholder="Contoh: Kepala Kantor / Kepala KUA"
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                              5. Nama Pimpinan (Daftar Pegawai)
                            </label>
                            <select
                              aria-label="Nama Pimpinan"
                              value={profilKantor.nama_pimpinan}
                              onChange={(e) => handleSelectNamaPimpinan(e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                              <option value="">-- Pilih Nama Pegawai --</option>
                              {pegawaiList.map((peg) => {
                                const labelNama = resolvePegawaiNama(peg);
                                return (
                                  <option key={peg.id} value={labelNama}>
                                    {labelNama} {peg.nip ? `(${peg.nip})` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                              6. NIP Pimpinan (Otomatis)
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={profilKantor.nip_pimpinan}
                              placeholder="Otomatis terisi saat memilih nama"
                              className="w-full border border-emerald-200 bg-emerald-50/90 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-emerald-950 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Kop Baris 1 s.d. 4 (7 s.d. 10) */}
                      <div className="p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3.5">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                          Susunan Kop Surat / Dokumen (Baris 1 – 4)
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              7. Kop Baris 1
                            </label>
                            <input
                              type="text"
                              value={profilKantor.kop_baris_1}
                              onChange={(e) =>
                                setProfilKantor({ ...profilKantor, kop_baris_1: e.target.value })
                              }
                              placeholder="Baris pertama kop..."
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              8. Kop Baris 2
                            </label>
                            <input
                              type="text"
                              value={profilKantor.kop_baris_2}
                              onChange={(e) =>
                                setProfilKantor({ ...profilKantor, kop_baris_2: e.target.value })
                              }
                              placeholder="Baris kedua kop..."
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              9. Kop Baris 3
                            </label>
                            <input
                              type="text"
                              value={profilKantor.kop_baris_3}
                              onChange={(e) =>
                                setProfilKantor({ ...profilKantor, kop_baris_3: e.target.value })
                              }
                              placeholder="Baris ketiga kop..."
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              10. Kop Baris 4
                            </label>
                            <input
                              type="text"
                              value={profilKantor.kop_baris_4}
                              onChange={(e) =>
                                setProfilKantor({ ...profilKantor, kop_baris_4: e.target.value })
                              }
                              placeholder="Baris keempat kop (alamat/kontak/website)..."
                              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Pratinjau Kop */}
                        <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3.5 text-center space-y-0.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                            Pratinjau Kop • {profilKantor.nama_kantor}
                          </div>
                          {profilKantor.kop_baris_1 && (
                            <div className="text-xs font-bold text-gray-900">
                              {profilKantor.kop_baris_1}
                            </div>
                          )}
                          {profilKantor.kop_baris_2 && (
                            <div className="text-xs font-bold text-gray-800">
                              {profilKantor.kop_baris_2}
                            </div>
                          )}
                          {profilKantor.kop_baris_3 && (
                            <div className="text-xs font-extrabold text-emerald-900">
                              {profilKantor.kop_baris_3}
                            </div>
                          )}
                          {profilKantor.kop_baris_4 && (
                            <div className="text-[11px] text-gray-600">
                              {profilKantor.kop_baris_4}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-3 border-t border-gray-100">
                        <button
                          type="submit"
                          disabled={savingProfilKantor}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                        >
                          {savingProfilKantor ? 'Menyimpan Profil Unit...' : '💾 Simpan Profil Kantor'}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                {/* PANEL 2: MASTER JABATAN */}
                {isSuperAdmin && activeSubNav === 'jabatan' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Sub-Menu 02 • Referensi Jabatan
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                          Master Jabatan ({jabatanList.length})
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddModal('jabatan')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs"
                      >
                        + Tambah Jabatan
                      </button>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">Memuat data jabatan...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-6 py-3 font-semibold">No</th>
                              <th className="px-6 py-3 font-semibold">Nama Jabatan</th>
                              <th className="px-6 py-3 font-semibold">Kategori</th>
                              <th className="px-6 py-3 font-semibold">Deskripsi</th>
                              <th className="px-6 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {jabatanList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-6 text-center text-xs text-gray-500">
                                  Belum ada data jabatan.
                                </td>
                              </tr>
                            ) : (
                              jabatanList.map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                                  <td className="px-6 py-3.5 text-gray-500">{idx + 1}</td>
                                  <td className="px-6 py-3.5 font-bold text-gray-900">
                                    {item.namaJabatan}
                                  </td>
                                  <td className="px-6 py-3.5">
                                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      {item.kategori || 'Umum'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 text-xs text-gray-600">
                                    {item.deskripsi || '-'}
                                  </td>
                                  <td className="px-6 py-3.5 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal('jabatan', item)}
                                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmDelete('jabatan', item.id, item.namaJabatan)
                                      }
                                      className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition"
                                    >
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* PANEL 3: KATEGORI JABATAN */}
                {isSuperAdmin && activeSubNav === 'kategori_jabatan' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Sub-Menu 03 • Klasifikasi Jabatan
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                          Kategori Jabatan ({kategoriJabatanList.length})
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddModal('kategori_jabatan')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs"
                      >
                        + Tambah Kategori Jabatan
                      </button>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Memuat data kategori jabatan...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-6 py-3 font-semibold">No</th>
                              <th className="px-6 py-3 font-semibold">Nama Kategori Jabatan</th>
                              <th className="px-6 py-3 font-semibold">Deskripsi / Keterangan</th>
                              <th className="px-6 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {kategoriJabatanList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-6 text-center text-xs text-gray-500">
                                  Belum ada data kategori jabatan.
                                </td>
                              </tr>
                            ) : (
                              kategoriJabatanList.map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                                  <td className="px-6 py-3.5 text-gray-500">{idx + 1}</td>
                                  <td className="px-6 py-3.5 font-bold text-gray-900">
                                    {item.namaKategori}
                                  </td>
                                  <td className="px-6 py-3.5 text-xs text-gray-600">
                                    {item.deskripsi || '-'}
                                  </td>
                                  <td className="px-6 py-3.5 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal('kategori_jabatan', item)}
                                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmDelete('kategori_jabatan', item.id, item.namaKategori)
                                      }
                                      className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition"
                                    >
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* PANEL 4: MASTER UNIT KUA */}
                {isSuperAdmin && activeSubNav === 'kua' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Sub-Menu 04 • Unit Kerja &amp; KUA
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                          Master Unit KUA ({kuaList.length})
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddModal('kua')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs"
                      >
                        + Tambah Unit KUA
                      </button>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">Memuat data unit KUA...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-6 py-3 font-semibold">No</th>
                              <th className="px-6 py-3 font-semibold">Nama Unit / KUA</th>
                              <th className="px-6 py-3 font-semibold">Alamat Kantor</th>
                              <th className="px-6 py-3 font-semibold">Telepon / Email</th>
                              <th className="px-6 py-3 font-semibold">Kecamatan</th>
                              <th className="px-6 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {kuaList.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 text-center text-xs text-gray-500">
                                  Belum ada data unit KUA.
                                </td>
                              </tr>
                            ) : (
                              kuaList.map((item, idx) => {
                                const matchedKec = kecamatanList.find(
                                  (k) => k.id === item.kecamatanId
                                );
                                return (
                                  <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-3.5 text-gray-500">{idx + 1}</td>
                                    <td className="px-6 py-3.5 font-bold text-gray-900">
                                      {item.namaKua}
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-gray-600">
                                      {item.alamat || '-'}
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-gray-600">
                                      <div>{item.telepon || '-'}</div>
                                      <div className="text-emerald-800">{item.email || ''}</div>
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-emerald-800 font-semibold">
                                      {matchedKec ? matchedKec.namaKecamatan : '-'}
                                    </td>
                                    <td className="px-6 py-3.5 text-right whitespace-nowrap space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => openEditModal('kua', item)}
                                        className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => confirmDelete('kua', item.id, item.namaKua)}
                                        className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition"
                                      >
                                        Hapus
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* PANEL 5: MASTER KECAMATAN */}
                {isSuperAdmin && activeSubNav === 'kecamatan' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          Sub-Menu 05 • Wilayah Administratif
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                          Master Kecamatan ({kecamatanList.length})
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddModal('kecamatan')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs"
                      >
                        + Tambah Kecamatan
                      </button>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Memuat data kecamatan...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                            <tr>
                              <th className="px-6 py-3 font-semibold">No</th>
                              <th className="px-6 py-3 font-semibold">Kode Kecamatan</th>
                              <th className="px-6 py-3 font-semibold">Nama Kecamatan</th>
                              <th className="px-6 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {kecamatanList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-6 text-center text-xs text-gray-500">
                                  Belum ada data kecamatan.
                                </td>
                              </tr>
                            ) : (
                              kecamatanList.map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-gray-50 transition">
                                  <td className="px-6 py-3.5 text-gray-500">{idx + 1}</td>
                                  <td className="px-6 py-3.5 font-mono text-xs text-emerald-800 font-bold">
                                    {item.kodeKecamatan}
                                  </td>
                                  <td className="px-6 py-3.5 font-bold text-gray-900">
                                    {item.namaKecamatan}
                                  </td>
                                  <td className="px-6 py-3.5 text-right whitespace-nowrap space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal('kecamatan', item)}
                                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmDelete('kecamatan', item.id, item.namaKecamatan)
                                      }
                                      className="text-red-600 hover:text-red-800 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition"
                                    >
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* PANEL 6: LOGO INSTANSI SIDEBAR */}
                {isSuperAdmin && activeSubNav === 'logo_instansi' && (
                  <section className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
                    <div className="border-b border-gray-100 pb-4 mb-5">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        Sub-Menu 06 • Identitas Visual
                      </span>
                      <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                        Konfigurasi Logo Resmi Instansi
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Unggah logo resmi instansi yang akan otomatis tampil di sudut kiri atas sidebar aplikasi.
                      </p>
                    </div>

                    <form onSubmit={handleSaveLogo} className="space-y-5">
                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                        <div className="w-20 h-20 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-3xl overflow-hidden shrink-0 border-2 border-emerald-500/40 shadow-md">
                          {logoPreviewUrl ? (
                            <img
                              src={logoPreviewUrl}
                              alt="Preview Logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>🕌</span>
                          )}
                        </div>
                        <div className="flex-1 text-center sm:text-left min-w-0">
                          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs">
                            <span>📤</span> Pilih File Logo Instansi
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={handleLogoFileChange}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[11px] text-gray-500 mt-2">
                            Disarankan format PNG transparan atau JPG/WebP rasio persegi (1:1).{' '}
                            <strong>Maksimal ukuran 1 MB</strong>.
                          </p>
                          {selectedLogoFile && (
                            <p className="text-[11px] font-semibold text-emerald-700 mt-1 break-all">
                              ✓ File terpilih: {selectedLogoFile.name} (
                              {Math.round(selectedLogoFile.size / 1024)} KB)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-3 border-t">
                        <button
                          type="submit"
                          disabled={processing || !selectedLogoFile}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-50"
                        >
                          {processing ? 'Mengunggah & Menyimpan...' : 'Simpan & Terapkan Logo'}
                        </button>
                      </div>
                    </form>
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* MODAL FORM TAMBAH / EDIT MASTER REFERENSI */}
          {isSuperAdmin && showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {editId ? 'Edit' : 'Tambah'} Master {getEntityTitle(modalEntity).toUpperCase()}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Kelola data referensi dalam database Supabase.
                </p>

                <form onSubmit={handleSaveMaster} className="space-y-4">
                  {modalEntity === 'kua' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Nama Unit Kerja / KUA
                        </label>
                        <input
                          type="text"
                          required
                          value={inputNamaKua}
                          onChange={(e) => setInputNamaKua(e.target.value)}
                          placeholder="Contoh: KUA Kecamatan Dengilo / Seksi Bimas Islam"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Alamat Kantor
                        </label>
                        <input
                          type="text"
                          value={inputAlamatKua}
                          onChange={(e) => setInputAlamatKua(e.target.value)}
                          placeholder="Contoh: Jl. Trans Sulawesi..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Telepon
                          </label>
                          <input
                            type="text"
                            value={inputTeleponKua}
                            onChange={(e) => setInputTeleponKua(e.target.value)}
                            placeholder="0812..."
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={inputEmailKua}
                            onChange={(e) => setInputEmailKua(e.target.value)}
                            placeholder="kua@..."
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Kecamatan (Referensi)
                        </label>
                        <select
                          value={inputKecamatanIdKua}
                          onChange={(e) => setInputKecamatanIdKua(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Kecamatan --</option>
                          {kecamatanList.map((kec) => (
                            <option key={kec.id} value={kec.id}>
                              {kec.namaKecamatan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : modalEntity === 'jabatan' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Nama Jabatan
                        </label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="Contoh: Pengelola Keuangan"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Kategori Jabatan (Referensi)
                        </label>
                        <select
                          value={inputKategoriJabatan}
                          onChange={(e) => setInputKategoriJabatan(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Kategori Jabatan --</option>
                          {kategoriJabatanList.map((kat) => (
                            <option key={kat.id} value={kat.namaKategori}>
                              {kat.namaKategori}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Deskripsi
                        </label>
                        <input
                          type="text"
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Keterangan tambahan..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  ) : modalEntity === 'kategori_jabatan' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Nama Kategori Jabatan
                        </label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="Contoh: Fungsional"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Deskripsi
                        </label>
                        <input
                          type="text"
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Keterangan jenis jabatan..."
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Kode Kecamatan (Contoh: 75.04.14)
                        </label>
                        <input
                          type="text"
                          required
                          value={inputField1}
                          onChange={(e) => setInputField1(e.target.value)}
                          placeholder="75.04.14"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Nama Kecamatan
                        </label>
                        <input
                          type="text"
                          required
                          value={inputField2}
                          onChange={(e) => setInputField2(e.target.value)}
                          placeholder="Contoh: Taluditi"
                          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  )}

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
                      disabled={processing}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL KONFIRMASI HAPUS ELEGAN */}
          {isSuperAdmin && showDeleteModal && deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  ⚠️
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Konfirmasi Hapus</h3>
                <p className="text-xs text-gray-600 mb-6">
                  Yakin ingin menghapus{' '}
                  <strong className="text-gray-900">"{deleteTarget.nama}"</strong> dari master data?
                  Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={executeDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-red-600/20"
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
