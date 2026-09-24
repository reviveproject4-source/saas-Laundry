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
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <p className="text-xs text-slate-500">
            Daftar pencatatan keuangan tersimpan di Supabase. Transaksi milik user lain terkunci secara otomatis.
          </p>
        </div>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-medium">
          Total {transactions.length} Data
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Diinput Oleh</th>
              <th className="py-3 px-4">Kategori & Catatan</th>
              <th className="py-3 px-4">Metode</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4 text-right">Nominal</th>
              <th className="py-3 px-4 text-center">Aksi (Lock)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Belum ada data transaksi tersimpan di Supabase.
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
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    
                    {/* Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDateIndo(tx.transaction_date)}
                    </td>

                    {/* Creator Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          tx.creator_role === 'investor'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {tx.creator_role === 'investor' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1 text-amber-600" />
                            {tx.creator_name || 'Investor'}
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
                            {tx.creator_name || 'Pengelola'}
                          </>
                        )}
                      </span>
                    </td>

                    {/* Category & Notes */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800">{getCategoryLabel(tx.sub_category)}</div>
                      {tx.notes && <div className="text-[11px] text-slate-400 truncate">{tx.notes}</div>}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {tx.payment_method === 'cash' ? (
                          <>
                            <Banknote className="w-3 h-3 text-emerald-600" />
                            <span>Cash</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3 text-sky-600" />
                            <span>Transfer</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isIncome ? 'Penerimaan' : 'Pengeluaran'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-3.5 px-4 text-right font-bold text-sm whitespace-nowrap ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                    </td>

                    {/* Action with Lock logic */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isEditable ? (
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus data transaksi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div
                          className="inline-flex items-center space-x-1 text-slate-400 bg-slate-100 px-2 py-1 rounded cursor-not-allowed text-[11px]"
                          title={`Terkunci. Diinput oleh ${tx.creator_name} (${tx.creator_role}). Hanya pembuat yang dapat menghapus.`}
                        >
                          <Lock className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-semibold text-slate-500">Terkunci</span>
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
