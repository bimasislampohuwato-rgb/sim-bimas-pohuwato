'use client';

import React from 'react';

interface KUAPanelProps {
  kuaList: any[];
  kecamatanList: any[];
  loading: boolean;
  openAddModal: (entity: 'kua') => void;
  openEditModal: (entity: 'kua', item: any) => void;
  confirmDelete: (entity: 'kua', id: string, nama: string) => void;
}

export function KUAPanel({
  kuaList,
  kecamatanList,
  loading,
  openAddModal,
  openEditModal,
  confirmDelete,
}: KUAPanelProps) {
  return (
    <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Sub-Menu 04 • Unit Kerja & KUA
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
        <div className="p-8 text-center text-gray-500 text-sm">
          Memuat data unit KUA...
        </div>
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
  );
}