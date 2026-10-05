const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zhcneknemfuwyusapbum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoY25la25lbWZ1d3l1c2FwYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjU3OTIsImV4cCI6MjEwNjQwMTc5Mn0._IjRwmq8qwVqp9TJwEogVgBaJDYV5BMOQftoWX0PFzA';

async function runFase2Verification() {
  console.log('================================================================');
  console.log('FASE 2 — ROLE-ENFORCED INPUT & FORM UX: VERIFICATION GATE');
  console.log('================================================================\n');

  let allPassed = true;

  // 1. Inisialisasi Klien & Login
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
    console.error('❌ Gagal login pengguna test:', {
      pengelola: authPengelola.error?.message,
      pemilik: authPemilik.error?.message,
    });
    return false;
  }

  console.log('✓ Login Pengelola: OK (ID: ' + authPengelola.data.user.id + ')');
  console.log('✓ Login Pemilik: OK (ID: ' + authPemilik.data.user.id + ')\n');

  // Ambil tenant_id
  const { data: profilePengelola } = await pengelolaClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', authPengelola.data.user.id)
    .single();

  const tenantId = profilePengelola?.tenant_id;
  if (!tenantId) {
    console.error('❌ Tenant ID tidak ditemukan');
    return false;
  }

  const TEST_DATE_OMZET = '2099-11-20';
  const TEST_DATE_TX = '2099-11-20';
  const TEST_MARKER = '[FASE2_AUTOMATED_TEST]';

  // Cleanup awal
  await pengelolaClient.from('daily_omzet').delete().eq('date', TEST_DATE_OMZET);
  await pemilikClient.from('transactions').delete().like('notes', `%${TEST_MARKER}%`);

  const insertedTxIds = [];

  // ========================================================================
  // T-01: Pengelola mencatat Omzet Harian (Laundry + Reparasi) ke daily_omzet
  // ========================================================================
  process.stdout.write('T-01 [Pengelola -> daily_omzet]: ');
  const { data: t01Data, error: t01Err } = await pengelolaClient
    .from('daily_omzet')
    .insert([
      {
        tenant_id: tenantId,
        date: TEST_DATE_OMZET,
        omzet_laundry: 1500000,
        omzet_reparasi: 500000,
        notes: `${TEST_MARKER} Rekap transaksi harian shift 1 & 2`,
        created_by_user_id: authPengelola.data.user.id,
        creator_name: 'Pengelola Trio R',
      },
    ])
    .select()
    .single();

  if (!t01Err && t01Data) {
    console.log('PASS (Berhasil simpan Omzet Laundry: Rp1.500.000, Reparasi: Rp500.000)');
  } else {
    console.log(`FAIL (${t01Err?.message})`);
    allPassed = false;
  }

  // ========================================================================
  // T-02: Pengelola DITOLAK saat mencoba insert Penerimaan ke transactions
  // ========================================================================
  process.stdout.write('T-02 [Pengelola -> Blocked from Penerimaan/transactions]: ');
  const { error: t02Err } = await pengelolaClient.from('transactions').insert([
    {
      tenant_id: tenantId,
      created_by_user_id: authPengelola.data.user.id,
      creator_role: 'pengelola',
      creator_name: 'Pengelola Trio R',
      transaction_date: TEST_DATE_TX,
      type: 'penerimaan',
      amount: 1500000,
      bank_account: 'rekening_laundry',
      payment_method: 'transfer',
      notes: `${TEST_MARKER} Illegal Pengelola Penerimaan`,
    },
  ]);

  if (t02Err) {
    console.log('PASS (Akses Ditolak RLS sesuai model bisnis: ' + t02Err.message + ')');
  } else {
    console.log('FAIL (Pengelola seharusnya TIDAK diizinkan mencatat penerimaan di transactions!)');
    allPassed = false;
  }

  // ========================================================================
  // T-03: Pengelola DITOLAK saat mencoba insert Pengeluaran ke transactions
  // ========================================================================
  process.stdout.write('T-03 [Pengelola -> Blocked from Pengeluaran/transactions]: ');
  const { error: t03Err } = await pengelolaClient.from('transactions').insert([
    {
      tenant_id: tenantId,
      created_by_user_id: authPengelola.data.user.id,
      creator_role: 'pengelola',
      creator_name: 'Pengelola Trio R',
      transaction_date: TEST_DATE_TX,
      type: 'pengeluaran',
      amount: 250000,
      business_unit: 'laundry',
      cost_type: 'variable_cost',
      payment_method: 'cash',
      notes: `${TEST_MARKER} Illegal Pengelola Pengeluaran`,
    },
  ]);

  if (t03Err) {
    console.log('PASS (Akses Ditolak RLS sesuai model bisnis: ' + t03Err.message + ')');
  } else {
    console.log('FAIL (Pengelola seharusnya TIDAK diizinkan mencatat pengeluaran di transactions!)');
    allPassed = false;
  }

  // ========================================================================
  // T-04: Pemilik mencatat Penerimaan Rekening Laundry
  // ========================================================================
  process.stdout.write('T-04 [Pemilik -> Penerimaan Rekening Laundry]: ');
  const { data: t04Data, error: t04Err } = await pemilikClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPemilik.data.user.id,
        creator_role: 'investor',
        creator_name: 'Pemilik Trio R',
        transaction_date: TEST_DATE_TX,
        type: 'penerimaan',
        amount: 1500000,
        bank_account: 'rekening_laundry',
        business_unit: 'laundry',
        payment_method: 'transfer',
        notes: `${TEST_MARKER} Transfer BCA Laundry`,
      },
    ])
    .select()
    .single();

  if (!t04Err && t04Data && t04Data.bank_account === 'rekening_laundry') {
    insertedTxIds.push(t04Data.id);
    console.log('PASS (Berhasil simpan Penerimaan dengan bank_account = rekening_laundry)');
  } else {
    console.log(`FAIL (${t04Err?.message})`);
    allPassed = false;
  }

  // ========================================================================
  // T-05: Pemilik mencatat Penerimaan Rekening Reparasi
  // ========================================================================
  process.stdout.write('T-05 [Pemilik -> Penerimaan Rekening Reparasi]: ');
  const { data: t05Data, error: t05Err } = await pemilikClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPemilik.data.user.id,
        creator_role: 'investor',
        creator_name: 'Pemilik Trio R',
        transaction_date: TEST_DATE_TX,
        type: 'penerimaan',
        amount: 500000,
        bank_account: 'rekening_reparasi',
        business_unit: 'reparasi',
        payment_method: 'transfer',
        notes: `${TEST_MARKER} Transfer Mandiri Reparasi`,
      },
    ])
    .select()
    .single();

  if (!t05Err && t05Data && t05Data.bank_account === 'rekening_reparasi') {
    insertedTxIds.push(t05Data.id);
    console.log('PASS (Berhasil simpan Penerimaan dengan bank_account = rekening_reparasi)');
  } else {
    console.log(`FAIL (${t05Err?.message})`);
    allPassed = false;
  }

  // ========================================================================
  // T-06: Pemilik mencatat Pengeluaran Operasional (Business Unit + Cost Type)
  // ========================================================================
  process.stdout.write('T-06 [Pemilik -> Pengeluaran Fixed & Variable Cost]: ');
  const { data: t06Data, error: t06Err } = await pemilikClient
    .from('transactions')
    .insert([
      {
        tenant_id: tenantId,
        created_by_user_id: authPemilik.data.user.id,
        creator_role: 'investor',
        creator_name: 'Pemilik Trio R',
        transaction_date: TEST_DATE_TX,
        type: 'pengeluaran',
        amount: 350000,
        business_unit: 'laundry',
        cost_type: 'fixed_cost',
        payment_method: 'cash',
        notes: `${TEST_MARKER} Pembayaran sewa bulanan`,
      },
    ])
    .select()
    .single();

  if (!t06Err && t06Data && t06Data.business_unit === 'laundry' && t06Data.cost_type === 'fixed_cost') {
    insertedTxIds.push(t06Data.id);
    console.log('PASS (Berhasil simpan Pengeluaran Laundry + fixed_cost)');
  } else {
    console.log(`FAIL (${t06Err?.message})`);
    allPassed = false;
  }

  // ========================================================================
  // T-07: Pemilik DITOLAK saat mencoba insert ke daily_omzet
  // ========================================================================
  process.stdout.write('T-07 [Pemilik -> Blocked from daily_omzet]: ');
  const { error: t07Err } = await pemilikClient.from('daily_omzet').insert([
    {
      tenant_id: tenantId,
      date: '2099-11-21',
      omzet_laundry: 500000,
      omzet_reparasi: 100000,
      created_by_user_id: authPemilik.data.user.id,
      creator_name: 'Pemilik Trio R',
    },
  ]);

  if (t07Err) {
    console.log('PASS (Akses Ditolak RLS sesuai model bisnis: ' + t07Err.message + ')');
  } else {
    console.log('FAIL (Pemilik seharusnya TIDAK diizinkan mencatat di daily_omzet!)');
    allPassed = false;
  }

  // ========================================================================
  // T-08: One Day One Omzet — Upsert memperbarui record existing
  // ========================================================================
  process.stdout.write('T-08 [One Day One Omzet -> Upsert Record Existing]: ');
  const { data: t08Data, error: t08Err } = await pengelolaClient
    .from('daily_omzet')
    .upsert(
      {
        tenant_id: tenantId,
        date: TEST_DATE_OMZET,
        omzet_laundry: 1800000,
        omzet_reparasi: 650000,
        notes: `${TEST_MARKER} Update koreksi rekap omzet`,
        created_by_user_id: authPengelola.data.user.id,
        creator_name: 'Pengelola Trio R',
      },
      { onConflict: 'tenant_id,date' }
    )
    .select()
    .single();

  if (!t08Err && t08Data && t08Data.omzet_laundry === 1800000) {
    // Verifikasi jumlah record tetap 1
    const { count } = await pengelolaClient
      .from('daily_omzet')
      .select('*', { count: 'exact', head: true })
      .eq('date', TEST_DATE_OMZET);

    if (count === 1) {
      console.log('PASS (Update nilai sukses & jumlah record tetap 1)');
    } else {
      console.log(`FAIL (Ditemukan ${count} record untuk tanggal yang sama)`);
      allPassed = false;
    }
  } else {
    console.log(`FAIL (${t08Err?.message})`);
    allPassed = false;
  }

  // ========================================================================
  // T-09: Isolasi Entitas & Pencegahan Double Counting
  // ========================================================================
  process.stdout.write('T-09 [Entity Isolation & Anti Double Counting]: ');
  // Cek apakah ada record omzet yang masuk ke transactions
  const { data: txWithOmzet } = await pemilikClient
    .from('transactions')
    .select('id')
    .eq('type', 'omzet');

  // Cek pemisahan tabel
  const { count: omzetCount } = await pengelolaClient
    .from('daily_omzet')
    .select('*', { count: 'exact', head: true })
    .eq('date', TEST_DATE_OMZET);

  if ((!txWithOmzet || txWithOmzet.length === 0) && omzetCount === 1) {
    console.log('PASS (daily_omzet & transactions terisolasi 100%, tidak ada type=omzet di transactions)');
  } else {
    console.log('FAIL (Terdeteksi duplikasi atau type=omzet di transactions)');
    allPassed = false;
  }

  // ========================================================================
  // CLEANUP TEST DATA
  // ========================================================================
  console.log('\n--- Cleanup Data Test ---');
  const cleanOmzet = await pengelolaClient.from('daily_omzet').delete().eq('date', TEST_DATE_OMZET);
  const cleanTx = await pemilikClient.from('transactions').delete().like('notes', `%${TEST_MARKER}%`);

  if (!cleanOmzet.error && !cleanTx.error) {
    console.log('✓ Cleanup test data sukses tanpa residu.');
  } else {
    console.log('⚠️ Cleanup warning:', cleanOmzet.error?.message, cleanTx.error?.message);
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('HASIL AKHIR: SEMUA TEST VERIFIKASI FASE 2 PASS (T-01 s/d T-09) ✅');
  } else {
    console.log('HASIL AKHIR: TERDAPAT TEST GAGAL ❌');
  }
  console.log('================================================================\n');

  return allPassed;
}

runFase2Verification().then((success) => {
  process.exit(success ? 0 : 1);
});
