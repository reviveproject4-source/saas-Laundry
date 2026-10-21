'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import PersonalExpenseChart from '@/components/PersonalExpenseChart';
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
  Building2,
  Wrench,
  Loader2,
  AlertTriangle,
  Banknote,
  Wallet,
  ShoppingCart,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function LaporanKeuanganPribadiPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyOmzetList, setDailyOmzetList] = useState<DailyOmzet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showStoreDetails, setShowStoreDetails] = useState(false);

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

    const { data: txList, error: txErr } = await fetchTransactions();
    if (txErr) {
      setErrorMessage(txErr);
    } else {
      setTransactions(txList);
    }

    const { data: omzetList, error: omzetErr } = await fetchDailyOmzet();
    if (omzetErr) {
      console.warn('Omzet load warning:', omzetErr);
    } else {
      setDailyOmzetList(omzetList);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

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

  // Filter Data Berdasarkan Rentang Tanggal
  const filteredDailyOmzet = dailyOmzetList.filter((item) => {
    if (!item.date) return true;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  const filteredPenerimaan = transactions.filter((tx) => {
    if (tx.type !== 'penerimaan') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  const filteredPengeluaran = transactions.filter((tx) => {
    if (tx.type !== 'pengeluaran') return false;
    const txDate = tx.transaction_date ? tx.transaction_date.substring(0, 10) : '';
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  // Murni Biaya Operasional Toko
  const filteredStoreOps = filteredPengeluaran.filter(
    (tx) =>
      tx.sub_category !== 'penarikan_investor' &&
      tx.sub_category !== 'pengeluaran_pribadi' &&
      tx.sub_category !== 'disetor_investor'
  );

  // Aliran Dana Pribadi: Debit (Ambil Usaha) & Kredit (Belanja Pribadi)
  const filteredPriveDebit = filteredPengeluaran.filter((tx) => tx.sub_category === 'penarikan_investor');
  const filteredPersonalCredit = filteredPengeluaran.filter((tx) => tx.sub_category === 'pengeluaran_pribadi');

  // Kalkulasi Usaha Toko
  const totalOmzetLaundry = filteredDailyOmzet.reduce((acc, o) => acc + Number(o.omzet_laundry || 0), 0);
  const totalOmzetReparasi = filteredDailyOmzet.reduce((acc, o) => acc + Number(o.omzet_reparasi || 0), 0);
  const totalOmzetGlobal = totalOmzetLaundry + totalOmzetReparasi;

  const totalPenerimaan = filteredPenerimaan.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const totalBiayaToko = filteredStoreOps.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const storeMargin = totalPenerimaan - totalBiayaToko;

  // Kalkulasi Arus Kas Pribadi
  const totalPriveDebit = filteredPriveDebit.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const storeDirectSpent = filteredPriveDebit.filter((tx) => {
    const note = (tx.notes || '').toLowerCase();
    return note.includes('belanja') || note.includes('qris') || !note.includes('tarik dana usaha ke kantong');
  }).reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const independentPersonal = filteredPersonalCredit.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const totalPersonalCredit = storeDirectSpent + independentPersonal;
  const personalBalance = totalPriveDebit - totalPersonalCredit;
  const realNetStoreCash = storeMargin - totalPriveDebit;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Laporan Keuangan Pribadi
            </h2>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>

          {/* Filter Bar Periode */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                <Filter className="w-3.5 h-3.5 text-sky-600" />
                <span>Filter Periode Tanggal</span>
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={handleResetFilter}
                  className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Mulai</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Akhir</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FOKUS UTAMA: LAPORAN ARUS KAS PRIBADI (AMBIL DANA USAHA & PENGELUARAN)     */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            
            {/* Summary 4 Kartu Arus Kas Pribadi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Kartu 1: DEBIT (Ambil Dana Usaha) */}
              <div className="bg-amber-50/70 p-5 rounded-2xl border-2 border-amber-200 shadow-2xs space-y-1">
                <span className="text-xs font-black text-amber-900 uppercase block mb-1">
                  1. Ambil Usaha (DEBIT)
                </span>
                <div className="text-2xl font-black text-amber-800">{formatRupiah(totalPriveDebit)}</div>
                <div className="text-xs text-amber-900 font-semibold">{filteredPriveDebit.length} kali penarikan</div>
              </div>

              {/* Kartu 2: KREDIT (Belanja Pribadi) */}
              <div className="bg-purple-50/70 p-5 rounded-2xl border-2 border-purple-200 shadow-2xs space-y-1">
                <span className="text-xs font-black text-purple-900 uppercase block mb-1">
                  2. Belanja Pribadi (KREDIT)
                </span>
                <div className="text-2xl font-black text-purple-800">{formatRupiah(totalPersonalCredit)}</div>
                <div className="text-xs text-purple-900 font-semibold">{filteredPersonalCredit.length + (storeDirectSpent > 0 ? 1 : 0)} transaksi belanja</div>
              </div>

              {/* Kartu 3: Neraca Kas Pribadi */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xs space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-purple-200 uppercase block">
                    3. Neraca Kas Pribadi
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                    Balance
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {personalBalance === 0 ? 'Rp 0' : formatRupiah(Math.abs(personalBalance))}
                </div>
                <div className="text-xs text-slate-300 font-semibold">
                  DEBIT = KREDIT
                </div>
              </div>

              {/* Kartu 4: Sisa Kas Riil Usaha */}
              <div className="bg-sky-50/70 p-5 rounded-2xl border-2 border-sky-200 shadow-2xs space-y-1">
                <span className="text-xs font-black text-sky-900 uppercase block mb-1">
                  4. Sisa Kas Riil Toko
                </span>
                <div className="text-2xl font-black text-sky-900">{formatRupiah(realNetStoreCash)}</div>
                <div className="text-xs text-sky-800 font-semibold">Margin Toko - Ambil Pribadi</div>
              </div>

            </div>

            {/* Grafik Komposisi Belanja Pribadi */}
            <PersonalExpenseChart transactions={[...filteredPriveDebit, ...filteredPersonalCredit]} />

            {/* Tabel Riwayat Aliran Dana Pribadi */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-purple-50/80 border-b border-purple-200 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-black text-purple-950 uppercase tracking-wide">
                  Rincian Mutasi Arus Kas Pribadi (Debit & Kredit)
                </span>
                <span className="text-xs font-bold text-purple-900">
                  {filteredPriveDebit.length + filteredPersonalCredit.length} Transaksi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-purple-50/50 uppercase text-xs font-black text-purple-950 border-b border-purple-200 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Jenis</th>
                      <th className="py-3 px-4">Sumber / Jalur</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPriveDebit.length === 0 && filteredPersonalCredit.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-500 font-semibold text-xs">
                          Belum ada catatan mutasi dana pribadi pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      [...filteredPriveDebit, ...filteredPersonalCredit]
                        .sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1))
                        .map((tx) => {
                          const isDebit = tx.sub_category === 'penarikan_investor';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition">
                              <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap text-xs">
                                {formatDateIndo(tx.transaction_date)}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border ${
                                  isDebit ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-purple-100 text-purple-900 border-purple-300'
                                }`}>
                                  {isDebit ? 'DEBIT (Ambil Usaha)' : 'KREDIT (Belanja Pribadi)'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                {isDebit
                                  ? tx.bank_account === 'rekening_reparasi'
                                    ? 'Rekening Reparasi BCA'
                                    : tx.bank_account === 'rekening_laundry'
                                    ? 'Rekening Laundry BCA'
                                    : 'Kasir Tunai Toko'
                                  : 'Kantong Pribadi'}
                              </td>
                              <td className="py-3.5 px-4 max-w-xs text-xs text-slate-700 truncate">
                                {tx.notes || '-'}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-black text-sm sm:text-base whitespace-nowrap ${
                                isDebit ? 'text-amber-700' : 'text-purple-700'
                              }`}>
                                {isDebit ? '+' : '-'} {formatRupiah(tx.amount)}
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
          {/* SECTION DUKUNGAN: REKAP KINERJA USAHA TOKO                                */}
          {/* ========================================================================= */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setShowStoreDetails(!showStoreDetails)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 uppercase">
                  Data Usaha
                </span>
                <span className="text-sm font-black text-slate-900">
                  Ringkasan Kinerja Usaha Toko (Omzet, Penerimaan & Biaya)
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                <span>{showStoreDetails ? 'Sembunyikan' : 'Tampilkan'}</span>
                {showStoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showStoreDetails && (
              <div className="p-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Omzet</span>
                    <div className="text-lg font-black text-slate-900">{formatRupiah(totalOmzetGlobal)}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Penerimaan</span>
                    <div className="text-lg font-black text-emerald-900">{formatRupiah(totalPenerimaan)}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-800 uppercase block">Total Biaya Usaha</span>
                    <div className="text-lg font-black text-rose-900">{formatRupiah(totalBiayaToko)}</div>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                    <span className="text-[11px] font-bold text-sky-800 uppercase block">Margin Laba Toko</span>
                    <div className="text-lg font-black text-sky-900">{formatRupiah(storeMargin)}</div>
                  </div>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
