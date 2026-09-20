'use client';

import React from 'react';
import { formatRupiah } from '@/lib/formatters';
import { Target, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

interface TargetProgressProps {
  totalDisetor: number;
  totalPenarikan: number;
}

export default function TargetProgress({ totalDisetor, totalPenarikan }: TargetProgressProps) {
  const TARGET_SETORAN = 10000000; // Tetap Rp 10.000.000 / bulan
  const percentage = Math.min(Math.round((totalDisetor / TARGET_SETORAN) * 100), 100);
  const remaining = Math.max(TARGET_SETORAN - totalDisetor, 0);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-6 shadow-md border border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-400/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-white">Target Setoran Investor</h3>
              <span className="bg-sky-400/20 text-sky-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-sky-400/30">
                Tetap Rp 10 Juta / Bln
              </span>
            </div>
            <p className="text-xs text-slate-300">Setoran dari pengelola kepada investor per bulan</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-white">{percentage}%</div>
          <div className="text-xs text-slate-400 font-medium">Realisasi Bulan Ini</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700/60 rounded-full h-3.5 mb-4 overflow-hidden p-0.5 border border-slate-600">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage >= 100
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-sky-500 to-blue-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Figures Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span className="text-slate-400 block mb-1">Target Tetap</span>
          <span className="font-bold text-sm text-white">{formatRupiah(TARGET_SETORAN)}</span>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span className="text-slate-400 block mb-1">Telah Disetor Pengelola</span>
          <span className="font-bold text-sm text-emerald-400">{formatRupiah(totalDisetor)}</span>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <span className="text-slate-400 block mb-1">Sisa Target Setoran</span>
          <span className={`font-bold text-sm ${remaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {remaining === 0 ? 'Target Terpenuhi 🎉' : formatRupiah(remaining)}
          </span>
        </div>
      </div>

      {/* Penarikan Investor Info */}
      {totalPenarikan > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-1.5">
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            <span>Total Penarikan Uang (Prive) Investor Bulan Ini:</span>
          </div>
          <span className="font-bold text-amber-300">{formatRupiah(totalPenarikan)}</span>
        </div>
      )}
    </div>
  );
}
