import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'SaaS Keuangan Laundry Sederhana',
  description: 'Pencatatan Keuangan Laundry untuk Investor & Pengelola',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased pb-16 md:pb-0">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
