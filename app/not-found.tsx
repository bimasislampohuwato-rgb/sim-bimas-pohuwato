export default function NotFound() {
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-emerald-600">404</h1>
        <p className="text-lg text-gray-700">Halaman tidak ditemukan</p>
        <p className="text-sm text-gray-500">Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
        <a
          href="/"
          className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          Kembali ke Beranda
        </a>
      </div>
    </div>
  );
}

