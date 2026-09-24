import { supabase } from './supabase';
import { UserProfile, TenantProfile, UserRole } from './types';

export async function signInWithEmailPassword(email: string, passwordInput: string): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanEmail = email.trim();
    // Memastikan password memenuhi syarat minimal 6 karakter Supabase Auth
    const password = passwordInput.length < 6 ? passwordInput.padEnd(6, '0') : passwordInput;

    // 1. Coba login ke Supabase Auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (!signInError && signInData.session) {
      return { success: true };
    }

    // 2. Auto-signUp jika akun belum ada di Supabase Auth
    if (signInError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (!signUpError && signUpData.session) {
        return { success: true };
      }

      if (!signUpError && signUpData.user) {
        const { data: retrySignIn, error: retryErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!retryErr && retrySignIn.session) {
          return { success: true };
        }
      }

      if (signUpError) {
        return { success: false, message: `Login Gagal: ${signUpError.message}` };
      }
    }

    return { success: false, message: signInError?.message || 'Kredensial tidak valid. Periksa email & password.' };
  } catch (err: any) {
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

    // Fetch user profile from Supabase profiles table
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('Error fetching profiles:', profileErr);
    }

    let profile: UserProfile | null = profileData;

    // Auto-provision profile jika user baru
    if (!profile) {
      const defaultRole: UserRole = userEmail.toLowerCase().includes('investor') ? 'investor' : 'pengelola';
      const defaultTenantId = '00000000-0000-0000-0000-000000000001';
      
      const newProfile: UserProfile = {
        id: userId,
        tenant_id: defaultTenantId,
        full_name: userEmail.split('@')[0] || (defaultRole === 'investor' ? 'Investor' : 'Pengelola'),
        role: defaultRole,
        email: userEmail,
      };

      const { data: insertedProfile } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          tenant_id: defaultTenantId,
          full_name: newProfile.full_name,
          role: defaultRole,
        }])
        .select()
        .maybeSingle();

      if (insertedProfile) {
        profile = insertedProfile;
      } else {
        profile = newProfile;
      }
    } else {
      profile.email = userEmail;
    }

    // Fetch tenant profile from Supabase tenants table
    let tenant: TenantProfile | null = null;
    if (profile?.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      if (tenantData) {
        tenant = tenantData;
      }
    }

    if (!tenant) {
      tenant = {
        id: profile?.tenant_id || '00000000-0000-0000-0000-000000000001',
        name: 'Trio R Healthy Laundry',
        address: 'Jl. Utama No. 123',
        phone: '081234567890',
        monthly_deposit_target: 10000000,
      };
    }

    return { profile, tenant };
  } catch (err: any) {
    return { profile: null, tenant: null, error: err.message };
  }
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
