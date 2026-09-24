'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
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

  const handleTransactionSuccess = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await deleteTransactionFromSupabase(id);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat data penerimaan dari Supabase...</span>
        </div>
      </div>
    );
  }

  const incomeTxs = transactions.filter((t) => t.type === 'penerimaan');

  const totalIncome = incomeTxs.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalCash = incomeTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalTransfer = incomeTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenantProfile} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Menu Penerimaan Uang</h2>
              <p className="text-xs text-slate-500">
                Pencatatan data uang diterima (Omset Laundry, Reparasi, Cash & Transfer) dari Supabase.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Uang Diterima</span>
            </button>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Uang Diterima</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{formatRupiah(totalIncome)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Laundry + Reparasi</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Penerimaan Cash</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-800">{formatRupiah(totalCash)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Uang Tunai Kasir</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Penerimaan Transfer</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-800">{formatRupiah(totalTransfer)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Transfer Bank / QRIS</div>
            </div>
          </div>

          {/* Income Table */}
          <TransactionTable
            title="Data Penerimaan Uang (Cash & Transfer)"
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
