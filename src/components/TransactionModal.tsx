'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BankAccount, BusinessUnit, CostType, SubCategory, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { X, CreditCard, ShoppingBag, ShieldAlert, Loader2, AlertCircle, Building2, Wrench, ShieldCheck, Target } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTx: Transaction) => void;
  userProfile: UserProfile | null;
  defaultType?: TransactionType;
  defaultSubCategory?: SubCategory;
}

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

  // Field khusus Penerimaan
  const [bankAccount, setBankAccount] = useState<BankAccount>('rekening_laundry');
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
      setRawAmount('');
      setNotes('');
      setReference('');
      setErrorMessage(null);
      setDate(todayStr);
    }
  }, [isOpen, defaultType, defaultSubCategory, todayStr]);

  if (!isOpen) return null;

  // Role Guard: Pemilik dan Pengelola boleh mengakses form transaksi
  if (!userProfile || (userProfile.role !== 'investor' && userProfile.role !== 'pengelola')) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Akses Ditolak</h3>
          <p className="text-xs text-slate-500">
            Sesi pengguna tidak memiliki izin untuk mencatat transaksi.
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

  const isPengelola = userProfile.role === 'pengelola';

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

    // Pemilik wajib isi bukti transfer untuk penerimaan rekening
    if (type === 'penerimaan' && !isPengelola && !reference.trim()) {
      setErrorMessage('Harap isi referensi / bukti pembayaran transfer.');
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
          ? isPengelola
            ? (reference.trim() ? reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '') : notes.trim())
            : reference.trim() + (notes.trim() ? ` - ${notes.trim()}` : '')
          : notes.trim();

      const isSetoran = type === 'pengeluaran' && isSetoranInvestor;
      const computedSubCategory =
        type === 'penerimaan'
          ? businessUnit === 'reparasi'
            ? 'reparasi'
            : 'laundry'
          : isSetoran
          ? 'disetor_investor'
          : 'operasional';

      const defaultSetoranNote = isSetoran ? 'Setoran Target Bulanan ke Investor' : null;

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: userProfile.role,
        creator_name: userProfile.full_name || (isPengelola ? 'Pengelola Trio R' : 'Pemilik Trio R'),
        transaction_date: date,
        type: type,
        sub_category: computedSubCategory as any,
        amount: parsedAmount,
        notes: (type === 'penerimaan' ? combinedNotes : notes.trim()) || defaultSetoranNote,
        // Kolom spesifik Penerimaan
        payment_method: (type === 'penerimaan' ? (isPengelola ? 'cash' : 'transfer') : 'cash') as 'transfer' | 'cash',
        bank_account: type === 'penerimaan' ? (isPengelola ? null : bankAccount) : null,
        // Kolom spesifik Pengeluaran & Unit
        business_unit: type === 'penerimaan' ? (isPengelola ? businessUnit : (bankAccount === 'rekening_reparasi' ? 'reparasi' : 'laundry')) : (isSetoran ? 'laundry' : businessUnit),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="font-black text-slate-900 text-xl sm:text-2xl">
              {type === 'penerimaan'
                ? isPengelola
                  ? 'Input Penerimaan Cash Kasir'
                  : 'Input Penerimaan Rekening'
                : 'Input Pengeluaran Operasional'}
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Pencatatan arus uang resmi (Peran:{' '}
              <span
                className={`font-black uppercase ${
                  isPengelola ? 'text-emerald-800' : 'text-amber-800'
                }`}
              >
                {isPengelola ? 'Pengelola' : 'Pemilik'}
              </span>
              )
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
                <span>{isPengelola ? 'Penerimaan Cash' : 'Penerimaan Transfer'}</span>
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
              {isPengelola ? (
                <>
                  {/* Pilihan Unit Usaha Cash Laundry vs Cash Reparasi */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Penerimaan Tunai (Cash Kasir)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBusinessUnit('laundry')}
                        className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          businessUnit === 'laundry'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-sm">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                          <span>Cash Laundry</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 mt-1.5">Uang Tunai Kasir Laundry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBusinessUnit('reparasi')}
                        className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          businessUnit === 'reparasi'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-sm">
                          <Wrench className="w-5 h-5 text-indigo-600" />
                          <span>Cash Reparasi</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 mt-1.5">Uang Tunai Kasir Reparasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Keterangan Kasir */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Keterangan Kasir (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kas masuk shift pagi"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Rekening Penerimaan (Pemilik) */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Rekening Penerimaan (Uang yang Menerima)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBankAccount('rekening_laundry')}
                        className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          bankAccount === 'rekening_laundry'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-sm">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                          <span>Rekening Laundry</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 mt-1.5">Unit Usaha: Laundry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBankAccount('rekening_reparasi')}
                        className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                          bankAccount === 'rekening_reparasi'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-black text-sm">
                          <Wrench className="w-5 h-5 text-indigo-600" />
                          <span>Rekening Reparasi</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 mt-1.5">Unit Usaha: Reparasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Referensi / Bukti Transfer */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Referensi / Bukti Pembayaran Transfer
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Transfer BCA an Budi / Ref #12345"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </>
              )}
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
                      Listrik, gas, sabun, sewa, sparepart
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
                      <span>Setoran ke Investor</span>
                    </div>
                    <span className="text-xs text-amber-800 font-bold mt-1.5">
                      Target Tetap Rp 10 Juta / Bln
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
                  {/* Business Unit */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Business Unit</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBusinessUnit('laundry')}
                        className={`py-3 px-3.5 rounded-xl border-2 text-sm font-black transition flex items-center justify-center space-x-2 ${
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
                        className={`py-3 px-3.5 rounded-xl border-2 text-sm font-black transition flex items-center justify-center space-x-2 ${
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
                        <span className="text-xs text-slate-600 font-semibold mt-1">Biaya Variabel (Gas, Detergen, Part)</span>
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
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            {rawAmount && (
              <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-1.5">
                Terbaca: {formatRupiah(parseInputToNumber(rawAmount))}
              </p>
            )}
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              {type === 'pengeluaran'
                ? isSetoranInvestor
                  ? 'Catatan Setoran (Opsional)'
                  : 'Keterangan Pengeluaran'
                : 'Catatan Tambahan (Opsional)'}
            </label>
            <input
              type="text"
              placeholder={
                type === 'pengeluaran'
                  ? isSetoranInvestor
                    ? 'Contoh: Setoran tahap 1 transfer ke BCA pemilik'
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
            <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isPengelola ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="font-medium">
              {isPengelola ? (
                <>
                  Pencatatan ini akan tersimpan ke buku transaksi resmi sebagai <strong>Pengelola</strong> (
                  {type === 'penerimaan'
                    ? 'Kasir Tunai / Cash'
                    : isSetoranInvestor
                    ? 'Setoran ke Investor'
                    : 'Biaya Operasional'}
                  ).
                </>
              ) : (
                <>
                  Pencatatan ini akan tersimpan ke buku transaksi resmi sebagai <strong>Pemilik</strong> (
                  {type === 'penerimaan'
                    ? 'Mutasi Rekening Bank'
                    : isSetoranInvestor
                    ? 'Konfirmasi Setoran Investor'
                    : 'Pengeluaran/Biaya'}
                  ).
                </>
              )}
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
                ? isPengelola
                  ? 'Simpan Penerimaan Cash'
                  : 'Simpan Penerimaan Rekening'
                : isSetoranInvestor
                ? 'Simpan Setoran ke Investor'
                : 'Simpan Pengeluaran Operasional'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
