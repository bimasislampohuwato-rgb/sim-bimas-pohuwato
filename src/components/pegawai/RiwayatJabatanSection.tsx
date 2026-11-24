'use client';

import type { RiwayatJabatanItem } from './types';

interface RiwayatJabatanSectionProps {
  items: RiwayatJabatanItem[];
  masterGolongan: string[];
  masterJabatanList: string[];
  masterKuaList: string[];
  onChange: (index: number, field: keyof RiwayatJabatanItem, value: string) => void;
  onFileChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onTambah: () => void;
  onHapus: (index: number) => void;
}

export default function RiwayatJabatanSection({
  items,
  masterGolongan,
  masterJabatanList,
  masterKuaList,
  onChange,
  onFileChange,
  onTambah,
  onHapus,
}: RiwayatJabatanSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-3">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Langkah 2 dari 5</span>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">Riwayat Jabatan &amp; Golongan</h3>
        </div>
        <button
          type="button"
          onClick={onTambah}
          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
        >
          + Tambah Riwayat Jabatan
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
              Riwayat Jabatan #{index + 1}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pangkat &amp; Golongan Ruang</label>
              <select
                value={item.pangkatGolongan}
                onChange={(e) => onChange(index, 'pangkatGolongan', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Golongan --</option>
                {masterGolongan.map((gol, i) => (
                  <option key={i} value={gol}>{gol}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jabatan</label>
              <select
                value={item.jabatan}
                onChange={(e) => onChange(index, 'jabatan', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Jabatan --</option>
                {masterJabatanList.map((jab, i) => (
                  <option key={i} value={jab}>{jab}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Unit Kerja / Penempatan</label>
              <select
                value={item.unitKerja}
                onChange={(e) => onChange(index, 'unitKerja', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Unit Kerja / KUA --</option>
                {masterKuaList.map((kua, i) => (
                  <option key={i} value={kua}>{kua}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nomor SK</label>
              <input
                type="text"
                value={item.nomorSk}
                onChange={(e) => onChange(index, 'nomorSk', e.target.value)}
                placeholder="Contoh: SK/123/Kemenag/2025"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal SK</label>
              <input
                type="date"
                value={item.tanggalSk}
                onChange={(e) => onChange(index, 'tanggalSk', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">TMT Jabatan</label>
              <input
                type="date"
                value={item.tmt}
                onChange={(e) => onChange(index, 'tmt', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Angka Kredit</label>
              <input
                type="number"
                step="0.01"
                value={item.angkaKredit}
                onChange={(e) => onChange(index, 'angkaKredit', e.target.value)}
                placeholder="Contoh: 150.00"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Upload File SK (PDF / Gambar)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => onFileChange(index, e)}
                className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {item.fileSk && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">📎 File dipilih: {(item.fileSk as File).name}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}