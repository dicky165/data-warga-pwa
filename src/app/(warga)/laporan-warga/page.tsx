'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw, MapPin, Loader2 } from 'lucide-react';

export default function WargaLaporanPage() {
  const supabase = createClient();

  const [listLaporan, setListLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyLaporan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('laporan_kejadian')
        .select('*')
        .eq('pelapor_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setListLaporan(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLaporan();
  }, []);

  return (
    <div className="space-y-4 pb-24 px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Laporan Saya</h2>
          <p className="text-[11px] text-slate-400">Pantau status laporan kejadian & kerusakan</p>
        </div>
        <Link
          href="/laporan-warga/buat"
          className="flex items-center gap-1 px-3 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat laporan...</span>
        </div>
      ) : listLaporan.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Anda belum pernah membuat laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listLaporan.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  {item.kategori}
                </span>
                <span className="text-[10px] font-bold">
                  {item.status === 'PENDING' && <span className="text-amber-600">Menunggu</span>}
                  {item.status === 'DIPROSES' && <span className="text-sky-600">Diproses</span>}
                  {item.status === 'SELESAI' && <span className="text-emerald-600">Selesai</span>}
                  {item.status === 'DITOLAK' && <span className="text-rose-600">Ditolak</span>}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-800">{item.judul}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{item.deskripsi}</p>

              {item.foto_url && (
                <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100">
                  <img src={item.foto_url} alt={item.judul} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{item.lokasi_detail}</span>
              </div>

              {item.catatan_pengurus && (
                <div className="bg-sky-50/60 p-2.5 rounded-xl text-[11px] text-sky-800 border border-sky-100">
                  <span className="font-bold block">Tanggapan Pengurus:</span>
                  {item.catatan_pengurus}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}