'use client';

import React from 'react';

interface LogoInstansiPanelProps {
  logoUrl: string;
  logoPreviewUrl: string;
  selectedLogoFile: File | null;
  handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveLogo: (e: React.FormEvent) => Promise<void>;
  processing: boolean;
}

export function LogoInstansiPanel({
  logoUrl,
  logoPreviewUrl,
  selectedLogoFile,
  handleLogoFileChange,
  handleSaveLogo,
  processing,
}: LogoInstansiPanelProps) {
  return (
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
  );
}