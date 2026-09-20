'use client';

import React, { useState } from 'react';
import { validateLogin, AUTHORIZED_ACCOUNTS } from '@/lib/auth';
import { Lock, KeyRound, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [selectedEmail, setSelectedEmail] = useState<string>('investor1@gmail.com');
  const [pin, setPin] = useState<string>('1234');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = validateLogin(selectedEmail, pin);
    if (res.success) {
      window.location.href = '/';
    } else {
      setErrorMessage(res.message || 'Login gagal');
    }
  };

  const handleQuickSelect = (email: string) => {
    setSelectedEmail(email);
    setPin('1234');
    const res = validateLogin(email, '1234');
    if (res.success) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
        
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center items-center w-20 h-20 bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-1 mb-1">
            <img
              src="/logo.png"
              alt="Trio R Healthy Laundry Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Trio R Healthy Laundry</h1>
          <p className="text-xs text-slate-500 font-medium">SaaS Keuangan Internal Investor & Pengelola</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl text-center">
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Email Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Akun Email Anda</label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {AUTHORIZED_ACCOUNTS.map((acc) => (
                <option key={acc.email} value={acc.email}>
                  {acc.email} ({acc.role === 'investor' ? 'Investor' : 'Pengelola'})
                </option>
              ))}
            </select>
          </div>

          {/* Password / PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password / PIN (Default: 1234)</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Masukkan PIN 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-widest"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-98"
          >
            <span>Masuk ke Aplikasi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Quick Login per Account */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <span className="block text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
            Atau Klik 1-Kali Masuk Langsung Sebagai:
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickSelect('investor1@gmail.com')}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] rounded-xl border border-amber-200 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Investor 1</span>
            </button>

            <button
              onClick={() => handleQuickSelect('investor2@gmail.com')}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] rounded-xl border border-amber-200 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Investor 2</span>
            </button>

            <button
              onClick={() => handleQuickSelect('pengelola1@gmail.com')}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-[11px] rounded-xl border border-emerald-200 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Pengelola 1</span>
            </button>

            <button
              onClick={() => handleQuickSelect('pengelola2@gmail.com')}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-[11px] rounded-xl border border-emerald-200 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Pengelola 2</span>
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center space-x-2 text-[11px] text-slate-500">
          <Lock className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Keamanan terkunci khusus 4 akun terdaftar di atas.</span>
        </div>

      </div>
    </div>
  );
}
