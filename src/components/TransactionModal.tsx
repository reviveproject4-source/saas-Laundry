'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BankAccount, BusinessUnit, CostType, SubCategory, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { X, CreditCard, ShoppingBag, Loader2, AlertCircle, Building2, Wrench, ShieldCheck, Target, Banknote } from 'lucide-react';
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
  const [isSetoranInvestor, setIsSetoranInvestor] = useState<boolean>(defaultSubCategory === 'disetor_investor');
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
      setIsSetoranInvestor(defaultSubCategory === 'disetor_investor');
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

    // Transfer wajib isi referensi/bukti transfer
    if (type === 'penerimaan' && !isCash && !reference.trim()) {
      setErrorMessage('Harap isi referensi / bukti pembayaran transfer bank.');
      return;
    }

    if (type === 'pengeluaran' && !isSetoranInvestor && !notes.trim()) {
      setErrorMessage('Harap isi keterangan pengeluaran operasional.');
      return;
    }

    try {
      setSubmitting(true);

      const combinedNotes =
        type === 'penerimaan'
          ? reference.trim()
            ? reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '')
            : notes.trim()
          : notes.trim();

      const isSetoran = type === 'pengeluaran' && isSetoranInvestor;
      const isReparasi = wallet === 'rekening_reparasi' || (isCash && businessUnit === 'reparasi');

      const computedSubCategory =
        type === 'penerimaan'
          ? isReparasi
            ? 'reparasi'
            : 'laundry'
          : isSetoran
          ? 'disetor_investor'
          : 'operasional';

      const defaultSetoranNote = isSetoran ? 'Setoran Target Bulanan ke Investor' : null;

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: 'investor' as const,
        creator_name: userProfile.full_name || 'Pemilik Trio R',
        transaction_date: date,
        type: type,
        sub_category: computedSubCategory as any,
        amount: parsedAmount,
        notes: (type === 'penerimaan' ? combinedNotes : notes.trim()) || defaultSetoranNote,
        payment_method: (isCash ? 'cash' : 'transfer') as 'transfer' | 'cash',
        bank_account: (isCash ? null : (wallet === 'rekening_reparasi' ? 'rekening_reparasi' : 'rekening_laundry')) as BankAccount | null,
        business_unit: (isSetoran ? 'laundry' : (isReparasi ? 'reparasi' : 'laundry')) as BusinessUnit,
        cost_type: type === 'pengeluaran' ? (isSetoran ? null : costType) : null,
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
              {type === 'penerimaan' ? 'Input Penerimaan Toko' : 'Input Pengeluaran'}
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Pencatatan keuangan resmi (Peran: <span className="font-black text-amber-800 uppercase">Pemilik</span>)
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
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Jenis Pencatatan</label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('penerimaan')}
                className={`py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2 ${
                  type === 'penerimaan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Penerimaan (Uang Masuk)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('pengeluaran')}
                className={`py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2 ${
                  type === 'pengeluaran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Pengeluaran (Biaya)</span>
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

          {/* ===================== MODE PENGELUARAN ===================== */}
          {type === 'pengeluaran' && (
            <>
              {/* Pilihan: Biaya Operasional vs Setoran Target ke Investor */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Tujuan Pengeluaran
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSetoranInvestor(false)}
                    className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      !isSetoranInvestor
                        ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-black text-sm">
                      <ShoppingBag className="w-4 h-4 text-rose-600" />
                      <span>Biaya Operasional</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 mt-1.5">
                      Listrik, sewa, gaji, gas, servis
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSetoranInvestor(true)}
                    className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                      isSetoranInvestor
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-black text-sm">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span>Setoran Target</span>
                    </div>
                    <span className="text-xs text-amber-800 font-bold mt-1.5">
                      Target Rp 10 Juta / Bln
                    </span>
                  </button>
                </div>
              </div>

              {isSetoranInvestor ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs sm:text-sm space-y-1">
                  <div className="font-extrabold flex items-center space-x-1.5 text-amber-900">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span>Setoran Realisasi Target Investor</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                    Pencatatan ini akan langsung dihitung sebagai realisasi <strong>Target Setoran Investor (Rp 10.000.000 / Bulan)</strong> dan otomatis mengurangi sisa target yang harus dipenuhi.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pilihan 3 Dompet Pembayar */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Sumber Dana (Dompet yang Membayar)
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
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Sewa, PAM, Listrik</span>
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
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Gaji, Sparepart</span>
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
                        <span className="text-[11px] font-semibold text-slate-600 mt-1">Bensin, Gas, Toko</span>
                      </button>
                    </div>
                  </div>

                  {/* Jika Kasir Tunai, pilih unit */}
                  {isCash && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Beban Unit Usaha</label>
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

                  {/* Cost Type */}
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
                placeholder="Contoh: 1.000.000"
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

          {/* Catatan / Keterangan Pengeluaran */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              {type === 'pengeluaran' ? 'Keterangan Pengeluaran' : 'Catatan Tambahan (Opsional)'}
            </label>
            <input
              type="text"
              placeholder={
                type === 'pengeluaran'
                  ? isSetoranInvestor
                    ? 'Contoh: Setoran tahap 1 ke rekening pribadi pemilik'
                    : 'Contoh: Pembelian Gas LPG 3 tabung'
                  : 'Catatan tambahan jika ada...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'pengeluaran' && !isSetoranInvestor}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Security & Audit Badge */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <span className="font-medium">
              Pencatatan ini akan tersimpan ke buku transaksi resmi sebagai <strong>Pemilik</strong> (
              {type === 'penerimaan'
                ? isCash ? 'Kasir Tunai Cash' : 'Mutasi Transfer Bank'
                : isSetoranInvestor
                ? 'Realisasi Setoran Target'
                : 'Pengeluaran/Biaya Operasional'}
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
                : isSetoranInvestor
                ? 'bg-amber-600 hover:bg-amber-700 text-slate-950 font-black'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>
              {submitting
                ? 'Menyimpan Transaksi...'
                : type === 'penerimaan'
                ? 'Simpan Penerimaan'
                : isSetoranInvestor
                ? 'Simpan Setoran Target'
                : 'Simpan Pengeluaran'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
