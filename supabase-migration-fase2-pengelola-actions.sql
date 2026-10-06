-- ====================================================================
-- MIGRASI: PEMBARUAN RLS AKSI PENGELOLA (PENERIMAAN CASH & PENGELUARAN)
-- Project: zhcneknemfuwyusapbum
-- Jalankan di: Supabase Dashboard -> SQL Editor -> Run
-- Sifat: 100% AMAN, TANPA DROP TABLE/COLUMN, DATA LAMA TETAP UTUH
-- ====================================================================

-- Perbarui policy INSERT pada public.transactions
DROP POLICY IF EXISTS "Transactions Tenant Insert" ON public.transactions;

CREATE POLICY "Transactions Tenant Insert" ON public.transactions
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
        AND (
            -- 1. Pemilik (investor) berhak mencatat penerimaan transfer rekening & pengeluaran
            (public.get_auth_user_role() = 'investor')
            OR
            -- 2. Pengelola berhak mencatat penerimaan tunai (cash laundry & reparasi) serta pengeluaran operasional
            (
                public.get_auth_user_role() = 'pengelola'
                AND (
                    (type = 'penerimaan' AND payment_method = 'cash')
                    OR
                    (type = 'pengeluaran')
                )
            )
        )
    );
