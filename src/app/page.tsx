'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TargetProgress from '@/components/TargetProgress';
import RevenueChart from '@/components/RevenueChart';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import { Transaction, UserRole } from '@/lib/types';
import { getInitialUserRole, setUserRoleStore, getTransactionsStore, saveTransactionsStore } from '@/lib/store';
import { formatRupiah } from '@/lib/formatters';
import { PlusCircle, Banknote, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('pengelola');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentRole(getInitialUserRole());
    
    // Purge any lingering dummy data from localStorage to ensure 100% clean state
    const saved = localStorage.getItem('laundry_transactions_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If old mock items exist (ids starting with tx-1, tx-2, etc.), purge them
        if (Array.isArray(parsed) && parsed.some((t: any) => t.id === 'tx-1' || t.id === 'tx-2')) {
          localStorage.removeItem('laundry_transactions_data');
          setTransactions([]);
        } else {
          setTransactions(parsed);
        }
      } catch (e) {
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }

    setMounted(true);
  }, []);

  const handleSwitchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    setUserRoleStore(newRole);
  };

  const handleSaveTransaction = (newTx: Omit<Transaction, 'id' | 'created_at'>) => {
    const createdTx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updated = [createdTx, ...transactions];
    setTransactions(updated);
    saveTransactionsStore(updated);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveTransactionsStore(updated);
  };

  if (!mounted) return null;

  // Calculations for Today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter((t) => t.transaction_date === todayStr);

  const todayIncomeCash = todayTxs
    .filter((t) => t.type === 'penerimaan' && t.payment_method === 'cash')
    .reduce((acc, t) => acc + t.amount, 0);

  const todayIncomeTransfer = todayTxs
    .filter((t) => t.type === 'penerimaan' && t.payment_method === 'transfer')
    .reduce((acc, t) => acc + t.amount, 0);

  const todayIncomeTotal = todayIncomeCash + todayIncomeTransfer;

  const todayExpenseTotal = todayTxs
    .filter((t) => t.type === 'pengeluaran')
    .reduce((acc, t) => acc + t.amount, 0);

  // Month target calculations
  const monthDisetor = transactions
    .filter((t) => t.type === 'pengeluaran' && t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthPenarikan = transactions
    .filter((t) => t.type === 'pengeluaran' && t.sub_category === 'penarikan_investor')
    .reduce((acc, t) => acc + t.amount, 0);

  // 6 Days Real Data (0 jika belum ada transaksi)
  const dailyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - i));
    const dStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const omset = transactions
      .filter((t) => t.transaction_date === dStr && t.type === 'penerimaan')
      .reduce((acc, t) => acc + t.amount, 0);

    return { label: dayName, omset };
  });

  // 6 Months Real Data (0 jika belum ada transaksi)
  const monthNames = ['Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep'];
  const monthlyData = monthNames.map((m) => ({
    label: m,
    omset: 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentRole={currentRole} onSwitchRole={handleSwitchRole} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header & Quick Add */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Halaman Utama (Dashboard)</h2>
              <p className="text-xs text-slate-500">Laporan transaksi harian, bulanan, & target setoran investor.</p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Transaksi Baru</span>
            </button>
          </div>

          {/* Target Setoran 10jt Card */}
          <TargetProgress totalDisetor={monthDisetor} totalPenarikan={monthPenarikan} />

          {/* Today Summary Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Omset Hari Ini */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Omset Hari Ini</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-800">{formatRupiah(todayIncomeTotal)}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">Laundry & Reparasi</div>
            </div>

            {/* Cash Hari Ini */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Penerimaan Cash</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-800">{formatRupiah(todayIncomeCash)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Uang Tunai di Kasir</div>
            </div>

            {/* Transfer Hari Ini */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Penerimaan Transfer</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-800">{formatRupiah(todayIncomeTransfer)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Masuk Rekening Bank</div>
            </div>

            {/* Pengeluaran Hari Ini */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Pengeluaran Hari Ini</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-rose-600">{formatRupiah(todayExpenseTotal)}</div>
              <div className="text-[11px] text-rose-600 font-medium mt-1">Biaya Operasional</div>
            </div>

          </div>

          {/* Revenue Chart */}
          <RevenueChart dailyData={dailyData} monthlyData={monthlyData} />

          {/* Transactions Table */}
          <TransactionTable
            transactions={transactions}
            currentRole={currentRole}
            onDeleteTransaction={handleDeleteTransaction}
          />

        </main>
      </div>

      {/* Input Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        currentRole={currentRole}
      />
    </div>
  );
}
