import { Transaction, UserRole, UserProfile } from './types';
import { supabase } from './supabase';

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-pengelola-1',
    creator_role: 'pengelola',
    creator_name: 'Budi (Pengelola)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'penerimaan',
    sub_category: 'laundry',
    payment_method: 'cash',
    amount: 350000,
    notes: 'Penerimaan laundry kiloan 35kg',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-pengelola-1',
    creator_role: 'pengelola',
    creator_name: 'Budi (Pengelola)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'penerimaan',
    sub_category: 'reparasi',
    payment_method: 'transfer',
    amount: 150000,
    notes: 'Reparasi mesin cuci koin perbaikan tombol',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-pengelola-1',
    creator_role: 'pengelola',
    creator_name: 'Budi (Pengelola)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'pengeluaran',
    sub_category: 'gas',
    payment_method: 'cash',
    amount: 68000,
    notes: 'Beli gas LPG 3kg 3 tabung',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tx-4',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-investor-1',
    creator_role: 'investor',
    creator_name: 'Pak Hendra (Investor)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'pengeluaran',
    sub_category: 'sewa_toko',
    payment_method: 'transfer',
    amount: 2500000,
    notes: 'Bayar sewa tempat bulan ini',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tx-5',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-pengelola-1',
    creator_role: 'pengelola',
    creator_name: 'Budi (Pengelola)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'pengeluaran',
    sub_category: 'disetor_investor',
    payment_method: 'transfer',
    amount: 4000000,
    notes: 'Setoran mingguan ke investor',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tx-6',
    tenant_id: 'tenant-1',
    created_by_user_id: 'user-investor-1',
    creator_role: 'investor',
    creator_name: 'Pak Hendra (Investor)',
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'pengeluaran',
    sub_category: 'penarikan_investor',
    payment_method: 'transfer',
    amount: 1000000,
    notes: 'Penarikan uang investor (prive modal)',
    created_at: new Date().toISOString(),
  }
];

export function getInitialUserRole(): UserRole {
  if (typeof window === 'undefined') return 'pengelola';
  const saved = localStorage.getItem('laundry_active_role');
  return (saved as UserRole) || 'pengelola';
}

export function setUserRoleStore(role: UserRole) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('laundry_active_role', role);
  }
}

export function getCurrentUser(role: UserRole): UserProfile {
  if (role === 'investor') {
    return {
      id: 'user-investor-1',
      name: 'Pak Hendra (Investor)',
      role: 'investor',
      tenant_id: 'tenant-1',
    };
  }
  return {
    id: 'user-pengelola-1',
    name: 'Budi (Pengelola)',
    role: 'pengelola',
    tenant_id: 'tenant-1',
  };
}

export function getTransactionsStore(): Transaction[] {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  const data = localStorage.getItem('laundry_transactions_data');
  if (!data) {
    localStorage.setItem('laundry_transactions_data', JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactionsStore(transactions: Transaction[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('laundry_transactions_data', JSON.stringify(transactions));
  }
}
