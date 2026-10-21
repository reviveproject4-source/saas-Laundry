'use client';

import React from 'react';
import { Transaction, UserProfile, UserRole } from '@/lib/types';
import { 
  formatRupiah, 
  formatDateIndo, 
  getCategoryLabel, 
  parsePersonalCategory, 
  getPersonalCategoryLabel, 
  getPersonalCategoryIcon 
} from '@/lib/formatters';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  Lock, 
  CreditCard, 
  Banknote, 
  Building2, 
  Wrench, 
  ShieldCheck, 
  UserCheck, 
  User, 
  ShoppingCart,
  QrCode
} from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  userProfile?: UserProfile | null;
  currentRole?: UserRole;
  onDeleteTransaction?: (id: string) => void;
  title?: string;
}

export default function TransactionTable({
  transactions,
  userProfile,
  currentRole = 'investor',
  onDeleteTransaction,
  title = 'Riwayat Transaksi Harian',
}: TransactionTableProps) {
  const activeUserId = userProfile?.id;
  const activeRole = userProfile?.role || currentRole || 'pengelola';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-black text-slate-900 text-lg sm:text-xl">{title}</h3>
          <p className="text-sm font-semibold text-slate-600 mt-0.5">
            Daftar seluruh riwayat transaksi keuangan yang tercatat di sistem.
          </p>
        </div>
        <span className="text-xs sm:text-sm bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-700 font-bold border border-slate-200">
          Total {transactions.length} Data
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-100/90 text-slate-800 uppercase text-xs font-black border-b border-slate-200 tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Tanggal</th>
              <th className="py-3.5 px-4">Diinput Oleh</th>
              <th className="py-3.5 px-4">Kategori & Catatan</th>
              <th className="py-3.5 px-4">Metode</th>
              <th className="py-3.5 px-4">Jenis Aliran</th>
              <th className="py-3.5 px-4 text-right">Nominal</th>
              <th className="py-3.5 px-4 text-center">Aksi (Lock)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 font-bold text-sm">
                  Belum ada riwayat transaksi yang tercatat.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isEditable = activeUserId
                  ? tx.created_by_user_id === activeUserId
                  : tx.creator_role === activeRole;

                const isIncome = tx.type === 'penerimaan';
                const isPriveTarik = tx.sub_category === 'penarikan_investor';
                const isBelanjaPribadi = tx.sub_category === 'pengeluaran_pribadi';
                const isSetoran = tx.sub_category === 'disetor_investor';
                const isQRISBelanja = isPriveTarik && (
                  (tx.notes || '').toLowerCase().includes('belanja') ||
                  (tx.notes || '').toLowerCase().includes('qris') ||
                  (tx.notes || '').toLowerCase().includes('makanan') ||
                  (tx.notes || '').toLowerCase().includes('listrik') ||
                  (tx.notes || '').toLowerCase().includes('donasi') ||
                  (tx.notes || '').toLowerCase().includes('bensin')
                );
                const isAnyPersonal = isQRISBelanja || isBelanjaPribadi;
                const personalCat = isAnyPersonal ? parsePersonalCategory(tx.notes, tx.sub_category) : null;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    
                    {/* Date */}
                    <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {formatDateIndo(tx.transaction_date)}
                    </td>

                    {/* Creator Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          tx.creator_role === 'investor'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {tx.creator_role === 'investor' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                            {tx.creator_name || 'Pemilik'}
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                            {tx.creator_name || 'Pengelola'}
                          </>
                        )}
                      </span>
                    </td>

                    {/* Category & Notes */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {tx.bank_account && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
                            {tx.bank_account === 'rekening_laundry' ? 'Rekening Laundry' : 'Rekening Reparasi'}
                          </span>
                        )}
                        {tx.business_unit && tx.business_unit !== 'pribadi' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
                            {tx.business_unit === 'laundry' ? 'Unit Laundry' : 'Unit Reparasi'}
                          </span>
                        )}
                        {tx.cost_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            {tx.cost_type === 'fixed_cost' ? 'Fixed Cost' : 'Variable Cost'}
                          </span>
                        )}

                        {isSetoran ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs">
                            ⭐ Setoran Target Investor
                          </span>
                        ) : isAnyPersonal ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-purple-100 text-purple-950 border border-purple-400 shadow-2xs">
                            <span className="mr-1">{getPersonalCategoryIcon(personalCat!)}</span>
                            <span>{getPersonalCategoryLabel(personalCat!)}</span>
                            {isQRISBelanja && <span className="ml-1 text-[10px] text-purple-700 font-semibold">(QRIS)</span>}
                          </span>
                        ) : isPriveTarik ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs">
                            <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-amber-700" />
                            Tarik Kas/ATM (Debit)
                          </span>
                        ) : tx.sub_category ? (
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {getCategoryLabel(tx.sub_category)}
                          </span>
                        ) : null}
                      </div>
                      {tx.notes && <div className="text-xs text-slate-500 font-medium truncate">{tx.notes}</div>}
                    </td>

                    {/* Payment Method */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded text-xs">
                        {isQRISBelanja ? (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                            <span>QRIS / Bank Toko</span>
                          </>
                        ) : isBelanjaPribadi ? (
                          <>
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            <span>Kantong Pribadi</span>
                          </>
                        ) : tx.payment_method === 'cash' ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cash</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                            <span>{tx.bank_account === 'rekening_reparasi' ? 'BCA Reparasi' : tx.bank_account === 'rekening_laundry' ? 'BCA Laundry' : 'Transfer Bank'}</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold px-2.5 py-1 rounded text-xs ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : isQRISBelanja
                            ? 'bg-purple-100 text-purple-900 border border-purple-300 font-black'
                            : isPriveTarik
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isBelanjaPribadi
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {isIncome
                          ? 'Penerimaan Usaha'
                          : isQRISBelanja
                          ? 'QRIS Belanja (Balance 2 Sisi)'
                          : isPriveTarik
                          ? 'Debit Pribadi (Tarik Usaha)'
                          : isBelanjaPribadi
                          ? 'Kredit Pribadi (Belanja)'
                          : 'Biaya Toko'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-4 px-4 text-right font-black text-base whitespace-nowrap ${
                        isIncome
                          ? 'text-emerald-700'
                          : isQRISBelanja
                          ? 'text-purple-700'
                          : isPriveTarik
                          ? 'text-amber-700'
                          : isBelanjaPribadi
                          ? 'text-purple-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </td>

                    {/* Actions / Lock status */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {isEditable && onDeleteTransaction ? (
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Hapus transaksi"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          title="Terkunci: Dibuat oleh pemilik"
                          className="inline-flex items-center text-slate-400 cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
