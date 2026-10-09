'use client';

import React, { useState, useEffect } from 'react';
import { DailyOmzet, UserProfile } from '@/lib/types';
import { fetchTodayOmzet, upsertDailyOmzet } from '@/lib/omzet';
import { X, Calendar, DollarSign, Loader2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

interface OmzetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (omzet: DailyOmzet) => void;
  userProfile: UserProfile | null;
}

export default function OmzetModal({
  isOpen,
  onClose,
  onSuccess,
  userProfile,
}: OmzetModalProps) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const [date, setDate] = useState<string>(todayStr);
  const [omzetLaundry, setOmzetLaundry] = useState<string>('');
  const [omzetReparasi, setOmzetReparasi] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isExisting, setIsExisting] = useState(false);
  const [checkingDate, setCheckingDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper untuk format display ribuan
  const formatInputRupiah = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (!cleanDigits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(cleanDigits));
  };

  const parseInputToNumber = (val: string): number => {
    const cleanDigits = val.replace(/\D/g, '');
    return cleanDigits ? Number(cleanDigits) : 0;
  };

  // Cek apakah tanggal yang dipilih sudah memiliki rekap omzet (One Day One Omzet)
  const checkDateRecord = async (targetDate: string) => {
    if (!targetDate) return;
    setCheckingDate(true);
    setErrorMessage(null);

    const res = await fetchTodayOmzet(targetDate);
    if (res.data) {
      setIsExisting(true);
      setOmzetLaundry(formatInputRupiah(String(res.data.omzet_laundry || 0)));
      setOmzetReparasi(formatInputRupiah(String(res.data.omzet_reparasi || 0)));
      setNotes(res.data.notes || '');
    } else {
      setIsExisting(false);
      setOmzetLaundry('');
      setOmzetReparasi('');
      setNotes('');
    }
    setCheckingDate(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkDateRecord(date);
    }
  }, [isOpen, date]);

  if (!isOpen) return null;

  // Role Guard
  if (userProfile?.role !== 'pengelola') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Akses Ditolak</h3>
          <p className="text-xs text-slate-500">
            Form Input Omzet Harian hanya diperuntukkan bagi peran <strong>Pengelola</strong>.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (date > todayStr) {
      setErrorMessage('Tanggal tidak boleh melebihi hari ini.');
      return;
    }

    const numLaundry = parseInputToNumber(omzetLaundry);
    const numReparasi = parseInputToNumber(omzetReparasi);

    if (numLaundry < 0 || numReparasi < 0) {
      setErrorMessage('Nominal omzet tidak boleh negatif.');
      return;
    }

    if (numLaundry === 0 && numReparasi === 0) {
      setErrorMessage('Masukkan minimal salah satu nilai omzet (Laundry atau Reparasi).');
      return;
    }

    if (!userProfile) {
      setErrorMessage('Sesi autentikasi tidak valid. Silakan login kembali.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await upsertDailyOmzet({
        tenant_id: userProfile.tenant_id,
        date: date,
        omzet_laundry: numLaundry,
        omzet_reparasi: numReparasi,
        notes: notes.trim() || null,
        created_by_user_id: userProfile.id,
        creator_name: userProfile.full_name || 'Pengelola Trio R',
      });

      if (res.error || !res.data) {
        setErrorMessage(res.error || 'Gagal menyimpan rekap omzet ke database.');
        setSubmitting(false);
        return;
      }

      if (onSuccess) {
        onSuccess(res.data);
      }

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan rekap omzet.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 className="font-black text-slate-900 text-xl sm:text-2xl">Input Omzet Harian</h3>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              Rekap transaksi operasional harian di luar sistem (Peran: <span className="font-black text-emerald-800 uppercase">Pengelola</span>)
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

        {/* Existing Record Indicator (One Day One Omzet) */}
        {isExisting && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs sm:text-sm text-amber-900 font-medium">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">Mode Koreksi/Update:</span> Rekap omzet untuk tanggal ini sudah pernah dicatat. Nilai yang Anda simpan akan memperbarui data tanggal ini.
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Tanggal */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Rekap Omzet</label>
            <div className="relative">
              <input
                type="date"
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Calendar className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            {checkingDate && (
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memeriksa catatan tanggal terpilih...</span>
              </p>
            )}
          </div>

          {/* Omzet Laundry */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Omzet Laundry (Kiloan / Satuan)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">Rp</span>
              <input
                type="text"
                placeholder="Contoh: 1.500.000"
                value={omzetLaundry}
                onChange={(e) => setOmzetLaundry(formatInputRupiah(e.target.value))}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {omzetLaundry && (
              <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-1.5">
                Terbaca: {formatRupiah(parseInputToNumber(omzetLaundry))}
              </p>
            )}
          </div>

          {/* Omzet Reparasi */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Omzet Reparasi (Mesin / Pakaian)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">Rp</span>
              <input
                type="text"
                placeholder="Contoh: 500.000"
                value={omzetReparasi}
                onChange={(e) => setOmzetReparasi(formatInputRupiah(e.target.value))}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {omzetReparasi && (
              <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-1.5">
                Terbaca: {formatRupiah(parseInputToNumber(omzetReparasi))}
              </p>
            )}
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Catatan Operasional (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Rekap kasir shift 1 & 2 lancar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Domain Notice */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-slate-600">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <span className="font-medium">
              Omzet adalah rekap transaksi kotor operasional di luar SaaS. Data ini <strong>tidak mengubah saldo kas atau penerimaan rekening</strong>.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>
              {submitting
                ? 'Menyimpan...'
                : isExisting
                ? 'Perbarui Rekap Omzet'
                : 'Simpan Rekap Omzet'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
