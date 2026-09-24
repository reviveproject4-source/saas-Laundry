-- ====================================================================
-- SKEMA DATABASE SUPABASE: SAAS KEUANGAN LAUNDRY (HARDENED RLS SECURITY)
-- Project: uzrqolqdqsispedbmtrl
-- Eksekusi file ini di Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. TABLE TENANTS (Outlet Laundry)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    monthly_deposit_target DECIMAL(15, 2) DEFAULT 10000000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('investor', 'pengelola')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE TRANSACTIONS
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

-- Indexing
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type, payment_method);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION: Ambil tenant_id milik authenticated user dari public.profiles
CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- HELPER FUNCTION: Ambil role milik authenticated user dari public.profiles
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;

-- 4. RLS POLICIES FOR PROFILES (Dilarang ubah tenant_id atau role dari client)
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Tenant Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Self Insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Self Update" ON public.profiles;

CREATE POLICY "Profiles Tenant Select" ON public.profiles
    FOR SELECT TO authenticated 
    USING (id = auth.uid() OR tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Profiles Self Insert" ON public.profiles
    FOR INSERT TO authenticated 
    WITH CHECK (id = auth.uid());

-- Client tidak boleh mengubah tenant_id atau role
CREATE POLICY "Profiles Self Update" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND tenant_id = public.get_auth_user_tenant_id() AND role = public.get_auth_user_role());

-- 5. RLS POLICIES FOR TENANTS
DROP POLICY IF EXISTS "Public Read Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants Tenant Select" ON public.tenants;
DROP POLICY IF EXISTS "Tenants Tenant Update" ON public.tenants;

CREATE POLICY "Tenants Tenant Select" ON public.tenants
    FOR SELECT TO authenticated 
    USING (id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenants Tenant Update" ON public.tenants
    FOR UPDATE TO authenticated 
    USING (id = public.get_auth_user_tenant_id())
    WITH CHECK (id = public.get_auth_user_tenant_id());

-- 6. RLS POLICIES FOR TRANSACTIONS (Dilarang memalsukan tenant_id, created_by_user_id, atau role)
DROP POLICY IF EXISTS "Read Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Insert Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Update Transactions Own Only" ON public.transactions;
DROP POLICY IF EXISTS "Delete Transactions Own Only" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Tenant Select" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Tenant Insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Tenant Update" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Tenant Delete" ON public.transactions;

-- SELECT: HANYA transaksi milik tenant_id user
CREATE POLICY "Transactions Tenant Select" ON public.transactions
    FOR SELECT TO authenticated 
    USING (tenant_id = public.get_auth_user_tenant_id());

-- INSERT: HANYA untuk tenant_id milik user & created_by_user_id = auth.uid() & creator_role = user role
CREATE POLICY "Transactions Tenant Insert" ON public.transactions
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
        AND creator_role = public.get_auth_user_role()
    );

-- UPDATE: HANYA transaksi milik tenant_id user & created_by_user_id = auth.uid(), dan dilarang mengubah tenant_id/created_by_user_id
CREATE POLICY "Transactions Tenant Update" ON public.transactions
    FOR UPDATE TO authenticated 
    USING (tenant_id = public.get_auth_user_tenant_id() AND created_by_user_id = auth.uid())
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
        AND creator_role = public.get_auth_user_role()
    );

-- DELETE: HANYA transaksi milik tenant_id user DAN dibuat oleh user tersebut
CREATE POLICY "Transactions Tenant Delete" ON public.transactions
    FOR DELETE TO authenticated 
    USING (tenant_id = public.get_auth_user_tenant_id() AND created_by_user_id = auth.uid());
