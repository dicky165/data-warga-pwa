'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt, 
  PlusCircle 
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Card Saldo Kas Utama */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-3xl p-5 text-white shadow-lg shadow-sky-600/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-sky-100">Total Saldo Kas RT/RW</span>
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
            <Wallet className="w-5 h-5 text-sky-100" />
          </div>
        </div>

        <h2 className="text-2xl font-black font-mono tracking-tight mb-4">
          Rp 12.450.000
        </h2>

        {/* Breakdown Pemasukan & Pengeluaran */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] text-sky-100">Masuk (Bulan ini)</p>
              <p className="font-semibold font-mono">Rp 3.200.000</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/20 rounded-lg">
              <TrendingDown className="w-4 h-4 text-rose-300" />
            </div>
            <div>
              <p className="text-[10px] text-sky-100">Keluar (Bulan ini)</p>
              <p className="font-semibold font-mono">Rp 750.000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Aksi Cepat */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
          Aksi Cepat
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/pembayaran"
            className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-sky-300 active:scale-95 transition-all h-28"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Bayar Iuran</p>
              <p className="text-[10px] text-slate-400">Catat transaksi warga</p>
            </div>
          </Link>

          <Link
            href="/pengeluaran"
            className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-rose-300 active:scale-95 transition-all h-28"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Foto Nota Kas</p>
              <p className="text-[10px] text-slate-400">Upload pengeluaran</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Informasi Ringkas Warga */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Total Kepala Keluarga</p>
            <p className="text-[11px] text-slate-500">Terdaftar di RT 001 / RW 001</p>
          </div>
        </div>
        <span className="text-lg font-bold font-mono text-sky-600 bg-sky-50 px-3 py-1 rounded-xl">
          42 KK
        </span>
      </div>
    </div>
  );
}