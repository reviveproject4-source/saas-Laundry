'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BankAccount, BusinessUnit, CostType, SubCategory, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { X, CreditCard, ShoppingBag, Loader2, AlertCircle, Building2, Wrench, ShieldCheck, Target, Banknote, User, ArrowDownLeft, ShoppingCart } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTx: Transaction) => void;
  userProfile: UserProfile | null;
  defaultType?: TransactionType;
  defaultSubCategory?: SubCategory;
}

type WalletChoice = 'rekening_laundry' | 'rekening_reparasi' | 'kasir_tunai';
type ExpenseGoal = 'operasional' | 'ambil_usaha' | 'belanja_pribadi' | 'setoran';

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  userProfile,
  defaultType = 'penerimaan',
  defaultSubCategory,
}: TransactionModalProps) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [date, setDate] = useState<string>(todayStr);

  // Field Dompet
  const [wallet, setWallet] = useState<WalletChoice>('rekening_laundry');
  const [reference, setReference] = useState<string>('');

  // Field khusus Pengeluaran
  const [expenseGoal, setExpenseGoal] = useState<ExpenseGoal>('operasional');
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit>('laundry');
  const [costType, setCostType] = useState<CostType>('variable_cost');

  // Field umum
  const [rawAmount, setRawAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      if (defaultSubCategory === 'disetor_investor') {
        setExpenseGoal('setoran');
      } else if (defaultSubCategory === 'penarikan_investor') {
        setExpenseGoal('ambil_usaha');
      } else if (defaultSubCategory === 'pengeluaran_pribadi') {
        setExpenseGoal('belanja_pribadi');
      } else {
        setExpenseGoal('operasional');
      }
      setWallet('rekening_laundry');
      setRawAmount('');
      setNotes('');
      setReference('');
      setErrorMessage(null);
      setDate(todayStr);
    }
  }, [isOpen, defaultType, defaultSubCategory, todayStr]);

  if (!isOpen) return null;

  // Role Guard: Khusus Pemilik (investor)
  if (!userProfile || userProfile.role !== 'investor') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Akses Ditolak</h3>
          <p className="text-xs text-slate-500">
            Aplikasi SaaS ini sekarang dikhususkan hanya untuk <strong>Pemilik</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Format Helper
  const formatInputRupiah = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (!cleanDigits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(cleanDigits));
  };

  const parseInputToNumber = (val: string): number => {
    const cleanDigits = val.replace(/\D/g, '');
    return cleanDigits ? Number(cleanDigits) : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (date > todayStr) {
      setErrorMessage('Tanggal transaksi tidak boleh melebihi hari ini.');
      return;
    }

    const parsedAmount = parseInputToNumber(rawAmount);
    if (parsedAmount <= 0) {
      setErrorMessage('Masukkan nominal transaksi yang valid.');
      return;
    }

    const isCash = wallet === 'kasir_tunai';

    // Transfer penerimaan wajib isi referensi/bukti transfer
    if (type === 'penerimaan' && !isCash && !reference.trim()) {
      setErrorMessage('Harap isi referensi / bukti pembayaran transfer bank.');
      return;
    }

    // Biaya operasional wajib isi keterangan
    if (type === 'pengeluaran' && expenseGoal === 'operasional' && !notes.trim()) {
      setErrorMessage('Harap isi keterangan pengeluaran operasional toko.');
      return;
    }

    // Belanja pribadi wajib isi keterangan
    if (type === 'pengeluaran' && expenseGoal === 'belanja_pribadi' && !notes.trim()) {
      setErrorMessage('Harap isi keterangan keperluan belanja pribadi.');
      return;
    }

    try {
      setSubmitting(true);

      const combinedNotes =
        type === 'penerimaan'
          ? reference.trim()
            ? reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '')
            : notes.trim()
          : expenseGoal === 'setoran'
          ? (notes.trim() || 'Setoran Target Bulanan ke Investor')
          : expenseGoal === 'ambil_usaha'
          ? (notes.trim() || 'Ambil Dana Usaha tuk Pribadi (Debit)')
          : expenseGoal === 'belanja_pribadi'
          ? notes.trim()
          : notes.trim();

      const isReparasi = wallet === 'rekening_reparasi' || (isCash && businessUnit === 'reparasi');

      let computedSubCategory: SubCategory = 'operasional';
      let paymentMethod: 'cash' | 'transfer' = isCash ? 'cash' : 'transfer';
      let bankAccount: BankAccount | null = isCash ? null : (wallet === 'rekening_reparasi' ? 'rekening_reparasi' : 'rekening_laundry');
      let targetBusinessUnit: BusinessUnit = isReparasi ? 'reparasi' : 'laundry';
      let finalCostType: CostType | null = null;

      if (type === 'penerimaan') {
        computedSubCategory = isReparasi ? 'reparasi' : 'laundry';
      } else if (expenseGoal === 'setoran') {
        computedSubCategory = 'disetor_investor';
        targetBusinessUnit = 'laundry';
      } else if (expenseGoal === 'ambil_usaha') {
        // Ambil Dana Usaha tuk Pribadi (Debit Pribadi)
        computedSubCategory = 'penarikan_investor';
        // bankAccount & paymentMethod mencatat dari mana uang usaha ditarik
      } else if (expenseGoal === 'belanja_pribadi') {
        // Pengeluaran Keperluan Pribadi (Kredit Pribadi)
        computedSubCategory = 'pengeluaran_pribadi';
        paymentMethod = 'cash';
        bankAccount = null; // Tidak memotong rekening bank toko!
        targetBusinessUnit = 'pribadi'; // Murni pengeluaran pribadi Mami Lina!
      } else {
        // Biaya Operasional Toko
        computedSubCategory = 'operasional';
        finalCostType = costType;
      }

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: 'investor' as const,
        creator_name: userProfile.full_name || 'Pemilik Trio R',
        transaction_date: date,
        type: type,
        sub_category: computedSubCategory,
        amount: parsedAmount,
        notes: combinedNotes,
        payment_method: paymentMethod,
        bank_account: bankAccount,
        business_unit: targetBusinessUnit,
        cost_type: finalCostType,
      };

      const res = await createTransactionInSupabase(payload);

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Gagal menyimpan transaksi ke database.');
        setSubmitting(false);
        return;
      }

      onSuccess(res.data);

      // Reset form
      setRawAmount('');
      setNotes('');
      setReference('');
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan transaksi.');
      setSubmitting(false);
    }
  };

  const isCash = wallet === 'kasir_tunai';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="font-black text-slate-900 text-xl sm:text-2xl">
              {type === 'penerimaan'
                ? 'Input Penerimaan Toko'
                : expenseGoal === 'ambil_usaha'
                ? 'Ambil Dana Usaha (Debit Pribadi)'
                : expenseGoal === 'belanja_pribadi'
                ? 'Input Pengeluaran Pribadi (Kredit)'
                : expenseGoal === 'setoran'
                ? 'Input Setoran Target Bulanan'
                : 'Input Biaya Operasional Toko'}
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Pencatatan keuangan (Peran: <span className="font-black text-amber-800 uppercase">Pemilik Mami Lina</span>)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Toggle Jenis: Penerimaan vs Pengeluaran */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Kelompok Pencatatan</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('penerimaan')}
                className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 ${
                  type === 'penerimaan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Penerimaan Usaha</span>
              </button>
              <button
                type="button"
                onClick={() => setType('pengeluaran')}
                className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-1.5 ${
                  type === 'pengeluaran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Pengeluaran / Pribadi</span>
              </button>
            </div>
          </div>

          {/* Tanggal Transaksi */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Transaksi</label>
            <input
              type="date"
              max={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* ===================== MODE PENERIMAAN ===================== */}
          {type === 'penerimaan' && (
            <>
              {/* Pilihan 3 Dompet Penerima */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Dompet / Rekening Penerima
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWallet('rekening_laundry')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      wallet === 'rekening_laundry'
                        ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                      <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Rek. Laundry</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1">Transfer Bank BCA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWallet('rekening_reparasi')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      wallet === 'rekening_reparasi'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                      <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Rek. Reparasi</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1">Transfer Bank BCA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWallet('kasir_tunai')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      wallet === 'kasir_tunai'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Kasir Tunai</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1">Uang Tunai Cash</span>
                  </button>
                </div>
              </div>

              {/* Jika Kasir Tunai, pilih unit usaha */}
              {isCash && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Unit Layanan Tunai</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBusinessUnit('laundry')}
                      className={`p-3 rounded-xl border-2 text-left transition flex items-center space-x-2 ${
                        businessUnit === 'laundry'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black">Cash Laundry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessUnit('reparasi')}
                      className={`p-3 rounded-xl border-2 text-left transition flex items-center space-x-2 ${
                        businessUnit === 'reparasi'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Wrench className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-black">Cash Reparasi</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Referensi / Bukti Pembayaran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {isCash ? 'Nomor Nota / Keterangan Kasir (Opsional)' : 'Referensi / Bukti Pembayaran Transfer (Wajib)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isCash
                      ? 'Contoh: Nota #123 / Kasir Toko'
                      : 'Contoh: Transfer BCA an Budi / Ref #12345'
                  }
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required={!isCash}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </>
          )}

          {/* ===================== MODE PENGELUARAN / PRIBADI ===================== */}
          {type === 'pengeluaran' && (
            <>
              {/* Pilihan 3 Menu Utama Pengeluaran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Pilih Jenis Aliran Dana
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* Pilihan 1: Biaya Usaha Toko */}
                  <button
                    type="button"
                    onClick={() => setExpenseGoal('operasional')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      expenseGoal === 'operasional'
                        ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs sm:text-sm">
                      <ShoppingBag className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Biaya Toko</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1">
                      Sewa, gaji, listrik, servis
                    </span>
                  </button>

                  {/* Pilihan 2: Ambil Dana Usaha tuk Pribadi (Debit) */}
                  <button
                    type="button"
                    onClick={() => setExpenseGoal('ambil_usaha')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      expenseGoal === 'ambil_usaha'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs sm:text-sm">
                      <ArrowDownLeft className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Ambil Dana Usaha</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 mt-1">
                      Tarik ke Pribadi (Debit)
                    </span>
                  </button>

                  {/* Pilihan 3: Belanja / Keperluan Pribadi (Kredit) */}
                  <button
                    type="button"
                    onClick={() => setExpenseGoal('belanja_pribadi')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      expenseGoal === 'belanja_pribadi'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs sm:text-sm">
                      <ShoppingCart className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Belanja Pribadi</span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-800 mt-1">
                      Pengeluaran Pribadi (Kredit)
                    </span>
                  </button>

                </div>
              </div>

              {/* BANNER PENJELAS: BIAYA OPERASIONAL TOKO */}
              {expenseGoal === 'operasional' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-rose-900">
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                    <span>Biaya Operasional Toko (Pengurang Margin Usaha)</span>
                  </div>
                  <p className="leading-relaxed font-medium text-rose-800">
                    Pengeluaran murni toko (sewa ruko, listrik, PAM, gaji karyawan Yani & Ujang, servis mesin, sparepart, gas, bensin). Nilai ini akan dihitung sebagai pengurang margin laba usaha toko.
                  </p>
                </div>
              )}

              {/* BANNER PENJELAS: AMBIL DANA USAHA (DEBIT PRIBADI) */}
              {expenseGoal === 'ambil_usaha' && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-amber-900">
                    <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                    <span>Ambil Dana Usaha tuk Pribadi (Debit / Uang Masuk ke Kantong Mami)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                    Dana diambil dari kasir tunai atau rekening bank usaha toko untuk keperluan pribadi Mami Lina. Dicatat sebagai modal pribadi masuk (Debit) dan <strong>TIDAK MEMOTONG Margin Laba Operasional Toko</strong>.
                  </p>
                </div>
              )}

              {/* BANNER PENJELAS: BELANJA PRIBADI (KREDIT PRIBADI) */}
              {expenseGoal === 'belanja_pribadi' && (
                <div className="p-3.5 bg-purple-50 border border-purple-300 rounded-xl text-purple-950 text-xs sm:text-sm space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-purple-900">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                    <span>Pengeluaran untuk Keperluan Pribadi (Kredit / Belanja Mami Lina)</span>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed font-semibold">
                    Catat pengeluaran belanja pribadi Mami Lina (dapur, pakaian, kebutuhan rumah tangga, dll). Pengeluaran ini <strong>MURNI MEMOTONG SALDO DANA PRIBADI MAMI</strong>, dan <strong>SAMA SEKALI TIDAK MEMOTONG DANA / BIAYA USAHA TOKO</strong>.
                  </p>
                </div>
              )}

              {/* SUMBER DANA: Ditampilkan jika BIAYA TOKO atau AMBIL DANA USAHA */}
              {expenseGoal !== 'belanja_pribadi' && expenseGoal !== 'setoran' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Sumber Dana Usaha (Dompet yang Membayar / Ditarik)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setWallet('rekening_laundry')}
                        className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          wallet === 'rekening_laundry'
                            ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                          <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>Rek. Laundry</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Bank BCA Laundry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWallet('rekening_reparasi')}
                        className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          wallet === 'rekening_reparasi'
                            ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                          <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>Rek. Reparasi</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Bank BCA Reparasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWallet('kasir_tunai')}
                        className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          wallet === 'kasir_tunai'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-xs sm:text-sm">
                          <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Kasir Tunai</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Uang Cash Toko</span>
                      </button>
                    </div>
                  </div>

                  {/* Jika Kasir Tunai, pilih unit */}
                  {isCash && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {expenseGoal === 'ambil_usaha' ? 'Diambil Dari Kasir Unit' : 'Beban Unit Usaha'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setBusinessUnit('laundry')}
                          className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center space-x-2 ${
                            businessUnit === 'laundry'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>Unit Laundry</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBusinessUnit('reparasi')}
                          className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition flex items-center justify-center space-x-2 ${
                            businessUnit === 'reparasi'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Wrench className="w-4 h-4 text-indigo-600" />
                          <span>Unit Reparasi</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cost Type hanya untuk Biaya Usaha Toko */}
                  {expenseGoal === 'operasional' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Jenis Biaya (Cost Type)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCostType('fixed_cost')}
                          className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                            costType === 'fixed_cost'
                              ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-black text-sm">Fixed Cost</span>
                          <span className="text-xs text-slate-600 font-semibold mt-1">Biaya Tetap (Sewa, Gaji Pokok)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCostType('variable_cost')}
                          className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                            costType === 'variable_cost'
                              ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-black text-sm">Variable Cost</span>
                          <span className="text-xs text-slate-600 font-semibold mt-1">Biaya Variabel (Gas, Bensin, Part)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Nominal Transaksi (Live Rupiah Preview) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Nominal Transaksi (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">Rp</span>
              <input
                type="text"
                placeholder="Contoh: 100.000"
                value={rawAmount}
                onChange={(e) => setRawAmount(formatInputRupiah(e.target.value))}
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wide"
              />
            </div>
            {rawAmount && (
              <span className="text-xs font-bold text-slate-500 mt-1 block">
                Terbaca: {formatRupiah(parseInputToNumber(rawAmount))}
              </span>
            )}
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              {type === 'pengeluaran'
                ? expenseGoal === 'ambil_usaha'
                  ? 'Keterangan Ambil Dana Usaha (Opsional)'
                  : expenseGoal === 'belanja_pribadi'
                  ? 'Keterangan Keperluan Belanja Pribadi (Wajib)'
                  : expenseGoal === 'setoran'
                  ? 'Catatan Setoran Target'
                  : 'Keterangan Pengeluaran Operasional Toko (Wajib)'
                : 'Catatan Tambahan (Opsional)'}
            </label>
            <input
              type="text"
              placeholder={
                type === 'pengeluaran'
                  ? expenseGoal === 'ambil_usaha'
                    ? 'Contoh: Tarik kas toko tuk keperluan pribadi / belanja'
                    : expenseGoal === 'belanja_pribadi'
                    ? 'Contoh: Belanja kebutuhan dapur / beli pakaian / uang jajan'
                    : expenseGoal === 'setoran'
                    ? 'Contoh: Setoran tahap 1 ke rekening pemilik'
                    : 'Contoh: Pembelian Gas LPG 3 tabung / Listrik'
                  : 'Catatan tambahan jika ada...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'pengeluaran' && (expenseGoal === 'operasional' || expenseGoal === 'belanja_pribadi')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Security & Audit Badge */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <span className="font-medium">
              Pencatatan ini tersimpan resmi sebagai <strong>Pemilik Mami Lina</strong> (
              {type === 'penerimaan'
                ? isCash ? 'Kasir Tunai Cash Toko' : 'Mutasi Transfer Bank Toko'
                : expenseGoal === 'ambil_usaha'
                ? 'Ambil Dana Usaha tuk Pribadi (Debit)'
                : expenseGoal === 'belanja_pribadi'
                ? 'Pengeluaran Keperluan Pribadi (Kredit)'
                : expenseGoal === 'setoran'
                ? 'Realisasi Setoran Target'
                : 'Biaya Operasional Toko'}
              ).
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 text-white font-bold text-sm sm:text-base rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50 ${
              type === 'penerimaan'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : expenseGoal === 'ambil_usaha'
                ? 'bg-amber-600 hover:bg-amber-700 text-white font-black'
                : expenseGoal === 'belanja_pribadi'
                ? 'bg-purple-600 hover:bg-purple-700 font-black'
                : expenseGoal === 'setoran'
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>
              {submitting
                ? 'Menyimpan Transaksi...'
                : type === 'penerimaan'
                ? 'Simpan Penerimaan Toko'
                : expenseGoal === 'ambil_usaha'
                ? 'Simpan Ambil Dana Usaha (Debit)'
                : expenseGoal === 'belanja_pribadi'
                ? 'Simpan Belanja Pribadi (Kredit)'
                : expenseGoal === 'setoran'
                ? 'Simpan Setoran Target'
                : 'Simpan Biaya Toko'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
