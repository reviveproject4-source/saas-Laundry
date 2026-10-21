'use client';

import React, { useState, useEffect } from 'react';
import { TransactionType, SubCategory, BankAccount, BusinessUnit, CostType, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { formatRupiah } from '@/lib/formatters';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Building2, 
  Wrench, 
  Banknote, 
  CreditCard, 
  Calendar, 
  ShoppingBag, 
  ShoppingCart, 
  Coins, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Wallet
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTx: any) => void;
  userProfile?: UserProfile | null;
  defaultType?: TransactionType;
  defaultSubCategory?: SubCategory;
}

type WalletChoice = 'rekening_laundry' | 'rekening_reparasi' | 'kasir_tunai';
type ExpenseGoal = 'belanja_qris' | 'operasional' | 'ambil_usaha' | 'belanja_mandiri' | 'setoran';

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
  const [expenseGoal, setExpenseGoal] = useState<ExpenseGoal>('belanja_qris');
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
      } else if (defaultSubCategory === 'operasional') {
        setExpenseGoal('operasional');
      } else if (defaultSubCategory === 'pengeluaran_pribadi') {
        setExpenseGoal('belanja_qris');
      } else {
        setExpenseGoal('belanja_qris');
      }
      setWallet('rekening_laundry');
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

    // Biaya operasional wajib isi keterangan
    if (type === 'pengeluaran' && expenseGoal === 'operasional' && !notes.trim()) {
      setErrorMessage('Harap isi keterangan pengeluaran operasional toko.');
      return;
    }

    // Belanja pribadi wajib isi keterangan
    if (type === 'pengeluaran' && (expenseGoal === 'belanja_qris' || expenseGoal === 'belanja_mandiri') && !notes.trim()) {
      setErrorMessage('Harap isi keterangan keperluan belanja pribadi.');
      return;
    }

    try {
      setSubmitting(true);

      let combinedNotes = notes.trim();
      if (type === 'penerimaan') {
        combinedNotes = reference.trim()
          ? reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '')
          : notes.trim();
      } else if (expenseGoal === 'belanja_qris') {
        const prefix = wallet === 'kasir_tunai' ? '[Belanja Kas Toko]' : '[QRIS Belanja]';
        combinedNotes = notes.trim().startsWith('[') ? notes.trim() : `${prefix} ${notes.trim()}`;
      } else if (expenseGoal === 'setoran') {
        combinedNotes = notes.trim() || 'Setoran Target Bulanan ke Investor';
      } else if (expenseGoal === 'ambil_usaha') {
        combinedNotes = notes.trim() || 'Tarik Dana Usaha ke Kantong Pribadi';
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
      } else if (expenseGoal === 'belanja_qris') {
        // Belanja Pribadi via QRIS/Toko: Mengurangi kas/bank usaha & dicatat sebagai Prive / Belanja Pribadi (Balance 2 sisi)
        computedSubCategory = 'penarikan_investor';
      } else if (expenseGoal === 'ambil_usaha') {
        // Tarik kas toko ke dompet pribadi
        computedSubCategory = 'penarikan_investor';
      } else if (expenseGoal === 'belanja_mandiri') {
        // Belanja Pribadi murni pakai uang sendiri di luar toko
        computedSubCategory = 'pengeluaran_pribadi';
        paymentMethod = 'cash';
        bankAccount = null;
        targetBusinessUnit = 'pribadi';
      } else {
        // Biaya Operasional Toko
        computedSubCategory = 'operasional';
        finalCostType = costType;
      }

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: 'investor' as const,
        creator_name: userProfile.full_name || 'Mami Lina',
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
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setSubmitting(false);
    }
  };

  const modalTitle =
    type === 'penerimaan'
      ? 'Catat Penerimaan Uang'
      : expenseGoal === 'setoran'
      ? 'Setoran Target Bulanan ke Investor'
      : expenseGoal === 'belanja_qris'
      ? 'Belanja Pribadi via QRIS / Toko'
      : expenseGoal === 'ambil_usaha'
      ? 'Tarik Kas Toko ke Kantong Pribadi'
      : expenseGoal === 'belanja_mandiri'
      ? 'Belanja Pribadi (Uang Pribadi Sendiri)'
      : 'Catat Biaya Operasional Toko';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2.5 rounded-2xl ${
                type === 'penerimaan'
                  ? 'bg-emerald-100 text-emerald-800'
                  : expenseGoal === 'belanja_qris'
                  ? 'bg-purple-100 text-purple-800'
                  : expenseGoal === 'ambil_usaha'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {type === 'penerimaan' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : expenseGoal === 'belanja_qris' ? (
                <CreditCard className="w-5 h-5" />
              ) : expenseGoal === 'ambil_usaha' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                {modalTitle}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Dompetku • Kelola Keuangan Pemilik Usaha
              </p>
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
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Toggle Tab: Penerimaan vs Pengeluaran */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('penerimaan');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                type === 'penerimaan'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Penerimaan Usaha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('pengeluaran');
                setErrorMessage(null);
              }}
              className={`py-2.5 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 ${
                type === 'pengeluaran'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
          </div>

          {/* ===================== MODE PENGELUARAN ===================== */}
          {type === 'pengeluaran' && (
            <>
              {/* Pilihan Jenis Aliran Pengeluaran */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Pilih Jenis Pengeluaran
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  {/* Pilihan 1: Belanja Pribadi via QRIS / Toko (DEFAULT) */}
                  <button
                    type="button"
                    onClick={() => setExpenseGoal('belanja_qris')}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      expenseGoal === 'belanja_qris'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs sm:text-sm">
                      <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Belanja Pribadi</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-purple-700 mt-1">
                      QRIS / Dana Usaha (Default)
                    </span>
                  </button>

                  {/* Pilihan 2: Biaya Usaha Toko */}
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
                      Sewa, gaji, listrik, deterjen
                    </span>
                  </button>

                  {/* Pilihan 3: Tarik Kas Toko ke Kantong Pribadi */}
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
                      <span>Tarik ke Kantong</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 mt-1">
                      Disimpan di Dompet (Debit)
                    </span>
                  </button>

                </div>

                {/* Sub-toggle belanja pakai uang sendiri di luar toko */}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setExpenseGoal(expenseGoal === 'belanja_mandiri' ? 'belanja_qris' : 'belanja_mandiri')}
                    className="text-[11px] font-bold text-slate-500 hover:text-purple-700 underline"
                  >
                    {expenseGoal === 'belanja_mandiri'
                      ? '← Kembali ke Belanja QRIS / Dana Toko'
                      : 'Belanja pakai uang pribadi sendiri (di luar uang toko)? Klik di sini.'}
                  </button>
                </div>
              </div>

              {/* BANNER PENJELAS: BELANJA PRIBADI VIA QRIS / DANA TOKO */}
              {expenseGoal === 'belanja_qris' && (
                <div className="p-3.5 bg-purple-50 border-2 border-purple-200 rounded-2xl text-purple-950 text-xs space-y-1.5 shadow-2xs">
                  <div className="font-black flex items-center space-x-2 text-purple-900">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Belanja Pribadi via QRIS / Dana Usaha (Neraca 2 Sisi Balance)</span>
                  </div>
                  <p className="text-purple-800 leading-relaxed font-semibold">
                    ⚡ <strong>Otomatis Seimbang:</strong> Uang rekening/kas toko yang dipilih langsung berkurang riil. Di neraca pribadi Mami, dicatat otomatis <strong>Debit (Uang Diambil) = Kredit (Belanja)</strong>, dan dihitung ke metrik <strong>Total Belanja Pribadi (Yang Tidak Terasa)</strong> sebagai pengurang kas riil usaha.
                  </p>
                </div>
              )}

              {/* BANNER PENJELAS: BIAYA OPERASIONAL TOKO */}
              {expenseGoal === 'operasional' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-rose-900">
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                    <span>Biaya Operasional Toko (Pengurang Margin Usaha)</span>
                  </div>
                  <p className="leading-relaxed font-medium text-rose-800">
                    Pengeluaran murni operasional toko (sewa ruko, listrik, PAM, gaji Yani & Ujang, deterjen, sparepart mesin). Pengeluaran ini memotong margin laba usaha toko.
                  </p>
                </div>
              )}

              {/* BANNER PENJELAS: AMBIL DANA USAHA KE KANTONG PRIBADI */}
              {expenseGoal === 'ambil_usaha' && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-amber-900">
                    <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                    <span>Tarik Dana Usaha ke Dompet Pribadi (Debit)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                    Uang ditarik dari kasir tunai atau rekening toko untuk disimpan di dompet/rekening pribadi Mami Lina (belum langsung dibelanjakan).
                  </p>
                </div>
              )}

              {/* BANNER PENJELAS: BELANJA MANDIRI */}
              {expenseGoal === 'belanja_mandiri' && (
                <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Wallet className="w-4 h-4 text-slate-600" />
                    <span>Belanja Pribadi Menggunakan Uang Sendiri (Di Luar Uang Toko)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pengeluaran ini murni ditalangi dari kantong pribadi Mami, tidak memotong rekening toko sama sekali.
                  </p>
                </div>
              )}

              {/* SUMBER DANA USAHA (Toko) */}
              {expenseGoal !== 'belanja_mandiri' && expenseGoal !== 'setoran' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {expenseGoal === 'belanja_qris'
                      ? 'Pilih Rekening / Kas Toko yang Di-scan QRIS'
                      : 'Sumber Dana Usaha (Dompet yang Membayar / Ditarik)'}
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
                        <span>{expenseGoal === 'belanja_qris' ? 'QRIS Rek. Laundry' : 'Rek. Laundry'}</span>
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
                        <span>{expenseGoal === 'belanja_qris' ? 'QRIS Rek. Reparasi' : 'Rek. Reparasi'}</span>
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
                        <span>Kasir Tunai Toko</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 mt-1">Cash Kasir</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Jenis Beban Biaya Toko (Khusus Operasional) */}
              {expenseGoal === 'operasional' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit Usaha</label>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Biaya</label>
                    <select
                      value={costType}
                      onChange={(e) => setCostType(e.target.value as CostType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="variable_cost">Variable Cost (Deterjen, Listrik, Sparepart)</option>
                      <option value="fixed_cost">Fixed Cost (Sewa Ruko, Gaji Pokok)</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===================== MODE PENERIMAAN ===================== */}
          {type === 'penerimaan' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Dompet Penerimaan (Pilih Rekening / Kasir)
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
                  <span className="text-[11px] font-semibold text-slate-600 mt-1">BCA Transfer (Laundry)</span>
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
                  <span className="text-[11px] font-semibold text-slate-600 mt-1">BCA Transfer (Reparasi)</span>
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
                  <span className="text-[11px] font-semibold text-slate-600 mt-1">Uang Tunai Kasir</span>
                </button>
              </div>
            </div>
          )}

          {/* Tanggal & No Referensi (Nota) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {type === 'penerimaan' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Nota / Pelanggan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA-108 Pak Budi"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                  {expenseGoal === 'belanja_qris'
                    ? wallet === 'kasir_tunai'
                      ? '💵 Tunai Kasir Toko'
                      : '💳 Scan QRIS / Transfer Bank Toko'
                    : wallet === 'kasir_tunai'
                    ? '💵 Uang Tunai (Cash)'
                    : '💳 Transfer Bank BCA'}
                </div>
              </div>
            )}
          </div>

          {/* Nominal (Rp) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-black text-slate-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={rawAmount ? Number(rawAmount).toLocaleString('id-ID') : ''}
                onChange={handleAmountChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-xs text-sky-700 font-extrabold mt-1 text-right">
                Terbilang: {formatRupiah(parsedAmount)}
              </p>
            )}
          </div>

          {/* Keterangan Transaksi */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              {expenseGoal === 'belanja_qris'
                ? 'Keterangan Belanja Pribadi (Wajib)'
                : expenseGoal === 'operasional'
                ? 'Keterangan Pengeluaran Toko (Wajib)'
                : expenseGoal === 'ambil_usaha'
                ? 'Tujuan Penarikan Dana (Opsional)'
                : 'Keterangan / Catatan Tambahan (Opsional)'}
            </label>
            <input
              type="text"
              placeholder={
                expenseGoal === 'belanja_qris'
                  ? 'Contoh: Belanja Sayur & Buah di Supermarket'
                  : expenseGoal === 'operasional'
                  ? 'Contoh: Beli deterjen cair 10 liter / Gaji Yani'
                  : 'Contoh: Ambil kas toko tuk jatah pribadi'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'pengeluaran' && (expenseGoal === 'operasional' || expenseGoal === 'belanja_qris' || expenseGoal === 'belanja_mandiri')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 text-white font-extrabold rounded-2xl transition flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 ${
                type === 'penerimaan'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : expenseGoal === 'belanja_qris'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                  : expenseGoal === 'ambil_usaha'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan ke Dompetku...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {type === 'penerimaan'
                      ? 'Simpan Penerimaan Uang'
                      : expenseGoal === 'belanja_qris'
                      ? 'Simpan Belanja QRIS (Balance 2 Sisi)'
                      : expenseGoal === 'ambil_usaha'
                      ? 'Simpan Penarikan ke Dompet Pribadi'
                      : expenseGoal === 'belanja_mandiri'
                      ? 'Simpan Belanja Pribadi'
                      : 'Simpan Biaya Operasional Toko'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
