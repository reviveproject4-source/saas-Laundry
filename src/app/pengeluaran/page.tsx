'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import PersonalExpenseChart from '@/components/PersonalExpenseChart';
import { Transaction, SubCategory, UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions, deleteTransactionFromSupabase } from '@/lib/transactions';
import { formatRupiah } from '@/lib/formatters';
import { PlusCircle, ArrowUpRight, ArrowDownLeft, Loader2, AlertTriangle, CreditCard } from 'lucide-react';

export default function PengeluaranPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubCategory, setModalSubCategory] = useState<SubCategory>('operasional');

  const handleOpenModal = (subCat: SubCategory) => {
    setModalSubCategory(subCat);
    setIsModalOpen(true);
  };

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

    const { data: txList, error: txErr } = await fetchTransactions();
    if (txErr) {
      setErrorMessage(txErr);
    } else {
      setTransactions(txList);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTransactionSuccess = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    setSuccessMessage('Pengeluaran berhasil disimpan.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await deleteTransactionFromSupabase(id);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setSuccessMessage('Data pengeluaran berhasil dihapus.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat data pengeluaran...</span>
        </div>
      </div>
    );
  }

  const allExpenseTxs = transactions.filter((t) => t.type === 'pengeluaran');

  // 1. Murni Biaya Operasional Toko
  const storeOpsTxs = allExpenseTxs.filter(
    (t) =>
      t.sub_category !== 'penarikan_investor' &&
      t.sub_category !== 'pengeluaran_pribadi' &&
      t.sub_category !== 'disetor_investor'
  );
  const totalStoreOps = storeOpsTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  const opsBank = storeOpsTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const opsCash = storeOpsTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // 2. Ambil Dana Usaha tuk Pribadi / Belanja QRIS (Debit Pribadi)
  const priveDebitTxs = allExpenseTxs.filter((t) => t.sub_category === 'penarikan_investor');
  const totalPriveDebit = priveDebitTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  // 3. Belanja Pribadi via QRIS / Toko
  const storeDirectSpentTxs = priveDebitTxs.filter((t) => {
    const note = (t.notes || '').toLowerCase();
    return note.includes('belanja') || note.includes('qris') || !note.includes('tarik dana usaha ke kantong');
  });
  const totalStoreDirectSpent = storeDirectSpentTxs.reduce((acc, t) => acc + Number(t.amount), 0);

  // 4. Belanja Mandiri
  const independentPersonalTxs = allExpenseTxs.filter(
    (t) => t.sub_category === 'pengeluaran_pribadi' && !t.bank_account && t.business_unit === 'pribadi'
  );
  const totalPersonalCredit = totalStoreDirectSpent + independentPersonalTxs.reduce((acc, t) => acc + Number(t.amount), 0);
  const personalBalance = totalPriveDebit - totalPersonalCredit;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center space-x-2 shadow-xs">
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pengeluaran (Usaha)</h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenModal('operasional')}
                className="flex items-center space-x-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Biaya Toko</span>
              </button>
              <button
                onClick={() => handleOpenModal('pengeluaran_pribadi')}
                className="flex items-center space-x-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>+ Belanja Pribadi (QRIS)</span>
              </button>
              <button
                onClick={() => handleOpenModal('penarikan_investor')}
                className="flex items-center space-x-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Tarik Kas Toko</span>
              </button>
            </div>
          </div>

          {/* Widgets Pengeluaran Terpisah */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Biaya Toko Murni */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-rose-800 uppercase">1. Biaya Usaha Toko</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700">{formatRupiah(totalStoreOps)}</div>
              <div className="text-xs text-slate-500 font-semibold">Bank: {formatRupiah(opsBank)} • Kasir: {formatRupiah(opsCash)}</div>
            </div>

            {/* 2. Belanja Pribadi via QRIS / Toko */}
            <div className="bg-purple-50/70 p-5 rounded-2xl border-2 border-purple-300 shadow-sm space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-purple-900 uppercase">2. Belanja Pribadi (QRIS)</span>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-800">{formatRupiah(totalStoreDirectSpent)}</div>
              <div className="text-xs text-purple-900 font-semibold">Uang toko dipakai belanja QRIS</div>
            </div>

            {/* 3. Tarik Kas Toko ke Dompet Pribadi */}
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-300 shadow-sm space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-amber-900 uppercase">3. Ambil Dana Usaha</span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-800">{formatRupiah(totalPriveDebit)}</div>
              <div className="text-xs text-amber-900 font-semibold">{priveDebitTxs.length} kali penarikan ke pribadi</div>
            </div>

            {/* 4. Sisa Saldo Pribadi */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-300 uppercase">Neraca Kas Pribadi</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                  Balance
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400">{formatRupiah(Math.abs(personalBalance))}</div>
              <div className="text-xs text-slate-300 font-semibold">Debit: {formatRupiah(totalPriveDebit)} • Kredit: {formatRupiah(totalPersonalCredit)}</div>
            </div>

          </div>

          {/* Grafik Komposisi Pengeluaran Pribadi */}
          <PersonalExpenseChart transactions={allExpenseTxs} />

          {/* Expense Table */}
          <TransactionTable
            title="Data Riwayat Seluruh Pengeluaran Usaha"
            transactions={allExpenseTxs}
            userProfile={userProfile}
            onDeleteTransaction={handleDeleteTransaction}
          />

        </main>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        userProfile={userProfile}
        defaultType="pengeluaran"
        defaultSubCategory={modalSubCategory}
      />
    </div>
  );
}
