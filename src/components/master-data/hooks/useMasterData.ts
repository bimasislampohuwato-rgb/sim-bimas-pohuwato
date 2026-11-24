'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type {
  PegawaiRefItem,
  ProfilKantorData,
  MasterSubSectionKey,
  ModalEntity,
  SubMenuItem,
  DeleteTarget,
  ToastData,
  KuaFormData,
  JabatanFormData,
  KategoriJabatanFormData,
  KecamatanFormData,
  UserScope,
} from '../types';

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

interface UseMasterDataOptions {
  router: ReturnType<typeof useRouter>;
  onToast: (toast: ToastData) => void;
  onDelete: (target: DeleteTarget) => void;
}

interface UseMasterDataReturn {
  // Auth & Role
  userRole: string;
  isSuperAdmin: boolean;
  userKuaScope: UserScope;
  setUserKuaScope: React.Dispatch<React.SetStateAction<UserScope>>;

  // Master Reference Lists
  jabatanList: any[];
  setJabatanList: React.Dispatch<React.SetStateAction<any[]>>;
  kategoriJabatanList: any[];
  setKategoriJabatanList: React.Dispatch<React.SetStateAction<any[]>>;
  kuaList: any[];
  setKuaList: React.Dispatch<React.SetStateAction<any[]>>;
  kecamatanList: any[];
  setKecamatanList: React.Dispatch<React.SetStateAction<any[]>>;
  pegawaiList: PegawaiRefItem[];
  setPegawaiList: React.Dispatch<React.SetStateAction<PegawaiRefItem[]>>;

  // Profil Kantor Multi-Unit
  profilUnits: ProfilKantorData[];
  setProfilUnits: React.Dispatch<React.SetStateAction<ProfilKantorData[]>>;
  selectedUnitKey: string;
  setSelectedUnitKey: React.Dispatch<React.SetStateAction<string>>;
  profilKantor: ProfilKantorData;
  setProfilKantor: React.Dispatch<React.SetStateAction<ProfilKantorData>>;
  savingProfilKantor: boolean;
  setSavingProfilKantor: React.Dispatch<React.SetStateAction<boolean>>;

  // Logo
  logoUrl: string;
  setLogoUrl: React.Dispatch<React.SetStateAction<string>>;
  selectedLogoFile: File | null;
  setSelectedLogoFile: React.Dispatch<React.SetStateAction<File | null>>;
  logoPreviewUrl: string;
  setLogoPreviewUrl: React.Dispatch<React.SetStateAction<string>>;

  // UI State
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  activeSubNav: MasterSubSectionKey;
  setActiveSubNav: React.Dispatch<React.SetStateAction<MasterSubSectionKey>>;
  processing: boolean;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;

  // Modal State
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  modalEntity: ModalEntity;
  setModalEntity: React.Dispatch<React.SetStateAction<ModalEntity>>;
  editId: string | null;
  setEditId: React.Dispatch<React.SetStateAction<string | null>>;

  // Form Fields
  inputField1: string;
  setInputField1: React.Dispatch<React.SetStateAction<string>>;
  inputField2: string;
  setInputField2: React.Dispatch<React.SetStateAction<string>>;
  inputKategoriJabatan: string;
  setInputKategoriJabatan: React.Dispatch<React.SetStateAction<string>>;
  inputNamaKua: string;
  setInputNamaKua: React.Dispatch<React.SetStateAction<string>>;
  inputAlamatKua: string;
  setInputAlamatKua: React.Dispatch<React.SetStateAction<string>>;
  inputTeleponKua: string;
  setInputTeleponKua: React.Dispatch<React.SetStateAction<string>>;
  inputEmailKua: string;
  setInputEmailKua: React.Dispatch<React.SetStateAction<string>>;
  inputKecamatanIdKua: string;
  setInputKecamatanIdKua: React.Dispatch<React.SetStateAction<string>>;

  // Actions
  loadMasterData: (superAdminFlag?: boolean, scope?: UserScope) => Promise<void>;
  handleSelectUnitProfil: (unitKey: string) => void;
  handleSelectNamaPimpinan: (selectedNama: string) => void;
  handleSaveProfilKantor: (e: React.FormEvent) => Promise<void>;
  openAddModal: (entity: ModalEntity) => void;
  openEditModal: (entity: ModalEntity, item: any) => void;
  handleSaveMaster: (e: React.FormEvent) => Promise<void>;
  handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveLogo: (e: React.FormEvent) => Promise<void>;
  confirmDelete: (entity: ModalEntity, id: string, namaItem: string) => void;
  executeDelete: () => Promise<void>;
  handleSelectSubMenu: (key: MasterSubSectionKey) => void;
  visibleSubMenuItems: SubMenuItem[];
}

