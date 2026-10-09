'use client';

import React from 'react';
import { UserRole, UserProfile, TenantProfile } from '@/lib/types';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface NavbarProps {
  userProfile?: UserProfile | null;
  tenantProfile?: TenantProfile | null;
  currentRole?: UserRole;
}

export default function Navbar({ userProfile, tenantProfile, currentRole }: NavbarProps) {
  const activeRole: UserRole = userProfile?.role || currentRole || 'pengelola';
  const outletName = tenantProfile?.name || 'Trio R Healthy Laundry';
  const userName = userProfile?.full_name || (activeRole === 'investor' ? 'Investor' : 'Pengelola');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Outlet Name */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-amber-200 bg-amber-50 shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Trio R Healthy Laundry Logo"
                width={40}
                height={40}
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                className="p-0.5"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-tight">{outletName}</h1>
              <p className="text-xs text-slate-600 font-semibold">SaaS Keuangan Investor & Pengelola</p>
            </div>
          </div>

          {/* Role Indicator & User Name */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 bg-slate-100/90 px-3.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-sm text-slate-600 font-medium hidden sm:inline">User:</span>
              <span className="text-sm font-extrabold text-slate-800 max-w-[140px] sm:max-w-none truncate">{userName}</span>
              <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold ${
                activeRole === 'investor' 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {activeRole === 'investor' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1 text-amber-600" />
                    Investor
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-1 text-emerald-600" />
                    Pengelola
                  </>
                )}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
