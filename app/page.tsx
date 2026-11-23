import Link from 'next/link';
import { Users, FileText, BookOpen, Settings } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SIM Bimas Islam</h1>
            <p className="text-sm text-gray-500 mt-1">Kantor Kementerian Agama Kabupaten Pohuwato</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/pegawai"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <Users className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Kepegawaian</p>
              <p className="text-xs text-gray-500">Data pegawai & KUA</p>
            </div>
          </Link>
          <Link
            href="/ptsp"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <FileText className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Layanan PTSP</p>
              <p className="text-xs text-gray-500">Permohonan & pelacakan</p>
            </div>
          </Link>
          <Link
            href="/admin/kebimasislaman"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Kebimasislaman</p>
              <p className="text-xs text-gray-500">Data masjid & lembaga</p>
            </div>
          </Link>
          <Link
            href="/admin/master"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-300 hover:shadow-md transition"
          >
            <Settings className="w-6 h-6 text-emerald-600" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Master Data</p>
              <p className="text-xs text-gray-500">Jabatan, kecamatan, KUA</p>
            </div>
          </Link>
        </div>

        <p className="text-xs text-gray-400">© 2026 Kemenag Kab. Pohuwato</p>
      </div>
    </div>
  );
}
