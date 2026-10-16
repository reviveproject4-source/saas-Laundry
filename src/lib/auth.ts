import { supabase } from './supabase';
import { UserProfile, TenantProfile } from './types';

export async function signInWithEmailPassword(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { success: false, message: 'Silakan isi email dan kata sandi Anda.' };
    }

    // 1. Autentikasi murni Supabase Auth (Tanpa auto-signup & tanpa modifikasi password)
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (authErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Diagnostic Auth Error]:', authErr.message);
      }
      return { success: false, message: authErr.message };
    }

    if (!authData.session) {
      return { success: false, message: 'Gagal mendapatkan sesi autentikasi.' };
    }

    // 2. Verifikasi Profile & Tenant di Database Supabase
    const { profile, tenant, error: profileTenantErr } = await getCurrentAuthUser();

    if (profileTenantErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Diagnostic Profile/Tenant Error]:', profileTenantErr);
      }
      return { success: false, message: profileTenantErr };
    }

    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'Akses ditolak. Aplikasi SaaS ini dikhususkan hanya untuk Pemilik (Investor).',
      };
    }

    if (!tenant) {
      return {
        success: false,
        message: 'Akun berhasil login, tetapi tenant belum terdaftar.',
      };
    }

    return { success: true };
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Diagnostic Exception]:', err.message);
    }
    return { success: false, message: err.message || 'Terjadi kesalahan saat autentikasi.' };
  }
}

export async function getCurrentAuthUser(): Promise<{
  profile: UserProfile | null;
  tenant: TenantProfile | null;
  error?: string;
}> {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
      return { profile: null, tenant: null };
    }

    const userId = sessionData.session.user.id;
    const userEmail = sessionData.session.user.email || '';

    // Ambil profile murni dari tabel public.profiles (Tanpa auto-provision dari client)
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching profiles:', profileErr);
      return { profile: null, tenant: null, error: `Gagal membaca profil: ${profileErr.message}` };
    }

    if (!profileData) {
      return {
        profile: null,
        tenant: null,
        error: 'Profil pengguna tidak ditemukan di database. Silakan hubungi administrator.',
      };
    }

    // Blokir Akses Pengelola: Sistem ini dikhususkan secara mutlak hanya untuk Pemilik (investor)
    if (profileData.role !== 'investor') {
      await supabase.auth.signOut();
      return {
        profile: null,
        tenant: null,
        error: 'Akses ditolak. Aplikasi SaaS ini dikhususkan hanya untuk Pemilik (Investor). Akses pengelola telah dinonaktifkan.',
      };
    }

    const profile: UserProfile = {
      ...profileData,
      email: userEmail,
    };

    // Ambil data tenant murni dari tabel public.tenants (Tanpa object fallback palsu)
    const { data: tenantData, error: tenantErr } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .maybeSingle();

    if (tenantErr) {
      console.error('Error fetching tenant:', tenantErr);
      return { profile, tenant: null, error: `Gagal membaca data outlet: ${tenantErr.message}` };
    }

    if (!tenantData) {
      return {
        profile,
        tenant: null,
        error: 'Data outlet (tenant) tidak ditemukan di database.',
      };
    }

    return { profile, tenant: tenantData };
  } catch (err: any) {
    return { profile: null, tenant: null, error: err.message };
  }
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
