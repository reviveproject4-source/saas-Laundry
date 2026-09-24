'use client';

import React, { useState } from 'react';
import { Transaction, TransactionType, PaymentMethod, SubCategory, UserProfile } from '@/lib/types';
import { createTransactionInSupabase } from '@/lib/transactions';
import { X, Banknote, CreditCard, ShieldAlert, Loader2 } from 'lucide-react';

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
  const [type, setType] = useState<TransactionType>(defaultType);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subCategory, setSubCategory] = useState<SubCategory>(
    defaultType === 'penerimaan' ? 'laundry' : 'operasional'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentRole = userProfile?.role || 'pengelola';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Masukkan nominal transaksi yang valid.');
      return;
    }

    if (!userProfile) {
      setErrorMessage('Sesi autentikasi tidak valid. Silakan login kembali.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createTransactionInSupabase({
        tenant_id: userProfile.tenant_id,
        created_by_user_id: userProfile.id,
        creator_role: userProfile.role,
        creator_name: userProfile.full_name || (userProfile.role === 'investor' ? 'Investor' : 'Pengelola'),
        transaction_date: date,
        type,
        sub_category: subCategory,
        payment_method: paymentMethod,
        amount: parsedAmount,
        notes: notes.trim() || null,
      });

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Gagal menyimpan transaksi ke database.');
        setSubmitting(false);
        return;
      }

      onSuccess(res.data);

      // Reset form
      setAmount('');
      setNotes('');
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan data.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Input Transaksi Baru</h3>
            <p className="text-xs text-slate-500">
              Diinput sebagai <span className="font-semibold text-slate-700 uppercase">{currentRole}</span>
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
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Transaksi</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('penerimaan');
                  setSubCategory('laundry');
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  type === 'penerimaan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penerimaan (Uang Masuk)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('pengeluaran');
                  setSubCategory('operasional');
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  type === 'pengeluaran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pengeluaran (Uang Keluar)
              </button>
            </div>
          </div>

          {/* Sub Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori Transaksi</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value as SubCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {type === 'penerimaan' ? (
                <>
                  <option value="laundry">Omset Laundry (Kiloan/Satuan)</option>
                  <option value="reparasi">Reparasi Mesin / Pakaian</option>
                  <option value="lainnya">Penerimaan Lainnya</option>
                </>
              ) : (
                <>
                  <option value="operasional">Operasional Toko Umum</option>
                  <option value="gas">Pembelian Gas LPG</option>
                  <option value="detergen">Pembelian Detergen/Sabun</option>
                  <option value="sewa_toko">Pembayaran Sewa Toko</option>
                  <option value="disetor_investor">Disetor ke Investor</option>
                  <option value="penarikan_investor">Penarikan Uang oleh Investor (Prive)</option>
                </>
              )}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-medium transition ${
                  paymentMethod === 'cash'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Cash (Tunai)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-xs font-medium transition ${
                  paymentMethod === 'transfer'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-600" />
                <span>Transfer (Bank/QRIS)</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              placeholder="Contoh: 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Transaksi</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan / Keterangan</label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Immutability Notice */}
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-start space-x-2 text-[11px] text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Aturan SaaS: Data tersimpan di Supabase dan hanya dapat diubah/dihapus oleh Anda (role <strong>{currentRole}</strong>).
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'Menyimpan ke Supabase...' : 'Simpan Transaksi'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}
