import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'SIM Bimas Islam — Kemenag Kab. Pohuwato',
    template: '%s | SIM Bimas Islam',
  },
  description: 'Sistem Informasi Manajemen Bimas Islam — Kantor Kementerian Agama Kabupaten Pohuwato',
  keywords: ['SIM Bimas Islam', 'Kemenag Pohuwato', 'Kepegawaian', 'PTSP', 'Kebimasislaman'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
