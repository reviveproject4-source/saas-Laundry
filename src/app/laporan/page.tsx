'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Transaction, DailyOmzet, UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions } from '@/lib/transactions';
import { fetchDailyOmzet } from '@/lib/omzet';
import { formatRupiah, formatDateIndo } from '@/lib/formatters';
import {
  Printer,
  RotateCcw,
  Calendar,
  Filter,
  DollarSign,
  CreditCard,
  ShoppingBag,
  Building2,
  Wrench,
  Loader2,
  AlertTriangle,
  Info,
  Banknote,
  Layers,
  User,
  ArrowDownLeft,
  ShoppingCart,
  Wallet,
  Receipt,
} from 'lucide-react';

export default function RingkasanPencatatanPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyOmzetList, setDailyOmzetList] = useState<DailyOmzet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter Periode Tanggal
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { profile, tenant, error: authErr } = await getCurrentAuthUser();
    if (authErr) {
      setErrorMessage(authErr);
    }

    if (!profile) {
      window.location.href = '/login';
      return;
    }

    setUserProfile(profile);
    setTenantProfile(tenant);

    const [txResult, omzetResult] = await Promise.all([
      fetchTransactions(),
      fetchDailyOmzet(),
    ]);

    if (txResult.error) {
      setErrorMessage(txResult.error);
    } else {
      setTransactions(txResult.data);
    }

    if (omzetResult.error) {
      console.error('Error fetching omzet:', omzetResult.error);
    } else {
      setDailyOmzetList(omzetResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat ringkasan pencatatan...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. FILTERING INDEPENDEN UNTUK TIGA KELOMPOK DATA
  // =========================================================================

  // Kelompok 1: Daily Omzet (public.daily_omzet)
  const filteredDailyOmzet = dailyOmzetList.filter((item) => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  // Kelompok 2: Penerimaan (public.transactions type='penerimaan')
  const filteredPenerimaan = transactions.filter((tx) => {
    if (tx.type !== 'penerimaan') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Kelompok 3: Pengeluaran Keseluruhan
  const filteredPengeluaran = transactions.filter((tx) => {
    if (tx.type !== 'pengeluaran') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Murni Biaya Operasional Toko
  const filteredStoreOps = filteredPengeluaran.filter(
    (tx) =>
      tx.sub_category !== 'penarikan_investor' &&
      tx.sub_category !== 'pengeluaran_pribadi' &&
      tx.sub_category !== 'disetor_investor'
  );

  // Aliran Dana Pribadi: Debit (Ambil Usaha) & Kredit (Belanja Pribadi)
  const filteredPriveDebit = filteredPengeluaran.filter((tx) => tx.sub_category === 'penarikan_investor');
  const filteredPersonalCredit = filteredPengeluaran.filter((tx) => tx.sub_category === 'pengeluaran_pribadi');

  // =========================================================================
  // 2. KALKULASI TOTAL KELOMPOK 1: REKAP OMZET OPERASIONAL
  // =========================================================================
  const totalOmzetLaundry = filteredDailyOmzet.reduce(
    (acc, o) => acc + Number(o.omzet_laundry || 0),
    0
  );
  const totalOmzetReparasi = filteredDailyOmzet.reduce(
    (acc, o) => acc + Number(o.omzet_reparasi || 0),
    0
  );
  const totalOmzetGlobal = totalOmzetLaundry + totalOmzetReparasi;

  // =========================================================================
  // 3. KALKULASI TOTAL KELOMPOK 2: CATATAN PENERIMAAN PEMBAYARAN
  // =========================================================================
  const isRekeningLaundry = (tx: Transaction) => {
    if (tx.bank_account === 'rekening_laundry') return true;
    if (tx.bank_account === 'rekening_reparasi') return false;
    return tx.payment_method === 'transfer' && tx.business_unit !== 'reparasi';
  };

  const isRekeningReparasi = (tx: Transaction) => {
    if (tx.bank_account === 'rekening_reparasi') return true;
    if (tx.bank_account === 'rekening_laundry') return false;
    return tx.payment_method === 'transfer' && tx.business_unit === 'reparasi';
  };

  const penerimaanRekeningLaundry = filteredPenerimaan
    .filter(isRekeningLaundry)
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const penerimaanRekeningReparasi = filteredPenerimaan
    .filter(isRekeningReparasi)
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const penerimaanCash = filteredPenerimaan
    .filter((tx) => tx.payment_method === 'cash')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const totalPenerimaan = filteredPenerimaan.reduce(
    (acc, tx) => acc + Number(tx.amount || 0),
    0
  );

  // =========================================================================
  // 4. KALKULASI TOTAL KELOMPOK 3: BIAYA OPERASIONAL TOKO (MURNI TOKO)
  // =========================================================================
  const pengeluaranBank = filteredStoreOps
    .filter((tx) => tx.payment_method === 'transfer')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranCash = filteredStoreOps
    .filter((tx) => tx.payment_method === 'cash')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranLaundry = filteredStoreOps
    .filter((tx) => tx.business_unit === 'laundry' || (!tx.business_unit && tx.sub_category?.includes('laundry')))
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranReparasi = filteredStoreOps
    .filter((tx) => tx.business_unit === 'reparasi' || (!tx.business_unit && tx.sub_category?.includes('reparasi')))
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranFixedCost = filteredStoreOps
    .filter((tx) => tx.cost_type === 'fixed_cost')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranVariableCost = filteredStoreOps
    .filter((tx) => tx.cost_type === 'variable_cost' || !tx.cost_type)
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const totalBiayaToko = filteredStoreOps.reduce(
    (acc, tx) => acc + Number(tx.amount || 0),
    0
  );

  // Margin Usaha Toko = Penerimaan - Biaya Toko
  const storeMargin = totalPenerimaan - totalBiayaToko;

  // =========================================================================
  // 5. KALKULASI TOTAL KELOMPOK 4: ARUS KAS PRIBADI MAMI LINA
  // =========================================================================
  const totalPriveDebit = filteredPriveDebit.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const storeDirectSpent = filteredPriveDebit.filter((tx) => {
    const note = (tx.notes || '').toLowerCase();
    return note.includes('belanja') || note.includes('qris') || !note.includes('tarik dana usaha ke kantong');
  }).reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const independentPersonal = filteredPersonalCredit.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const totalPersonalCredit = storeDirectSpent + independentPersonal;
  const personalBalance = totalPriveDebit - totalPersonalCredit;
  const realNetStoreCash = storeMargin - totalPriveDebit;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenantProfile} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Ringkasan Laporan Pencatatan</h2>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Laporan Keuangan Toko Trio R & Buku Arus Kas Pribadi Mami Lina.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xs transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Bar Periode */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                <Filter className="w-4 h-4 text-sky-600" />
                <span>Filter Periode Tanggal</span>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={handleResetFilter}
                  className="flex items-center space-x-1.5 text-xs sm:text-sm text-rose-600 hover:text-rose-700 font-bold"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Akhir</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            {(startDate || endDate) && (
              <p className="text-xs sm:text-sm text-slate-600 font-semibold pt-1">
                Menampilkan data periode: <strong className="text-slate-900">{startDate || 'Awal'}</strong> s/d <strong className="text-slate-900">{endDate || 'Sekarang'}</strong>
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RINGKASAN STRATEGIS: MARGIN USAHA TOKO & SISA SALDO PRIBADI               */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                Margin Bersih Usaha Toko (Laba Toko)
              </span>
              <div className="text-3xl font-black text-white">{formatRupiah(storeMargin)}</div>
              <div className="text-xs text-emerald-100 font-medium">
                Penerimaan Toko: {formatRupiah(totalPenerimaan)} - Biaya Toko: {formatRupiah(totalBiayaToko)}
              </div>
              <p className="text-[11px] text-emerald-200 pt-1 font-semibold border-t border-emerald-500/40">
                ✨ Murni performa usaha toko, 100% tidak terpotong dana pribadi.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-700 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-1 border border-purple-500/30">
              <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                Sisa Saldo Dana Pribadi Mami Lina
              </span>
              <div className="text-3xl font-black text-purple-300">{formatRupiah(personalBalance)}</div>
              <div className="text-xs text-purple-200 font-medium">
                Debit Ambil Usaha: {formatRupiah(totalPriveDebit)} - Kredit Belanja: {formatRupiah(totalPersonalCredit)}
              </div>
              <p className="text-[11px] text-purple-300 pt-1 font-semibold border-t border-purple-600/40">
                Uang pegangan pribadi Mami Lina yang masih tersisa.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* KELOMPOK 1: REKAP OMZET OPERASIONAL HARIAN                                */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 text-sm font-black">
                  1
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">Rekap Omzet Operasional Harian</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Sumber: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-800 font-bold">public.daily_omzet</code> (Rekap transaksi kotor layanan)
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full font-bold border border-emerald-200">
                {filteredDailyOmzet.length} Hari Rekap
              </span>
            </div>

            {/* Summary Cards Kelompok 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1.5">Omzet Laundry</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(totalOmzetLaundry)}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">Unit Laundry Kiloan / Satuan</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1.5">Omzet Reparasi</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(totalOmzetReparasi)}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">Unit Reparasi Pakaian & Mesin</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/40">
                <span className="text-xs sm:text-sm font-bold text-emerald-800 uppercase block mb-1.5">Total Omzet Operasional</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700">{formatRupiah(totalOmzetGlobal)}</div>
                <div className="text-xs sm:text-sm text-emerald-800 mt-1 font-bold">Laundry + Reparasi</div>
              </div>
            </div>

            {/* Table Kelompok 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/90 uppercase text-xs font-black text-slate-800 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Tanggal Rekap</th>
                      <th className="py-3.5 px-4 text-right">Omzet Laundry</th>
                      <th className="py-3.5 px-4 text-right">Omzet Reparasi</th>
                      <th className="py-3.5 px-4 text-right">Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredDailyOmzet.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500 font-semibold">
                          Belum ada rekap omzet pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyOmzet.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {formatDateIndo(item.date)}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-slate-800 whitespace-nowrap">
                            {formatRupiah(item.omzet_laundry)}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-slate-800 whitespace-nowrap">
                            {formatRupiah(item.omzet_reparasi)}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-emerald-700 whitespace-nowrap">
                            {formatRupiah(Number(item.omzet_laundry || 0) + Number(item.omzet_reparasi || 0))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KELOMPOK 2: CATATAN PENERIMAAN PEMBAYARAN TOKO                            */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-100 text-sky-900 text-sm font-black">
                  2
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">Catatan Penerimaan Pembayaran Toko</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Sumber: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-800 font-bold">public.transactions</code> (type: penerimaan - Kasir Tunai & Transfer Bank)
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm bg-sky-50 text-sky-800 px-3.5 py-1.5 rounded-full font-bold border border-sky-200">
                {filteredPenerimaan.length} Transaksi
              </span>
            </div>

            {/* Summary Cards Kelompok 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm bg-sky-50/20">
                <span className="text-xs sm:text-sm font-bold text-sky-900 uppercase block mb-1">Rekening Laundry</span>
                <div className="text-xl sm:text-2xl font-black text-sky-800">{formatRupiah(penerimaanRekeningLaundry)}</div>
                <div className="text-xs sm:text-sm text-sky-800 mt-1 font-semibold">Transfer Laundry (BCA)</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-sm bg-purple-50/20">
                <span className="text-xs sm:text-sm font-bold text-purple-900 uppercase block mb-1">Rekening Reparasi</span>
                <div className="text-xl sm:text-2xl font-black text-purple-800">{formatRupiah(penerimaanRekeningReparasi)}</div>
                <div className="text-xs sm:text-sm text-purple-800 mt-1 font-semibold">Transfer Reparasi (BCA)</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-sm bg-indigo-50/30">
                <span className="text-xs sm:text-sm font-bold text-indigo-900 uppercase block mb-1">Total Bank (Pemilik)</span>
                <div className="text-xl sm:text-2xl font-black text-indigo-700">{formatRupiah(penerimaanRekeningLaundry + penerimaanRekeningReparasi)}</div>
                <div className="text-xs sm:text-sm text-indigo-800 mt-1 font-bold">Laundry + Reparasi</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                <span className="text-xs sm:text-sm font-bold text-emerald-900 uppercase block mb-1">Kasir Tunai (Cash)</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">{formatRupiah(penerimaanCash)}</div>
                <div className="text-xs sm:text-sm text-emerald-800 mt-1 font-semibold">Uang Kas Toko (Cash)</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm bg-slate-100/70">
                <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase block mb-1">Total Penerimaan Usaha</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900">{formatRupiah(totalPenerimaan)}</div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 font-bold">Bank + Kasir Cash</div>
              </div>
            </div>

            {/* Table Kelompok 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/90 uppercase text-xs font-black text-slate-800 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Rekening Penerimaan</th>
                      <th className="py-3.5 px-4">Metode</th>
                      <th className="py-3.5 px-4">Referensi / Keterangan</th>
                      <th className="py-3.5 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPenerimaan.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500 font-semibold">
                          Belum ada catatan penerimaan pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredPenerimaan.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {formatDateIndo(tx.transaction_date)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {tx.payment_method === 'transfer' ? (
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                  tx.bank_account === 'rekening_reparasi' || (!tx.bank_account && tx.business_unit === 'reparasi')
                                    ? 'bg-purple-50 text-purple-900 border-purple-300'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                }`}
                              >
                                {tx.bank_account === 'rekening_reparasi' || (!tx.bank_account && tx.business_unit === 'reparasi')
                                  ? 'Rekening Reparasi'
                                  : 'Rekening Laundry'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">
                                Kas Tunai Kasir
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded text-xs">
                              {tx.payment_method === 'cash' ? (
                                <>
                                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Cash</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Transfer</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-4 max-w-xs text-xs sm:text-sm text-slate-600 truncate">
                            {tx.notes || '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-base text-sky-700 whitespace-nowrap">
                            {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KELOMPOK 3: CATATAN BIAYA OPERASIONAL TOKO (MURNI OPERASIONAL)            */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 text-rose-900 text-sm font-black">
                  3
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">Catatan Biaya Operasional Toko (Murni Usaha)</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Pengeluaran murni toko (sewa, gaji Yani/Ujang/Bu Linna, listrik, PAM, servis, part, bensin, gas). Tidak memuat dana pribadi.
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm bg-rose-50 text-rose-800 px-3.5 py-1.5 rounded-full font-bold border border-rose-200">
                {filteredStoreOps.length} Transaksi Biaya
              </span>
            </div>

            {/* Summary Cards Kelompok 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-200 shadow-sm bg-sky-50/30">
                <span className="text-xs sm:text-sm font-bold text-sky-800 uppercase block mb-1">Via Rekening Bank</span>
                <div className="text-xl sm:text-2xl font-black text-sky-700">{formatRupiah(pengeluaranBank)}</div>
                <div className="text-xs sm:text-sm text-sky-800 mt-1 font-semibold">Sewa, Listrik, PAM, Servis</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                <span className="text-xs sm:text-sm font-bold text-emerald-800 uppercase block mb-1">Via Kasir Tunai</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">{formatRupiah(pengeluaranCash)}</div>
                <div className="text-xs sm:text-sm text-emerald-800 mt-1 font-semibold">Gaji Yani, Gas, Bensin (Cash)</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Unit Laundry</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900">{formatRupiah(pengeluaranLaundry)}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">Biaya Toko Laundry</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Unit Reparasi</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900">{formatRupiah(pengeluaranReparasi)}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">Gaji Bu Linna, Pa Aris, Part</div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm bg-rose-50/40">
                <span className="text-xs sm:text-sm font-bold text-rose-800 uppercase block mb-1">Total Biaya Usaha</span>
                <div className="text-xl sm:text-2xl font-black text-rose-700">{formatRupiah(totalBiayaToko)}</div>
                <div className="text-xs sm:text-sm text-rose-800 mt-1 font-bold">Murni Biaya Operasional</div>
              </div>
            </div>

            {/* Table Kelompok 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/90 uppercase text-xs font-black text-slate-800 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Sumber Dana Usaha</th>
                      <th className="py-3.5 px-4">Unit Usaha</th>
                      <th className="py-3.5 px-4">Cost Type</th>
                      <th className="py-3.5 px-4">Keterangan Biaya</th>
                      <th className="py-3.5 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStoreOps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 font-semibold">
                          Belum ada catatan biaya operasional toko pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredStoreOps.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {formatDateIndo(tx.transaction_date)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {tx.payment_method === 'transfer' ? (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-sky-50 text-sky-900 border-sky-300">
                                <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                                <span>{tx.bank_account === 'rekening_reparasi' ? 'Rek. Reparasi' : 'Rek. Laundry'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-900 border-emerald-300">
                                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Kasir Tunai</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                tx.business_unit === 'reparasi'
                                  ? 'bg-purple-50 text-purple-900 border-purple-300'
                                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {tx.business_unit === 'reparasi' ? 'Reparasi' : 'Laundry'}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                tx.cost_type === 'fixed_cost'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                            >
                              {tx.cost_type === 'fixed_cost' ? 'Fixed Cost' : 'Variable Cost'}
                            </span>
                          </td>
                          <td className="py-4 px-4 max-w-xs text-xs sm:text-sm text-slate-600 truncate">
                            {tx.notes || '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-base text-rose-700 whitespace-nowrap">
                            {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KELOMPOK 4: LAPORAN ARUS KAS PRIBADI MAMI LINA (LAPORAN TERPISAH)         */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200 pb-3">
              <div className="flex items-center space-x-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600 text-white text-sm font-black">
                  4
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-purple-950">Laporan Arus Kas Pribadi Mami Lina</h3>
                  <p className="text-xs sm:text-sm text-purple-800 font-medium">
                    Ambil Dana Usaha tuk Pribadi (Debit) vs Input Pengeluaran Keperluan Pribadi (Kredit).
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm bg-purple-100 text-purple-900 px-3.5 py-1.5 rounded-full font-bold border border-purple-300">
                {filteredPriveDebit.length + filteredPersonalCredit.length} Catatan Pribadi
              </span>
            </div>

            {/* Summary Cards Kelompok 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-amber-50/70 p-5 rounded-2xl border-2 border-amber-200 shadow-2xs space-y-1">
                <span className="text-xs font-black text-amber-900 uppercase block mb-1">
                  1. Ambil Dana Usaha (DEBIT)
                </span>
                <div className="text-2xl font-black text-amber-800">{formatRupiah(totalPriveDebit)}</div>
                <div className="text-xs text-amber-900 font-semibold">{filteredPriveDebit.length} kali penarikan dari usaha</div>
                <p className="text-[11px] text-amber-800 pt-1 font-medium border-t border-amber-200">
                  Uang masuk ke kantong Mami Lina.
                </p>
              </div>

              <div className="bg-purple-50/70 p-5 rounded-2xl border-2 border-purple-200 shadow-2xs space-y-1">
                <span className="text-xs font-black text-purple-900 uppercase block mb-1">
                  2. Belanja Pribadi (KREDIT)
                </span>
                <div className="text-2xl font-black text-purple-800">{formatRupiah(totalPersonalCredit)}</div>
                <div className="text-xs text-purple-900 font-semibold">{filteredPersonalCredit.length} kali belanja keperluan pribadi</div>
                <p className="text-[11px] text-purple-800 pt-1 font-medium border-t border-purple-200">
                  Murni belanja pribadi, tidak memotong usaha.
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-purple-950 text-white p-5 rounded-2xl shadow-2xs space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-purple-200 uppercase block">
                    3. Neraca Kas Pribadi
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                    Balance
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {personalBalance === 0 ? 'Rp 0 (Balance)' : formatRupiah(Math.abs(personalBalance))}
                </div>
                <div className="text-xs text-purple-200 font-semibold">
                  {personalBalance === 0 ? '✓ Seimbang otomatis (Asas Berpasangan)' : 'Selisih Kas Pribadi'}
                </div>
                <p className="text-[11px] text-purple-300 pt-1 font-medium border-t border-purple-800">
                  DEBIT ({formatRupiah(totalPriveDebit)}) vs KREDIT ({formatRupiah(totalPersonalCredit)})
                </p>
              </div>
            </div>

            {/* Table Kelompok 4 */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-purple-50/80 uppercase text-xs font-black text-purple-950 border-b border-purple-200 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Jenis Aliran</th>
                      <th className="py-3.5 px-4">Sumber / Jalur</th>
                      <th className="py-3.5 px-4">Keterangan</th>
                      <th className="py-3.5 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPriveDebit.length === 0 && filteredPersonalCredit.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500 font-semibold">
                          Belum ada catatan mutasi dana pribadi pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      [...filteredPriveDebit, ...filteredPersonalCredit]
                        .sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1))
                        .map((tx) => {
                          const isDebit = tx.sub_category === 'penarikan_investor';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition">
                              <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                                {formatDateIndo(tx.transaction_date)}
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${
                                  isDebit ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-purple-100 text-purple-900 border-purple-300'
                                }`}>
                                  {isDebit ? 'DEBIT (Ambil Usaha)' : 'KREDIT (Belanja Pribadi)'}
                                </span>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                {isDebit
                                  ? tx.bank_account === 'rekening_reparasi'
                                    ? 'Rekening Reparasi BCA'
                                    : tx.bank_account === 'rekening_laundry'
                                    ? 'Rekening Laundry BCA'
                                    : 'Kasir Tunai Toko (Cash)'
                                  : 'Kantong Pribadi Mami'}
                              </td>
                              <td className="py-4 px-4 max-w-xs text-xs sm:text-sm text-slate-700 truncate">
                                {tx.notes || '-'}
                              </td>
                              <td className={`py-4 px-4 text-right font-black text-base whitespace-nowrap ${
                                isDebit ? 'text-amber-700' : 'text-purple-700'
                              }`}>
                                {isDebit ? '+' : '-'} {formatRupiah(tx.amount)}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Prinsip Independen Notice */}
          <div className="p-5 bg-slate-100 rounded-2xl border border-slate-200 flex items-start space-x-3.5 text-xs sm:text-sm text-slate-700">
            <Info className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-slate-900 text-sm">Prinsip Akuntansi Bersih:</span>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium leading-relaxed">
                Pencatatan Keuangan Usaha Toko Trio R dan Keuangan Pribadi Mami Lina dipisahkan secara ketat.
                Penarikan uang usaha untuk kebutuhan pribadi (Debit) dan belanja pribadi (Kredit) disajikan di buku kas pribadi, sehingga Margin Operasional Usaha Toko tetap mencerminkan laba toko yang riil dan presisi.
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
