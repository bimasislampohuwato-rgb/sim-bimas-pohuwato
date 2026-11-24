'use client';

import React from 'react';

interface KategoriJabatanPanelProps {
  kategoriJabatanList: any[];
  loading: boolean;
  openAddModal: (entity: 'kategori_jabatan') => void;
  openEditModal: (entity: 'kategori_jabatan', item: any) => void;
  confirmDelete: (entity: 'kategori_jabatan', id: string, nama: string) => void;
}

export function KategoriJabatanPanel({
  kategoriJabatanList,
  loading,
  openAddModal,
  openEditModal,
  confirmDelete,
}: KategoriJabatanPanelProps) {
  return (
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
  );
}