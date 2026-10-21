'use client';

import React, { useState } from 'react';
import { signInWithEmailPassword } from '@/lib/auth';
import { Lock, KeyRound, ArrowRight, Loader2, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
          <div className="inline-flex justify-center items-center w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-200 p-2 mb-1">
            <img
              src="/dompetku-logo.jpg"
              alt="Logo Dompetku"
              width={88}
              height={88}
              style={{ maxWidth: '88px', maxHeight: '88px', width: 'auto', height: 'auto', objectFit: 'contain' }}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            <span className="text-[#0d2a63]">Dompet</span><span className="text-[#e89005]">ku</span>
          </h1>
          <div>
            <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
              Kelola Keuangan
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Saas khusus tuk keuangan pemilik usaha</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl text-center">
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Alamat Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="Masukkan email terdaftar..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Kata Sandi (Password)</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wider"
              />
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-extrabold rounded-2xl transition flex items-center justify-center space-x-2 shadow-md shadow-sky-600/25 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Dompetku</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center space-x-2.5 text-xs text-slate-600 font-medium">
          <Lock className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Portal Resmi Dompetku • Khusus Keuangan Pemilik Usaha.</span>
        </div>

      </div>
    </div>
  );
}
