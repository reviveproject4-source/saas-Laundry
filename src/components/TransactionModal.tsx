'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BankAccount, BusinessUnit, CostType, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { X, CreditCard, ShoppingBag, ShieldAlert, Loader2, AlertCircle, Building2, Wrench, ShieldCheck } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTx: Transaction) => void;
  userProfile: UserProfile | null;
  defaultType?: TransactionType;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  userProfile,
  defaultType = 'penerimaan',
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
      setRawAmount('');
      setNotes('');
      setReference('');
      setErrorMessage(null);
      setDate(todayStr);
    }
  }, [isOpen, defaultType, todayStr]);

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

    if (type === 'pengeluaran' && !notes.trim()) {
      setErrorMessage('Harap isi keterangan pengeluaran.');
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

      const payload = {
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: userProfile.role,
        creator_name: userProfile.full_name || (isPengelola ? 'Pengelola Trio R' : 'Pemilik Trio R'),
        transaction_date: date,
        type: type,
        amount: parsedAmount,
        notes: combinedNotes || null,
        // Kolom spesifik Penerimaan
        payment_method: (type === 'penerimaan' ? (isPengelola ? 'cash' : 'transfer') : 'cash') as 'transfer' | 'cash',
        bank_account: type === 'penerimaan' ? (isPengelola ? null : bankAccount) : null,
        // Kolom spesifik Pengeluaran & Unit
        business_unit: type === 'penerimaan' ? (isPengelola ? businessUnit : (bankAccount === 'rekening_reparasi' ? 'reparasi' : 'laundry')) : businessUnit,
        cost_type: type === 'pengeluaran' ? costType : null,
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
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              {type === 'penerimaan'
                ? isPengelola
                  ? 'Input Penerimaan Cash Kasir'
                  : 'Input Penerimaan Rekening'
                : 'Input Pengeluaran Operasional'}
            </h3>
            <p className="text-xs text-slate-500">
              Pencatatan arus uang resmi (Peran:{' '}
              <span
                className={`font-semibold uppercase ${
                  isPengelola ? 'text-emerald-700' : 'text-amber-700'
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
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Toggle Jenis: Penerimaan vs Pengeluaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Pencatatan</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('penerimaan')}
                className={`py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
                  type === 'penerimaan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isPengelola ? 'Penerimaan Cash' : 'Penerimaan Transfer'}</span>
              </button>
              <button
                type="button"
                onClick={() => setType('pengeluaran')}
                className={`py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
                  type === 'pengeluaran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Pengeluaran (Biaya)</span>
              </button>
            </div>
          </div>

          {/* Tanggal Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Transaksi</label>
            <input
              type="date"
              max={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* ===================== MODE PENERIMAAN ===================== */}
          {type === 'penerimaan' && (
            <>
              {isPengelola ? (
                <>
                  {/* Pilihan Unit Usaha Cash Laundry vs Cash Reparasi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Penerimaan Tunai (Cash Kasir)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBusinessUnit('laundry')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          businessUnit === 'laundry'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>Cash Laundry</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Uang Tunai Kasir Laundry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBusinessUnit('reparasi')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          businessUnit === 'reparasi'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <Wrench className="w-4 h-4 text-indigo-600" />
                          <span>Cash Reparasi</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Uang Tunai Kasir Reparasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Keterangan Kasir */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Keterangan Kasir (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kas masuk shift pagi"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Rekening Penerimaan (Pemilik) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Rekening Penerimaan (Uang yang Menerima)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBankAccount('rekening_laundry')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          bankAccount === 'rekening_laundry'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span>Rekening Laundry</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Unit Usaha: Laundry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBankAccount('rekening_reparasi')}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          bankAccount === 'rekening_reparasi'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <Wrench className="w-4 h-4 text-indigo-600" />
                          <span>Rekening Reparasi</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">Unit Usaha: Reparasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Referensi / Bukti Transfer */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Referensi / Bukti Pembayaran Transfer
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Transfer BCA an Budi / Ref #12345"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* ===================== MODE PENGELUARAN ===================== */}
          {type === 'pengeluaran' && (
            <>
              {/* Business Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBusinessUnit('laundry')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      businessUnit === 'laundry'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Unit Laundry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBusinessUnit('reparasi')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      businessUnit === 'reparasi'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>Unit Reparasi</span>
                  </button>
                </div>
              </div>

              {/* Cost Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Biaya (Cost Type)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCostType('fixed_cost')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      costType === 'fixed_cost'
                        ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs">Fixed Cost</span>
                    <span className="text-[10px] text-slate-500">Biaya Tetap (Sewa, Gaji Pokok)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCostType('variable_cost')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      costType === 'variable_cost'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs">Variable Cost</span>
                    <span className="text-[10px] text-slate-500">Biaya Variabel (Gas, Detergen, Part)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Nominal Transaksi (Live Rupiah Preview) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nominal Transaksi (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
              <input
                type="text"
                placeholder="Contoh: 1.200.000"
                value={rawAmount}
                onChange={(e) => setRawAmount(formatInputRupiah(e.target.value))}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            {rawAmount && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {formatRupiah(parseInputToNumber(rawAmount))}
              </p>
            )}
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {type === 'pengeluaran' ? 'Keterangan Pengeluaran' : 'Catatan Tambahan (Opsional)'}
            </label>
            <input
              type="text"
              placeholder={type === 'pengeluaran' ? 'Contoh: Pembelian Gas LPG 3 tabung' : 'Catatan tambahan jika ada...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'pengeluaran'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Security & Audit Badge */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-start space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Pencatatan ini akan tersimpan ke buku transaksi resmi sebagai <strong>Pemilik</strong> dan langsung tercatat di mutasi rekening.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full flex items-center justify-center space-x-2 py-3 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50 ${
              type === 'penerimaan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {submitting
                ? 'Menyimpan Transaksi...'
                : type === 'penerimaan'
                ? 'Simpan Penerimaan Rekening'
                : 'Simpan Pengeluaran Operasional'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
