'use client';

import React from 'react';
import { UserRole, UserProfile, TenantProfile } from '@/lib/types';
import { ShieldCheck } from 'lucide-react';

interface NavbarProps {
  userProfile?: UserProfile | null;
  tenantProfile?: TenantProfile | null;
  currentRole?: UserRole;
}

export default function Navbar({ userProfile, tenantProfile, currentRole }: NavbarProps) {
  const activeRole: UserRole = userProfile?.role || currentRole || 'investor';
  const outletName = tenantProfile?.name || 'Trio R Healthy Laundry';
  const userName = userProfile?.full_name || (activeRole === 'investor' ? 'Mami Lina' : 'Pengelola');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & SaaS Name */}
          <div className="flex items-center space-x-3">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-xs border border-blue-100 bg-white shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/dompetku-logo.jpg"
                alt="Logo Dompetku"
                width={44}
                height={44}
                style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-slate-900 text-lg sm:text-xl leading-tight tracking-tight">
                  <span className="text-[#0d2a63]">Dompet</span><span className="text-[#e89005]">ku</span>
                </h1>
                <span className="text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  Kelola Keuangan
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-none mt-1 hidden sm:block">
                Saas khusus tuk keuangan pemilik usaha
              </p>
            </div>
          </div>

          {/* Role Indicator & User Name */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 bg-slate-100/90 px-3.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-sm text-slate-600 font-medium hidden sm:inline">User:</span>
              <span className="text-sm font-extrabold text-slate-800 max-w-[140px] sm:max-w-none truncate">{userName}</span>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <ShieldCheck className="w-4 h-4 mr-1 text-amber-600" />
                Pemilik
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
