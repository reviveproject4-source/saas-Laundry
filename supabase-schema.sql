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

-- ====================================================================
-- 7. PRODUCTION PROVISIONING & AUTOMATIC PROFILE TRIGGER
-- ====================================================================
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. Inisialisasi Tenant Single Production (gen_random_uuid)
    SELECT id INTO v_tenant_id FROM public.tenants WHERE name = 'Trio R Healthy Laundry' LIMIT 1;
    IF v_tenant_id IS NULL THEN
        v_tenant_id := gen_random_uuid();
        INSERT INTO public.tenants (id, name, address, phone, monthly_deposit_target)
        VALUES (v_tenant_id, 'Trio R Healthy Laundry', 'Jl. Utama No. 1, Jakarta', '081234567890', 10000000.00);
    END IF;

    -- 2. Pemilik / Investor (pemilik@gmail.com -> UUID: 69c1ed2b-564a-42db-982e-496c6d42226e)
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES ('69c1ed2b-564a-42db-982e-496c6d42226e', v_tenant_id, 'Pemilik Trio R', 'investor')
    ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, role = 'investor', full_name = 'Pemilik Trio R';

    -- 3. Pengelola (pengelola@gmail.com -> UUID: 297d703f-095d-4832-ab71-183280e52108)
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES ('297d703f-095d-4832-ab71-183280e52108', v_tenant_id, 'Pengelola Trio R', 'pengelola')
    ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, role = 'pengelola', full_name = 'Pengelola Trio R';
END $$;

-- FUNCTION & TRIGGER: Otomatis buat Profile saat User baru dibuat di Supabase Auth Dashboard
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_role VARCHAR(50);
BEGIN
    SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;

    -- Tentukan role berdasarkan email (jika mengandung investor/pemilik -> investor, selebihnya -> pengelola)
    IF NEW.email LIKE '%investor%' OR NEW.email LIKE '%pemilik%' THEN
        v_role := 'investor';
    ELSE
        v_role := 'pengelola';
    END IF;

    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES (
        NEW.id,
        v_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', INITCAP(SPLIT_PART(NEW.email, '@', 1))),
        v_role
    )
    ON CONFLICT (id) DO UPDATE
    SET tenant_id = EXCLUDED.tenant_id, role = EXCLUDED.role;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- SYNC SINKRONISASI SEKETIKA (Dijalankan dengan SECURITY DEFINER agar aman dari permission denied)
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS void AS $$
BEGIN
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    SELECT 
        u.id,
        (SELECT id FROM public.tenants LIMIT 1),
        COALESCE(u.raw_user_meta_data->>'full_name', INITCAP(SPLIT_PART(u.email, '@', 1))),
        CASE 
            WHEN u.email LIKE '%investor%' OR u.email LIKE '%pemilik%' THEN 'investor'
            ELSE 'pengelola'
        END
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
    ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Jalankan fungsi sinkronisasi
SELECT public.sync_existing_auth_users();






