'use client';

import React from 'react';
import type { ModalEntity, PegawaiRefItem } from '../types';

interface AddEditModalProps {
  showModal: boolean;
  onClose: () => void;
  modalEntity: ModalEntity;
  editId: string | null;
  processing: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  // Form values
  inputField1: string;
  inputField2: string;
  inputKategoriJabatan: string;
  inputNamaKua: string;
  inputAlamatKua: string;
  inputTeleponKua: string;
  inputEmailKua: string;
  inputKecamatanIdKua: string;
  // Reference lists
  kategoriJabatanList: any[];
  kecamatanList: any[];
  pegawaiList: PegawaiRefItem[];
  // Setters
  setInputField1: React.Dispatch<React.SetStateAction<string>>;
  setInputField2: React.Dispatch<React.SetStateAction<string>>;
  setInputKategoriJabatan: React.Dispatch<React.SetStateAction<string>>;
  setInputNamaKua: React.Dispatch<React.SetStateAction<string>>;
  setInputAlamatKua: React.Dispatch<React.SetStateAction<string>>;
  setInputTeleponKua: React.Dispatch<React.SetStateAction<string>>;
  setInputEmailKua: React.Dispatch<React.SetStateAction<string>>;
  setInputKecamatanIdKua: React.Dispatch<React.SetStateAction<string>>;
}

function resolvePegawaiNama(p: PegawaiRefItem): string {
  if (p.nama_lengkap && p.nama_lengkap.trim()) return p.nama_lengkap.trim();
  if (p.nama && p.nama.trim()) return p.nama.trim();
  const depan = p.gelarDepan ? `${p.gelarDepan.trim()} ` : '';
  const tengah = (p.namaTanpaGelar || '').trim();
  const belakang = p.gelarBelakang ? `, ${p.gelarBelakang.trim()}` : '';
  return `${depan}${tengah}${belakang}`.trim() || 'Pegawai Tanpa Nama';
}

function getEntityTitle(entity: ModalEntity): string {
  if (entity === 'jabatan') return 'Jabatan';
  if (entity === 'kategori_jabatan') return 'Kategori Jabatan';
  if (entity === 'kua') return 'Unit Kerja / KUA';
  return 'Kecamatan';
}

export function AddEditModal({
  showModal,
  onClose,
  modalEntity,
  editId,
  processing,
  onSubmit,
  inputField1,
  inputField2,
  inputKategoriJabatan,
  inputNamaKua,
  inputAlamatKua,
  inputTeleponKua,
  inputEmailKua,
  inputKecamatanIdKua,
  kategoriJabatanList,
  kecamatanList,
  pegawaiList,
  setInputField1,
  setInputField2,
  setInputKategoriJabatan,
  setInputNamaKua,
  setInputAlamatKua,
  setInputTeleponKua,
  setInputEmailKua,
  setInputKecamatanIdKua,
}: AddEditModalProps) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {editId ? 'Edit' : 'Tambah'} Master {getEntityTitle(modalEntity).toUpperCase()}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Kelola data referensi dalam database Supabase.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={onClose}
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
  );
}