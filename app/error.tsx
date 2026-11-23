'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <p className="text-lg font-semibold text-red-600">Terjadi kesalahan</p>
        <p className="text-sm text-gray-500 max-w-md">{error.message || 'Gagal memuat halaman.'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}