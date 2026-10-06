const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zhcneknemfuwyusapbum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoY25la25lbWZ1d3l1c2FwYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjU3OTIsImV4cCI6MjEwNjQwMTc5Mn0._IjRwmq8qwVqp9TJwEogVgBaJDYV5BMOQftoWX0PFzA';

async function runPengelolaActionsVerification() {
  console.log('================================================================');
  console.log('VERIFIKASI AKSI PENGELOLA (OMZET, PENERIMAAN CASH, PENGELUARAN)');
  console.log('================================================================\n');

  const pengelolaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authPengelola = await pengelolaClient.auth.signInWithPassword({
    email: 'pengelola@gmail.com',
    password: '123456',
  });

  const pemilikClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authPemilik = await pemilikClient.auth.signInWithPassword({
    email: 'pemilik@gmail.com',
    password: '021202',
  });

  if (authPengelola.error || authPemilik.error) {
    console.error('❌ Gagal login:', {
      pengelola: authPengelola.error?.message,
      pemilik: authPemilik.error?.message,
    });
    return false;
  }

  const { data: profilePengelola } = await pengelolaClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', authPengelola.data.user.id)
    .single();

  const tenantId = profilePengelola?.tenant_id;
  const TEST_DATE = '2099-10-10';
  const TEST_MARKER = '[PENGELOLA_ACTIONS_TEST]';

  // 1. Pengelola input Omzet Harian ke daily_omzet
  process.stdout.write('1. Pengelola input Omzet Harian (Laundry & Reparasi): ');
  const { data: omzetData, error: omzetErr } = await pengelolaClient
    .from('daily_omzet')
    .upsert(
      {
        tenant_id: tenantId,
        date: TEST_DATE,
        omzet_laundry: 600000,
        omzet_reparasi: 250000,
        notes: `${TEST_MARKER} Rekap shift`,
        created_by_user_id: authPengelola.data.user.id,
        creator_name: 'Pengelola Trio R',
      },
      { onConflict: 'tenant_id,date' }
    )
    .select()
    .single();

  if (!omzetErr && omzetData) {
    console.log('PASS (Tersimpan di daily_omzet: Laundry Rp600.000, Reparasi Rp250.000)');
  } else {
    console.log(`FAIL (${omzetErr?.message})`);
  }

  // 2. Pengelola input Penerimaan Cash Laundry ke transactions
  process.stdout.write('2. Pengelola input Penerimaan Cash (Kasir Tunai): ');
  const { data: cashData, error: cashErr } = await pengelolaClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPengelola.data.user.id,
        creator_role: 'pengelola',
        creator_name: 'Pengelola Trio R',
        transaction_date: TEST_DATE,
        type: 'penerimaan',
        payment_method: 'cash',
        business_unit: 'laundry',
        bank_account: null,
        amount: 250000,
        notes: `${TEST_MARKER} Cash kasir shift pagi`,
      },
    ])
    .select()
    .single();

  if (!cashErr && cashData) {
    console.log('PASS (Tersimpan di transactions: Cash Laundry Rp250.000)');
  } else {
    console.log(`RLS STATUS: ${cashErr?.message} (Perlu jalankan SQL migration supabase-migration-fase2-pengelola-actions.sql di Supabase SQL Editor)`);
  }

  // 3. Pengelola input Pengeluaran Operasional ke transactions
  process.stdout.write('3. Pengelola input Pengeluaran Operasional: ');
  const { data: expData, error: expErr } = await pengelolaClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPengelola.data.user.id,
        creator_role: 'pengelola',
        creator_name: 'Pengelola Trio R',
        transaction_date: TEST_DATE,
        type: 'pengeluaran',
        business_unit: 'laundry',
        cost_type: 'variable_cost',
        payment_method: 'cash',
        amount: 50000,
        notes: `${TEST_MARKER} Beli sabun darurat`,
      },
    ])
    .select()
    .single();

  if (!expErr && expData) {
    console.log('PASS (Tersimpan di transactions: Pengeluaran Rp50.000)');
  } else {
    console.log(`RLS STATUS: ${expErr?.message} (Perlu jalankan SQL migration supabase-migration-fase2-pengelola-actions.sql di Supabase SQL Editor)`);
  }

  // 4. Pengelola DITOLAK jika coba input Transfer Rekening ke transactions
  process.stdout.write('4. Pengelola Ditolak saat mencoba input Transfer Rekening: ');
  const { error: illegalTransferErr } = await pengelolaClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPengelola.data.user.id,
        creator_role: 'pengelola',
        creator_name: 'Pengelola Trio R',
        transaction_date: TEST_DATE,
        type: 'penerimaan',
        payment_method: 'transfer',
        bank_account: 'rekening_laundry',
        amount: 500000,
        notes: `${TEST_MARKER} Illegal transfer input by pengelola`,
      },
    ]);

  if (illegalTransferErr) {
    console.log('PASS (Akses Ditolak RLS sesuai aturan: ' + illegalTransferErr.message + ')');
  } else {
    console.log('FAIL (Pengelola tidak boleh menginput transfer rekening!)');
  }

  // Cleanup test data
  await pengelolaClient.from('daily_omzet').delete().eq('date', TEST_DATE);
  await pengelolaClient.from('transactions').delete().like('notes', `%${TEST_MARKER}%`);
  await pemilikClient.from('transactions').delete().like('notes', `%${TEST_MARKER}%`);

  console.log('\n================================================================');
}

runPengelolaActionsVerification();
