const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zhcneknemfuwyusapbum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoY25la25lbWZ1d3l1c2FwYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjU3OTIsImV4cCI6MjEwNjQwMTc5Mn0._IjRwmq8qwVqp9TJwEogVgBaJDYV5BMOQftoWX0PFzA';

async function runVerification() {
  console.log('====================================================');
  console.log('FASE 1 VERIFICATION GATE TEST RUNNER');
  console.log('====================================================\n');

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // STEP 1: Cek Keberadaan Tabel daily_omzet
  process.stdout.write('1. Cek tabel public.daily_omzet: ');
  const checkOmzet = await supabaseAnon.from('daily_omzet').select('*').limit(1);
  if (checkOmzet.error && (checkOmzet.status === 404 || checkOmzet.error.code === 'PGRST205')) {
    console.log('FAIL (Tabel belum ada / belum dieksekusi di Supabase)');
    console.log('   -> Eksekusi skrip supabase-migration-fase1.sql di Supabase SQL Editor.\n');
    return false;
  } else if (checkOmzet.error) {
    console.log(`FAIL (${checkOmzet.error.message})`);
    return false;
  } else {
    console.log('PASS (Tabel aktif di Supabase)');
  }

  // STEP 2: Cek Kolom transactions (business_unit, bank_account, cost_type)
  process.stdout.write('2. Cek kolom baru public.transactions: ');
  const checkColumns = await supabaseAnon.from('transactions').select('business_unit, bank_account, cost_type').limit(1);
  if (checkColumns.error) {
    console.log(`FAIL (${checkColumns.error.message})`);
    return false;
  } else {
    console.log('PASS (Kolom business_unit, bank_account, cost_type aktif)');
  }

  // STEP 3: Login Pengelola & Pemilik
  console.log('\n3. Menguji Autentikasi Pengguna:');
  const pengelolaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authPengelola = await pengelolaClient.auth.signInWithPassword({
    email: 'pengelola@gmail.com',
    password: '123456',
  });
  if (authPengelola.error) {
    console.log(`   - Login Pengelola: FAIL (${authPengelola.error.message})`);
  } else {
    console.log(`   - Login Pengelola: PASS (ID: ${authPengelola.data.user.id})`);
  }

  const pemilikClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const authPemilik = await pemilikClient.auth.signInWithPassword({
    email: 'pemilik@gmail.com',
    password: '021202',
  });
  if (authPemilik.error) {
    console.log(`   - Login Pemilik: FAIL (${authPemilik.error.message})`);
  } else {
    console.log(`   - Login Pemilik: PASS (ID: ${authPemilik.data.user.id})`);
  }

  if (authPengelola.error || authPemilik.error) {
    console.log('\n❌ Verifikasi ditunda karena salah satu user belum dapat login.');
    return false;
  }

  // Ambil tenant_id pengelola
  const { data: profilePengelola } = await pengelolaClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', authPengelola.data.user.id)
    .single();

  const tenantId = profilePengelola ? profilePengelola.tenant_id : null;
  if (!tenantId) {
    console.log('❌ Tenant ID tidak ditemukan untuk pengelola.');
    return false;
  }

  const testDate = '2099-12-31'; // Tanggal khusus test agar aman

  // STEP 4: Uji RLS Pengelola -> Boleh Insert Omzet
  console.log('\n4. Uji Izin RLS Pengelola pada daily_omzet:');
  // Bersihkan data test jika ada
  await pengelolaClient.from('daily_omzet').delete().eq('date', testDate);

  const insertOmzet = await pengelolaClient.from('daily_omzet').insert([
    {
      tenant_id: tenantId,
      date: testDate,
      omzet_laundry: 1000000,
      omzet_reparasi: 500000,
      notes: 'Test Omzet Otomatis',
      created_by_user_id: authPengelola.data.user.id,
      creator_name: 'Pengelola Trio R',
    },
  ]);

  if (insertOmzet.error) {
    console.log(`   - Insert daily_omzet oleh Pengelola: FAIL (${insertOmzet.error.message})`);
  } else {
    console.log('   - Insert daily_omzet oleh Pengelola: PASS');
  }

  // STEP 4b: Uji RLS Pengelola -> Boleh UPDATE Omzet
  const updateOmzet = await pengelolaClient
    .from('daily_omzet')
    .update({ omzet_laundry: 1500000, notes: 'Test Omzet Updated' })
    .eq('date', testDate);

  if (updateOmzet.error) {
    console.log(`   - Update daily_omzet oleh Pengelola: FAIL (${updateOmzet.error.message})`);
  } else {
    console.log('   - Update daily_omzet oleh Pengelola: PASS');
  }

  // STEP 5: Uji Constraint UNIQUE (tenant_id, date)
  process.stdout.write('5. Uji Constraint UNIQUE (tenant_id, date): ');
  const duplicateOmzet = await pengelolaClient.from('daily_omzet').insert([
    {
      tenant_id: tenantId,
      date: testDate,
      omzet_laundry: 2000000,
      omzet_reparasi: 700000,
      created_by_user_id: authPengelola.data.user.id,
      creator_name: 'Pengelola Trio R',
    },
  ]);
  if (duplicateOmzet.error && duplicateOmzet.error.code === '23505') {
    console.log('PASS (Duplikasi hari yang sama ditolak oleh database)');
  } else {
    console.log(`FAIL (Respon tidak sesuai: ${duplicateOmzet.error ? duplicateOmzet.error.message : 'Berhasil insert ganda'})`);
  }

  // STEP 6: Uji RLS Pemilik -> DILARANG Insert Omzet
  console.log('\n6. Uji Isolasi Role (Pemilik DILARANG tulis daily_omzet):');
  const pemilikInsertOmzet = await pemilikClient.from('daily_omzet').insert([
    {
      tenant_id: tenantId,
      date: '2099-12-30',
      omzet_laundry: 500000,
      omzet_reparasi: 100000,
      created_by_user_id: authPemilik.data.user.id,
      creator_name: 'Pemilik Trio R',
    },
  ]);
  if (pemilikInsertOmzet.error) {
    console.log(`   - Insert Omzet oleh Pemilik: PASS (DITOLAK RLS: ${pemilikInsertOmzet.error.message})`);
  } else {
    console.log('   - Insert Omzet oleh Pemilik: FAIL (Pemilik bisa insert omzet padahal dilarang!)');
    await pemilikClient.from('daily_omzet').delete().eq('date', '2099-12-30');
  }

  // STEP 7: Uji Isolasi Role (Pengelola DILARANG insert transactions):
  console.log('\n7. Uji Isolasi Role Transactions:');
  const pengelolaInsertTx = await pengelolaClient.from('transactions').insert([
    {
      tenant_id: tenantId,
      created_by_user_id: authPengelola.data.user.id,
      creator_role: 'pengelola',
      creator_name: 'Pengelola Trio R',
      transaction_date: testDate,
      type: 'penerimaan',
      payment_method: 'transfer',
      amount: 100000,
      business_unit: 'laundry',
    },
  ]);
  if (pengelolaInsertTx.error) {
    console.log(`   - Insert Transaksi oleh Pengelola: PASS (DITOLAK RLS: ${pengelolaInsertTx.error.message})`);
  } else {
    console.log('   - Insert Transaksi oleh Pengelola: FAIL (Pengelola bisa insert transaksi penerimaan!)');
    await pengelolaClient.from('transactions').delete().eq('transaction_date', testDate);
  }

  // STEP 7b: Uji Pemilik -> Boleh Insert Transactions
  const pemilikInsertTx = await pemilikClient.from('transactions').insert([
    {
      tenant_id: tenantId,
      created_by_user_id: authPemilik.data.user.id,
      creator_role: 'investor',
      creator_name: 'Pemilik Trio R',
      transaction_date: testDate,
      type: 'penerimaan',
      payment_method: 'transfer',
      amount: 500000,
      business_unit: 'laundry',
      bank_account: 'rekening_laundry',
    },
  ]);
  if (pemilikInsertTx.error) {
    console.log(`   - Insert Transaksi oleh Pemilik: FAIL (${pemilikInsertTx.error.message})`);
  } else {
    console.log('   - Insert Transaksi oleh Pemilik: PASS');
    await pemilikClient.from('transactions').delete().eq('transaction_date', testDate);
  }

  // Clean up data test
  await pengelolaClient.from('daily_omzet').delete().eq('date', testDate);
  console.log('\n🧹 Data test telah dibersihkan.');
  console.log('====================================================');
  console.log('SELURUH POINT VERIFICATION GATE BERHASIL DIUJI.');
  console.log('====================================================');
  return true;
}

runVerification();
