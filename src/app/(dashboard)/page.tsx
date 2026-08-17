'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, PlusCircle, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------
// 1. Komponen Utama Halaman Iuran (Mengakses searchParams)
// ---------------------------------------------------------------------
function IuranContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [noKK, setNoKK] = useState<string>('');
  const [jumlahBayar, setJumlahBayar] = useState<string>('');
  const [periodeBulan, setPeriodeBulan] = useState<number>(new Date().getMonth() + 1);
  const [periodeTahun, setPeriodeTahun] = useState<number>(new Date().getFullYear());
  const [keterangan, setKeterangan] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const kkParam = searchParams.get('no_kk');
    if (kkParam) {
      setNoKK(kkParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!noKK.trim() || !jumlahBayar) {
        throw new Error('Nomor KK dan Nominal Bayar wajib diisi!');
      }

      const { error } = await supabase.from('pembayaran_iuran').insert([
        {
          no_kk: noKK.trim(),
          jumlah_bayar: Number(jumlahBayar),
          periode_bulan: Number(periodeBulan),
          periode_tahun: Number(periodeTahun),
          keterangan: keterangan.trim() || null,
        },
      ]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Pembayaran iuran berhasil dicatat!' });
      setJumlahBayar('');
      setKeterangan('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan pembayaran.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Pembayaran Iuran</h1>
          <p className="text-xs text-slate-400">Catat penerimaan kas dari warga</p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nomor KK</label>
          <input
            type="text"
            value={noKK}
            onChange={(e) => setNoKK(e.target.value)}
            placeholder="Masukkan 16 digit No KK"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Bayar (Rp)</label>
          <input
            type="number"
            value={jumlahBayar}
            onChange={(e) => setJumlahBayar(e.target.value)}
            placeholder="Contoh: 50000"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Periode Bulan</label>
            <select
              value={periodeBulan}
              onChange={(e) => setPeriodeBulan(Number(e.target.value))}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 bg-white"
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((namaBulan, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {namaBulan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Periode Tahun</label>
            <input
              type="number"
              value={periodeTahun}
              onChange={(e) => setPeriodeTahun(Number(e.target.value))}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan (Opsional)</label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Catatan tambahan..."
            rows={2}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Simpan Pembayaran</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. Export Default Halaman yang Dibungkus Suspense (Memperbaiki Netlify Build Error)
// ---------------------------------------------------------------------
export default function IuranPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span className="text-xs">Memuat formulir iuran...</span>
        </div>
      }
    >
      <IuranContent />
    </Suspense>
  );
}