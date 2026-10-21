'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import { Transaction, UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions, deleteTransactionFromSupabase } from '@/lib/transactions';
import { formatRupiah } from '@/lib/formatters';
import { PlusCircle, ArrowDownLeft, Banknote, CreditCard, Loader2, AlertTriangle } from 'lucide-react';

export default function PenerimaanPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setSuccessMessage('Pemasukan berhasil disimpan.');
    setTimeout(() => setSuccessMessage(null), 4000);
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
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat data pemasukkan...</span>
        </div>
      </div>
    );
  }

  const incomeTxs = transactions.filter((t) => t.type === 'penerimaan');

  const totalIncome = incomeTxs.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalCash = incomeTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount), 0);
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

  const totalTransferLaundry = incomeTxs
    .filter(isRekeningLaundry)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalTransferReparasi = incomeTxs
    .filter(isRekeningReparasi)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalTransfer = totalTransferLaundry + totalTransferReparasi;

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
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pemasukkan (Usaha)</h2>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Pemasukkan</span>
            </button>
          </div>

          {/* Widgets Penerimaan Tiga Dompet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rekening Laundry */}
            <div className="bg-sky-50/60 p-5 rounded-2xl border-2 border-sky-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-sky-900 uppercase">Rekening Laundry</span>
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-900">{formatRupiah(totalTransferLaundry)}</div>
              <div className="text-xs font-semibold text-sky-800 mt-1">Transfer Bank</div>
            </div>

            {/* Rekening Reparasi */}
            <div className="bg-purple-50/60 p-5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-purple-900 uppercase">Rekening Reparasi</span>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-900">{formatRupiah(totalTransferReparasi)}</div>
              <div className="text-xs font-semibold text-purple-800 mt-1">Transfer Bank</div>
            </div>

            {/* Kasir Tunai Toko */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border-2 border-emerald-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-900 uppercase">Kasir Tunai (Cash)</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">{formatRupiah(totalCash)}</div>
              <div className="text-xs font-semibold text-emerald-800 mt-1">Uang Kasir Toko</div>
            </div>

            {/* Total Seluruh Penerimaan */}
            <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase">Total Pemasukkan</span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(totalIncome)}</div>
              <div className="text-xs font-bold text-slate-600 mt-1">Bank ({formatRupiah(totalTransfer)}) + Cash</div>
            </div>
          </div>

          {/* Income Table */}
          <TransactionTable
            title="Data Pemasukkan Usaha (Cash & Transfer)"
            transactions={incomeTxs}
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
        defaultType="penerimaan"
      />
    </div>
  );
}
