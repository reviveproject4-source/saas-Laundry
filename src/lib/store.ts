import { Transaction, UserRole, UserProfile } from './types';

// Production Ready: Clean empty data (Tanpa data dummy)
const INITIAL_TRANSACTIONS: Transaction[] = [];

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
      id: 'user-investor',
      name: 'Investor',
      role: 'investor',
      tenant_id: 'tenant-1',
    };
  }
  return {
    id: 'user-pengelola',
    name: 'Pengelola',
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

export function clearAllTransactionsData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('laundry_transactions_data');
  }
}
