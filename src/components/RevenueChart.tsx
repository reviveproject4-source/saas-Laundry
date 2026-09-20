'use client';

import React, { useState } from 'react';
import { formatRupiah } from '@/lib/formatters';
import { BarChart3, Calendar } from 'lucide-react';

interface ChartDataPoint {
  label: string;
  omset: number;
}

interface RevenueChartProps {
  dailyData: ChartDataPoint[];
  monthlyData: ChartDataPoint[];
}

export default function RevenueChart({ dailyData, monthlyData }: RevenueChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const activeData = viewMode === 'daily' ? dailyData : monthlyData;
  const maxOmset = Math.max(...activeData.map((d) => d.omset), 100000);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-lg">Grafik Omset Keuangan</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'daily'
              ? 'Menampilkan omset 6 hari sebelumnya'
              : 'Menampilkan omset 6 bulan sebelumnya'}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'daily'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Hari Terakhir
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'monthly'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Bulan Terakhir
          </button>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
        {activeData.map((item, index) => {
          const heightPercent = Math.max(Math.round((item.omset / maxOmset) * 100), 8);
          return (
            <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              
              {/* Tooltip on Hover */}
              <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all bg-slate-800 text-white text-[11px] py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                {formatRupiah(item.omset)}
              </div>

              {/* Bar */}
              <div
                className="w-full max-w-[48px] bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                style={{ height: `${heightPercent}%` }}
              />

              {/* Label */}
              <span className="text-[11px] font-medium text-slate-500 mt-2 text-center truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-sky-500 rounded-sm inline-block" />
          <span>Total Omset (Laundry + Reparasi)</span>
        </div>
        <span className="font-semibold text-slate-700">
          Max: {formatRupiah(maxOmset)}
        </span>
      </div>
    </div>
  );
}
