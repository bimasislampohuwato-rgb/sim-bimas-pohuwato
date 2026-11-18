import Sidebar from '@/src/components/Sidebar';

export default function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Kiri */}
      <Sidebar />

      {/* Konten Utama Kanan */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}