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

export type BusinessUnit = 'laundry' | 'reparasi';

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
  | 'penarikan_investor';

export interface Transaction {
  id: string; // UUID from database
  tenant_id: string;
  created_by_user_id: string;
  creator_role: UserRole;
  creator_name: string;
  transaction_date: string; // YYYY-MM-DD
  type: TransactionType;
  sub_category?: SubCategory | string;
  payment_method: PaymentMethod;
  amount: number;
  notes?: string | null;
  business_unit?: BusinessUnit | null;
  bank_account?: BankAccount | null;
  cost_type?: CostType | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyOmzet {
  id: string; // UUID from database
  tenant_id: string;
  date: string; // YYYY-MM-DD
  omzet_laundry: number;
  omzet_reparasi: number;
  notes?: string | null;
  created_by_user_id: string;
  creator_name: string;
  created_at?: string;
  updated_at?: string;
}
