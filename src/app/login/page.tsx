'use client';

import React, { useState } from 'react';
import { signInWithEmailPassword } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { Lock, KeyRound, ShieldCheck, UserCheck, ArrowRight, Loader2, Mail } from 'lucide-react';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('pengelola');
  const [email, setEmail] = useState<string>('pengelola@triorlaundry.com');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'investor') {
      setEmail('investor@triorlaundry.com');
    } else {
      setEmail('pengelola@triorlaundry.com');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Silakan isi email dan kata sandi Anda.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await signInWithEmailPassword(email, password);
      
      if (res.success) {
        window.location.href = '/';
      } else {
        setErrorMessage(res.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal terhubung ke server autentikasi.');
      setSubmitting(false);
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
          <p className="text-xs text-slate-500 font-medium">Autentikasi Supabase Auth (Investor & Pengelola)</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl text-center">
            {errorMessage}
          </div>
        )}

        {/* Form Login Supabase */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Peran Pengguna</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => handleRoleChange('pengelola')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
                  selectedRole === 'pengelola'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Pengelola</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('investor')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
                  selectedRole === 'investor'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Investor</span>
              </button>
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alamat Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="Masukkan Email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kata Sandi (Password)</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Masukkan Kata Sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wider"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-98 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Masuk Akun Supabase</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center space-x-2 text-[11px] text-slate-500">
          <Lock className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Sesi terautentikasi secara aman melalui Supabase Auth & RLS Policy.</span>
        </div>

      </div>
    </div>
  );
}
