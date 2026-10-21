'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // Jangan tampilkan header di halaman login
  if (pathname === '/login') return null;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          
          {/* Logo SaaS & Nama Dompetku */}
          <div className="flex items-center space-x-2.5">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-2xs border border-blue-100 bg-white shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/dompetku-logo.jpg"
                alt="Logo Dompetku"
                width={40}
                height={40}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                className="object-contain"
              />
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-slate-900 text-lg sm:text-xl leading-none tracking-tight">
                <span className="text-[#0d2a63]">Dompet</span>
                <span className="text-[#e89005]">ku</span>
              </span>
              <span className="text-[10px] sm:text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Kelola Keuangan
              </span>
            </div>
          </div>

          {/* User Badge: Pemilik */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
              <span>Pemilik</span>
            </span>
          </div>

        </div>
      </div>
    </header>
  );
}
