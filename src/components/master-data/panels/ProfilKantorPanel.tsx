'use client';

import React from 'react';
import type { ProfilKantorData, UserScope } from '../types';

interface ProfilKantorPanelProps {
  profilKantor: ProfilKantorData;
  setProfilKantor: React.Dispatch<React.SetStateAction<ProfilKantorData>>;
  profilUnits: ProfilKantorData[];
  selectedUnitKey: string;
  handleSelectUnitProfil: (unitKey: string) => void;
  pegawaiList: any[];
  handleSelectNamaPimpinan: (nama: string) => void;
  savingProfilKantor: boolean;
  handleSaveProfilKantor: (e: React.FormEvent) => Promise<void>;
  isSuperAdmin: boolean;
  userKuaScope: UserScope;
}

export function ProfilKantorPanel({
  profilKantor,
  setProfilKantor,
  profilUnits,
  selectedUnitKey,
  handleSelectUnitProfil,
  pegawaiList,
  handleSelectNamaPimpinan,
  savingProfilKantor,
  handleSaveProfilKantor,
  isSuperAdmin,
  userKuaScope,
}: ProfilKantorPanelProps) {
  return (
    <section className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Sub-Menu 01 • Profil Kantor, Satker & KUA
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

        {/* Identitas & Kontak */}
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

        {/* Pimpinan */}
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
                  const labelNama =
                    peg.nama_lengkap?.trim() ||
                    peg.nama?.trim() ||
                    `${peg.gelarDepan || ''} ${peg.namaTanpaGelar || ''} ${peg.gelarBelakang || ''}`.trim();
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

        {/* Kop Surat */}
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
              <div className="text-xs font-bold text-gray-900">{profilKantor.kop_baris_1}</div>
            )}
            {profilKantor.kop_baris_2 && (
              <div className="text-xs font-bold text-gray-800">{profilKantor.kop_baris_2}</div>
            )}
            {profilKantor.kop_baris_3 && (
              <div className="text-xs font-extrabold text-emerald-900">{profilKantor.kop_baris_3}</div>
            )}
            {profilKantor.kop_baris_4 && (
              <div className="text-[11px] text-gray-600">{profilKantor.kop_baris_4}</div>
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
  );
}