'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, BarChart3, Settings } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const menuItems = [
    { label: 'Utama', href: '/', icon: LayoutDashboard },
    { label: 'Penerimaan', href: '/penerimaan', icon: ArrowDownLeft },
    { label: 'Pengeluaran', href: '/pengeluaran', icon: ArrowUpRight },
    { label: 'Laporan', href: '/laporan', icon: BarChart3 },
    { label: 'Setting', href: '/setting', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg px-2 py-1.5 backdrop-blur-md bg-white/95">
      <div className="flex justify-around items-center">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full py-1.5 transition active:scale-90 ${
                isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-sky-50' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
