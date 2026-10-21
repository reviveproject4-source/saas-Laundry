export type UserRole = 'investor' | 'pengelola';

export interface UserProfile {
  id: string; // auth.users UUID
  tenant_id: string; // tenants UUID
  full_name: string;
  role: UserRole;
  created_at?: string;
  email?: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  monthly_deposit_target: number;
  created_at?: string;
}

export type BusinessUnit = 'laundry' | 'reparasi' | 'pribadi';

export type BankAccount = 'rekening_laundry' | 'rekening_reparasi';

export type CostType = 'fixed_cost' | 'variable_cost';

export type TransactionType = 'penerimaan' | 'pengeluaran';

export type PaymentMethod = 'cash' | 'transfer';

export type SubCategory =
  | 'laundry'
  | 'reparasi'
  | 'lainnya'
  | 'operasional'
  | 'gas'
  | 'detergen'
  | 'sewa_toko'
  | 'disetor_investor'
  | 'penarikan_investor'
  | 'pengeluaran_pribadi';

export type PersonalCategory =
  | 'bahan_makanan'
  | 'makanan'
  | 'listrik_kuota'
  | 'donasi'
  | 'belanja'
  | 'bensin';

export interface PersonalCategoryMeta {
  id: PersonalCategory;
  label: string;
  icon: string;
}

export const PERSONAL_CATEGORIES: PersonalCategoryMeta[] = [
  { id: 'bahan_makanan', label: 'Bahan Makanan', icon: '🥬' },
  { id: 'makanan', label: 'Makanan', icon: '🍲' },
  { id: 'listrik_kuota', label: 'Listrik / Kuota', icon: '⚡' },
  { id: 'donasi', label: 'Donasi', icon: '🤲' },
  { id: 'belanja', label: 'Belanja', icon: '🛍️' },
  { id: 'bensin', label: 'Bensin', icon: '⛽' },
];

export interface Transaction {
  id: string; // UUID from database
  tenant_id: string;
  created_by_user_id: string;
  creator_role: UserRole;
  creator_name: string;
  transaction_date: string; // YYYY-MM-DD
  type: TransactionType;
  sub_category: SubCategory;
  amount: number;
  notes?: string;
  payment_method: PaymentMethod;
  bank_account?: BankAccount | null;
  business_unit?: BusinessUnit;
  cost_type?: CostType | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyOmzet {
  id: string;
  tenant_id: string;
  date: string; // YYYY-MM-DD
  omzet_laundry: number;
  omzet_reparasi: number;
  notes?: string;
  created_by_user_id: string;
  creator_name: string;
  created_at?: string;
}
