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
import { formatRupiah, formatDateIndo } from '@/lib/formatters';
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
  ShoppingCart,
  Receipt,
  Sparkles,
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
        ? 'Penerimaan toko berhasil disimpan.'
        : newTx.sub_category === 'penarikan_investor'
        ? 'Ambil dana usaha (Debit Pribadi) berhasil disimpan.'
        : newTx.sub_category === 'pengeluaran_pribadi'
        ? 'Pengeluaran keperluan pribadi (Kredit) berhasil disimpan.'
        : newTx.sub_category === 'disetor_investor'
        ? 'Setoran target berhasil disimpan.'
        : 'Biaya operasional toko berhasil disimpan.';
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

  // =========================================================================
  // 1. PEMISAHAN FUNDAMENTAL: DANA USAHA VS DANA PRIBADI (AKUNTANSI BERSIH)
  // =========================================================================

  // A. Penerimaan Usaha (Uang Masuk dari Pelanggan Toko)
  const allIncomeTxs = transactions.filter((t) => t.type === 'penerimaan');
  const totalStoreIncome = allIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // B. Biaya Operasional Toko (Murni Pengeluaran Usaha Toko)
  // Tidak memuat penarikan pribadi, tidak memuat belanja pribadi, tidak memuat setoran investor!
  const storeOpsTxs = transactions.filter(
    (t) =>
      t.type === 'pengeluaran' &&
      t.sub_category !== 'penarikan_investor' &&
      t.sub_category !== 'pengeluaran_pribadi' &&
      t.sub_category !== 'disetor_investor'
  );
  const totalStoreOpsExpense = storeOpsTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // C. Margin Usaha Toko (Laba Bersih Toko) -> TIDAK MEMOTONG DANA PRIBADI!
  const storeMargin = totalStoreIncome - totalStoreOpsExpense;
  const storeMarginPercentage = totalStoreIncome > 0 ? ((storeMargin / totalStoreIncome) * 100).toFixed(1) : '0';

  // D. Aliran Dana Pribadi Mami Lina & Pengurangan Akuntansi Riil
  // 1. DEBIT: Uang usaha yang ditarik untuk kantong pribadi / belanja langsung via QRIS/Toko
  const priveDebitTxs = transactions.filter((t) => t.sub_category === 'penarikan_investor');
  const totalPriveDebit = priveDebitTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const priveDebitCash = priveDebitTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const priveDebitRekLaundry = priveDebitTxs
    .filter((t) => t.bank_account === 'rekening_laundry' || (!t.bank_account && t.payment_method === 'transfer' && t.business_unit !== 'reparasi'))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const priveDebitRekReparasi = priveDebitTxs
    .filter((t) => t.bank_account === 'rekening_reparasi' || (!t.bank_account && t.payment_method === 'transfer' && t.business_unit === 'reparasi'))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 2. KREDIT: Seluruh belanja pribadi Mami Lina
  // Transaksi belanja langsung dari toko (QRIS / Belanja Toko)
  const storeDirectSpentTxs = priveDebitTxs.filter((t) => {
    const note = (t.notes || '').toLowerCase();
    return note.includes('belanja') || note.includes('qris') || !note.includes('tarik dana usaha ke kantong');
  });
  const totalStoreDirectSpent = storeDirectSpentTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Transaksi belanja mandiri di luar toko
  const independentPersonalTxs = transactions.filter(
    (t) => t.type === 'pengeluaran' && t.sub_category === 'pengeluaran_pribadi' && !t.bank_account && t.business_unit === 'pribadi'
  );
  const totalIndependentPersonal = independentPersonalTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const personalCreditTxs = [...storeDirectSpentTxs, ...independentPersonalTxs];
  const totalPersonalCredit = totalStoreDirectSpent + totalIndependentPersonal;

  // 3. Total Belanja Pribadi dari Dana Usaha (Yang Tidak Terasa)
  const totalStoreFundedPersonal = totalPriveDebit;

  // 4. Sisa Saldo Dana Pribadi Mami Lina = DEBIT - KREDIT (Balance)
  const personalBalance = totalPriveDebit - totalPersonalCredit;

  // 5. Sisa Kas Riil Usaha Toko (Angka Real Akuntansi)
  const realNetStoreCash = storeMargin - totalStoreFundedPersonal;

  // =========================================================================
  // 2. DETAIL TIGA DOMPET USAHA (REK LAUNDRY, REK REPARASI, KASIR TOKO)
  // =========================================================================
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

  // 1. Rekening Laundry (BCA)
  const bankLaundryIncomeTxs = allIncomeTxs.filter(isRekeningLaundry);
  const bankLaundryIncome = bankLaundryIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const bankLaundryOpsExpenseTxs = storeOpsTxs.filter(isRekeningLaundry);
  const bankLaundryOpsExpense = bankLaundryOpsExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const bankLaundrySewa = bankLaundryOpsExpenseTxs
    .filter((t) => (t.notes || '').toLowerCase().includes('sewa'))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const bankLaundryOpsOther = bankLaundryOpsExpense - bankLaundrySewa;

  const bankLaundryBalance = bankLaundryIncome - bankLaundryOpsExpense - priveDebitRekLaundry;

  // 2. Rekening Reparasi (BCA)
  const bankReparasiIncomeTxs = allIncomeTxs.filter(isRekeningReparasi);
  const bankReparasiIncome = bankReparasiIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const bankReparasiOpsExpenseTxs = storeOpsTxs.filter(isRekeningReparasi);
  const bankReparasiOpsExpense = bankReparasiOpsExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const bankReparasiBalance = bankReparasiIncome - bankReparasiOpsExpense - priveDebitRekReparasi;

  // Total Bank
  const bankIncome = bankLaundryIncome + bankReparasiIncome;
  const bankIncomeCount = bankLaundryIncomeTxs.length + bankReparasiIncomeTxs.length;

  // 3. Kasir Tunai Toko (Cash)
  const cashIncomeTxs = allIncomeTxs.filter((t) => t.payment_method === 'cash');
  const cashIncome = cashIncomeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const cashOpsExpenseTxs = storeOpsTxs.filter((t) => t.payment_method === 'cash');
  const cashOpsExpense = cashOpsExpenseTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const cashBalance = cashIncome - cashOpsExpense - priveDebitCash;

  // Total Sisa Kas & Bank Fisik Toko
  const totalStoreCashAndBank = bankLaundryBalance + bankReparasiBalance + cashBalance;

  // =========================================================================
  // 3. KALKULASI HARI INI
  // =========================================================================
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

  const todayStoreOpsTxs = todayTxs.filter(
    (t) =>
      t.type === 'pengeluaran' &&
      t.sub_category !== 'penarikan_investor' &&
      t.sub_category !== 'pengeluaran_pribadi' &&
      t.sub_category !== 'disetor_investor'
  );
  const todayStoreOpsExpense = todayStoreOpsTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const todayPriveDebitTxs = todayTxs.filter((t) => t.sub_category === 'penarikan_investor');
  const todayPriveDebit = todayPriveDebitTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const todayPersonalCreditTxs = todayTxs.filter((t) => t.sub_category === 'pengeluaran_pribadi');
  const todayPersonalCredit = todayPersonalCreditTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Target Setoran Bulan Ini
  const monthTxs = transactions.filter((t) => t.transaction_date && t.transaction_date.startsWith(currentMonthPrefix));
  const monthDisetor = monthTxs
    .filter((t) => t.type === 'pengeluaran' && t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Data Grafik 6 Hari Terakhir (Murni dari public.daily_omzet)
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

  // Data Grafik 6 Bulan Terakhir (Murni dari public.daily_omzet)
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

          {/* Header & Quick Action Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Halaman Utama (Dashboard)</h2>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                  Mami Lina
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Dompetku - Kelola Keuangan: Saas khusus tuk keuangan pemilik usaha.
              </p>
            </div>

            {/* Tombol Aksi Cepat */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsOmzetModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Input Omzet</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('penerimaan')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Penerimaan Toko</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran', 'operasional')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Biaya Toko</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran', 'pengeluaran_pribadi')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>+ Belanja Pribadi (QRIS/Toko)</span>
              </button>
              <button
                onClick={() => handleOpenTransactionModal('pengeluaran', 'penarikan_investor')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Tarik Kas Toko</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* HIGHLIGHT UTAMA: PERFORMA DANA USAHA & ARUS KAS PRIBADI */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Kartu 1: Laba Operasional Toko */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                  Laba Operasional Toko
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {storeMarginPercentage}% Laba
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {formatRupiah(storeMargin)}
              </div>
              <div className="text-xs text-emerald-100 font-medium">
                Omzet: {formatRupiah(totalStoreIncome)} - Biaya: {formatRupiah(totalStoreOpsExpense)}
              </div>
              <div className="pt-1 text-[11px] text-emerald-200 font-semibold border-t border-emerald-500/40">
                🏢 Performa murni efisiensi bisnis toko laundry & reparasi.
              </div>
            </div>

            {/* Kartu 2: Belanja Pribadi / QRIS Toko (Yang Tidak Terasa) */}
            <div className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                  Belanja Pribadi (QRIS/Toko)
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-200 border border-purple-400/30">
                  Yang Tidak Terasa
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {formatRupiah(totalStoreFundedPersonal)}
              </div>
              <div className="text-xs text-purple-200 font-medium">
                🔻 Pengurang Laba Toko (Prive Belanja Pribadi)
              </div>
              <div className="pt-1 text-[11px] text-purple-300 font-semibold border-t border-purple-500/40">
                Laundry: {formatRupiah(priveDebitRekLaundry)} • Rep: {formatRupiah(priveDebitRekReparasi)} • Cash: {formatRupiah(priveDebitCash)}
              </div>
            </div>

            {/* Kartu 3: Sisa Kas Riil Usaha Toko (Angka Real Nyata) */}
            <div className="bg-gradient-to-br from-sky-600 to-blue-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-sky-100">
                  Sisa Kas Riil Toko
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Angka Real
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {formatRupiah(realNetStoreCash)}
              </div>
              <div className="text-xs text-sky-100 font-medium">
                Laba Toko ({formatRupiah(storeMargin)}) - Belanja Pribadi ({formatRupiah(totalStoreFundedPersonal)})
              </div>
              <div className="pt-1 text-[11px] text-sky-200 font-semibold border-t border-sky-500/40">
                💎 Saldo aktual yang benar-benar tersisa di bank & kasir toko.
              </div>
            </div>

            {/* Kartu 4: Neraca Kas Pribadi Mami Lina (Balance 2 Sisi) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-2 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Neraca Pribadi Mami Lina
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                  Balance (Seimbang)
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatRupiah(Math.abs(personalBalance))}
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Debit Ambil: {formatRupiah(totalPriveDebit)} • Kredit Belanja: {formatRupiah(totalPersonalCredit)}
              </div>
              <div className="pt-1 text-[11px] text-slate-400 font-semibold border-t border-slate-700">
                ⚖️ Asas Akuntansi Berpasangan: Seimbang Otomatis!
              </div>
            </div>

          </div>

          {/* BANNER REAL AKUNTANSI: PERSAMAAN DASAR DANA USAHA & PRIBADI */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs font-bold text-slate-600">
              <span className="flex items-center space-x-1.5 text-blue-950 font-black">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Prinsip Akuntansi Nyata: Aliran Dana Usaha vs Belanja Pribadi QRIS</span>
              </span>
              <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Sinkron 100% dengan Mutasi m-BCA
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center pt-1">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">1. Omzet Usaha</div>
                <div className="text-sm font-black text-slate-900">{formatRupiah(totalStoreIncome)}</div>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-rose-600 uppercase">2. Biaya Toko (-)</div>
                <div className="text-sm font-black text-rose-700">{formatRupiah(totalStoreOpsExpense)}</div>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">3. Laba Operasi Toko</div>
                <div className="text-sm font-black text-emerald-800">{formatRupiah(storeMargin)}</div>
              </div>
              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                <div className="text-[10px] font-bold text-purple-700 uppercase">4. Belanja QRIS / Toko (-)</div>
                <div className="text-sm font-black text-purple-800">{formatRupiah(totalStoreFundedPersonal)}</div>
              </div>
              <div className="bg-sky-50 p-2.5 rounded-xl border-2 border-sky-300">
                <div className="text-[10px] font-black text-sky-800 uppercase">5. Sisa Kas Riil Toko</div>
                <div className="text-sm font-black text-sky-900">{formatRupiah(realNetStoreCash)}</div>
              </div>
            </div>
          </div>

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
                    <button
                      onClick={() => setIsOmzetModalOpen(true)}
                      className="text-xs sm:text-sm font-bold px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition active:scale-95 shadow-xs"
                    >
                      + Input Sekarang
                    </button>
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
          {/* SEKSI 2: KEUANGAN USAHA TOKO TRIO R (3 KANTONG DOMPET) */}
          {/* ========================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl flex items-center gap-2">
                  <span>Dana Usaha Toko Trio R (Pemisahan 3 Kantong)</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Sisa Kas/Bank Toko: {formatRupiah(totalStoreCashAndBank)}
                  </span>
                </h3>
                <p className="text-sm font-medium text-slate-600">
                  Uang masuk pelanggan, biaya operasional toko, dan aliran penarikan dana usaha ke pribadi.
                </p>
              </div>
            </div>

            {/* 3 KARTU KANTONG DOMPET USAHA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* DOMPET 1: REKENING LAUNDRY (BCA) */}
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
                      <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer BCA (Laundry)</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    BCA
                  </span>
                </div>

                <div className="space-y-2.5 pt-1 text-xs sm:text-sm">
                  {/* Transfer Masuk */}
                  <div className="bg-white/90 p-3 rounded-xl border border-sky-100 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                      <span className="text-base font-black text-emerald-700">{formatRupiah(bankLaundryIncome)}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {bankLaundryIncomeTxs.length} Nota
                    </span>
                  </div>

                  {/* Biaya Operasional Toko */}
                  <div className="bg-white/90 p-3 rounded-xl border border-sky-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600 block">Biaya Operasional Toko</span>
                      <span className="text-base font-black text-rose-700">{formatRupiah(bankLaundryOpsExpense)}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5 font-medium">
                      <div className="flex justify-between">
                        <span>• Sewa Laundry:</span>
                        <span className="font-bold text-slate-800">{formatRupiah(bankLaundrySewa)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Operasional Bank:</span>
                        <span className="font-bold text-slate-800">{formatRupiah(bankLaundryOpsOther)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic pt-0.5">Listrik, PAM, Servis mesin, Smartlink, Name tag.</p>
                    </div>
                  </div>

                  {/* Ambil ke Pribadi */}
                  {priveDebitRekLaundry > 0 && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between items-center text-xs text-amber-900 font-bold">
                      <span>• Ditarik ke Pribadi (Debit):</span>
                      <span className="text-amber-800 font-black">{formatRupiah(priveDebitRekLaundry)}</span>
                    </div>
                  )}

                  {/* Sisa Saldo Rekening */}
                  <div className="bg-sky-100/70 p-3 rounded-xl border border-sky-200 flex justify-between items-center">
                    <span className="text-xs font-black text-sky-950 uppercase">Sisa Saldo Rek. Laundry</span>
                    <span className="text-base font-black text-sky-900">{formatRupiah(bankLaundryBalance)}</span>
                  </div>
                </div>
              </div>

              {/* DOMPET 2: REKENING REPARASI (BCA) */}
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
                      <span className="text-xs sm:text-sm font-bold text-slate-700">Bank Transfer BCA (Reparasi)</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    BCA
                  </span>
                </div>

                <div className="space-y-2.5 pt-1 text-xs sm:text-sm">
                  {/* Transfer Masuk */}
                  <div className="bg-white/90 p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">Transfer Masuk</span>
                      <span className="text-base font-black text-emerald-700">{formatRupiah(bankReparasiIncome)}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {bankReparasiIncomeTxs.length} Nota
                    </span>
                  </div>

                  {/* Biaya Operasional Toko */}
                  <div className="bg-white/90 p-3 rounded-xl border border-purple-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600 block">Biaya Operasional Toko</span>
                      <span className="text-base font-black text-rose-700">{formatRupiah(bankReparasiOpsExpense)}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5 font-medium">
                      <div className="flex justify-between">
                        <span>• Gaji Bu Linna:</span>
                        <span className="font-bold text-slate-800">Rp 800.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Pa Aris (Reparasi):</span>
                        <span className="font-bold text-slate-800">Rp 120.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Sparepart Reparasi:</span>
                        <span className="font-bold text-slate-800">Rp 205.000</span>
                      </div>
                    </div>
                  </div>

                  {/* Ambil ke Pribadi */}
                  {priveDebitRekReparasi > 0 && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between items-center text-xs text-amber-900 font-bold">
                      <span>• Ditarik ke Pribadi (Debit):</span>
                      <span className="text-amber-800 font-black">{formatRupiah(priveDebitRekReparasi)}</span>
                    </div>
                  )}

                  {/* Sisa Saldo Rekening */}
                  <div className="bg-purple-100/70 p-3 rounded-xl border border-purple-200 flex justify-between items-center">
                    <span className="text-xs font-black text-purple-950 uppercase">Sisa Saldo Rek. Reparasi</span>
                    <span className="text-base font-black text-purple-900">{formatRupiah(bankReparasiBalance)}</span>
                  </div>
                </div>
              </div>

              {/* DOMPET 3: KASIR TUNAI TOKO (CASH) */}
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
                    Cash Toko
                  </span>
                </div>

                <div className="space-y-2.5 pt-1 text-xs sm:text-sm">
                  {/* Cash Masuk */}
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">Cash Masuk Toko</span>
                      <span className="text-base font-black text-emerald-700">{formatRupiah(cashIncome)}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {cashIncomeTxs.length} Nota
                    </span>
                  </div>

                  {/* Belanja Operasional Toko */}
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600 block">Belanja Operasional Toko (Cash)</span>
                      <span className="text-base font-black text-rose-700">{formatRupiah(cashOpsExpense)}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5 font-medium">
                      <div className="flex justify-between">
                        <span>• Gaji Yani (18 Okt):</span>
                        <span className="font-bold text-slate-800">Rp 360.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Gaji Yani sebelumnya:</span>
                        <span className="font-bold text-slate-800">Rp 600.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Bensin, Gas & Harian Toko:</span>
                        <span className="font-bold text-slate-800">{formatRupiah(cashOpsExpense - 960000)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ambil ke Pribadi */}
                  {priveDebitCash > 0 && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between items-center text-xs text-amber-900 font-bold">
                      <span>• Ditarik ke Pribadi (Debit):</span>
                      <span className="text-amber-800 font-black">{formatRupiah(priveDebitCash)}</span>
                    </div>
                  )}

                  {/* Sisa Saldo Kasir */}
                  <div className="bg-emerald-100/70 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-950 uppercase">Sisa Fisik Kasir Tunai</span>
                    <span className="text-base font-black text-emerald-900">{formatRupiah(cashBalance)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SEKSI 3: KEUANGAN PRIBADI MAMI LINA (LAPORAN TERPISAH) */}
          {/* ========================================================= */}
          <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/50 p-6 sm:p-7 rounded-3xl border-2 border-purple-300 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-purple-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-purple-950 text-xl sm:text-2xl">
                      Laporan Terpisah: Arus Kas Pribadi Mami Lina
                    </h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 uppercase">
                      SaaS Pribadi
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-purple-800 font-medium mt-0.5">
                    Pemisahan total: Ambil dana usaha tuk pribadi (Debit) vs Input pengeluaran keperluan pribadi (Kredit).
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran', 'penarikan_investor')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-2xs"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>+ Ambil Usaha (Debit)</span>
                </button>
                <button
                  onClick={() => handleOpenTransactionModal('pengeluaran', 'pengeluaran_pribadi')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-2xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>+ Belanja Pribadi (Kredit)</span>
                </button>
              </div>
            </div>

            {/* 3 Metrik Terpisah Dana Pribadi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Kolom 1: DEBIT (Dana Usaha Diambil) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-200 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide flex items-center">
                    <ArrowDownLeft className="w-4 h-4 mr-1 text-amber-600" />
                    1. Uang Masuk Pribadi (DEBIT)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {priveDebitTxs.length} Transaksi
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-700">
                  {formatRupiah(totalPriveDebit)}
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Total dana yang ditarik dari kas/bank usaha toko untuk modal kantong pribadi Mami Lina.
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-700 space-y-0.5 font-semibold">
                  <div className="flex justify-between">
                    <span>• Dari Rek. Reparasi:</span>
                    <span>{formatRupiah(priveDebitRekReparasi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Dari Rek. Laundry:</span>
                    <span>{formatRupiah(priveDebitRekLaundry)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Dari Kasir Toko:</span>
                    <span>{formatRupiah(priveDebitCash)}</span>
                  </div>
                </div>
              </div>

              {/* Kolom 2: KREDIT (Pengeluaran Belanja Pribadi) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-200 shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wide flex items-center">
                    <ShoppingCart className="w-4 h-4 mr-1 text-purple-600" />
                    2. Pengeluaran Pribadi (KREDIT)
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                    {personalCreditTxs.length} Transaksi
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-700">
                  {formatRupiah(totalPersonalCredit)}
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Total belanja untuk kebutuhan pribadi Mami Lina (dapur, pakaian, anak, uang saku).
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-purple-800 font-bold">
                  🔒 Tidak memotong dana toko & tidak memotong margin usaha toko.
                </div>
              </div>

              {/* Kolom 3: Sisa Saldo Dana Pribadi */}
              <div className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-purple-200 uppercase tracking-wide flex items-center">
                    <Wallet className="w-4 h-4 mr-1 text-purple-300" />
                    3. Sisa Saldo Pribadi Mami
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Siap Pakai
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {formatRupiah(personalBalance)}
                </div>
                <p className="text-xs text-purple-200 font-medium leading-relaxed">
                  Sisa dana pribadi yang masih dipegang Mami Lina (Debit dikurangi Kredit belanja).
                </p>
                <div className="pt-2 border-t border-purple-500/40 text-[11px] text-purple-200 font-semibold flex justify-between">
                  <span>Rumus:</span>
                  <span>DEBIT ({formatRupiah(totalPriveDebit)}) - KREDIT ({formatRupiah(totalPersonalCredit)})</span>
                </div>
              </div>

            </div>

            {/* Riwayat Transaksi Pribadi Mami Lina (Debit & Kredit) */}
            <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
              <div className="p-4 bg-purple-50/70 border-b border-purple-100 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-black text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <span>Riwayat Aliran Kas Pribadi Mami Lina</span>
                </span>
                <span className="text-xs font-bold text-purple-800">
                  Total {priveDebitTxs.length + personalCreditTxs.length} Catatan Pribadi
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {priveDebitTxs.length === 0 && personalCreditTxs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-semibold">
                    Belum ada catatan mutasi dana pribadi. Gunakan tombol di atas untuk mencatat penarikan dari usaha atau belanja pribadi.
                  </div>
                ) : (
                  [...priveDebitTxs, ...personalCreditTxs]
                    .sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1))
                    .map((item) => {
                      const isDebit = item.sub_category === 'penarikan_investor';
                      return (
                        <div key={item.id} className="p-3.5 sm:p-4 hover:bg-slate-50 flex justify-between items-center transition">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl shrink-0 ${isDebit ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
                              {isDebit ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  isDebit ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-purple-100 text-purple-900 border border-purple-300'
                                }`}>
                                  {isDebit ? 'Debit: Ambil Dana Usaha' : 'Kredit: Belanja Pribadi'}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {formatDateIndo(item.transaction_date)}
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                                {item.notes || (isDebit ? 'Penarikan dana usaha ke pribadi' : 'Belanja kebutuhan pribadi')}
                              </div>
                              {isDebit && (
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Sumber: {item.bank_account === 'rekening_reparasi' ? 'Rekening Reparasi BCA' : item.bank_account === 'rekening_laundry' ? 'Rekening Laundry BCA' : 'Kasir Tunai Toko (Cash)'}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-sm sm:text-base font-black ${isDebit ? 'text-amber-700' : 'text-purple-700'}`}>
                              {isDebit ? '+' : '-'} {formatRupiah(item.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
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
