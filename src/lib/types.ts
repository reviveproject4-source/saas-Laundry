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
  | 'penarikan_investor';

export interface Transaction {
  id: string; // UUID from database
  tenant_id: string;
  created_by_user_id: string;
  creator_role: UserRole;
  creator_name: string;
  transaction_date: string; // YYYY-MM-DD
  type: TransactionType;
  sub_category: SubCategory;
  payment_method: PaymentMethod;
  amount: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}
