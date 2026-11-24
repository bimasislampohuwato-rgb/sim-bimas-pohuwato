'use client';

import { useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import type { KuaProfileData, KuaProfilPageData } from '@/app/kua/profil/_actions/kua-profil';

interface ProfilKuaClientProps {
  initialData: KuaProfilPageData | null;
  initialError: string | null;
}

export default function ProfilKuaClient({ initialData, initialError }: ProfilKuaClientProps) {
  const [profile, setProfile] = useState<KuaProfileData | null>(initialData?.kuaProfile || null);
  const [riwayatKepala, setRiwayatKepala] = useState<Array<{ id: number; nama: string; periode: string; nip: string }>>(
    initialData?.riwayatKepala || [
      { id: 1, nama: 'H. Rais Abaidata, S.Ag, M.H', periode: '2023 - Sekarang', nip: '197501012000031002' },
      { id: 2, nama: 'Drs. H. Mohamad Randa', periode: '2019 - 2023', nip: '197005121998031001' },
      { id: 3, nama: 'Arfan Adam, S.Hi', periode: '2015 - 2019', nip: '198003152005011004' },
    ]
  );

  const [kuaData, setKuaData] = useState({
    nama_kua: profile?.namaKua || '',
    kepala_kua: '',
    nip_kepala: profile?.kepalaKuaNip || '',
    alamat: profile?.alamat || '',
    kontak: profile?.telepon || '',
    email: profile?.email || '',
    website: profile?.website || '',
    foto_kantor: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const triggerToast = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) {
      triggerToast('error', 'Gagal', 'Profil KUA belum dimuat dari database.');
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(`/api/kua/profil/update/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaKua: kuaData.nama_kua,
          alamat: kuaData.alamat,
          telepon: kuaData.kontak || null,
          email: kuaData.email || null,
          website: kuaData.website || null,
          kepalaKua: kuaData.kepala_kua,
          kepalaKuaNip: kuaData.nip_kepala || null,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setIsEditing(false);
        triggerToast('success', 'Profil Diperbarui', 'Profil KUA berhasil diperbarui.');
        setProfile((prev: KuaProfileData | null) => prev ? { ...prev, ...kuaData } : null);
      } else {
        triggerToast('error', 'Gagal', result.error || 'Terjadi kesalahan.');
      }
    } catch (err) {
      triggerToast('error', 'Gagal', 'Terjadi kesalahan jaringan atau server.');
    } finally {
      setProcessing(false);
    }
  };

  if (initialError && !initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <h2 className="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h2>
              <p className="text-red-700">{initialError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
        {toast && (
          <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>✓</div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
              <p className="text-xs text-gray-600 mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 font-bold p-1">✕</button>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profil Kantor Urusan Agama (KUA)</h1>
              <p className="text-sm text-gray-600 mt-1">Kelola informasi kelembagaan, kontak, pimpinan, dan riwayat kepala KUA wilayah tugas</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20"
            >
              {isEditing ? 'Batal Edit' : '✏️ Edit Profil KUA'}
            </button>
          </div>

          {/* KARTU INFORMASI UTAMA PROFIL KUA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-[#062e21] to-emerald-800 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="bg-emerald-600 text-emerald-100 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-500/40">Unit Kerja Resmi Kemenag</span>
                <h2 className="text-2xl font-black mt-2">{kuaData.nama_kua || 'Memuat...'}</h2>
                <p className="text-xs text-emerald-200 mt-1">Kabupaten Pohuwato, Provinsi Gorontalo</p>
              </div>
              <div className="text-right bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-700/50">
                <span className="text-[10px] text-emerald-300 block uppercase font-bold">Kepala KUA Saat Ini</span>
                <span className="text-sm font-extrabold text-white">{kuaData.kepala_kua || 'Belum diisi'}</span>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama KUA</label>
                    <input type="text" value={kuaData.nama_kua} onChange={(e) => setKuaData({...kuaData, nama_kua: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Kepala KUA</label>
                    <input type="text" value={kuaData.kepala_kua} onChange={(e) => setKuaData({...kuaData, kepala_kua: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">NIP Kepala KUA</label>
                    <input type="text" value={kuaData.nip_kepala} onChange={(e) => setKuaData({...kuaData, nip_kepala: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nomor Kontak / HP</label>
                    <input type="text" value={kuaData.kontak} onChange={(e) => setKuaData({...kuaData, kontak: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Resmi</label>
                    <input type="email" value={kuaData.email} onChange={(e) => setKuaData({...kuaData, email: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Website</label>
                    <input type="text" value={kuaData.website} onChange={(e) => setKuaData({...kuaData, website: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Alamat Kantor</label>
                  <textarea value={kuaData.alamat} onChange={(e) => setKuaData({...kuaData, alamat: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700">Batal</button>
                  <button type="submit" disabled={processing} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">{processing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
              </form>
            ) : (
              <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Alamat Kantor</span>
                  <p className="text-gray-800 font-medium mt-1">{kuaData.alamat}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Kontak Telepon</span>
                  <p className="text-gray-800 font-medium mt-1">{kuaData.kontak}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Email Resmi</span>
                  <p className="text-gray-800 font-medium mt-1">{kuaData.email}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Website</span>
                  <p className="text-emerald-700 font-medium mt-1 underline">{kuaData.website}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">NIP Kepala KUA</span>
                  <p className="text-gray-800 font-mono font-medium mt-1">{kuaData.nip_kepala}</p>
                </div>
              </div>
            )}
          </div>

          {/* TABEL RIWAYAT KEPALA KUA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-600">
              <span>🏛️ Riwayat Kepemimpinan (Daftar Kepala KUA Terdahulu)</span>
              <span>Total Periode Tercatat: <strong className="text-emerald-700">{riwayatKepala.length} Orang</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">No</th>
                    <th className="px-6 py-3.5 font-semibold">Nama Kepala KUA & Gelar</th>
                    <th className="px-6 py-3.5 font-semibold">NIP</th>
                    <th className="px-6 py-3.5 font-semibold">Masa Periode Tugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {riwayatKepala.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{item.nama}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">{item.nip}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.periode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}