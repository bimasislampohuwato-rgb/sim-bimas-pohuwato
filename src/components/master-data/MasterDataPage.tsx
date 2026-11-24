'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';
import { useMasterData } from './hooks/useMasterData';
import {
  ProfilKantorPanel,
  JabatanPanel,
  KategoriJabatanPanel,
  KUAPanel,
  KecamatanPanel,
  LogoInstansiPanel,
} from './panels';
import { AddEditModal, DeleteConfirmModal } from './modals';
import type { ToastData, DeleteTarget, MasterSubSectionKey } from './types';

function MasterDataPageContent() {
  const router = useRouter();
  const [toast, setToast] = React.useState<ToastData | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);

  const triggerToast = React.useCallback((toastData: ToastData) => {
    setToast(toastData);
    setTimeout(() => setToast(null), 6000);
  }, []);

  const handleDelete = React.useCallback((target: DeleteTarget) => {
    setDeleteTarget(target);
  }, []);

  const executeDelete = React.useCallback(async () => {
    // This will be implemented by the parent hook
    // The actual execution is handled by the useMasterData hook's executeDelete
  }, []);

  const {
    userRole,
    isSuperAdmin,
    userKuaScope,
    jabatanList,
    kategoriJabatanList,
    kuaList,
    kecamatanList,
    pegawaiList,
    profilUnits,
    selectedUnitKey,
    profilKantor,
    savingProfilKantor,
    logoUrl,
    logoPreviewUrl,
    selectedLogoFile,
    loading,
    activeSubNav,
    processing,
    showModal,
    modalEntity,
    editId,
    inputField1,
    inputField2,
    inputKategoriJabatan,
    inputNamaKua,
    inputAlamatKua,
    inputTeleponKua,
    inputEmailKua,
    inputKecamatanIdKua,
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
    executeDelete: executeDeleteAction,
    handleSelectSubMenu,
    visibleSubMenuItems,
    // Setters
    setInputField1,
    setInputField2,
    setInputKategoriJabatan,
    setInputNamaKua,
    setInputAlamatKua,
    setInputTeleponKua,
    setInputEmailKua,
    setInputKecamatanIdKua,
    setShowModal,
    setSelectedLogoFile,
    setLogoPreviewUrl,
    setProfilKantor,
  } = useMasterData({
    router,
    onToast: triggerToast,
    onDelete: handleDelete,
  });

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

            {/* Layout 2 Kolom */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* KOLOM KIRI: SUB-MENU NAVIGASI */}
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
                    Unit & Pimpinan Aktif
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

              {/* KOLOM KANAN: PANEL AKTIF */}
              <div className="lg:col-span-8 xl:col-span-9">
                {activeSubNav === 'profil_kantor' && (
                  <ProfilKantorPanel
                    profilKantor={profilKantor}
                    setProfilKantor={setProfilKantor}
                    profilUnits={profilUnits}
                    selectedUnitKey={selectedUnitKey}
                    handleSelectUnitProfil={handleSelectUnitProfil}
                    pegawaiList={pegawaiList}
                    handleSelectNamaPimpinan={handleSelectNamaPimpinan}
                    savingProfilKantor={savingProfilKantor}
                    handleSaveProfilKantor={handleSaveProfilKantor}
                    isSuperAdmin={isSuperAdmin}
                    userKuaScope={userKuaScope}
                  />
                )}

                {isSuperAdmin && activeSubNav === 'jabatan' && (
                  <JabatanPanel
                    jabatanList={jabatanList}
                    loading={loading}
                    openAddModal={openAddModal}
                    openEditModal={openEditModal}
                    confirmDelete={confirmDelete}
                  />
                )}

                {isSuperAdmin && activeSubNav === 'kategori_jabatan' && (
                  <KategoriJabatanPanel
                    kategoriJabatanList={kategoriJabatanList}
                    loading={loading}
                    openAddModal={openAddModal}
                    openEditModal={openEditModal}
                    confirmDelete={confirmDelete}
                  />
                )}

                {isSuperAdmin && activeSubNav === 'kua' && (
                  <KUAPanel
                    kuaList={kuaList}
                    kecamatanList={kecamatanList}
                    loading={loading}
                    openAddModal={openAddModal}
                    openEditModal={openEditModal}
                    confirmDelete={confirmDelete}
                  />
                )}

                {isSuperAdmin && activeSubNav === 'kecamatan' && (
                  <KecamatanPanel
                    kecamatanList={kecamatanList}
                    loading={loading}
                    openAddModal={openAddModal}
                    openEditModal={openEditModal}
                    confirmDelete={confirmDelete}
                  />
                )}

                {isSuperAdmin && activeSubNav === 'logo_instansi' && (
                  <LogoInstansiPanel
                    logoUrl={logoUrl}
                    logoPreviewUrl={logoPreviewUrl}
                    selectedLogoFile={selectedLogoFile}
                    handleLogoFileChange={handleLogoFileChange}
                    handleSaveLogo={handleSaveLogo}
                    processing={processing}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ADD/EDIT MODAL */}
          <AddEditModal
            showModal={showModal}
            onClose={() => setShowModal(false)}
            modalEntity={modalEntity}
            editId={editId}
            processing={processing}
            onSubmit={handleSaveMaster}
            inputField1={inputField1}
            inputField2={inputField2}
            inputKategoriJabatan={inputKategoriJabatan}
            inputNamaKua={inputNamaKua}
            inputAlamatKua={inputAlamatKua}
            inputTeleponKua={inputTeleponKua}
            inputEmailKua={inputEmailKua}
            inputKecamatanIdKua={inputKecamatanIdKua}
            kategoriJabatanList={kategoriJabatanList}
            kecamatanList={kecamatanList}
            pegawaiList={pegawaiList}
            setInputField1={setInputField1}
            setInputField2={setInputField2}
            setInputKategoriJabatan={setInputKategoriJabatan}
            setInputNamaKua={setInputNamaKua}
            setInputAlamatKua={setInputAlamatKua}
            setInputTeleponKua={setInputTeleponKua}
            setInputEmailKua={setInputEmailKua}
            setInputKecamatanIdKua={setInputKecamatanIdKua}
          />

          {/* DELETE CONFIRM MODAL */}
          <DeleteConfirmModal
            showDeleteModal={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            deleteTarget={deleteTarget}
            processing={processing}
            onConfirm={executeDeleteAction}
          />
        </main>
      </div>
    </div>
  );
}

export default function MasterDataPage() {
  return <MasterDataPageContent />;
}