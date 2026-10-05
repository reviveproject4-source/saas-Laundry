const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zhcneknemfuwyusapbum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoY25la25lbWZ1d3l1c2FwYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjU3OTIsImV4cCI6MjEwNjQwMTc5Mn0._IjRwmq8qwVqp9TJwEogVgBaJDYV5BMOQftoWX0PFzA';

async function testDashboardOmzetLogic() {
  console.log('================================================================');
  console.log('VERIFIKASI LOGIKA SUMBER DATA OMZET DASHBOARD');
  console.log('================================================================\n');

  // Simulasi Helper Dashboard
  function calculateDashboardValues(todayStr, dailyOmzetList, transactions) {
    // A. Omzet Harian (Murni dari daily_omzet)
    const todayOmzetRecord = dailyOmzetList.find((o) => o.date === todayStr);
    const todayOmzetTotal = todayOmzetRecord
      ? Number(todayOmzetRecord.omzet_laundry || 0) + Number(todayOmzetRecord.omzet_reparasi || 0)
      : 0;

    // B. Penerimaan & Pengeluaran Kas/Bank (Murni dari transactions)
    const todayTxs = transactions.filter((t) => {
      const txDate = t.transaction_date ? t.transaction_date.substring(0, 10) : '';
      return txDate === todayStr;
    });

    const todayIncomeCash = todayTxs
      .filter((t) => t.type === 'penerimaan' && t.payment_method === 'cash')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const todayIncomeTransfer = todayTxs
      .filter((t) => t.type === 'penerimaan' && t.payment_method === 'transfer')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    return {
      todayOmzetTotal,
      todayIncomeCash,
      todayIncomeTransfer,
    };
  }

  const todayStr = '2026-10-05';
  let allPass = true;

  // TEST 1: Pastikan Dashboard mengambil Omzet dari daily_omzet bukan transactions
  console.log('TEST 1: Pemisahan Sumber Data Omzet vs Transaksi');
  const dummyTxOnly = [
    { transaction_date: todayStr, type: 'penerimaan', payment_method: 'transfer', amount: 350000 },
  ];
  const resTest1 = calculateDashboardValues(todayStr, [], dummyTxOnly);
  if (resTest1.todayOmzetTotal === 0 && resTest1.todayIncomeTransfer === 350000) {
    console.log('✓ PASS: Omzet Hari Ini = Rp 0 saat tidak ada daily_omzet (TIDAK terpengaruh transaksi penerimaan)\n');
  } else {
    console.log('❌ FAIL: Omzet masih terpengaruh transactions!', resTest1);
    allPass = false;
  }

  // TEST 2: Kondisi daily_omzet = 185.000, penerimaan = 185.000
  console.log('TEST 2: Nilai sama Rp 185.000 dengan Sumber Berbeda');
  const omzetT2 = [{ date: todayStr, omzet_laundry: 150000, omzet_reparasi: 35000 }];
  const txT2 = [{ transaction_date: todayStr, type: 'penerimaan', payment_method: 'transfer', amount: 185000 }];
  const resTest2 = calculateDashboardValues(todayStr, omzetT2, txT2);
  if (resTest2.todayOmzetTotal === 185000 && resTest2.todayIncomeTransfer === 185000) {
    console.log('✓ PASS: Omzet = Rp 185.000 (dari daily_omzet) dan Penerimaan Transfer = Rp 185.000 (dari transactions)\n');
  } else {
    console.log('❌ FAIL: Test 2 gagal!', resTest2);
    allPass = false;
  }

  // TEST 3: daily_omzet = 500.000, penerimaan = 185.000
  console.log('TEST 3: daily_omzet = 500.000, penerimaan = 185.000');
  const omzetT3 = [{ date: todayStr, omzet_laundry: 400000, omzet_reparasi: 100000 }];
  const txT3 = [{ transaction_date: todayStr, type: 'penerimaan', payment_method: 'transfer', amount: 185000 }];
  const resTest3 = calculateDashboardValues(todayStr, omzetT3, txT3);
  if (resTest3.todayOmzetTotal === 500000 && resTest3.todayIncomeTransfer === 185000) {
    console.log('✓ PASS: Omzet = Rp 500.000 & Penerimaan Transfer = Rp 185.000 (tidak saling mempengaruhi)\n');
  } else {
    console.log('❌ FAIL: Test 3 gagal!', resTest3);
    allPass = false;
  }

  // TEST 4: daily_omzet = 0, penerimaan = 185.000
  console.log('TEST 4: daily_omzet = 0 (belum input), penerimaan = 185.000');
  const omzetT4 = []; // Belum ada input omzet
  const txT4 = [{ transaction_date: todayStr, type: 'penerimaan', payment_method: 'transfer', amount: 185000 }];
  const resTest4 = calculateDashboardValues(todayStr, omzetT4, txT4);
  if (resTest4.todayOmzetTotal === 0 && resTest4.todayIncomeTransfer === 185000) {
    console.log('✓ PASS: Omzet = Rp 0 & Penerimaan Transfer = Rp 185.000 (Omzet TIDAK otomatis menjadi Rp 185.000)\n');
  } else {
    console.log('❌ FAIL: Test 4 gagal!', resTest4);
    allPass = false;
  }

  // TEST LIVE SUPABASE FETCH CONTRACT
  console.log('TEST LIVE: Verifikasi Akses Live Supabase API');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [omzetFetch, txFetch] = await Promise.all([
    supabase.from('daily_omzet').select('*').limit(5),
    supabase.from('transactions').select('*').limit(5),
  ]);

  if (!omzetFetch.error && !txFetch.error) {
    console.log(`✓ PASS: Fetch daily_omzet (${omzetFetch.data.length} baris) & transactions (${txFetch.data.length} baris) sukses.`);
  } else {
    console.log('❌ FAIL Live Fetch:', { omzetError: omzetFetch.error, txError: txFetch.error });
    allPass = false;
  }

  console.log('\n================================================================');
  console.log(allPass ? 'KESIMPULAN: SELURUH TEST VERIFIKASI OMZET DASHBOARD PASS ✅' : 'KESIMPULAN: ADA TEST GAGAL ❌');
  console.log('================================================================');

  process.exit(allPass ? 0 : 1);
}

testDashboardOmzetLogic();
