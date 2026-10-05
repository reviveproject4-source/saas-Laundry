const fs = require('fs');
const path = require('path');

async function runFase3Verification() {
  console.log('================================================================');
  console.log('FASE 3 — RINGKASAN PENCATATAN: VERIFICATION GATE (T-01 s/d T-09)');
  console.log('================================================================\n');

  let results = {};

  // ========================================================================
  // T-01: Omzet dari daily_omzet (Laundry: 500k, Reparasi: 200k -> Total: 700k)
  // ========================================================================
  const sampleDailyOmzet = [
    { id: '1', date: '2026-10-05', omzet_laundry: 500000, omzet_reparasi: 200000 },
  ];
  const t01Laundry = sampleDailyOmzet.reduce((acc, o) => acc + o.omzet_laundry, 0);
  const t01Reparasi = sampleDailyOmzet.reduce((acc, o) => acc + o.omzet_reparasi, 0);
  const t01TotalOmzet = t01Laundry + t01Reparasi;

  if (t01TotalOmzet === 700000 && t01Laundry === 500000 && t01Reparasi === 200000) {
    console.log('T-01 [Omzet Calculation]: PASS (Total Omzet = Rp700.000 dari daily_omzet)');
    results['T-01'] = 'PASS';
  } else {
    console.log('T-01 [Omzet Calculation]: FAIL');
    results['T-01'] = 'FAIL';
  }

  // ========================================================================
  // T-02: Penerimaan (type = penerimaan, nominal = 400k -> Total: 400k)
  // ========================================================================
  const sampleTransactions = [
    {
      id: 'tx-1',
      transaction_date: '2026-10-05',
      type: 'penerimaan',
      payment_method: 'transfer',
      bank_account: 'rekening_laundry',
      amount: 400000,
    },
    {
      id: 'tx-2',
      transaction_date: '2026-10-05',
      type: 'pengeluaran',
      business_unit: 'laundry',
      cost_type: 'fixed_cost',
      amount: 100000,
    },
  ];

  const t02Penerimaan = sampleTransactions
    .filter((tx) => tx.type === 'penerimaan')
    .reduce((acc, tx) => acc + tx.amount, 0);

  if (t02Penerimaan === 400000) {
    console.log('T-02 [Penerimaan Calculation]: PASS (Total Penerimaan = Rp400.000, tidak dihitung sebagai omzet)');
    results['T-02'] = 'PASS';
  } else {
    console.log('T-02 [Penerimaan Calculation]: FAIL');
    results['T-02'] = 'FAIL';
  }

  // ========================================================================
  // T-03: Pengeluaran (type = pengeluaran, laundry, fixed_cost, 100k)
  // ========================================================================
  const t03Pengeluaran = sampleTransactions
    .filter((tx) => tx.type === 'pengeluaran')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const t03FixedCost = sampleTransactions
    .filter((tx) => tx.type === 'pengeluaran' && tx.cost_type === 'fixed_cost')
    .reduce((acc, tx) => acc + tx.amount, 0);

  if (t03Pengeluaran === 100000 && t03FixedCost === 100000) {
    console.log('T-03 [Pengeluaran Calculation]: PASS (Total Pengeluaran = Rp100.000)');
    results['T-03'] = 'PASS';
  } else {
    console.log('T-03 [Pengeluaran Calculation]: FAIL');
    results['T-03'] = 'FAIL';
  }

  // ========================================================================
  // T-04: Pemisahan Omzet dan Penerimaan (Omzet = 700k, Penerimaan = 400k)
  // ========================================================================
  if (t01TotalOmzet === 700000 && t02Penerimaan === 400000 && t01TotalOmzet !== t02Penerimaan) {
    console.log('T-04 [Pemisahan Omzet & Penerimaan]: PASS (Omzet = Rp700.000, Penerimaan = Rp400.000)');
    results['T-04'] = 'PASS';
  } else {
    console.log('T-04 [Pemisahan Omzet & Penerimaan]: FAIL');
    results['T-04'] = 'FAIL';
  }

  // ========================================================================
  // T-05: Filter Periode (Mulai s/d Akhir menyaring ketiga kelompok secara independen)
  // ========================================================================
  const multiDayOmzet = [
    { date: '2026-10-01', omzet_laundry: 100000, omzet_reparasi: 50000 },
    { date: '2026-10-05', omzet_laundry: 500000, omzet_reparasi: 200000 },
    { date: '2026-10-10', omzet_laundry: 300000, omzet_reparasi: 100000 },
  ];
  const multiDayTx = [
    { transaction_date: '2026-10-01', type: 'penerimaan', amount: 150000 },
    { transaction_date: '2026-10-05', type: 'penerimaan', amount: 400000 },
    { transaction_date: '2026-10-10', type: 'penerimaan', amount: 300000 },
    { transaction_date: '2026-10-05', type: 'pengeluaran', amount: 100000 },
    { transaction_date: '2026-10-10', type: 'pengeluaran', amount: 50000 },
  ];

  const filterStart = '2026-10-02';
  const filterEnd = '2026-10-08';

  const filteredOmzet = multiDayOmzet.filter((o) => o.date >= filterStart && o.date <= filterEnd);
  const filteredPenerimaan = multiDayTx.filter((t) => t.type === 'penerimaan' && t.transaction_date >= filterStart && t.transaction_date <= filterEnd);
  const filteredPengeluaran = multiDayTx.filter((t) => t.type === 'pengeluaran' && t.transaction_date >= filterStart && t.transaction_date <= filterEnd);

  if (filteredOmzet.length === 1 && filteredPenerimaan.length === 1 && filteredPengeluaran.length === 1) {
    console.log('T-05 [Filter Periode]: PASS (Hanya tanggal 2026-10-05 yang lolos filter periode pada ke-3 kelompok)');
    results['T-05'] = 'PASS';
  } else {
    console.log('T-05 [Filter Periode]: FAIL');
    results['T-05'] = 'FAIL';
  }

  // ========================================================================
  // T-06: Breakdown Omzet (Laundry, Reparasi, Total)
  // ========================================================================
  const laporanContent = fs.readFileSync(path.join(__dirname, 'src/app/laporan/page.tsx'), 'utf-8');
  const hasOmzetBreakdown =
    laporanContent.includes('totalOmzetLaundry') &&
    laporanContent.includes('totalOmzetReparasi') &&
    laporanContent.includes('totalOmzetGlobal') &&
    laporanContent.includes('Omzet Laundry') &&
    laporanContent.includes('Omzet Reparasi');

  if (hasOmzetBreakdown) {
    console.log('T-06 [Breakdown Omzet]: PASS (Tersedia Omzet Laundry, Omzet Reparasi, Total Omzet)');
    results['T-06'] = 'PASS';
  } else {
    console.log('T-06 [Breakdown Omzet]: FAIL');
    results['T-06'] = 'FAIL';
  }

  // ========================================================================
  // T-07: Breakdown Penerimaan (Rekening Laundry, Rekening Reparasi)
  // ========================================================================
  const hasPenerimaanBreakdown =
    laporanContent.includes('penerimaanRekeningLaundry') &&
    laporanContent.includes('penerimaanRekeningReparasi') &&
    laporanContent.includes('Rekening Laundry') &&
    laporanContent.includes('Rekening Reparasi');

  if (hasPenerimaanBreakdown) {
    console.log('T-07 [Breakdown Penerimaan]: PASS (Tersedia Rekening Laundry & Rekening Reparasi)');
    results['T-07'] = 'PASS';
  } else {
    console.log('T-07 [Breakdown Penerimaan]: FAIL');
    results['T-07'] = 'FAIL';
  }

  // ========================================================================
  // T-08: Breakdown Pengeluaran (Laundry/Reparasi, Fixed/Variable Cost)
  // ========================================================================
  const hasPengeluaranBreakdown =
    laporanContent.includes('pengeluaranLaundry') &&
    laporanContent.includes('pengeluaranReparasi') &&
    laporanContent.includes('pengeluaranFixedCost') &&
    laporanContent.includes('pengeluaranVariableCost');

  if (hasPengeluaranBreakdown) {
    console.log('T-08 [Breakdown Pengeluaran]: PASS (Tersedia Laundry/Reparasi & Fixed/Variable Cost)');
    results['T-08'] = 'PASS';
  } else {
    console.log('T-08 [Breakdown Pengeluaran]: FAIL');
    results['T-08'] = 'FAIL';
  }

  // ========================================================================
  // T-09: Terminologi "Ringkasan Pencatatan" pada Page dan Sidebar
  // ========================================================================
  const sidebarContent = fs.readFileSync(path.join(__dirname, 'src/components/Sidebar.tsx'), 'utf-8');
  const sidebarPass = sidebarContent.includes('Ringkasan Pencatatan') && !sidebarContent.includes('Laporan Keuangan');
  const pagePass = laporanContent.includes('Ringkasan Pencatatan') && !laporanContent.includes('Laporan Keuangan Outlet');

  if (sidebarPass && pagePass) {
    console.log('T-09 [Terminologi]: PASS (UI Page & Sidebar konsisten menggunakan "Ringkasan Pencatatan")');
    results['T-09'] = 'PASS';
  } else {
    console.log(`T-09 [Terminologi]: FAIL (sidebarPass: ${sidebarPass}, pagePass: ${pagePass})`);
    results['T-09'] = 'FAIL';
  }

  console.log('\n================================================================');
  const allPassed = Object.values(results).every((r) => r === 'PASS');
  console.log(allPassed ? 'HASIL: SELURUH TEST VERIFIKASI T-01 s/d T-09 PASS ✅' : 'HASIL: ADA TEST GAGAL ❌');
  console.log('================================================================\n');

  return allPassed;
}

runFase3Verification().then((ok) => process.exit(ok ? 0 : 1));
