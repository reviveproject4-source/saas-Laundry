'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Transaction, UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions } from '@/lib/transactions';
import { formatRupiah, formatDateIndo, getCategoryLabel } from '@/lib/formatters';
import {
  Printer,
  Banknote,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Loader2,
  AlertTriangle,
  Calendar,
  Filter,
  UserCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export default function LaporanPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'penerimaan' | 'pengeluaran'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'transfer'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat laporan keuangan...</span>
        </div>
      </div>
    );
  }

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterMethod !== 'all' && t.payment_method !== filterMethod) return false;
    const txDate = t.transaction_date ? t.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Financial Calculations based on filtered dataset
  const incomeTxs = filteredTransactions.filter((t) => t.type === 'penerimaan');
  const expenseTxs = filteredTransactions.filter((t) => t.type === 'pengeluaran');

  const cashIncome = incomeTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const transferIncome = incomeTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalIncome = cashIncome + transferIncome;

  const cashExpense = expenseTxs
    .filter((t) => t.payment_method === 'cash')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const transferExpense = expenseTxs
    .filter((t) => t.payment_method === 'transfer')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalExpense = cashExpense + transferExpense;

  const netBalance = totalIncome - totalExpense;

  const handleResetFilter = () => {
    setFilterType('all');
    setFilterMethod('all');
    setStartDate('');
    setEndDate('');
  };

  const handlePrint = () => {
    window.print();
  };

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

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Laporan Keuangan Outlet</h2>
              <p className="text-xs text-slate-500">
                Rekapitulasi omset, pengeluaran operasional, dan arus kas bersih yang telah terverifikasi.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Filter className="w-4 h-4 text-sky-600" />
                <span>Filter Periode & Kategori</span>
              </div>
              {(filterType !== 'all' || filterMethod !== 'all' || startDate || endDate) && (
                <button
                  onClick={handleResetFilter}
                  className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Filter Jenis */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Jenis Transaksi</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">Semua Transaksi</option>
                  <option value="penerimaan">Penerimaan (Uang Masuk)</option>
                  <option value="pengeluaran">Pengeluaran (Uang Keluar)</option>
                </select>
              </div>

              {/* Filter Metode */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Metode Pembayaran</label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">Semua Metode</option>
                  <option value="cash">Cash (Tunai)</option>
                  <option value="transfer">Transfer Bank / QRIS</option>
                </select>
              </div>

              {/* Tanggal Mulai */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Tanggal Selesai */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Rincian Penerimaan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Total Penerimaan</h3>
                </div>
                <span className="text-sm font-black text-emerald-600">{formatRupiah(totalIncome)}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="flex items-center text-slate-600">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600 mr-2" />
                    Kas Masuk (Cash)
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(cashIncome)}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600 mr-2" />
                    Rekening (Transfer)
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(transferIncome)}</span>
                </div>
              </div>
            </div>

            {/* Rincian Pengeluaran */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Total Pengeluaran</h3>
                </div>
                <span className="text-sm font-black text-rose-600">{formatRupiah(totalExpense)}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="flex items-center text-slate-600">
                    <Banknote className="w-3.5 h-3.5 text-rose-600 mr-2" />
                    Pengeluaran Tunai
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(cashExpense)}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="flex items-center text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-rose-600 mr-2" />
                    Pengeluaran Transfer
                  </span>
                  <span className="font-bold text-slate-800">{formatRupiah(transferExpense)}</span>
                </div>
              </div>
            </div>

            {/* Saldo Bersih / Arus Kas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">Arus Kas Bersih</h3>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Saldo (Penerimaan - Pengeluaran)</span>
                  <div className={`text-2xl font-black ${netBalance >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                    {formatRupiah(netBalance)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                Total tercatat: <strong>{filteredTransactions.length} transaksi</strong> pada periode terpilih.
              </div>
            </div>

          </div>

          {/* Full Transaction Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Rincian Riwayat Transaksi</h3>
                <p className="text-xs text-slate-500">Daftar transaksi tersusun sesuai filter yang dipilih.</p>
              </div>
              <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-semibold">
                {filteredTransactions.length} Data
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Diinput Oleh</th>
                    <th className="py-3 px-4">Kategori & Catatan</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada transaksi yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIncome = tx.type === 'penerimaan';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDateIndo(tx.transaction_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                tx.creator_role === 'investor'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {tx.creator_role === 'investor' ? (
                                <ShieldCheck className="w-3 h-3 mr-1 text-amber-600" />
                              ) : (
                                <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
                              )}
                              {tx.creator_name || (tx.creator_role === 'investor' ? 'Investor' : 'Pengelola')}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800">{getCategoryLabel(tx.sub_category)}</div>
                            {tx.notes && <div className="text-[11px] text-slate-400 truncate">{tx.notes}</div>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {tx.payment_method === 'cash' ? (
                                <>
                                  <Banknote className="w-3 h-3 text-emerald-600" />
                                  <span>Cash</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 text-sky-600" />
                                  <span>Transfer</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isIncome ? 'Penerimaan' : 'Pengeluaran'}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold text-sm whitespace-nowrap ${
                              isIncome ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
