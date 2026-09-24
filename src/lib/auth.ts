import { supabase } from './supabase';
import { UserProfile, TenantProfile, UserRole } from './types';

export async function signInWithEmailPassword(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.session) {
      return { success: false, message: 'Gagal mendapatkan sesi autentikasi.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan saat login.' };
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

    // Fallback: If user exists in Auth but has no profile row yet, auto-provision profile
    if (!profile) {
      const defaultRole: UserRole = userEmail.toLowerCase().includes('investor') ? 'investor' : 'pengelola';
      const defaultTenantId = '00000000-0000-0000-0000-000000000001';
      
      const newProfile: UserProfile = {
        id: userId,
        tenant_id: defaultTenantId,
        full_name: userEmail.split('@')[0] || 'Pengguna Laundry',
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

    // Default tenant fallback if not created in database yet
    if (!tenant) {
      tenant = {
        id: profile?.tenant_id || '00000000-0000-0000-0000-000000000001',
        name: 'Trio R Healthy Laundry',
        address: 'Jl. Raya Utama No. 123',
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
  if (typeof window !== 'undefined') {
    localStorage.removeItem('laundry_session_user');
    localStorage.removeItem('laundry_active_role');
  }
}
