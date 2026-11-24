'use client';

import type { RiwayatPendidikanItem } from './types';

interface RiwayatPendidikanSectionProps {
  items: RiwayatPendidikanItem[];
  masterPendidikan: string[];
  onChange: (index: number, field: keyof RiwayatPendidikanItem, value: string) => void;
  onTambah: () => void;
  onHapus: (index: number) => void;
}

export default function RiwayatPendidikanSection({
  items,
  masterPendidikan,
  onChange,
  onTambah,
  onHapus,
}: RiwayatPendidikanSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 3 dari 5</span>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Pendidikan Formal (SD s.d. S3)</h3>
        </div>
        <button
          type="button"
          onClick={onTambah}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
        >
          + Tambah Riwayat Pendidikan
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
              Pendidikan #{index + 1}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jenjang Pendidikan</label>
              <select
                value={item.jenjang}
                onChange={(e) => onChange(index, 'jenjang', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Jenjang --</option>
                {masterPendidikan.map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Sekolah / Universitas</label>
              <input
                type="text"
                value={item.namaSekolah}
                onChange={(e) => onChange(index, 'namaSekolah', e.target.value)}
                placeholder="Contoh: MIN Marisa / IAIN Gorontalo"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tahun Lulus</label>
              <input
                type="text"
                value={item.tahunLulus}
                onChange={(e) => onChange(index, 'tahunLulus', e.target.value)}
                placeholder="Contoh: 2018"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}