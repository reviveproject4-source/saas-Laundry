'use client';

import React, { useState, useEffect } from 'react';
import {
  Transaction,
  TransactionType,
  SubCategory,
  BankAccount,
  CostType,
  BusinessUnit,
  UserProfile,
  PersonalCategory,
  PERSONAL_CATEGORIES,
} from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { formatRupiah, getPersonalCategoryLabel } from '@/lib/formatters';
import {
  X,
  PlusCircle,
  Building2,
  Wrench,
  Banknote,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CreditCard,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  PiggyBank,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTx: Transaction) => void;
  userProfile: UserProfile | null;
  defaultType?: TransactionType;
  defaultSubCategory?: SubCategory;
}

type WalletChoice = 'rekening_laundry' | 'rekening_reparasi' | 'kasir_tunai';
type ExpenseGoal = 'belanja_pribadi' | 'operasional' | 'tarik_tunai' | 'setoran';
type PersonalPaymentSource = 'cash_pribadi' | 'qris' | 'kasir_toko';

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

  // Field Dompet Usaha
  const [wallet, setWallet] = useState<WalletChoice>('rekening_laundry');
  const [reference, setReference] = useState<string>('');

  // Field khusus Pengeluaran
  const [expenseGoal, setExpenseGoal] = useState<ExpenseGoal>('belanja_pribadi');
  const [personalCategory, setPersonalCategory] = useState<PersonalCategory>('belanja');
  const [personalSource, setPersonalSource] = useState<PersonalPaymentSource>('cash_pribadi');
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
        setExpenseGoal('tarik_tunai');
      } else if (defaultSubCategory === 'operasional') {
        setExpenseGoal('operasional');
      } else if (defaultSubCategory === 'pengeluaran_pribadi') {
        setExpenseGoal('belanja_pribadi');
        setPersonalSource('cash_pribadi');
      } else {
        setExpenseGoal('belanja_pribadi');
      }
      setWallet('rekening_laundry');
      setPersonalCategory('belanja');
      setPersonalSource('cash_pribadi');
      setRawAmount('');
      setNotes('');
      setReference('');
      setErrorMessage(null);
      setDate(todayStr);
    }
  }, [isOpen, defaultType, defaultSubCategory, todayStr]);

  if (!isOpen || !userProfile) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, '');
    setRawAmount(clean);
  };

  const parsedAmount = rawAmount ? parseInt(rawAmount, 10) : 0;
  const isCash = wallet === 'kasir_tunai';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parsedAmount <= 0) {
      setErrorMessage('Nominal transaksi harus lebih dari 0.');
      return;
    }

    if (!date) {
      setErrorMessage('Tanggal transaksi harus diisi.');
      return;
    }

    if (type === 'pengeluaran' && expenseGoal === 'operasional' && !notes.trim()) {
      setErrorMessage('Harap isi keterangan pengeluaran toko.');
      return;
    }

    try {
      setSubmitting(true);

      let combinedNotes = notes.trim();
      const catLabel = getPersonalCategoryLabel(personalCategory);

      if (type === 'penerimaan') {
        combinedNotes = reference.trim()
          ? reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '')
          : notes.trim();
      } else if (expenseGoal === 'belanja_pribadi') {
        if (personalSource === 'cash_pribadi') {
          const prefix = `[Cash ATM | ${catLabel}]`;
          combinedNotes = notes.trim() ? `${prefix} ${notes.trim()}` : prefix;
        } else if (personalSource === 'kasir_toko') {
          const prefix = `[Kasir Toko | ${catLabel}]`;
          combinedNotes = notes.trim() ? `${prefix} ${notes.trim()}` : prefix;
        } else {
          const bankName = wallet === 'rekening_reparasi' ? 'Reparasi' : 'Laundry';
          const prefix = `[QRIS ${bankName} | ${catLabel}]`;
          combinedNotes = notes.trim() ? `${prefix} ${notes.trim()}` : prefix;
        }
      } else if (expenseGoal === 'setoran') {
        combinedNotes = notes.trim() || 'Setoran Target Bulanan ke Investor';
      } else if (expenseGoal === 'tarik_tunai') {
        combinedNotes = notes.trim() ? `[Tarik Tunai] ${notes.trim()}` : '[Tarik Tunai ATM/Kas]';
      }

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
      } else if (expenseGoal === 'belanja_pribadi') {
        if (personalSource === 'cash_pribadi') {
          // Uang tunai yang sudah ditarik sebelumnya ke dompet pemilik -> tidak memotong toko lagi!
          computedSubCategory = 'pengeluaran_pribadi';
          paymentMethod = 'cash';
          bankAccount = null;
          targetBusinessUnit = 'pribadi';
        } else if (personalSource === 'kasir_toko') {
          // Ambil tunai langsung dari kasir toko saat belanja
          computedSubCategory = 'penarikan_investor';
          paymentMethod = 'cash';
          bankAccount = null;
          targetBusinessUnit = 'laundry';
        } else {
          // Pakai QRIS / Debit langsung dari rekening toko
          computedSubCategory = 'penarikan_investor';
          paymentMethod = 'transfer';
          bankAccount = wallet === 'rekening_reparasi' ? 'rekening_reparasi' : 'rekening_laundry';
          targetBusinessUnit = wallet === 'rekening_reparasi' ? 'reparasi' : 'laundry';
        }
      } else if (expenseGoal === 'tarik_tunai') {
        computedSubCategory = 'penarikan_investor';
        paymentMethod = isCash ? 'cash' : 'transfer';
        bankAccount = isCash ? null : (wallet === 'rekening_reparasi' ? 'rekening_reparasi' : 'rekening_laundry');
        targetBusinessUnit = isReparasi ? 'reparasi' : 'laundry';
      } else {
        computedSubCategory = 'operasional';
        finalCostType = costType;
      }

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: 'investor' as const,
        creator_name: userProfile.full_name || 'Pemilik',
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

      setRawAmount('');
      setNotes('');
      setReference('');
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setSubmitting(false);
    }
  };

  const modalTitle =
    type === 'penerimaan'
      ? 'Catat Pemasukkan'
      : expenseGoal === 'belanja_pribadi'
      ? 'Pengeluaran Pribadi'
      : expenseGoal === 'tarik_tunai'
      ? 'Tarik Kas / ATM'
      : expenseGoal === 'setoran'
      ? 'Setoran Target Bulanan'
      : 'Biaya Toko (Operasional)';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-xl ${
                type === 'penerimaan'
                  ? 'bg-emerald-100 text-emerald-800'
                  : expenseGoal === 'belanja_pribadi'
                  ? 'bg-purple-100 text-purple-800'
                  : expenseGoal === 'tarik_tunai'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {type === 'penerimaan' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : expenseGoal === 'belanja_pribadi' ? (
                <CreditCard className="w-5 h-5" />
              ) : expenseGoal === 'tarik_tunai' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {modalTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Toggle Tab: Pemasukkan vs Pengeluaran */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('penerimaan');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                type === 'penerimaan'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Pemasukkan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('pengeluaran');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                type === 'pengeluaran'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
          </div>

          {/* MODE PENGELUARAN */}
          {type === 'pengeluaran' && (
            <>
              {/* Pilihan 3 Tombol Utama */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseGoal('belanja_pribadi')}
                  className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center justify-center ${
                    expenseGoal === 'belanja_pribadi'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-600 mb-1" />
                  <span className="text-xs">Belanja Pribadi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseGoal('operasional')}
                  className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center justify-center ${
                    expenseGoal === 'operasional'
                      ? 'border-rose-600 bg-rose-50 text-rose-950 font-black ring-2 ring-rose-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-rose-600 mb-1" />
                  <span className="text-xs">Biaya Toko</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseGoal('tarik_tunai')}
                  className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center justify-center ${
                    expenseGoal === 'tarik_tunai'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-xs">Tarik Kas/ATM</span>
                </button>
              </div>

              {/* 7 KATEGORI PENGELUARAN PRIBADI */}
              {expenseGoal === 'belanja_pribadi' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Kategori Pengeluaran Pribadi
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {PERSONAL_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPersonalCategory(cat.id)}
                          className={`py-2 px-2 rounded-xl border transition flex items-center justify-center space-x-1.5 ${
                            personalCategory === cat.id
                              ? 'border-purple-600 bg-purple-100/90 text-purple-950 font-black ring-2 ring-purple-500 shadow-2xs'
                              : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 font-semibold'
                          }`}
                        >
                          <span className="text-sm">{cat.icon}</span>
                          <span className="text-[11px] truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PILIHAN METODE / SUMBER DANA PENGELUARAN PRIBADI */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Sumber Pembayaran Belanja
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Opsi 1: Cash Pribadi (Tarik ATM / Rekening) */}
                      <button
                        type="button"
                        onClick={() => setPersonalSource('cash_pribadi')}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          personalSource === 'cash_pribadi'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-600 mb-1" />
                        <span className="text-xs leading-tight">Cash Pribadi</span>
                        <span className="text-[9px] text-emerald-800 font-medium mt-0.5">Tarik ATM/Kas</span>
                      </button>

                      {/* Opsi 2: QRIS / Debit Bank Toko */}
                      <button
                        type="button"
                        onClick={() => setPersonalSource('qris')}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          personalSource === 'qris'
                            ? 'border-purple-600 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-purple-600 mb-1" />
                        <span className="text-xs leading-tight">QRIS Toko</span>
                        <span className="text-[9px] text-purple-800 font-medium mt-0.5">Rekening Bank</span>
                      </button>

                      {/* Opsi 3: Kasir Tunai Toko */}
                      <button
                        type="button"
                        onClick={() => setPersonalSource('kasir_toko')}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                          personalSource === 'kasir_toko'
                            ? 'border-amber-600 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-600 mb-1" />
                        <span className="text-xs leading-tight">Kasir Toko</span>
                        <span className="text-[9px] text-amber-800 font-medium mt-0.5">Laci Tunai</span>
                      </button>
                    </div>

                    {/* Penjelasan Ringkas Status Pemotongan Saldo */}
                    {personalSource === 'cash_pribadi' ? (
                      <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-semibold flex items-center space-x-1.5">
                        <span>💵</span>
                        <span>
                          Menggunakan uang tunai yang sudah ditarik sebelumnya. <strong>Tidak memotong rekening/kasir toko lagi</strong>.
                        </span>
                      </div>
                    ) : personalSource === 'qris' ? (
                      <div className="mt-2 p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl text-[11px] text-purple-900 font-semibold">
                        <div className="flex items-center space-x-1.5 mb-2">
                          <span>💳</span>
                          <span>Pilih rekening toko yang dipotong via QRIS / Debit:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWallet('rekening_laundry')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-black border transition ${
                              wallet === 'rekening_laundry'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                            }`}
                          >
                            BCA Laundry
                          </button>
                          <button
                            type="button"
                            onClick={() => setWallet('rekening_reparasi')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-black border transition ${
                              wallet === 'rekening_reparasi'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50'
                            }`}
                          >
                            BCA Reparasi
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold flex items-center space-x-1.5">
                        <span>🏪</span>
                        <span>
                          Uang diambil langsung dari laci kasir tunai toko saat berbelanja.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUMBER DANA TARIK KAS/ATM ATAU BIAYA TOKO */}
              {(expenseGoal === 'tarik_tunai' || expenseGoal === 'operasional') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {expenseGoal === 'tarik_tunai'
                      ? 'Tarik Dari Rekening / Kas Toko'
                      : 'Sumber Rekening Pembayaran Biaya'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setWallet('rekening_laundry')}
                      className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        wallet === 'rekening_laundry'
                          ? 'border-sky-600 bg-sky-50 text-sky-950 font-black ring-2 ring-sky-500'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-sky-600 mb-0.5" />
                      <span className="text-xs">BCA Laundry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallet('rekening_reparasi')}
                      className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        wallet === 'rekening_reparasi'
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-500'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <Wrench className="w-4 h-4 text-purple-600 mb-0.5" />
                      <span className="text-xs">BCA Reparasi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWallet('kasir_tunai')}
                      className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        wallet === 'kasir_tunai'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600 mb-0.5" />
                      <span className="text-xs">Kasir Tunai</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Jenis Beban Biaya Toko (Khusus Operasional) */}
              {expenseGoal === 'operasional' && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Usaha</label>
                    <select
                      value={businessUnit}
                      onChange={(e) => setBusinessUnit(e.target.value as BusinessUnit)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="laundry">Unit Laundry</option>
                      <option value="reparasi">Unit Reparasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori Biaya</label>
                    <select
                      value={costType}
                      onChange={(e) => setCostType(e.target.value as CostType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="variable_cost">Variable (Operasional)</option>
                      <option value="fixed_cost">Fixed (Sewa / Gaji)</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODE PENERIMAAN */}
          {type === 'penerimaan' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dompet Penerimaan
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWallet('rekening_laundry')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    wallet === 'rekening_laundry'
                      ? 'border-sky-600 bg-sky-50 text-sky-950 font-black ring-2 ring-sky-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-sky-600 mb-0.5" />
                  <span className="text-xs">BCA Laundry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWallet('rekening_reparasi')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    wallet === 'rekening_reparasi'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-purple-600 mb-0.5" />
                  <span className="text-xs">BCA Reparasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWallet('kasir_tunai')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    wallet === 'kasir_tunai'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-xs">Kasir Tunai</span>
                </button>
              </div>
            </div>
          )}

          {/* Tanggal & No Referensi (Nota) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {type === 'penerimaan' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">No. Nota (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA-108"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Metode</label>
                <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 truncate">
                  {expenseGoal === 'belanja_pribadi'
                    ? personalSource === 'cash_pribadi'
                      ? '💵 Cash Pribadi'
                      : personalSource === 'qris'
                      ? '💳 QRIS Toko'
                      : '🏪 Kasir Toko'
                    : wallet === 'kasir_tunai'
                    ? '💵 Kasir Tunai'
                    : '💳 Transfer Bank'}
                </div>
              </div>
            )}
          </div>

          {/* Nominal (Rp) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-black text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={rawAmount ? Number(rawAmount).toLocaleString('id-ID') : ''}
                onChange={handleAmountChange}
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-[11px] text-sky-700 font-extrabold mt-1 text-right">
                {formatRupiah(parsedAmount)}
              </p>
            )}
          </div>

          {/* Keterangan Transaksi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Keterangan / Rincian
            </label>
            <input
              type="text"
              placeholder={
                expenseGoal === 'belanja_pribadi'
                  ? 'Contoh: Belanja di Supermarket / Toko'
                  : expenseGoal === 'operasional'
                  ? 'Contoh: Deterjen cair / Servis dinamo'
                  : expenseGoal === 'tarik_tunai'
                  ? 'Contoh: Tarik tunai ATM BCA'
                  : 'Catatan tambahan...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 text-white font-extrabold rounded-2xl transition flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 ${
                type === 'penerimaan'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : expenseGoal === 'belanja_pribadi'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                  : expenseGoal === 'tarik_tunai'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
