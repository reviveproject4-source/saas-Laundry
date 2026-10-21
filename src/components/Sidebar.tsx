'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Wallet, Settings, ShieldCheck } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Halaman Utama',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Pemasukkan (Usaha)',
      href: '/penerimaan',
      icon: ArrowDownLeft,
    },
    {
      label: 'Pengeluaran (Usaha)',
      href: '/pengeluaran',
      icon: ArrowUpRight,
    },
    {
      label: 'Laporan Keuangan Pribadi',
      href: '/laporan',
      icon: Wallet,
    },
    {
      label: 'Setting',
      href: '/setting',
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200 min-h-screen p-4 shrink-0">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 pb-5 mb-5 border-b border-slate-100">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-2xs border border-blue-100 bg-white shrink-0 flex items-center justify-center p-0.5">
          <img
            src="/dompetku-logo.jpg"
            alt="Logo Dompetku"
            width={40}
            height={40}
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            className="object-contain"
          />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="font-black text-slate-900 text-lg leading-tight tracking-tight">
              <span className="text-[#0d2a63]">Dompet</span>
              <span className="text-[#e89005]">ku</span>
            </h1>
            <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-full">
              Kelola
            </span>
          </div>
          <div className="flex items-center space-x-1 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-slate-700">Pemilik</span>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition shrink-0 ${
                isActive
                  ? 'bg-sky-50 text-sky-700 shadow-2xs border border-sky-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-4 mt-auto border-t border-slate-100 text-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Dompetku Keuangan
        </span>
      </div>
    </aside>
  );
}
