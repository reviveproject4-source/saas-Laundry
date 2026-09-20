-- ====================================================================
-- SKEMA DATABASE SUPABASE: SAAS KEUANGAN LAUNDRY
-- Project: uzrqolqdqsispedbmtrl
-- Eksekusi file ini di Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. TABLE TENANTS (Outlet Laundry)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Outlet Laundry Barokah',
    address TEXT DEFAULT 'Jl. Utama No. 123',
    phone VARCHAR(50) DEFAULT '081234567890',
    monthly_deposit_target DECIMAL(15, 2) DEFAULT 10000000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 1 Default Tenant
INSERT INTO public.tenants (name, address, phone) 
VALUES ('Outlet Laundry Utama', 'Jl. Sudirman No. 88', '081234567890')
ON CONFLICT DO NOTHING;

-- 2. TABLE PROFILES (Role Investor & Pengelola)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('investor', 'pengelola')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE TRANSACTIONS (Omset, Reparasi, Cash/Transfer, Pengeluaran, Disetor, & Penarikan)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    creator_role VARCHAR(50) NOT NULL CHECK (creator_role IN ('investor', 'pengelola')),
    creator_name VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('penerimaan', 'pengeluaran')),
    sub_category VARCHAR(100) NOT NULL, 
    -- Penerimaan: 'laundry', 'reparasi', 'lainnya'
    -- Pengeluaran: 'operasional', 'gas', 'detergen', 'sewa_toko', 'disetor_investor', 'penarikan_investor'
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing untuk query cepat harian & bulanan
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type, payment_method);

-- 4. ROW-LEVEL SECURITY (RLS) & IMMUTABILITY POLICIES
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for all logged in users
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read Tenants" ON public.tenants FOR SELECT TO authenticated USING (true);

-- Transactions SELECT: Pengelola & Investor BISA MELIHAT SEMUA transaksi
CREATE POLICY "Read Transactions" ON public.transactions
    FOR SELECT TO authenticated USING (true);

-- Transactions INSERT: Pengelola & Investor BISA MEMBUAT transaksi
CREATE POLICY "Insert Transactions" ON public.transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by_user_id);

-- Transactions UPDATE: HANYA PEMBUAT (created_by_user_id) YANG BISA MENGUBAH
-- (Investor tidak bisa ubah milik Pengelola, Pengelola tidak bisa ubah milik Investor)
CREATE POLICY "Update Transactions Own Only" ON public.transactions
    FOR UPDATE TO authenticated 
    USING (auth.uid() = created_by_user_id);

-- Transactions DELETE: HANYA PEMBUAT (created_by_user_id) YANG BISA MENGHAPUS
CREATE POLICY "Delete Transactions Own Only" ON public.transactions
    FOR DELETE TO authenticated 
    USING (auth.uid() = created_by_user_id);
