'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { UserRole, OutletProfile } from '@/lib/types';
import { getInitialUserRole, setUserRoleStore } from '@/lib/store';
import { Store, LogOut, Save, MapPin, Phone, ShieldCheck, UserCheck } from 'lucide-react';

export default function SettingPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('pengelola');
  const [mounted, setMounted] = useState(false);

  const [outlet, setOutlet] = useState<OutletProfile>({
    id: 'outlet-1',
    name: 'Trio R Healthy Laundry',
    address: 'Jl. Raya Utama No. 123, Indonesia',
    phone: '0812-3456-7890',
    monthly_deposit_target: 10000000,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setCurrentRole(getInitialUserRole());
    const savedOutlet = localStorage.getItem('laundry_outlet_profile');
    if (savedOutlet) {
      try {
        setOutlet(JSON.parse(savedOutlet));
      } catch (e) {}
    }
    setMounted(true);
  }, []);

  const handleSwitchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    setUserRoleStore(newRole);
  };

  const handleSaveOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('laundry_outlet_profile', JSON.stringify(outlet));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar (Log-out)?')) {
      alert('Berhasil Log-out.');
      window.location.href = '/login';
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentRole={currentRole} onSwitchRole={handleSwitchRole} outletName={outlet.name} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Menu Setting</h2>
            <p className="text-xs text-slate-500">
              Kelola profil outlet laundry & pengaturan akun pengguna.
            </p>
          </div>

          <div className="max-w-2xl space-y-6">
            
            {/* Profil Outlet */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <div className="w-12 h-12 bg-amber-50 rounded-xl border border-amber-200 p-1 flex justify-center items-center shrink-0">
                  <img src="/logo.png" alt="Trio R Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Profil Trio R Healthy Laundry</h3>
                  <p className="text-xs text-slate-500 font-medium">Informasi identitas cabang / outlet usaha laundry Anda</p>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
                  ✓ Profil outlet berhasil diperbarui!
                </div>
              )}

              <form onSubmit={handleSaveOutlet} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nama Outlet Laundry</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={outlet.name}
                      onChange={(e) => setOutlet({ ...outlet, name: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Alamat Lengkap</label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={outlet.address}
                      onChange={(e) => setOutlet({ ...outlet, address: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nomor Telepon / WhatsApp</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={outlet.phone}
                      onChange={(e) => setOutlet({ ...outlet, phone: e.target.value })}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Target Setoran Tetap Note */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-600">
                  <span className="font-semibold block mb-0.5">Target Setoran Investor</span>
                  <span>Dikunci otomatis di <strong>Rp 10.000.000 / bulan</strong> (Fixed Rule).</span>
                </div>

                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </form>
            </div>

            {/* Info Akun & Log-out */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                  {currentRole === 'investor' ? (
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Status Akun Login</h3>
                  <p className="text-xs text-slate-500">Role Anda saat ini: <strong className="uppercase">{currentRole}</strong></p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log-out (Keluar Sesi)</span>
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
