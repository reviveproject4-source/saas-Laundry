'use client';

import React from 'react';
import Image from 'next/image';
import { UserRole } from '@/lib/types';
import { ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onSwitchRole: (newRole: UserRole) => void;
  outletName?: string;
}

export default function Navbar({ currentRole, onSwitchRole, outletName = 'Trio R Healthy Laundry' }: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Outlet Name */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-amber-200 bg-amber-50 shrink-0">
              <img
                src="/logo.png"
                alt="Trio R Healthy Laundry Logo"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">Trio R Healthy Laundry</h1>
              <p className="text-[11px] text-slate-500 font-medium">SaaS Keuangan Investor & Pengelola</p>
            </div>
          </div>

          {/* Role Indicator & Role Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Aktif Sebagai:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                currentRole === 'investor' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {currentRole === 'investor' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Investor
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Pengelola
                  </>
                )}
              </span>
            </div>

            {/* Switch Role Button */}
            <button
              onClick={() => onSwitchRole(currentRole === 'investor' ? 'pengelola' : 'investor')}
              className="flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs active:scale-95"
              title="Ganti peran untuk menguji penguncian input"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti ke {currentRole === 'investor' ? 'Pengelola' : 'Investor'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
