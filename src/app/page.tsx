'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TargetProgress from '@/components/TargetProgress';
import RevenueChart from '@/components/RevenueChart';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import OmzetModal from '@/components/OmzetModal';
import { Transaction, TransactionType, UserProfile, TenantProfile, DailyOmzet } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions, deleteTransactionFromSupabase } from '@/lib/transactions';
import { fetchDailyOmzet } from '@/lib/omzet';
import { formatRupiah } from '@/lib/formatters';
import { PlusCircle, Banknote, CreditCard, ArrowUpRight, ArrowDownLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyOmzetList, setDailyOmzetList] = useState<DailyOmzet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('penerimaan');
  const [isOmzetModalOpen, setIsOmzetModalOpen] = useState(false);

  const loadDataFromSupabase = async () => {
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
    loadDataFromSupabase();
  }, []);

  const handleTransactionSuccess = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    setSuccessMessage(newTx.type === 'penerimaan' ? 'Pemasukan berhasil disimpan.' : 'Pengeluaran berhasil disimpan.');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleOmzetSuccess = (savedOmzet: DailyOmzet) => {
    setDailyOmzetList((prev) => {
      const idx = prev.findIndex((o) => o.date === savedOmzet.date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedOmzet;
        return updated;
      }
      return [savedOmzet, ...prev];
    });
    setSuccessMessage(`Rekap omzet tanggal ${savedOmzet.date} berhasil disimpan.`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await deleteTransactionFromSupabase(id);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setSuccessMessage('Data transaksi berhasil dihapus.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat dashboard...</span>
        </div>
      </div>
    );
  }

  // Helpers for Local Date Formatting (Safe against UTC timezone shifts)
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const currentMonthPrefix = todayStr.substring(0, 7);

  // 1. Calculations: Akumulasi Keseluruhan (All-time / Total Penerimaan & Pengeluaran)
  const allIncomeTxs = transactions.filter((t) => t.type === 'penerimaan');
  const allExpenseTxs = transactions.filter((t) => t.type === 'pengeluaran');

  const totalIncome = allIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpense = allExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  // 2. Calculations: Hari Ini (Berdasarkan tanggal lokal outlet)
  // A. Omzet Harian (Murni dari public.daily_omzet, BUKAN dari transactions)
  const todayOmzetRecord = dailyOmzetList.find((o) => o.date === todayStr);
  const todayOmzetTotal = todayOmzetRecord
    ? Number(todayOmzetRecord.omzet_laundry || 0) + Number(todayOmzetRecord.omzet_reparasi || 0)
    : 0;

  // B. Penerimaan & Pengeluaran Hari Ini (Murni dari public.transactions)
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

  const todayExpenseTotal = todayTxs
    .filter((t) => t.type === 'pengeluaran')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 3. Calculations: Target Setoran Bulan Ini
  const monthTxs = transactions.filter((t) => t.transaction_date && t.transaction_date.startsWith(currentMonthPrefix));

  const monthDisetor = monthTxs
    .filter((t) => t.type === 'pengeluaran' && t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const monthPenarikan = monthTxs
    .filter((t) => t.type === 'pengeluaran' && t.sub_category === 'penarikan_investor')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 4. Data Grafik 6 Hari Terakhir (Murni dari public.daily_omzet)
  const dailyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - i));
    const dStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const dayOmzet = dailyOmzetList.find((o) => o.date === dStr);
    const omset = dayOmzet
      ? Number(dayOmzet.omzet_laundry || 0) + Number(dayOmzet.omzet_reparasi || 0)
      : 0;

    return { label: dayName, omset };
  });

  // 5. Data Grafik 6 Bulan Terakhir (Murni dari public.daily_omzet)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}`;
    const label = d.toLocaleDateString('id-ID', { month: 'short' });
    const omset = dailyOmzetList
      .filter((o) => o.date && o.date.startsWith(prefix))
      .reduce((acc, o) => acc + Number(o.omzet_laundry || 0) + Number(o.omzet_reparasi || 0), 0);

    return { label, omset };
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenantProfile} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Connection Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2 animate-fadeIn shadow-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Header & Quick Add */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Halaman Utama (Dashboard)</h2>
              <p className="text-xs text-slate-500">Ringkasan performa keuangan outlet & progres setoran investor.</p>
            </div>

            {userProfile?.role === 'pengelola' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsOmzetModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Omzet Harian</span>
                </button>
                <button
                  onClick={() => {
                    setTransactionModalType('penerimaan');
                    setIsTransactionModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Penerimaan Cash</span>
                </button>
                <button
                  onClick={() => {
                    setTransactionModalType('pengeluaran');
                    setIsTransactionModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Pengeluaran</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setTransactionModalType('penerimaan');
                    setIsTransactionModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Penerimaan Rekening</span>
                </button>
                <button
                  onClick={() => {
                    setTransactionModalType('pengeluaran');
                    setIsTransactionModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Pengeluaran</span>
                </button>
              </div>
            )}
          </div>

          {/* Target Setoran 10jt Card */}
          <TargetProgress totalDisetor={monthDisetor} totalPenarikan={monthPenarikan} />

          {/* Primary Summary Widgets: Akumulasi Total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Penerimaan Akumulasi */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Penerimaan</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{formatRupiah(totalIncome)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Akumulasi Seluruh Penerimaan Kas & Transfer</div>
            </div>

            {/* Total Pengeluaran Akumulasi */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Pengeluaran</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-rose-600">{formatRupiah(totalExpense)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Operasional & Setoran Investor</div>
            </div>

            {/* Saldo Kas Bersih */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Saldo Kas Bersih</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-extrabold ${netBalance >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                {formatRupiah(netBalance)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Penerimaan - Pengeluaran</div>
            </div>

          </div>

          {/* Today Summary Widgets */}
          <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ringkasan Hari Ini ({todayStr})</span>
              <span className="text-[11px] font-medium text-slate-500">{todayTxs.length} Transaksi Kas/Bank Hari Ini</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Omzet Hari Ini */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Omzet Hari Ini</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(todayOmzetTotal)}</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {todayOmzetRecord
                    ? `Laundry: ${formatRupiah(todayOmzetRecord.omzet_laundry || 0)} | Reparasi: ${formatRupiah(todayOmzetRecord.omzet_reparasi || 0)}`
                    : 'Laundry & Reparasi (Rekap Pengelola)'}
                </div>
              </div>

              {/* Cash Hari Ini */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Kasir Tunai (Cash)</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(todayIncomeCash)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Penerimaan Kas Masuk</div>
              </div>

              {/* Transfer Hari Ini */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Transfer Bank / QRIS</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(todayIncomeTransfer)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Penerimaan Masuk Rekening</div>
              </div>

              {/* Pengeluaran Hari Ini */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Pengeluaran Hari Ini</span>
                <div className="text-xl font-black text-rose-600">{formatRupiah(todayExpenseTotal)}</div>
                <div className="text-[10px] text-rose-500 mt-0.5">Biaya Operasional</div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <RevenueChart dailyData={dailyData} monthlyData={monthlyData} />

          {/* Transactions Table */}
          <TransactionTable
            transactions={transactions}
            userProfile={userProfile}
            onDeleteTransaction={handleDeleteTransaction}
          />

        </main>
      </div>

      {/* Omzet Modal (Pengelola) */}
      <OmzetModal
        isOpen={isOmzetModalOpen}
        onClose={() => setIsOmzetModalOpen(false)}
        onSuccess={handleOmzetSuccess}
        userProfile={userProfile}
      />

      {/* Transaction Modal (Pemilik) */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        userProfile={userProfile}
        defaultType={transactionModalType}
      />
    </div>
  );
}
