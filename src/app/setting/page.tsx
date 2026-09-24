'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser, signOutUser } from '@/lib/auth';
import { fetchTenantProfile, updateTenantProfileInSupabase } from '@/lib/tenants';
import { Store, LogOut, Save, MapPin, Phone, ShieldCheck, UserCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function SettingPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { profile, tenant: initialTenant, error: authErr } = await getCurrentAuthUser();
    if (authErr) {
      setErrorMessage(authErr);
    }

    if (!profile) {
      window.location.href = '/login';
      return;
    }

    setUserProfile(profile);

    const { data: tenantData, error: tenantErr } = await fetchTenantProfile(profile.tenant_id);
    if (tenantErr) {
      setErrorMessage(tenantErr);
      setTenant(initialTenant);
    } else {
      setTenant(tenantData || initialTenant);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !tenant) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await updateTenantProfileInSupabase(userProfile.tenant_id, {
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
      });

      if (res.error) {
        setErrorMessage(res.error);
        setSubmitting(false);
        return;
      }

      if (res.data) {
        setTenant(res.data);
      }

      setSavedSuccess(true);
      setSubmitting(false);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan ke Supabase.');
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat pengaturannya dari Supabase...</span>
        </div>
      </div>
    );
  }

  const currentRole = userProfile?.role || 'pengelola';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenant} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Menu Setting</h2>
            <p className="text-xs text-slate-500">
              Kelola profil outlet laundry & pengaturan akun tersimpan di Supabase.
            </p>
          </div>

          <div className="max-w-2xl space-y-6">
            
            {/* Error Feedback */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Profil Outlet */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <div className="w-12 h-12 bg-amber-50 rounded-xl border border-amber-200 p-1 flex justify-center items-center shrink-0">
                  <img src="/logo.png" alt="Trio R Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Profil {tenant?.name || 'Outlet Laundry'}</h3>
                  <p className="text-xs text-slate-500 font-medium">Informasi identitas cabang tersimpan di Supabase database</p>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
                  ✓ Profil outlet berhasil diperbarui di Supabase!
                </div>
              )}

              <form onSubmit={handleSaveOutlet} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nama Outlet Laundry</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tenant?.name || ''}
                      onChange={(e) => setTenant(tenant ? { ...tenant, name: e.target.value } : null)}
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
                      value={tenant?.address || ''}
                      onChange={(e) => setTenant(tenant ? { ...tenant, address: e.target.value } : null)}
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
                      value={tenant?.phone || ''}
                      onChange={(e) => setTenant(tenant ? { ...tenant, phone: e.target.value } : null)}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Target Setoran Tetap Note */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-600">
                  <span className="font-semibold block mb-0.5">Target Setoran Investor</span>
                  <span>Dikunci otomatis di <strong>Rp 10.000.000 / bulan</strong> (Business Rule).</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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
                  <h3 className="font-bold text-slate-800 text-base">Status Akun Logged In</h3>
                  <p className="text-xs text-slate-500">Nama: <strong className="text-slate-700">{userProfile?.full_name}</strong> | Role: <strong className="uppercase text-slate-700">{currentRole}</strong></p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log-out (Keluar Sesi Supabase)</span>
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
