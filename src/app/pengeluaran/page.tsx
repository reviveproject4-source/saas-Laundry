'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TransactionTable from '@/components/TransactionTable';
import TransactionModal from '@/components/TransactionModal';
import { Transaction, UserRole } from '@/lib/types';
import { getInitialUserRole, setUserRoleStore, getTransactionsStore, saveTransactionsStore } from '@/lib/store';
import { formatRupiah } from '@/lib/formatters';
import { PlusCircle, ArrowUpRight, ShoppingCart, Send, UserX } from 'lucide-react';

export default function PengeluaranPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('pengelola');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentRole(getInitialUserRole());
    setTransactions(getTransactionsStore());
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

  const expenseTxs = transactions.filter((t) => t.type === 'pengeluaran');

  const totalExpense = expenseTxs.reduce((acc, t) => acc + t.amount, 0);
  
  const totalOperasional = expenseTxs
    .filter((t) => t.sub_category !== 'disetor_investor' && t.sub_category !== 'penarikan_investor')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDisetor = expenseTxs
    .filter((t) => t.sub_category === 'disetor_investor')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalPenarikan = expenseTxs
    .filter((t) => t.sub_category === 'penarikan_investor')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentRole={currentRole} onSwitchRole={handleSwitchRole} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Menu Pengeluaran & Disetor</h2>
              <p className="text-xs text-slate-500">
                Pencatatan biaya operasional, pembelian, setoran investor, & penarikan prive investor.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Pengeluaran / Disetor</span>
            </button>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Pengeluaran</span>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-rose-600">{formatRupiah(totalExpense)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Semua Jenis Pengeluaran</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Operasional & Gas</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-800">{formatRupiah(totalOperasional)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Gas, Detergen, Belanja</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Disetor ke Investor</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-emerald-600">{formatRupiah(totalDisetor)}</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Dari Pengelola</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Penarikan Investor</span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-indigo-600">{formatRupiah(totalPenarikan)}</div>
              <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Penarikan Uang (Prive)</div>
            </div>

          </div>

          {/* Expense Table */}
          <TransactionTable
            title="Data Pengeluaran, Pembelian & Disetor"
            transactions={expenseTxs}
            currentRole={currentRole}
            onDeleteTransaction={handleDeleteTransaction}
          />

        </main>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        currentRole={currentRole}
        defaultType="pengeluaran"
      />
    </div>
  );
}
