-- ====================================================================
-- MIGRASI NON-DESTRUKTIF FASE 1: PUBLIC.DAILY_OMZET & ENRICH TRANSACTIONS
-- Project: zhcneknemfuwyusapbum
-- Jalankan di: Supabase Dashboard -> SQL Editor -> Run
-- Sifat: 100% AMAN, TANPA DROP TABLE/COLUMN, DATA LAMA TETAP UTUH
-- ====================================================================

-- 1. ENRICH TABEL public.transactions (ARUS MUTASI UANG PEMILIK)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS business_unit VARCHAR(50) DEFAULT 'laundry';

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS cost_type VARCHAR(50);

-- Index performa query laporan & filter unit usaha/rekening
CREATE INDEX IF NOT EXISTS idx_transactions_business_unit ON public.transactions(tenant_id, business_unit);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON public.transactions(tenant_id, bank_account);

-- 2. BUAT TABEL BARU public.daily_omzet (REKAP OMZET HARIAN PENGELOLA)
CREATE TABLE IF NOT EXISTS public.daily_omzet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    omzet_laundry DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (omzet_laundry >= 0),
    omzet_reparasi DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (omzet_reparasi >= 0),
    notes TEXT,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    creator_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_tenant_omzet_per_day UNIQUE (tenant_id, date)
);

-- Index pencarian rekap harian
CREATE INDEX IF NOT EXISTS idx_daily_omzet_tenant_date ON public.daily_omzet(tenant_id, date DESC);

-- 3. ROW LEVEL SECURITY (RLS) KETAT BERBASIS ROLE

-- A. RLS UNTUK public.daily_omzet (HANYA PENGELOLA YANG BISA TULIS)
ALTER TABLE public.daily_omzet ENABLE ROW LEVEL SECURITY;

-- SELECT: Pemilik & Pengelola dapat membaca data omzet
DROP POLICY IF EXISTS "Daily Omzet Tenant Select" ON public.daily_omzet;
CREATE POLICY "Daily Omzet Tenant Select" ON public.daily_omzet
    FOR SELECT TO authenticated 
    USING (tenant_id = public.get_auth_user_tenant_id());

-- INSERT: HANYA Pengelola yang dapat menginput omzet
DROP POLICY IF EXISTS "Daily Omzet Pengelola Insert" ON public.daily_omzet;
CREATE POLICY "Daily Omzet Pengelola Insert" ON public.daily_omzet
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
        AND created_by_user_id = auth.uid()
        AND public.get_auth_user_role() = 'pengelola'
    );

-- UPDATE: HANYA Pengelola yang dapat memperbarui omzet
DROP POLICY IF EXISTS "Daily Omzet Pengelola Update" ON public.daily_omzet;
CREATE POLICY "Daily Omzet Pengelola Update" ON public.daily_omzet
    FOR UPDATE TO authenticated 
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'pengelola'
    )
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'pengelola'
    );

-- DELETE: HANYA Pengelola yang membuat dapat menghapus omzet
DROP POLICY IF EXISTS "Daily Omzet Tenant Delete" ON public.daily_omzet;
DROP POLICY IF EXISTS "Daily Omzet Pengelola Delete" ON public.daily_omzet;
CREATE POLICY "Daily Omzet Pengelola Delete" ON public.daily_omzet
    FOR DELETE TO authenticated 
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        AND created_by_user_id = auth.uid()
        AND public.get_auth_user_role() = 'pengelola'
    );

-- B. RLS UNTUK public.transactions (HANYA PEMILIK/INVESTOR YANG BISA INSERT PENERIMAAN & PENGELUARAN)
DROP POLICY IF EXISTS "Transactions Tenant Insert" ON public.transactions;
CREATE POLICY "Transactions Tenant Insert" ON public.transactions
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
        AND public.get_auth_user_role() = 'investor'
    );

-- 4. KONFIRMASI STATUS EMAIL PENGELOLA (SUPABASE AUTH CONFIRMATION)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()) 
WHERE email = 'pengelola@gmail.com';

