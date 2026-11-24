'use client';

import type { DataKeluargaItem } from './types';

interface DataKeluargaSectionProps {
  items: DataKeluargaItem[];
  onChange: (index: number, field: keyof DataKeluargaItem, value: string) => void;
  onTambah: () => void;
  onHapus: (index: number) => void;
}

export default function DataKeluargaSection({ items, onChange, onTambah, onHapus }: DataKeluargaSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 4 dari 5</span>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">Data Keluarga (Pasangan, Anak, Orang Tua)</h3>
        </div>
        <button
          type="button"
          onClick={onTambah}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
        >
          + Tambah Anggota Keluarga
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
              Anggota Keluarga #{index + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onHapus(index)}
                className="text-red-600 hover:text-red-800 text-xs font-semibold"
              >
                Hapus Baris
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hubungan Keluarga</label>
              <select
                value={item.hubungan}
                onChange={(e) => onChange(index, 'hubungan', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Suami/Istri">Suami / Istri</option>
                <option value="Anak Kandung">Anak Kandung</option>
                <option value="Ayah Kandung">Ayah Kandung</option>
                <option value="Ibu Kandung">Ibu Kandung</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={item.nama}
                onChange={(e) => onChange(index, 'nama', e.target.value)}
                placeholder="Nama lengkap anggota keluarga"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tempat, Tanggal Lahir</label>
              <input
                type="text"
                value={item.tempatTanggalLahir}
                onChange={(e) => onChange(index, 'tempatTanggalLahir', e.target.value)}
                placeholder="Contoh: Marisa, 12-05-1985"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pekerjaan</label>
              <input
                type="text"
                value={item.pekerjaan}
                onChange={(e) => onChange(index, 'pekerjaan', e.target.value)}
                placeholder="Contoh: PNS / Ibu Rumah Tangga / Pelajar"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}