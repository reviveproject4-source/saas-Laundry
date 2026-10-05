import { supabase } from './supabase';
import { DailyOmzet } from './types';

export async function fetchDailyOmzet(
  startDate?: string,
  endDate?: string
): Promise<{ data: DailyOmzet[]; error: string | null }> {
  try {
    let query = supabase
      .from('daily_omzet')
      .select('*')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily omzet:', error);
      return { data: [], error: error.message };
    }

    return { data: (data as DailyOmzet[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Gagal mengambil data omzet harian.' };
  }
}

export async function fetchTodayOmzet(
  dateStr?: string
): Promise<{ data: DailyOmzet | null; error: string | null }> {
  try {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_omzet')
      .select('*')
      .eq('date', targetDate)
      .maybeSingle();

    if (error) {
      console.error('Error fetching today omzet:', error);
      return { data: null, error: error.message };
    }

    return { data: (data as DailyOmzet) || null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal mengambil data omzet hari ini.' };
  }
}

export async function upsertDailyOmzet(
  payload: Omit<DailyOmzet, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: DailyOmzet | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('daily_omzet')
      .upsert(
        {
          tenant_id: payload.tenant_id,
          date: payload.date,
          omzet_laundry: payload.omzet_laundry,
          omzet_reparasi: payload.omzet_reparasi,
          notes: payload.notes || null,
          created_by_user_id: payload.created_by_user_id,
          creator_name: payload.creator_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting daily omzet:', error);
      return { data: null, error: error.message };
    }

    return { data: data as DailyOmzet, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Terjadi kesalahan sistem saat menyimpan rekap omzet.' };
  }
}

export async function deleteDailyOmzet(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('daily_omzet').delete().eq('id', id);

    if (error) {
      console.error('Error deleting daily omzet:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus rekap omzet.' };
  }
}
