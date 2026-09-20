export type UserRole = 'investor' | 'pengelola';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  tenant_id: string;
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
  id: string;
  tenant_id: string;
  created_by_user_id: string;
  creator_role: UserRole;
  creator_name: string;
  transaction_date: string; // YYYY-MM-DD
  type: TransactionType;
  sub_category: SubCategory;
  payment_method: PaymentMethod;
  amount: number;
  notes?: string;
  created_at?: string;
}

export interface OutletProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  monthly_deposit_target: number; // 10.000.000 (fixed)
}
