'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '@/components/Sidebar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ImportPegawaiPage() {
  const router = useRouter();
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 6000);
  };

  const handleDownloadTemplate = () => {
    const headers = ['nip', 'nik', 'nama_lengkap', 'jabatan', 'unit_kerja', 'no_hp', 'email'];
    const sampleRow = ['199108212023211018', '7504032108910001', 'Asram Husuna, S.Th.I., M.H', 'Penyuluh Agama Islam', 'KUA Kecamatan Buntulia', '08114326021', 'asram@simbimas.local'];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), sampleRow.join(';')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'template_import_pegawai_kemenag.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setLoading(false);
        return;
      }

      const lines = text.split(/\r\n|\n/);
      if (lines.length < 2) {
        triggerToast('error', 'File Kosong', 'Format file tidak valid atau kosong.');
        setLoading(false);
        return;
      }

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));

      const results = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const currentLine = lines[i].split(delimiter).map(val => val.trim().replace(/['"]+/g, ''));
        
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = currentLine[index] || '';
        });

        results.push({
          nip: obj.nip || obj.nip_pegawai || '',
          nik: obj.nik || '',
          nama_lengkap: obj.nama_lengkap || obj.nama_tanpa_gelar || obj.nama || 'Tanpa Nama',
          jabatan: obj.jabatan || 'Pegawai',
          unit_kerja: obj.unit_kerja || obj.unitkerja || obj.satker || 'Kantor Kemenag Pohuwato',
          no_hp: obj.no_hp || obj.nomorhp || obj.hp || '-',
          email: obj.email || ''
        });
      }

      setParsedData(results);
      setLoading(false);
      triggerToast('success', 'File Berhasil Dibaca', `Ditemukan ${results.length} data pegawai siap diimport.`);
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) return;
    setProcessing(true);

    let successCount = 0;
    let failCount = 0;

    for (const item of parsedData) {
      if (!item.nip) {
        failCount++;
        continue;
      }

      // Payload bersih hanya menggunakan kolom standar yang ada di tabel 'pegawai'
      const payload = {
        nip: item.nip,
        nik: item.nik || null,
        nama_tanpa_gelar: item.nama_lengkap,
        nama_lengkap: item.nama_lengkap,
        jabatan: item.jabatan,
        unit_kerja: item.unit_kerja,
        no_hp: item.no_hp,
        email: item.email || null
      };

      const { error } = await supabase.from('pegawai').insert([payload]);

      if (!error) {
        successCount++;
        const fakeEmailLogin = `${item.nip.toLowerCase()}@kemenagpohuwato.go.id`;
        await supabase.from('profiles').upsert([{
          id: crypto.randomUUID ? crypto.randomUUID() : 'prof_' + Date.now() + Math.random(),
          nip: item.nip,
          email: item.email || fakeEmailLogin,
          nama_lengkap: item.nama_lengkap,
          role: 'pegawai',
          created_at: new Date().toISOString()
        }], { onConflict: 'nip' });
      } else {
        console.error('Insert Error:', error.message);
        failCount++;
      }
    }

    setProcessing(false);
    triggerToast('success', 'Import Selesai', `Berhasil mengimport ${successCount} data pegawai.${failCount > 0 ? ` Gagal/Duplikat: ${failCount}` : ''}`);
    
    setTimeout(() => {
      router.push('/pegawai');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
        
        {toast && (
          <div className="fixed top-6 right-6 z-[9999] max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 flex items-start gap-3.5 animate-bounce">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600 font-bold'}`}>
              {toast.type === 'success' ? '✓' : '⚠️'}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900">{toast.title}</h4>
              <p className="text-xs text-gray-700 mt-0.5 font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Data Pegawai & Download Template</h1>
              <p className="text-sm text-gray-600 mt-1">Unduh template CSV, isi datanya, lalu unggah kembali ke sistem.</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-2"
            >
              <span>📥 Download Template CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl border border-emerald-100">📂</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Unggah File CSV Data Pegawai</h3>
              <p className="text-xs text-gray-500 mb-6">Pilih file CSV yang sudah disesuaikan dengan template.</p>
              
              <input
                type="file"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-gray-300 rounded-xl p-2 bg-gray-50"
              />
              {fileName && <p className="text-xs text-emerald-700 font-semibold mt-2">File dipilih: {fileName}</p>}
            </div>
          </div>

          {parsedData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-600">
                <span>Pratinjau Data ({parsedData.length} Pegawai)</span>
                <button
                  onClick={handleExecuteImport}
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {processing ? 'Menyimpan Data...' : '🚀 Eksekusi Import Sekarang'}
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-left sticky top-0">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama & NIP</th>
                      <th className="px-4 py-3">Jabatan & Unit</th>
                      <th className="px-4 py-3">Kontak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{row.nama_lengkap}<br/><span className="font-mono text-emerald-800">{row.nip}</span></td>
                        <td className="px-4 py-3">{row.jabatan}<br/><span className="text-gray-500">{row.unit_kerja}</span></td>
                        <td className="px-4 py-3">{row.no_hp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
