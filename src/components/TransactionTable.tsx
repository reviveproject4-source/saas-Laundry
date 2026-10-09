'use client';

import React from 'react';
import { Transaction, UserProfile, UserRole } from '@/lib/types';
import { formatRupiah, formatDateIndo, getCategoryLabel } from '@/lib/formatters';
import { Lock, Trash2, Banknote, CreditCard, UserCheck, ShieldCheck } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  userProfile?: UserProfile | null;
  currentRole?: UserRole;
  onDeleteTransaction: (id: string) => void;
  title?: string;
}

export default function TransactionTable({
  transactions,
  userProfile,
  currentRole,
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
            Daftar seluruh riwayat transaksi keuangan outlet yang telah diverifikasi sistem.
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
              <th className="py-3.5 px-4">Jenis</th>
              <th className="py-3.5 px-4 text-right">Nominal</th>
              <th className="py-3.5 px-4 text-center">Aksi (Lock)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500 font-semibold text-sm">
                  Belum ada riwayat transaksi yang tercatat.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                // Rule: Editable if current user is the creator of this transaction
                const isEditable = activeUserId
                  ? tx.created_by_user_id === activeUserId
                  : tx.creator_role === activeRole;

                const isIncome = tx.type === 'penerimaan';

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
                            {tx.creator_name || 'Investor'}
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
                        {tx.business_unit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
                            {tx.business_unit === 'laundry' ? 'Unit Laundry' : 'Unit Reparasi'}
                          </span>
                        )}
                        {tx.cost_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            {tx.cost_type === 'fixed_cost' ? 'Fixed Cost' : 'Variable Cost'}
                          </span>
                        )}
                        {tx.sub_category === 'disetor_investor' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-black bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs">
                            ⭐ Setoran Target Investor
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
                        {tx.payment_method === 'cash' ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cash</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                            <span>Transfer</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold px-2.5 py-1 rounded text-xs ${
                          isIncome ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {isIncome ? 'Penerimaan' : 'Pengeluaran'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-4 px-4 text-right font-black text-base whitespace-nowrap ${
                        isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                    </td>

                    {/* Action with Lock logic */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {isEditable ? (
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
                          title="Hapus data transaksi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div
                          className="inline-flex items-center space-x-1.5 text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg cursor-not-allowed text-xs"
                          title={`Terkunci. Diinput oleh ${tx.creator_name} (${tx.creator_role}). Hanya pembuat yang dapat menghapus.`}
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold text-slate-600">Terkunci</span>
                        </div>
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
