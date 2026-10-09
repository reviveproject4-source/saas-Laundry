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
import { PlusCircle, ArrowUpRight, ShoppingCart, Send, UserX, Loader2, AlertTriangle } from 'lucide-react';

export default function PengeluaranPage() {
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

  const expenseTxs = transactions.filter((t) => t.type === 'pengeluaran');

  const totalExpense = expenseTxs.reduce((acc, t) => acc + Number(t.amount), 0);
  
  const totalOperasional = expenseTxs
    .filter((t) => t.sub_category !== 'disetor_investor' && t.sub_category !== 'penarikan_investor')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalDisetor = expenseTxs
    .filter((t) => t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalPenarikan = expenseTxs
    .filter((t) => t.sub_category === 'penarikan_investor')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenantProfile} />

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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Menu Pengeluaran Operasional</h2>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                Pencatatan pengeluaran biaya (Fixed Cost & Variable Cost) untuk unit Laundry dan Reparasi.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Pengeluaran</span>
            </button>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase">Total Pengeluaran</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600">{formatRupiah(totalExpense)}</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Semua Jenis Pengeluaran</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase">Operasional & Gas</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{formatRupiah(totalOperasional)}</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Gas, Detergen, Belanja</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase">Disetor ke Investor</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">{formatRupiah(totalDisetor)}</div>
              <div className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">Dari Pengelola</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase">Penarikan Investor</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserX className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">{formatRupiah(totalPenarikan)}</div>
              <div className="text-xs sm:text-sm font-semibold text-indigo-700 mt-1">Penarikan Uang (Prive)</div>
            </div>

          </div>

          {/* Expense Table */}
          <TransactionTable
            title="Data Pengeluaran, Pembelian & Disetor"
            transactions={expenseTxs}
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
      />
    </div>
  );
}
