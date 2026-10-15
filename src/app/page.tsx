'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TargetProgress from '@/components/TargetProgress';
import RevenueChart from '@/components/RevenueChart';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import OmzetModal from '@/components/OmzetModal';
import { Transaction, TransactionType, SubCategory, UserProfile, TenantProfile, DailyOmzet } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions, deleteTransactionFromSupabase } from '@/lib/transactions';
import { fetchDailyOmzet } from '@/lib/omzet';
import { formatRupiah } from '@/lib/formatters';
import {
  PlusCircle,
  Banknote,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Clock,
  Building2,
  Wrench,
  Target,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';

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
  const [transactionModalSubCategory, setTransactionModalSubCategory] = useState<SubCategory | undefined>(undefined);
  const [isOmzetModalOpen, setIsOmzetModalOpen] = useState(false);

  const handleOpenTransactionModal = (type: TransactionType, subCategory?: SubCategory) => {
    setTransactionModalType(type);
    setTransactionModalSubCategory(subCategory);
    setIsTransactionModalOpen(true);
  };

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

  // Pemisahan Tiga Dompet Spesifik: Rekening Laundry, Rekening Reparasi, dan Kasir Tunai Toko
  const isRekeningLaundry = (t: Transaction) => {
    if (t.bank_account === 'rekening_laundry') return true;
    if (t.bank_account === 'rekening_reparasi') return false;
    return t.payment_method === 'transfer' && t.business_unit !== 'reparasi';
  };

  const isRekeningReparasi = (t: Transaction) => {
    if (t.bank_account === 'rekening_reparasi') return true;
    if (t.bank_account === 'rekening_laundry') return false;
    return t.payment_method === 'transfer' && t.business_unit === 'reparasi';
  };

  const bankLaundryIncome = allIncomeTxs.filter(isRekeningLaundry).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundryExpense = allExpenseTxs.filter(isRekeningLaundry).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundryBalance = bankLaundryIncome - bankLaundryExpense;

  const bankReparasiIncome = allIncomeTxs.filter(isRekeningReparasi).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankReparasiExpense = allExpenseTxs.filter(isRekeningReparasi).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankReparasiBalance = bankReparasiIncome - bankReparasiExpense;

  const bankIncome = bankLaundryIncome + bankReparasiIncome;
  const bankExpense = bankLaundryExpense + bankReparasiExpense;
  const bankBalance = bankIncome - bankExpense;

  const cashIncome = allIncomeTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const cashExpense = allExpenseTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const cashBalance = cashIncome - cashExpense;

  // 2. Calculations: Hari Ini (Berdasarkan tanggal lokal outlet)
  // A. Omzet Harian (Murni dari public.daily_omzet, BUKAN dari transactions)
  const todayOmzetRecord = dailyOmzetList.find((o) => o.date === todayStr);
  const todayOmzetLaundry = todayOmzetRecord ? Number(todayOmzetRecord.omzet_laundry || 0) : 0;
  const todayOmzetReparasi = todayOmzetRecord ? Number(todayOmzetRecord.omzet_reparasi || 0) : 0;
  const todayOmzetTotal = todayOmzetLaundry + todayOmzetReparasi;

  // Rekap Terakhir yang Ada (Sebagai referensi jika hari ini belum diinput)
  const lastRecordedOmzet = dailyOmzetList.length > 0 ? dailyOmzetList[0] : null;

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
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center space-x-2 animate-fadeIn shadow-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Header & Quick Add */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Halaman Utama (Dashboard)</h2>
              <p className="text-sm font-semibold text-slate-600">Ringkasan performa keuangan outlet & progres setoran investor.</p>
            </div>

            {userProfile?.role === 'pengelola' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsOmzetModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Omzet Harian</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('penerimaan')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Penerimaan Cash</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Pengeluaran</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran', 'disetor_investor')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <Target className="w-4 h-4" />
                  <span>+ Setor ke Pemilik</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenTransactionModal('penerimaan')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Penerimaan Rekening</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Input Pengeluaran</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran', 'disetor_investor')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-sm transition active:scale-95"
                >
                  <Target className="w-4 h-4" />
                  <span>+ Catat Setoran Diterima</span>
                </button>
              </div>
            )}
          </div>

          {/* Target Setoran 10jt Card */}
          <TargetProgress
            totalDisetor={monthDisetor}
            role={userProfile?.role}
            onOpenSetoranModal={() => handleOpenTransactionModal('pengeluaran', 'disetor_investor')}
          />

          {/* ========================================================= */}
          {/* SEKSI 1: REKAP OMZET OPERASIONAL HARIAN (MURNI daily_omzet) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-5 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl">Rekap Omzet Operasional Harian</h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Murni Daily Omzet (Bukan Penerimaan)
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mt-1">
                    Nilai transaksi kotor layanan yang diinput Pengelola (Tersimpan di tabel <code className="text-emerald-800 font-mono font-bold">daily_omzet</code>). Terlihat transparan oleh Pemilik & Pengelola.
                  </p>
                </div>
              </div>

              {/* Status Input Hari Ini */}
              <div>
                {todayOmzetRecord ? (
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Sudah Diinput ({todayStr})
                  </span>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
                      Belum Diinput Hari Ini ({todayStr})
                    </span>
                    {userProfile?.role === 'pengelola' && (
                      <button
                        onClick={() => setIsOmzetModalOpen(true)}
                        className="text-xs sm:text-sm font-bold px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition active:scale-95 shadow-xs"
                      >
                        + Input Sekarang
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3 Dedicated Metric Cards: Laundry, Reparasi, Total Omzet */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: Omzet Laundry */}
              <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-100 hover:shadow-xs transition">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider flex items-center">
                    <Building2 className="w-4 h-4 mr-1.5 text-emerald-700" />
                    Omzet Laundry
                  </span>
                  <span className="text-xs bg-emerald-100/90 text-emerald-900 px-2.5 py-0.5 rounded font-bold">Unit Laundry</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatRupiah(todayOmzetLaundry)}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1.5 font-semibold">
                  {todayOmzetRecord
                    ? `Rekap tanggal ${todayStr}`
                    : lastRecordedOmzet
                    ? `Terakhir (${lastRecordedOmzet.date}): ${formatRupiah(lastRecordedOmzet.omzet_laundry || 0)}`
                    : 'Belum ada data input'}
                </div>
              </div>

              {/* Card 2: Omzet Reparasi */}
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 hover:shadow-xs transition">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider flex items-center">
                    <Wrench className="w-4 h-4 mr-1.5 text-indigo-700" />
                    Omzet Reparasi
                  </span>
                  <span className="text-xs bg-indigo-100/90 text-indigo-900 px-2.5 py-0.5 rounded font-bold">Unit Reparasi</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatRupiah(todayOmzetReparasi)}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1.5 font-semibold">
                  {todayOmzetRecord
                    ? `Rekap tanggal ${todayStr}`
                    : lastRecordedOmzet
                    ? `Terakhir (${lastRecordedOmzet.date}): ${formatRupiah(lastRecordedOmzet.omzet_reparasi || 0)}`
                    : 'Belum ada data input'}
                </div>
              </div>

              {/* Card 3: Total Omzet Hari Ini */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black uppercase tracking-wider text-emerald-100">
                    Total Omzet Hari Ini
                  </span>
                  <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded font-bold">Laundry + Reparasi</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {formatRupiah(todayOmzetTotal)}
                </div>
                <div className="text-xs sm:text-sm text-emerald-100 mt-1.5 font-bold">
                  {todayOmzetRecord
                    ? `Akumulasi 2 unit operasional hari ini`
                    : lastRecordedOmzet
                    ? `Total terakhir (${lastRecordedOmzet.date}): ${formatRupiah((lastRecordedOmzet.omzet_laundry || 0) + (lastRecordedOmzet.omzet_reparasi || 0))}`
                    : 'Menunggu input harian pengelola'}
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SEKSI 2: ARUS KAS MASUK & KELUAR (PENERIMAAN VS PENGELUARAN) */}
          {/* ========================================================= */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">Arus Penerimaan Kas & Mutasi Bank</h3>
              <p className="text-sm font-medium text-slate-600">
                Pencatatan uang masuk kasir/bank dan biaya operasional yang tercatat di buku transaksi (<code className="text-sky-800 font-mono font-bold">transactions</code>).
              </p>
            </div>

            {/* Ringkasan Hari Ini */}
            <div className="bg-slate-100/90 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Penerimaan & Biaya Hari Ini ({todayStr})</span>
                <span className="text-xs sm:text-sm font-bold text-slate-600">{todayTxs.length} Transaksi Kas/Bank Hari Ini</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Cash Hari Ini */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Kasir Tunai (Cash Hari Ini)</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(todayIncomeCash)}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">Uang Fisik Kas Masuk</div>
                </div>

                {/* Transfer Hari Ini */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Transfer Rekening / QRIS Hari Ini</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(todayIncomeTransfer)}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">Masuk Rekening Bank Pemilik</div>
                </div>

                {/* Pengeluaran Hari Ini */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Pengeluaran Biaya Hari Ini</span>
                  <div className="text-2xl sm:text-3xl font-black text-rose-600">{formatRupiah(todayExpenseTotal)}</div>
                  <div className="text-xs font-semibold text-rose-600 mt-1">Beban Operasional & Setoran</div>
                </div>

                {/* Total Uang Masuk Hari Ini */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block mb-1">Total Penerimaan Hari Ini</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600">{formatRupiah(todayIncomeCash + todayIncomeTransfer)}</div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1">Total Uang Masuk (Cash + Transfer)</div>
                </div>
              </div>
            </div>

            {/* Pemisahan Dua Dompet: Rekening Bank (Pemilik) vs Kasir Tunai Toko (Pengelola) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="font-black text-slate-900 text-base sm:text-lg">
                    Pemisahan Saldo Mandiri: Rekening Bank vs Kasir Tunai
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">
                    Posisi uang fisik riil dipisah transparan antara uang di Rekening Bank (Pemilik) dan uang di Kasir Toko (Pengelola).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* DOMPET 1: REKENING LAUNDRY (MAMI LINA) */}
                <div className="bg-gradient-to-br from-sky-50 via-white to-sky-50/40 p-5 rounded-2xl border-2 border-sky-300 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-sky-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-sky-600 text-white rounded-xl">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-sky-800 block">
                          Rekening Laundry
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer (Mami Lina)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      BCA/Bank
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700">{formatRupiah(bankLaundryIncome)}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Bayar via Bank</span>
                      <span className="text-sm sm:text-base font-black text-rose-700">{formatRupiah(bankLaundryExpense)}</span>
                      <span className="text-[10px] text-slate-600 block font-semibold">Sewa, Listrik, PAM</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-sky-200 shadow-xs flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-sky-800 uppercase block">Saldo Rekening Laundry</span>
                      <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">
                        {formatRupiah(bankLaundryBalance)}
                      </div>
                      <span className="text-xs font-bold text-emerald-800 flex items-center mt-1">
                        ✓ Fisik m-banking: ~Rp 500K (Klop)
                      </span>
                    </div>
                    <div className="p-2.5 bg-sky-100/70 text-sky-800 rounded-2xl shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* DOMPET 2: REKENING REPARASI (MAMI LINA) */}
                <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-5 rounded-2xl border-2 border-purple-300 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-purple-800 block">
                          Rekening Reparasi
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer (Mami Lina)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      BCA/Bank
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700">{formatRupiah(bankReparasiIncome)}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Biaya via Rek. Rep</span>
                      <span className="text-sm sm:text-base font-black text-rose-700">{formatRupiah(bankReparasiExpense)}</span>
                      <span className="text-[10px] text-slate-600 block font-semibold">Tercatat di sistem</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-xs flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-purple-800 uppercase block">Saldo Rekening Reparasi</span>
                      <div className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5">
                        {formatRupiah(bankReparasiBalance)}
                      </div>
                      <span className="text-xs font-bold text-amber-800 flex items-center mt-1">
                        Fisik m-banking: ~Rp 700K (Selisih 425K)
                      </span>
                    </div>
                    <div className="p-2.5 bg-purple-100/70 text-purple-800 rounded-2xl shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* DOMPET 3: KASIR TUNAI TOKO (PENGELOLA) */}
                <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-emerald-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                          Kasir Tunai Toko
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Dipegang Pengelola (Cash)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Uang Tunai
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Cash Masuk Tercatat</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700">{formatRupiah(cashIncome)}</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-bold text-slate-600 block">Belanja Toko (Cash)</span>
                      <span className="text-sm sm:text-base font-black text-rose-700">{formatRupiah(cashExpense)}</span>
                      <span className="text-[10px] text-slate-600 block font-semibold">Bensin, gas, harian</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-xs flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase block">Posisi Kasir Tercatat</span>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        {formatRupiah(cashBalance)}
                      </div>
                      <span className="text-xs font-bold text-emerald-800 flex items-center mt-1">
                        Fisik kasir saat ini: ~Rp 700K
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-100/70 text-emerald-800 rounded-2xl shrink-0">
                      <Coins className="w-6 h-6" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Baris Akumulasi Global Ringkas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase block">Total Seluruh Penerimaan (Semua)</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700">{formatRupiah(totalIncome)}</span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    Bank + Cash
                  </span>
                </div>
                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase block">Total Seluruh Pengeluaran (Semua)</span>
                    <span className="text-xl sm:text-2xl font-black text-rose-700">{formatRupiah(totalExpense)}</span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    Bank + Toko
                  </span>
                </div>
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

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        userProfile={userProfile}
        defaultType={transactionModalType}
        defaultSubCategory={transactionModalSubCategory}
      />
    </div>
  );
}