export function useMasterData({
  router,
  onToast,
  onDelete,
}: UseMasterDataOptions): UseMasterDataReturn {
  // Auth & Role
  const [userRole, setUserRole] = useState<string>('admin');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [userKuaScope, setUserKuaScope] = useState<UserScope>({
    kuaId: null,
    namaKua: '',
  });

  // Master Reference Lists
  const [jabatanList, setJabatanList] = useState<any[]>([]);
  const [kategoriJabatanList, setKategoriJabatanList] = useState<any[]>([]);
  const [kuaList, setKuaList] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<PegawaiRefItem[]>([]);

  // Profil Kantor Multi-Unit
  const [profilUnits, setProfilUnits] = useState<ProfilKantorData[]>([DEFAULT_KEMENAG_PROFIL]);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string>(KANTOR_KEMENAG_KEY);
  const [profilKantor, setProfilKantor] = useState<ProfilKantorData>(DEFAULT_KEMENAG_PROFIL);
  const [savingProfilKantor, setSavingProfilKantor] = useState(false);

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [activeSubNav, setActiveSubNav] = useState<MasterSubSectionKey>('profil_kantor');
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalEntity, setModalEntity] = useState<ModalEntity>('jabatan');
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [inputField1, setInputField1] = useState('');
  const [inputField2, setInputField2] = useState('');
  const [inputKategoriJabatan, setInputKategoriJabatan] = useState('');
  const [inputNamaKua, setInputNamaKua] = useState('');
  const [inputAlamatKua, setInputAlamatKua] = useState('');
  const [inputTeleponKua, setInputTeleponKua] = useState('');
  const [inputEmailKua, setInputEmailKua] = useState('');
  const [inputKecamatanIdKua, setInputKecamatanIdKua] = useState('');

  // Auth & Initial Load
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

  // Load Pegawai Options
  const loadPegawaiOptions = useCallback(async () => {
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
  }, []);

  // Load Profil Kantor Multi-Unit
  const loadProfilKantorMultiUnit = useCallback(
    async (
      superAdminFlag: boolean,
      scope: UserScope,
      kuaRowsFromMaster: any[]
    ) => {
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
    },
    [selectedUnitKey]
  );

  // Main Load Function
  const loadMasterData = useCallback(
    async (
      superAdminFlag: boolean = isSuperAdmin,
      scope: UserScope = userKuaScope
    ) => {
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
    },
    [isSuperAdmin, userKuaScope, loadPegawaiOptions, loadProfilKantorMultiUnit]
  );

  // Unit Selection
  const handleSelectUnitProfil = useCallback((unitKey: string) => {
    if (!isSuperAdmin) return;
    const found = profilUnits.find((u) => u.unit_key === unitKey);
    if (found) {
      setSelectedUnitKey(found.unit_key);
      setProfilKantor(found);
    }
  }, [isSuperAdmin, profilUnits]);

  // Pegawai Nama Selection
  const handleSelectNamaPimpinan = useCallback((selectedNama: string) => {
    const matchedPegawai = pegawaiList.find(
      (p) => resolvePegawaiNama(p).toLowerCase() === selectedNama.toLowerCase()
    );
    setProfilKantor((prev) => ({
      ...prev,
      nama_pimpinan: selectedNama,
      nip_pimpinan: matchedPegawai?.nip ? matchedPegawai.nip : prev.nip_pimpinan,
    }));
  }, [pegawaiList]);

  // Save Profil Kantor
  const handleSaveProfilKantor = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profilKantor.nama_kantor.trim()) {
        onToast({ type: 'error', title: 'Data Belum Lengkap', message: 'Nama Kantor / Satker / Unit wajib diisi.' });
        return;
      }

      if (!isSuperAdmin && profilKantor.jenis_unit !== 'kua') {
        onToast({
          type: 'error',
          title: 'Akses Dibatasi',
          message: 'Admin KUA hanya diperkenankan mengelola profil KUA miliknya sendiri.',
        });
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

        onToast({
          type: 'success',
          title: 'Profil Unit Tersimpan',
          message: `Profil "${savedRecord.nama_kantor}", pimpinan, dan 4 baris kop berhasil disimpan.`,
        });
      } catch (err: any) {
        onToast({
          type: 'error',
          title: 'Gagal Menyimpan Profil Kantor',
          message: err?.message || 'Terjadi kesalahan.',
        });
      } finally {
        setSavingProfilKantor(false);
      }
    },
    [profilKantor, isSuperAdmin, onToast]
  );

  // Modal Management
  const openAddModal = useCallback((entity: ModalEntity) => {
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
  }, [kategoriJabatanList, kecamatanList]);

  const openEditModal = useCallback(
    (entity: ModalEntity, item: any) => {
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
    },
    []
  );

  // Save Master Reference
  const handleSaveMaster = useCallback(
    async (e: React.FormEvent) => {
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
          onToast({
            type: 'error',
            title: 'Data Belum Lengkap',
            message: 'Nama Unit / KUA dan Kecamatan wajib diisi.',
          });
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
        onToast({
          type: 'success',
          title: editId ? 'Berhasil Diperbarui' : 'Berhasil Ditambahkan',
          message: 'Data referensi berhasil disimpan.',
        });
        setShowModal(false);
        loadMasterData();
      } else {
        console.error('Save Master Error:', error);
        onToast({
          type: 'error',
          title: 'Gagal Menyimpan',
          message: errorMessage,
        });
      }
    },
    [modalEntity, editId, inputField1, inputField2, inputKategoriJabatan, inputNamaKua, inputAlamatKua, inputTeleponKua, inputEmailKua, inputKecamatanIdKua, onToast, loadMasterData]
  );

  // Logo Handlers
  const handleLogoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast({
        type: 'error',
        title: 'Format Tidak Valid',
        message: 'Harap pilih file gambar logo (PNG, JPG, atau WebP).',
      });
      e.target.value = '';
      return;
    }

    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      onToast({
        type: 'error',
        title: 'Ukuran File Terlalu Besar',
        message: 'Maksimal ukuran file logo adalah 1 MB.',
      });
      e.target.value = '';
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }, [onToast]);

  const handleSaveLogo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLogoFile) {
        onToast({
          type: 'error',
          title: 'Belum Ada File Dipilih',
          message: 'Silakan pilih file logo terlebih dahulu sebelum menyimpan.',
        });
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
        onToast({
          type: 'error',
          title: 'Gagal Upload Logo',
          message: uploadError.message,
        });
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
        onToast({
          type: 'error',
          title: 'Gagal Menyimpan Logo',
          message: error.message,
        });
      } else {
        setLogoUrl(finalLogoUrl);
        setSelectedLogoFile(null);
        onToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Logo instansi berhasil diunggah dan diterapkan!',
        });
        setTimeout(() => window.location.reload(), 1200);
      }
    },
    [selectedLogoFile, onToast]
  );

  // Delete Handlers
  const confirmDelete = useCallback(
    (entity: ModalEntity, id: string, namaItem: string) => {
      onDelete({ id, nama: namaItem, entity });
    },
    [onDelete]
  );

  const executeDelete = useCallback(async () => {
    // This will be called from the delete modal callback
    // The actual execution is handled by the parent
  }, []);

  // Sub-menu selection
  const handleSelectSubMenu = useCallback((key: MasterSubSectionKey) => {
    if (!isSuperAdmin && key !== 'profil_kantor') return;
    setActiveSubNav(key);
  }, [isSuperAdmin]);

  // Visible Sub-menu Items
  const subMenuItems = useMemo<SubMenuItem[]>(
    () => [
      {
        key: 'profil_kantor',
        step: '01',
        label: 'Profil Kantor',
        desc: isSuperAdmin ? 'Kantor Kemenag & seluruh KUA' : 'Profil KUA unit kerja Anda',
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

  return {
    // Auth & Role
    userRole,
    isSuperAdmin,
    userKuaScope,
    setUserKuaScope,

    // Master Reference Lists
    jabatanList,
    setJabatanList,
    kategoriJabatanList,
    setKategoriJabatanList,
    kuaList,
    setKuaList,
    kecamatanList,
    setKecamatanList,
    pegawaiList,
    setPegawaiList,

    // Profil Kantor
    profilUnits,
    setProfilUnits,
    selectedUnitKey,
    setSelectedUnitKey,
    profilKantor,
    setProfilKantor,
    savingProfilKantor,
    setSavingProfilKantor,

    // Logo
    logoUrl,
    setLogoUrl,
    selectedLogoFile,
    setSelectedLogoFile,
    logoPreviewUrl,
    setLogoPreviewUrl,

    // UI State
    loading,
    setLoading,
    activeSubNav,
    setActiveSubNav,
    processing,
    setProcessing,

    // Modal State
    showModal,
    setShowModal,
    modalEntity,
    setModalEntity,
    editId,
    setEditId,

    // Form Fields
    inputField1,
    setInputField1,
    inputField2,
    setInputField2,
    inputKategoriJabatan,
    setInputKategoriJabatan,
    inputNamaKua,
    setInputNamaKua,
    inputAlamatKua,
    setInputAlamatKua,
    inputTeleponKua,
    setInputTeleponKua,
    inputEmailKua,
    setInputEmailKua,
    inputKecamatanIdKua,
    setInputKecamatanIdKua,

    // Actions
    loadMasterData,
    handleSelectUnitProfil,
    handleSelectNamaPimpinan,
    handleSaveProfilKantor,
    openAddModal,
    openEditModal,
    handleSaveMaster,
    handleLogoFileChange,
    handleSaveLogo,
    confirmDelete,
    executeDelete,
    handleSelectSubMenu,
    visibleSubMenuItems,
  };
}