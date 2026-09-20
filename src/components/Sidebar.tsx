'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, BarChart3, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Halaman Utama',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Penerimaan',
      href: '/penerimaan',
      icon: ArrowDownLeft,
    },
    {
      label: 'Pengeluaran',
      href: '/pengeluaran',
      icon: ArrowUpRight,
    },
    {
      label: 'Laporan Keuangan',
      href: '/laporan',
      icon: BarChart3,
    },
    {
      label: 'Setting',
      href: '/setting',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 md:min-h-[calc(100vh-4rem)] p-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3 hidden md:block">
        Navigasi Menu
      </div>
      <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition shrink-0 ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs border border-sky-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
