import { supabase } from './supabase';
import { TenantProfile } from './types';

export async function fetchTenantProfile(tenantId: string): Promise<{ data: TenantProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tenant profile from Supabase:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Data tenant tidak ditemukan di database.' };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal mengambil data outlet.' };
  }
}

export async function updateTenantProfileInSupabase(
  tenantId: string,
  updates: { name: string; address: string; phone: string }
): Promise<{ data: TenantProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        name: updates.name,
        address: updates.address,
        phone: updates.phone,
      })
      .eq('id', tenantId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating tenant in Supabase:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal memperbarui profil outlet.' };
  }
}
