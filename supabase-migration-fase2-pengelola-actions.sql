-- ====================================================================
-- MIGRASI: PEMBARUAN RLS AKSI PENGELOLA (PENERIMAAN CASH & PENGELUARAN)
-- Project: zhcneknemfuwyusapbum
-- Jalankan di: Supabase Dashboard -> SQL Editor -> Run
-- Sifat: 100% AMAN, TANPA DROP TABLE/COLUMN, DATA LAMA TETAP UTUH
-- ====================================================================

-- 1. Hapus semua policy INSERT lama pada public.transactions
DROP POLICY IF EXISTS "Transactions Tenant Insert" ON public.transactions;
DROP POLICY IF EXISTS "Insert Transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.transactions;

-- 2. Pasang policy INSERT baru: Izinkan Pemilik & Pengelola sesuai tugasnya
CREATE POLICY "Transactions Tenant Insert" ON public.transactions
    FOR INSERT TO authenticated 
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
        AND (
            -- A. Pemilik (investor) berhak mencatat penerimaan transfer rekening & pengeluaran
            (public.get_auth_user_role() = 'investor')
            OR
            -- B. Pengelola berhak mencatat penerimaan tunai (cash kasir) serta pengeluaran operasional
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

-- 3. Pastikan policy DELETE mengizinkan pembuat transaksi menghapus catatannya
DROP POLICY IF EXISTS "Transactions Tenant Delete" ON public.transactions;
CREATE POLICY "Transactions Tenant Delete" ON public.transactions
    FOR DELETE TO authenticated 
    USING (
        tenant_id = public.get_auth_user_tenant_id() 
        AND created_by_user_id = auth.uid()
    );

-- 4. Notifikasi konfirmasi berhasil
SELECT 'MIGRASI RLS BERHASIL: Pengelola kini diizinkan input Cash Kasir dan Pengeluaran!' AS status;
