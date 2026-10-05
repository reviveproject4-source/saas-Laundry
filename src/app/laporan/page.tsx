'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Transaction, DailyOmzet, UserProfile, TenantProfile } from '@/lib/types';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchTransactions } from '@/lib/transactions';
import { fetchDailyOmzet } from '@/lib/omzet';
import { formatRupiah, formatDateIndo } from '@/lib/formatters';
import {
  Printer,
  RotateCcw,
  Calendar,
  Filter,
  DollarSign,
  CreditCard,
  ShoppingBag,
  Building2,
  Wrench,
  Loader2,
  AlertTriangle,
  Info,
  Banknote,
  Layers,
} from 'lucide-react';

export default function RingkasanPencatatanPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyOmzetList, setDailyOmzetList] = useState<DailyOmzet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter Periode Tanggal
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
    loadData();
  }, []);

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-3 bg-white p-8 rounded-3xl shadow-xl">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <span className="text-xs font-bold text-slate-700">Memuat ringkasan pencatatan...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. FILTERING INDEPENDEN UNTUK TIGA KELOMPOK DATA
  // =========================================================================

  // Kelompok 1: Daily Omzet (public.daily_omzet)
  const filteredDailyOmzet = dailyOmzetList.filter((item) => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  // Kelompok 2: Penerimaan (public.transactions type='penerimaan')
  const filteredPenerimaan = transactions.filter((tx) => {
    if (tx.type !== 'penerimaan') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Kelompok 3: Pengeluaran (public.transactions type='pengeluaran')
  const filteredPengeluaran = transactions.filter((tx) => {
    if (tx.type !== 'pengeluaran') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // =========================================================================
  // 2. KALKULASI TOTAL KELOMPOK 1: REKAP OMZET OPERASIONAL
  // =========================================================================
  const totalOmzetLaundry = filteredDailyOmzet.reduce(
    (acc, o) => acc + Number(o.omzet_laundry || 0),
    0
  );
  const totalOmzetReparasi = filteredDailyOmzet.reduce(
    (acc, o) => acc + Number(o.omzet_reparasi || 0),
    0
  );
  const totalOmzetGlobal = totalOmzetLaundry + totalOmzetReparasi;

  // =========================================================================
  // 3. KALKULASI TOTAL KELOMPOK 2: CATATAN PENERIMAAN PEMBAYARAN
  // =========================================================================
  const penerimaanRekeningLaundry = filteredPenerimaan
    .filter((tx) => tx.bank_account === 'rekening_laundry')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const penerimaanRekeningReparasi = filteredPenerimaan
    .filter((tx) => tx.bank_account === 'rekening_reparasi')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const penerimaanCash = filteredPenerimaan
    .filter((tx) => tx.payment_method === 'cash')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const totalPenerimaan = filteredPenerimaan.reduce(
    (acc, tx) => acc + Number(tx.amount || 0),
    0
  );

  // =========================================================================
  // 4. KALKULASI TOTAL KELOMPOK 3: CATATAN PENGELUARAN BIAYA
  // =========================================================================
  const pengeluaranLaundry = filteredPengeluaran
    .filter((tx) => tx.business_unit === 'laundry' || (!tx.business_unit && tx.sub_category?.includes('laundry')))
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranReparasi = filteredPengeluaran
    .filter((tx) => tx.business_unit === 'reparasi' || (!tx.business_unit && tx.sub_category?.includes('reparasi')))
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranFixedCost = filteredPengeluaran
    .filter((tx) => tx.cost_type === 'fixed_cost')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const pengeluaranVariableCost = filteredPengeluaran
    .filter((tx) => tx.cost_type === 'variable_cost' || !tx.cost_type)
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const totalPengeluaran = filteredPengeluaran.reduce(
    (acc, tx) => acc + Number(tx.amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar userProfile={userProfile} tenantProfile={tenantProfile} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ringkasan Pencatatan</h2>
              <p className="text-xs text-slate-500">
                Pencatatan internal transparansi antara Pengelola dan Pemilik (Rekap Omzet, Penerimaan Pembayaran, dan Pengeluaran Biaya).
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

          {/* Filter Bar Periode */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
                <Filter className="w-4 h-4 text-sky-600" />
                <span>Filter Periode Tanggal</span>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={handleResetFilter}
                  className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Tanggal Mulai</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Tanggal Akhir</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {(startDate || endDate) && (
              <p className="text-[11px] text-slate-400 pt-1">
                Menampilkan data periode: <strong>{startDate || 'Awal'}</strong> s/d <strong>{endDate || 'Sekarang'}</strong>
              </p>
            )}
          </div>

          {/* ========================================================================= */}
          {/* KELOMPOK 1: REKAP OMZET OPERASIONAL HARIAN                                */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                  1
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Rekap Omzet Operasional Harian</h3>
                  <p className="text-[11px] text-slate-400">
                    Sumber: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">public.daily_omzet</code> (Dicatat oleh Pengelola berdasarkan nilai transaksi harian luar sistem)
                  </p>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
                {filteredDailyOmzet.length} Hari Rekap
              </span>
            </div>

            {/* Summary Cards Kelompok 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Omzet Laundry</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(totalOmzetLaundry)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Unit Laundry Kiloan / Satuan</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Omzet Reparasi</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(totalOmzetReparasi)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Unit Reparasi Pakaian & Mesin</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase block mb-1">Total Omzet Operasional</span>
                <div className="text-2xl font-black text-emerald-700">{formatRupiah(totalOmzetGlobal)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Laundry + Reparasi</div>
              </div>
            </div>

            {/* Table Kelompok 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Tanggal Rekap</th>
                      <th className="py-3 px-4 text-right">Omzet Laundry</th>
                      <th className="py-3 px-4 text-right">Omzet Reparasi</th>
                      <th className="py-3 px-4 text-right">Total Omzet</th>
                      <th className="py-3 px-4">Catatan Pengelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredDailyOmzet.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          Belum ada rekap omzet pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyOmzet.map((row) => {
                        const rowTotal = Number(row.omzet_laundry || 0) + Number(row.omzet_reparasi || 0);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                              {formatDateIndo(row.date)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-700">
                              {formatRupiah(row.omzet_laundry || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-700">
                              {formatRupiah(row.omzet_reparasi || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-700">
                              {formatRupiah(rowTotal)}
                            </td>
                            <td className="py-3 px-4 max-w-xs text-slate-500 truncate">
                              {row.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KELOMPOK 2: CATATAN PENERIMAAN PEMBAYARAN                                 */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-100 text-sky-800 text-xs font-black">
                  2
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Catatan Penerimaan Pembayaran</h3>
                  <p className="text-[11px] text-slate-400">
                    Sumber: <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">public.transactions</code> (type: penerimaan, diverifikasi oleh Pemilik berdasarkan bukti transfer / kas)
                  </p>
                </div>
              </div>
              <span className="text-xs bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-bold border border-sky-200">
                {filteredPenerimaan.length} Transaksi
              </span>
            </div>

            {/* Summary Cards Kelompok 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Rekening Laundry</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(penerimaanRekeningLaundry)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Transfer Rekening Laundry</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Rekening Reparasi</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(penerimaanRekeningReparasi)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Transfer Rekening Reparasi</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Kasir Tunai (Cash)</span>
                <div className="text-xl font-black text-slate-800">{formatRupiah(penerimaanCash)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Uang Kas Masuk</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm bg-sky-50/30">
                <span className="text-[11px] font-semibold text-sky-700 uppercase block mb-1">Total Penerimaan Uang</span>
                <div className="text-2xl font-black text-sky-700">{formatRupiah(totalPenerimaan)}</div>
                <div className="text-[10px] text-sky-600 mt-0.5">Rekening + Cash Masuk</div>
              </div>
            </div>

            {/* Table Kelompok 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Rekening Penerimaan</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4">Referensi / Keterangan</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPenerimaan.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          Belum ada catatan penerimaan pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredPenerimaan.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDateIndo(tx.transaction_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.bank_account ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  tx.bank_account === 'rekening_laundry'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-purple-50 text-purple-800 border-purple-200'
                                }`}
                              >
                                {tx.bank_account === 'rekening_laundry' ? 'Rekening Laundry' : 'Rekening Reparasi'}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Kas Tunai Outlet</span>
                            )}
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
                          <td className="py-3 px-4 max-w-xs text-slate-600 truncate">
                            {tx.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sky-700 whitespace-nowrap">
                            {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KELOMPOK 3: CATATAN PENGELUARAN BIAYA                                     */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 text-rose-800 text-xs font-black">
                  3
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Catatan Pengeluaran Biaya</h3>
                  <p className="text-[11px] text-slate-400">
                    Sumber: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-700">public.transactions</code> (type: pengeluaran, dicatat oleh Pemilik)
                  </p>
                </div>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold border border-rose-200">
                {filteredPengeluaran.length} Transaksi
              </span>
            </div>

            {/* Summary Cards Kelompok 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Unit Laundry</span>
                <div className="text-lg font-black text-slate-800">{formatRupiah(pengeluaranLaundry)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Operasional Laundry</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Unit Reparasi</span>
                <div className="text-lg font-black text-slate-800">{formatRupiah(pengeluaranReparasi)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Operasional Reparasi</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Fixed Cost</span>
                <div className="text-lg font-black text-slate-800">{formatRupiah(pengeluaranFixedCost)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Sewa, Gaji Tetap, dll</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Variable Cost</span>
                <div className="text-lg font-black text-slate-800">{formatRupiah(pengeluaranVariableCost)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Detergen, Plastik, Gas</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm bg-rose-50/30">
                <span className="text-[11px] font-semibold text-rose-700 uppercase block mb-1">Total Pengeluaran</span>
                <div className="text-xl font-black text-rose-700">{formatRupiah(totalPengeluaran)}</div>
                <div className="text-[10px] text-rose-600 mt-0.5">Total Biaya Tercatat</div>
              </div>
            </div>

            {/* Table Kelompok 3 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-[11px] font-semibold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Business Unit</th>
                      <th className="py-3 px-4">Cost Type</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPengeluaran.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400">
                          Belum ada catatan pengeluaran pada periode tanggal yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredPengeluaran.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDateIndo(tx.transaction_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                tx.business_unit === 'reparasi'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {tx.business_unit === 'reparasi' ? 'Reparasi' : 'Laundry'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                tx.cost_type === 'fixed_cost'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {tx.cost_type === 'fixed_cost' ? 'Fixed Cost' : 'Variable Cost'}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600 truncate">
                            {tx.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 whitespace-nowrap">
                            {formatRupiah(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Prinsip Independen Notice */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Catatan Prinsip Transparansi:</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ketiga kelompok pencatatan di atas disajikan secara mandiri dan independen untuk transparansi operasional.
                Sistem tidak melakukan rekonsiliasi otomatis atau penghitungan omzet sebagai penerimaan kas.
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
