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
  User,
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
    const label =
      newTx.type === 'penerimaan'
        ? 'Penerimaan berhasil disimpan.'
        : newTx.sub_category === 'penarikan_investor'
        ? 'Pengeluaran pribadi (Prive) berhasil disimpan.'
        : newTx.sub_category === 'disetor_investor'
        ? 'Setoran target berhasil disimpan.'
        : 'Pengeluaran operasional berhasil disimpan.';
    setSuccessMessage(label);
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

  // Penerimaan Bank Laundry & Reparasi
  const bankLaundryIncomeTxs = allIncomeTxs.filter(isRekeningLaundry);
  const bankLaundryIncome = bankLaundryIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  // Pengeluaran Bank Laundry (Detail itemized)
  const bankLaundryExpenseTxs = allExpenseTxs.filter(isRekeningLaundry);
  const bankLaundryExpense = bankLaundryExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const bankLaundrySewa = bankLaundryExpenseTxs
    .filter((t) => (t.notes || '').toLowerCase().includes('sewa'))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundrySetoran = bankLaundryExpenseTxs
    .filter((t) => t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundryPribadi = bankLaundryExpenseTxs
    .filter((t) => t.sub_category === 'penarikan_investor')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundryOpsExpense = bankLaundryExpense - bankLaundrySewa - bankLaundrySetoran - bankLaundryPribadi;

  // Penerimaan & Pengeluaran Bank Reparasi
  const bankReparasiIncomeTxs = allIncomeTxs.filter(isRekeningReparasi);
  const bankReparasiIncome = bankReparasiIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankReparasiExpenseTxs = allExpenseTxs.filter(isRekeningReparasi);
  const bankReparasiExpense = bankReparasiExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const bankIncome = bankLaundryIncome + bankReparasiIncome;
  const bankIncomeCount = bankLaundryIncomeTxs.length + bankReparasiIncomeTxs.length;

  // Kasir Tunai Toko
  const cashIncomeTxs = allIncomeTxs.filter((t) => t.payment_method === 'cash');
  const cashIncome = cashIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const cashExpenseTxs = allExpenseTxs.filter((t) => t.payment_method === 'cash');
  const cashExpense = cashExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Kategori Khusus: Pengeluaran Pribadi Pemilik (Prive)
  const personalExpenseTxs = allExpenseTxs.filter((t) => t.sub_category === 'penarikan_investor');
  const totalPersonalExpense = personalExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const personalExpenseCash = personalExpenseTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const personalExpenseRekLaundry = personalExpenseTxs
    .filter(isRekeningLaundry)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const personalExpenseRekReparasi = personalExpenseTxs
    .filter(isRekeningReparasi)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Murni Biaya Operasional Toko (di luar Setoran dan di luar Prive Pribadi)
  const operationalExpenseTxs = allExpenseTxs.filter(
    (t) => t.sub_category !== 'disetor_investor' && t.sub_category !== 'penarikan_investor'
  );
  const totalOperationalExpense = operationalExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const operationalProfit = totalIncome - totalOperationalExpense;

  // 2. Calculations: Hari Ini (Berdasarkan tanggal lokal outlet)
  const todayOmzetRecord = dailyOmzetList.find((o) => o.date === todayStr);
  const todayOmzetLaundry = todayOmzetRecord ? Number(todayOmzetRecord.omzet_laundry || 0) : 0;
  const todayOmzetReparasi = todayOmzetRecord ? Number(todayOmzetRecord.omzet_reparasi || 0) : 0;
  const todayOmzetTotal = todayOmzetLaundry + todayOmzetReparasi;

  const lastRecordedOmzet = dailyOmzetList.length > 0 ? dailyOmzetList[0] : null;

  const todayTxs = transactions.filter((t) => {
    const txDate = t.transaction_date ? t.transaction_date.substring(0, 10) : '';
    return txDate === todayStr;
  });

  const todayIncomeCashTxs = todayTxs.filter((t) => t.type === 'penerimaan' && t.payment_method === 'cash');
  const todayIncomeCash = todayIncomeCashTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const todayIncomeTransferTxs = todayTxs.filter((t) => t.type === 'penerimaan' && t.payment_method === 'transfer');
  const todayIncomeTransfer = todayIncomeTransferTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const todayIncomeTotalCount = todayIncomeCashTxs.length + todayIncomeTransferTxs.length;

  const todayExpenseTxs = todayTxs.filter((t) => t.type === 'pengeluaran');
  const todayExpenseTotal = todayExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const todayPersonalExpenseTxs = todayExpenseTxs.filter((t) => t.sub_category === 'penarikan_investor');
  const todayPersonalExpense = todayPersonalExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

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

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsOmzetModalOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Input Omzet Harian</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('penerimaan')}
                className="flex items-center space-x-2 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Input Penerimaan</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran')}
                className="flex items-center space-x-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Input Biaya Toko</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran', 'penarikan_investor')}
                className="flex items-center space-x-2 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>+ Pengeluaran Pribadi</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran', 'disetor_investor')}
                className="flex items-center space-x-2 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95"
              >
                <Target className="w-4 h-4" />
                <span>+ Catat Setoran</span>
              </button>
            </div>
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
                    Nilai transaksi kotor layanan (Tersimpan di tabel <code className="text-emerald-800 font-mono font-bold">daily_omzet</code>).
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
                    {userProfile?.role === 'investor' && (
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
                    : 'Belum ada input omzet hari ini'}
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SEKSI 2: ARUS KAS MASUK & KELUAR (PENERIMAAN VS PENGELUARAN) */}
          {/* ========================================================= */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-lg sm:text-xl">Arus Uang Masuk & Uang Keluar (Penerimaan vs Pengeluaran)</h3>
              <p className="text-sm font-medium text-slate-600">
                Pencatatan uang masuk kasir/bank, biaya operasional toko, dan pengeluaran pribadi pemilik di buku transaksi (<code className="text-sky-800 font-mono font-bold">transactions</code>).
              </p>
            </div>

            {/* Ringkasan Hari Ini */}
            <div className="bg-slate-100/90 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Penerimaan & Pengeluaran Hari Ini ({todayStr})</span>
                <span className="text-xs sm:text-sm font-bold text-slate-600">{todayTxs.length} Transaksi Hari Ini</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Cash Hari Ini */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase">Kasir Tunai (Cash)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {todayIncomeCashTxs.length} Nota
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">{formatRupiah(todayIncomeCash)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">{todayIncomeCashTxs.length} nota kasir terbayar</div>
                </div>

                {/* Transfer Hari Ini */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase">Transfer Bank</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      {todayIncomeTransferTxs.length} Nota
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">{formatRupiah(todayIncomeTransfer)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">{todayIncomeTransferTxs.length} transfer bank terbayar</div>
                </div>

                {/* Biaya Toko Hari Ini */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-600 uppercase block mb-1">Biaya Toko Hari Ini</span>
                  <div className="text-xl sm:text-2xl font-black text-rose-600">{formatRupiah(todayExpenseTotal - todayPersonalExpense)}</div>
                  <div className="text-[11px] font-semibold text-rose-600 mt-1">Operasional & Setoran</div>
                </div>

                {/* Pengeluaran Pribadi Hari Ini */}
                <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
                  <span className="text-xs font-bold text-purple-800 uppercase block mb-1">Prive Pribadi Hari Ini</span>
                  <div className="text-xl sm:text-2xl font-black text-purple-700">{formatRupiah(todayPersonalExpense)}</div>
                  <div className="text-[11px] font-semibold text-purple-600 mt-1">Penarikan Pemilik</div>
                </div>

                {/* Total Uang Masuk Hari Ini */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase">Total Penerimaan</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {todayIncomeTotalCount} Nota
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">{formatRupiah(todayIncomeCash + todayIncomeTransfer)}</div>
                  <div className="text-[11px] font-semibold text-emerald-700 mt-1">Total uang masuk</div>
                </div>
              </div>
            </div>

            {/* Pemisahan Dua Dompet: Rekening Bank (Pemilik) vs Kasir Tunai Toko */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="font-black text-slate-900 text-base sm:text-lg">
                    Pencatatan Rekening Bank (Pemilik) & Kasir Tunai Toko
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">
                    Pemisahan transparan antara uang masuk dan uang keluar pada Rekening Bank (Pemilik) dan Kasir Tunai Toko.
                  </p>
                </div>
              </div>

              {/* Highlight Pemasukan Pemilik vs Kasir Toko */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-sky-900 to-indigo-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex justify-between items-center border border-sky-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-sky-200 uppercase tracking-wider block">Total Pemasukan Bank (Rekening Pemilik)</span>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-500/30 text-sky-100 border border-sky-400/40">
                        {bankIncomeCount} Nota Terbayar
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                      {formatRupiah(bankIncome)}
                    </div>
                    <span className="text-xs text-sky-200 mt-1 block font-semibold">
                      Laundry: {formatRupiah(bankLaundryIncome)} ({bankLaundryIncomeTxs.length} nota) • Reparasi: {formatRupiah(bankReparasiIncome)} ({bankReparasiIncomeTxs.length} nota)
                    </span>
                  </div>
                  <div className="p-3 bg-white/10 text-sky-300 rounded-xl shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex justify-between items-center border border-emerald-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">Total Uang Masuk Kasir (Tunai Toko)</span>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                        {cashIncomeTxs.length} Nota Terbayar
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                      {formatRupiah(cashIncome)}
                    </div>
                    <span className="text-xs text-emerald-200 mt-1 block font-semibold">
                      Total {cashIncomeTxs.length} nota tunai terbayar di kasir toko
                    </span>
                  </div>
                  <div className="p-3 bg-white/10 text-emerald-300 rounded-xl shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* 3 KARTU DOMPET DETAIL */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* DOMPET 1: REKENING LAUNDRY */}
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
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer (Pemilik)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      BCA/Bank
                    </span>
                  </div>

                  <div className="space-y-3 pt-1 text-xs sm:text-sm">
                    {/* Transfer Masuk */}
                    <div className="bg-white/80 p-3 rounded-xl border border-sky-100 flex justify-between items-center">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                        <span className="text-base font-black text-emerald-700">{formatRupiah(bankLaundryIncome)}</span>
                      </div>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {bankLaundryIncomeTxs.length} Nota Terbayar
                      </span>
                    </div>

                    {/* Pengeluaran Bank & Rincian Transparan */}
                    <div className="bg-white/90 p-3 rounded-xl border border-sky-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block">Total Pengeluaran Bank</span>
                          <span className="text-base font-black text-rose-700">{formatRupiah(bankLaundryExpense)}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          {bankLaundryExpenseTxs.length} Transaksi
                        </span>
                      </div>

                      {/* Rincian Item Transparan agar Mami Lina Jelas */}
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1 font-semibold">
                        <div className="flex justify-between text-slate-700">
                          <span>• Sewa Laundry:</span>
                          <span className="font-bold text-slate-900">{formatRupiah(bankLaundrySewa)}</span>
                        </div>
                        {bankLaundrySetoran > 0 && (
                          <div className="flex justify-between text-slate-700">
                            <span>• Setoran ke Pemilik:</span>
                            <span className="font-bold text-slate-900">{formatRupiah(bankLaundrySetoran)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-700">
                          <span>• Biaya Operasional Bank:</span>
                          <span className="font-bold text-slate-900">{formatRupiah(bankLaundryOpsExpense)}</span>
                        </div>
                        {bankLaundryPribadi > 0 && (
                          <div className="flex justify-between text-purple-700 font-bold">
                            <span>• Penarikan Pribadi (Prive):</span>
                            <span>{formatRupiah(bankLaundryPribadi)}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 italic pt-0.5">
                          Operasional: Listrik (317k), PAM (85k), Servis (375k), Smartlink (56k), Name tag (50k).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DOMPET 2: REKENING REPARASI */}
                <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-5 rounded-2xl border-2 border-purple-300 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-purple-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2.5 bg-purple-600 text-white rounded-xl">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-purple-800 block">
                          Rekening Reparasi (Steril)
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer (Pemilik)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      BCA/Bank
                    </span>
                  </div>

                  <div className="space-y-3 pt-1 text-xs sm:text-sm">
                    {/* Transfer Masuk */}
                    <div className="bg-white/80 p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                        <span className="text-base font-black text-emerald-700">{formatRupiah(bankReparasiIncome)}</span>
                      </div>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {bankReparasiIncomeTxs.length} Nota Terbayar
                      </span>
                    </div>

                    {/* Pengeluaran Bank */}
                    <div className="bg-white/90 p-3 rounded-xl border border-purple-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block">Pengeluaran Bank</span>
                          <span className="text-base font-black text-rose-700">{formatRupiah(bankReparasiExpense)}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          {bankReparasiExpenseTxs.length} Transaksi
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1 font-semibold">
                        <div className="flex justify-between text-slate-700">
                          <span>• Gaji Bu Linna:</span>
                          <span className="font-bold text-slate-900">Rp 800.000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>• Pa Aris:</span>
                          <span className="font-bold text-slate-900">Rp 120.000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>• Sparepart & Bahan Reparasi:</span>
                          <span className="font-bold text-slate-900">Rp 205.000</span>
                        </div>
                        {personalExpenseRekReparasi > 0 && (
                          <div className="flex justify-between text-purple-700 font-bold">
                            <span>• Penarikan Pribadi (Prive):</span>
                            <span>{formatRupiah(personalExpenseRekReparasi)}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 italic pt-0.5">
                          Sparepart: Kepala resleting (105k), Kaki tas (36k), Webbing (32k), Kunci sodok (32k).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DOMPET 3: KASIR TUNAI TOKO */}
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
                        <span className="text-xs sm:text-sm font-bold text-slate-700">Operasional Kasir (Cash Toko)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Uang Tunai
                    </span>
                  </div>

                  <div className="space-y-3 pt-1 text-xs sm:text-sm">
                    {/* Cash Masuk */}
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block">Cash Masuk Toko</span>
                        <span className="text-base font-black text-emerald-700">{formatRupiah(cashIncome)}</span>
                      </div>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {cashIncomeTxs.length} Nota Terbayar
                      </span>
                    </div>

                    {/* Belanja Toko (Cash) */}
                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block">Pengeluaran Kasir (Cash)</span>
                          <span className="text-base font-black text-rose-700">{formatRupiah(cashExpense)}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {cashExpenseTxs.length} Transaksi
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1 font-semibold">
                        <div className="flex justify-between text-slate-700">
                          <span>• Gaji Yani (18 Okt):</span>
                          <span className="font-bold text-slate-900">Rp 360.000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>• Gaji Yani sebelumnya:</span>
                          <span className="font-bold text-slate-900">Rp 600.000</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>• Bensin, Gas & Harian Toko:</span>
                          <span className="font-bold text-slate-900">{formatRupiah(cashExpense - 960000 - personalExpenseCash)}</span>
                        </div>
                        {personalExpenseCash > 0 && (
                          <div className="flex justify-between text-purple-700 font-bold">
                            <span>• Penarikan Pribadi (Prive):</span>
                            <span>{formatRupiah(personalExpenseCash)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ========================================================= */}
              {/* KARTU KHUSUS: PENGELUARAN PRIBADI PEMILIK (PRIVE) */}
              {/* ========================================================= */}
              <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/50 p-5 rounded-2xl border-2 border-purple-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-purple-950 text-base sm:text-lg flex items-center gap-2">
                        <span>Pengeluaran Pribadi Pemilik (Prive Mami Lina)</span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                          {personalExpenseTxs.length} Transaksi
                        </span>
                      </h4>
                      <p className="text-xs text-purple-800 font-medium">
                        Penarikan dana keperluan pribadi Mami Lina dipisahkan dari biaya operasional toko agar laba toko tetap riil.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenTransactionModal('pengeluaran', 'penarikan_investor')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Catat Prive Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Total Prive Pribadi</span>
                    <span className="text-xl sm:text-2xl font-black text-purple-800 mt-0.5 block">{formatRupiah(totalPersonalExpense)}</span>
                    <span className="text-[11px] text-purple-700 font-semibold block mt-0.5">{personalExpenseTxs.length} kali penarikan dana</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Dari Kasir Tunai Toko</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 mt-0.5 block">{formatRupiah(personalExpenseCash)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Uang cash kasir</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Dari Rek. Laundry</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 mt-0.5 block">{formatRupiah(personalExpenseRekLaundry)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Transfer Bank BCA</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase block">Dari Rek. Reparasi</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 mt-0.5 block">{formatRupiah(personalExpenseRekReparasi)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Transfer Bank BCA</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-100/50 rounded-xl border border-purple-200 text-xs text-purple-900 font-semibold flex items-center justify-between">
                  <span>💡 <strong>Laba Operasional Bersih Toko (Sebelum Prive):</strong> {formatRupiah(operationalProfit)}</span>
                  <span><strong>Sisa Saldo Kas & Bank Riil:</strong> {formatRupiah(netBalance)}</span>
                </div>
              </div>

              {/* Baris Akumulasi Global Ringkas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase block">Total Penerimaan (Semua)</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700">{formatRupiah(totalIncome)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                      {allIncomeTxs.length} nota ({bankIncomeCount} transfer + {cashIncomeTxs.length} cash)
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    {allIncomeTxs.length} Nota Terbayar
                  </span>
                </div>

                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase block">Total Pengeluaran Toko Murni</span>
                    <span className="text-xl sm:text-2xl font-black text-rose-700">{formatRupiah(totalOperationalExpense)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                      Sewa, gaji, listrik, gas, servis
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    Biaya Toko
                  </span>
                </div>

                <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase block">Sisa Kas & Saldo Bank Riil</span>
                    <span className="text-xl sm:text-2xl font-black text-sky-800">{formatRupiah(netBalance)}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                      Total kas masuk dikurangi seluruh pengeluaran
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-md text-slate-700 border border-slate-200">
                    Kas Bersih
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

      {/* Omzet Modal */}
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
