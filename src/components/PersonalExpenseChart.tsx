'use client';

import React from 'react';
import { Transaction, PERSONAL_CATEGORIES, PersonalCategory } from '@/lib/types';
import { formatRupiah, parsePersonalCategory } from '@/lib/formatters';
import { PieChart, TrendingDown } from 'lucide-react';

interface PersonalExpenseChartProps {
  transactions: Transaction[];
}

export default function PersonalExpenseChart({ transactions }: PersonalExpenseChartProps) {
  // Filter all personal expenses (either from store accounts or independent)
  const personalTxs = transactions.filter((t) => {
    if (t.type !== 'pengeluaran') return false;
    if (t.sub_category === 'pengeluaran_pribadi') return true;
    if (t.sub_category === 'penarikan_investor') {
      const note = (t.notes || '').toLowerCase();
      // Only include direct spending (QRIS / Belanja Langsung Toko), exclude pure cash withdrawals
      return note.includes('belanja') || note.includes('qris') || !note.includes('tarik');
    }
    return false;
  });

  const totalPersonal = personalTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // Group by category
  const categoryTotals: Record<PersonalCategory, { amount: number; count: number }> = {
    bahan_makanan: { amount: 0, count: 0 },
    makanan: { amount: 0, count: 0 },
    listrik_kuota: { amount: 0, count: 0 },
    donasi: { amount: 0, count: 0 },
    belanja: { amount: 0, count: 0 },
    bensin: { amount: 0, count: 0 },
    tabungan: { amount: 0, count: 0 },
  };

  personalTxs.forEach((tx) => {
    const cat = parsePersonalCategory(tx.notes, tx.sub_category);
    if (categoryTotals[cat]) {
      categoryTotals[cat].amount += Number(tx.amount || 0);
      categoryTotals[cat].count += 1;
    }
  });

  const categoryColors: Record<PersonalCategory, { bar: string; badge: string; text: string }> = {
    bahan_makanan: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700' },
    makanan: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', text: 'text-amber-700' },
    listrik_kuota: { bar: 'bg-sky-500', badge: 'bg-sky-100 text-sky-800', text: 'text-sky-700' },
    donasi: { bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800', text: 'text-teal-700' },
    belanja: { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800', text: 'text-purple-700' },
    bensin: { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800', text: 'text-rose-700' },
    tabungan: { bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800', text: 'text-indigo-700' },
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-2xl">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg leading-tight">
              Komposisi Pengeluaran Pribadi
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Distribusi 7 kategori pengeluaran & tabungan pribadi
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto bg-purple-50 px-3.5 py-1.5 rounded-2xl border border-purple-200">
          <TrendingDown className="w-4 h-4 text-purple-600" />
          <span className="text-xs text-purple-800 font-bold">Total:</span>
          <span className="text-sm font-black text-purple-950">{formatRupiah(totalPersonal)}</span>
        </div>
      </div>

      {/* Category Bars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {PERSONAL_CATEGORIES.map((cat) => {
          const item = categoryTotals[cat.id];
          const pct = totalPersonal > 0 ? ((item.amount / totalPersonal) * 100).toFixed(1) : '0';
          const colors = categoryColors[cat.id];

          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {pct}%
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className={`text-base font-black ${colors.text}`}>
                  {formatRupiah(item.amount)}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {item.count}x
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(Math.max(Number(pct), item.amount > 0 ? 5 : 0), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
