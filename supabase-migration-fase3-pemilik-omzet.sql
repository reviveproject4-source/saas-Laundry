-- ====================================================================
-- MIGRASI NON-DESTRUKTIF FASE 3: AKSES PENUH OMZET UNTUK PEMILIK (INVESTOR)
-- Project: zhcneknemfuwyusapbum
-- Jalankan di: Supabase Dashboard -> SQL Editor -> Run (Opsional)
-- Sifat: 100% AMAN, TANPA DROP TABLE/DATA, DATA OMZET LAMA TETAP UTUH
-- ====================================================================

-- 1. Buka izin INSERT public.daily_omzet untuk Pemilik (investor) & Pengelola
DROP POLICY IF EXISTS "Daily Omzet Pengelola Insert" ON public.daily_omzet;
DROP POLICY IF EXISTS "Daily Omzet All Insert" ON public.daily_omzet;
CREATE POLICY "Daily Omzet All Insert" ON public.daily_omzet
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
    );

-- 2. Buka izin UPDATE public.daily_omzet untuk Pemilik (investor) & Pengelola
DROP POLICY IF EXISTS "Daily Omzet Pengelola Update" ON public.daily_omzet;
DROP POLICY IF EXISTS "Daily Omzet All Update" ON public.daily_omzet;
CREATE POLICY "Daily Omzet All Update" ON public.daily_omzet
    FOR UPDATE TO authenticated 
    USING (
        tenant_id = public.get_auth_user_tenant_id()
    )
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
    );

-- 3. Buka izin DELETE public.daily_omzet untuk Pemilik (investor) & Pengelola
DROP POLICY IF EXISTS "Daily Omzet Pengelola Delete" ON public.daily_omzet;
DROP POLICY IF EXISTS "Daily Omzet All Delete" ON public.daily_omzet;
CREATE POLICY "Daily Omzet All Delete" ON public.daily_omzet
    FOR DELETE TO authenticated 
    USING (
        tenant_id = public.get_auth_user_tenant_id()
    );
