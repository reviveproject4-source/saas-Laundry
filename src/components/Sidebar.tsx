'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Wallet, Settings } from 'lucide-react';

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
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-3">
        Navigasi Menu
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
