import { supabase } from './supabase';
import { Transaction } from './types';

export async function fetchTransactions(): Promise<{ data: Transaction[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions from Supabase:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Gagal terhubung ke database Supabase.' };
  }
}

export async function createTransactionInSupabase(
  tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Transaction | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          tenant_id: tx.tenant_id,
          created_by_user_id: tx.created_by_user_id,
          creator_role: tx.creator_role,
          creator_name: tx.creator_name,
          transaction_date: tx.transaction_date,
          type: tx.type,
          sub_category: tx.sub_category,
          payment_method: tx.payment_method,
          amount: tx.amount,
          notes: tx.notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting transaction to Supabase:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal menyimpan transaksi ke database.' };
  }
}

export async function deleteTransactionFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction from Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus transaksi dari database.' };
  }
}
