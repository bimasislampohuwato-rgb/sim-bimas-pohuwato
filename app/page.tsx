'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = useState('');
  const [layananList, setLayananList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initLandingData() {
      // 1. Ambil Logo Resmi Instansi
      const { data: logoData } = await supabase
        .from('app_settings')
        .select('value_text')
        .eq('key_name', 'logo_bimas_url')
        .single();
      if (logoData && logoData.value_text) {
        setLogoUrl(logoData.value_text);
      }

      // 2. Ambil Daftar Layanan PTSP untuk ditampilkan ke publik
      const { data: layananData } = await supabase
        .from('ptsp_master_layanan')
        .select('*')
        .order('created_at', { ascending: true });
      if (layananData) {
        setLayananList(layananData);
      }

      setLoading(false);
    }

    initLandingData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062e21] via-[#093d2c] to-[#042217] text-emerald-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* NAVBAR / HEADER PUBLIK */}
      <header className="w-full border-b border-emerald-900/50 bg-[#042217]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700/80 text-white font-bold flex items-center justify-center text-xl shadow-inner border border-emerald-500/30 overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Bimas" className="w-full h-full object-cover" />
              ) : (
                <span>🕌</span>
              )}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                SIM Bimas Islam
              </h1>
              <p className="text-[11px] text-emerald-300 font-medium">
                Kemenag Kabupaten Pohuwato
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ptsp/lacak"
              className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/50 rounded-xl text-xs font-bold transition shadow-sm hidden sm:inline-flex items-center gap-1.5"
            >
              <span>🔍</span> Lacak Tiket
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <span>🔐</span> Login Pegawai / Admin
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION UTAMA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-600/40 text-xs font-bold text-emerald-300 shadow-sm">
          <span>✨</span> Pelayanan Publik Terpadu & Transparan
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Layanan Keagamaan & PTSP Online <br className="hidden sm:inline" />
          <span className="text-emerald-400">Kantor Kementerian Agama Kab. Pohuwato</span>
        </h2>

        <p className="text-sm sm:text-base text-emerald-200/80 max-w-2xl mx-auto leading-relaxed">
          Ajukan permohonan layanan keagamaan secara digital, pantau status berkas secara real-time, dan dapatkan notifikasi resmi langsung melalui WhatsApp.
        </p>

        {/* TOMBOL AKSI UTAMA (CTA) */}
        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/ptsp/tambah"
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>📝</span> Ajukan Permohonan PTSP Sekarang
          </Link>
          <Link
            href="/ptsp/lacak"
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-emerald-500/40 font-bold text-sm rounded-2xl backdrop-blur-md transition flex items-center justify-center gap-2"
          >
            <span>🔍</span> Lacak Status Berkas Anda
          </Link>
        </div>
      </section>

      {/* DAFTAR STANDAR PELAYANAN & PERSYARATAN */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        <div className="text-center mb-10">
          <h3 className="text-xl sm:text-2xl font-bold text-white">Jenis Layanan & Persyaratan PTSP</h3>
          <p className="text-xs sm:text-sm text-emerald-300/80 mt-1">Standar operasional dan ketentuan berkas yang diperlukan masyarakat</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-emerald-300 text-sm">Memuat daftar layanan...</div>
        ) : layananList.length === 0 ? (
          <div className="text-center py-12 text-emerald-300 text-sm">Belum ada daftar layanan publik yang dikonfigurasi.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layananList.map((item, idx) => (
              <div key={item.id || idx} className="bg-[#042217]/80 border border-emerald-800/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between backdrop-blur-md transition hover:border-emerald-500/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-xl bg-emerald-800/80 text-emerald-300 flex items-center justify-center font-bold text-sm border border-emerald-700/50">
                      {idx + 1}
                    </span>
                    {item.waktu_pengerjaan && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        ⏱️ {item.waktu_pengerjaan}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white tracking-wide">{item.nama_layanan}</h4>
                  
                  <div className="text-xs text-emerald-200/70 leading-relaxed max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="font-semibold text-emerald-300 mb-1">Persyaratan:</p>
                    <p className="whitespace-pre-line">{item.deskripsi_persyaratan || 'Sesuai ketentuan berlaku.'}</p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-emerald-900/60 flex items-center justify-between">
                  {item.link_berkas_syarat ? (
                    <a
                      href={item.link_berkas_syarat}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-300 hover:text-white underline inline-flex items-center gap-1"
                    >
                      <span>📥</span> Unduh Format Berkas
                    </a>
                  ) : (
                    <span className="text-[11px] text-emerald-500 italic">Tanpa berkas unduhan</span>
                  )}

                  <Link
                    href="/ptsp/tambah"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Ajukan →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER PUBLIK */}
      <footer className="w-full border-t border-emerald-900/60 bg-[#042217] py-8 text-center text-xs text-emerald-400/70 space-y-2 mt-12">
        <p className="font-medium text-emerald-200">
          Seksi Bimbingan Masyarakat Islam • Kantor Kementerian Agama Kabupaten Pohuwato
        </p>
        <p>© 2026 Kementerian Agama Republik Indonesia. Hak Cipta Dilindungi.</p>
      </footer>

    </div>
  );
}