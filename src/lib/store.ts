import { Transaction, UserRole } from './types';
import { fetchTransactions, createTransactionInSupabase, deleteTransactionFromSupabase } from './transactions';

export async function getTransactionsFromSupabase(): Promise<Transaction[]> {
  const res = await fetchTransactions();
  return res.data;
}

export async function addTransactionToSupabase(
  tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Transaction | null; error: string | null }> {
  return await createTransactionInSupabase(tx);
}

export async function removeTransactionFromSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  return await deleteTransactionFromSupabase(id);
}
