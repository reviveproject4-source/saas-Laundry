'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Transaction, UserRole } from '@/lib/types';
import { getInitialUserRole, setUserRoleStore, getTransactionsStore } from '@/lib/store';
import { formatRupiah, formatDateIndo } from '@/lib/formatters';
import { Printer, Download, Banknote, CreditCard, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

export default function LaporanPage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('pengelola');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  if (!mounted) return null;

  // Calculations
  const incomeTxs = transactions.filter((t) => t.type === 'penerimaan');
  const expenseTxs = transactions.filter((t) => t.type === 'pengeluaran');

  const cashIncome = incomeTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + t.amount, 0);

  const transferIncome = incomeTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = cashIncome + transferIncome;

  const cashExpense = expenseTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + t.amount, 0);

  const transferExpense = expenseTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = cashExpense + transferExpense;

  const netBalance = totalIncome - totalExpense;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentRole={currentRole} onSwitchRole={handleSwitchRole} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Laporan Keuangan</h2>
              <p className="text-xs text-slate-500">
                Rekapitulasi penerimaan Cash & Transfer vs Pengeluaran.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          {/* Financial Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rincian Penerimaan */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Penerimaan</h3>
                </div>
                <span className="text-xs font-black text-emerald-600">{formatRupiah(totalIncome)}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="flex items-center text-slate-600">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600 mr-2" />
                    Uang Diterima Cash
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(cashIncome)}</span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="flex items-center text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600 mr-2" />
                    Uang Diterima Transfer
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(transferIncome)}</span>
                </div>
              </div>
            </div>

            {/* Rincian Pengeluaran */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Pengeluaran</h3>
                </div>
                <span className="text-xs font-black text-rose-600">{formatRupiah(totalExpense)}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="flex items-center text-slate-600">
                    <Banknote className="w-3.5 h-3.5 text-rose-600 mr-2" />
                    Pengeluaran Cash (Tunai)
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(cashExpense)}</span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="flex items-center text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-rose-600 mr-2" />
                    Pengeluaran Transfer
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(transferExpense)}</span>
                </div>
              </div>
            </div>

            {/* Saldo Bersih / Arus Kas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">Arus Kas Bersih</h3>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-slate-400 block mb-1">Saldo Bersih (Penerimaan - Pengeluaran)</span>
                  <div className={`text-3xl font-black ${netBalance >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                    {formatRupiah(netBalance)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                Laporan disusun secara real-time berdasarkan input kolektif Investor & Pengelola.
              </div>
            </div>

          </div>

          {/* Full Transaction Table Printout */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Rincian Lengkap Seluruh Transaksi</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Pembuat Input</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 px-3">{formatDateIndo(tx.transaction_date)}</td>
                      <td className="py-2.5 px-3 capitalize font-semibold">{tx.creator_name} ({tx.creator_role})</td>
                      <td className="py-2.5 px-3">{tx.sub_category}</td>
                      <td className="py-2.5 px-3 uppercase">{tx.payment_method}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          tx.type === 'penerimaan' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'penerimaan' ? '+' : '-'} {formatRupiah(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
