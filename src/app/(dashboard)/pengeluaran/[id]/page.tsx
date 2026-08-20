'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Calendar, ExternalLink, Building2, User } from 'lucide-react';

export interface PengeluaranKasDetail {
  id: number;
  id_wilayah?: number | null;
  rw: string;
  nominal_keluar: number;
  keterangan: string;
  url_foto_nota: string;
  pencatat_by_id: string;
  created_at: string;
  // Relasi ke tabel profil_pengurus
  profil_pengurus?: {
    nama_lengkap: string;
    role: string;
  } | null;
}

export default function DetailPengeluaranPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [item, setItem] = useState<PengeluaranKasDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
        try {
        const supabase = createClient();
        
        // 1. Ambil data pengeluaran kas (Pastikan ada .select('*'))
        const { data: pengeluaranData, error: pengeluaranError } = await supabase
            .from('pengeluaran_kas')
            .select('*')
            .eq('id', id)
            .single();

        if (pengeluaranError) throw pengeluaranError;

        // 2. Ambil data profil pengurus secara terpisah
        let pengurusData = null;
        if (pengeluaranData?.pencatat_by_id) {
            const { data: profil } = await supabase
            .from('profil_pengurus')
            .select('nama_lengkap, role')
            .eq('id', pengeluaranData.pencatat_by_id)
            .maybeSingle();

            pengurusData = profil;
        }

        // 3. Simpan ke state
        setItem({
            ...pengeluaranData,
            profil_pengurus: pengurusData,
        });
        } catch (err: any) {
        console.error('Gagal memuat detail pengeluaran:', err);
        setErrorMessage(err.message || 'Data pengeluaran tidak ditemukan.');
        } finally {
        setIsLoading(false);
        }
    };

    if (id) fetchDetail();
    }, [id]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 p-2 sm:p-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        <Link
          href="/pengeluaran"
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-slate-800">Detail Pengeluaran</h1>
          <p className="text-xs text-slate-500">ID Transaksi: #{id}</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs text-slate-500">Memuat detail transaksi...</span>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
          {errorMessage}
        </div>
      )}

      {/* Content Detail */}
      {!isLoading && item && (
        <div className="space-y-4">
          {/* Card Info Utama */}
          <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="text-center pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Nominal Keluar</span>
              <h2 className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
                {formatRupiah(item.nominal_keluar)}
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Keterangan / Keperluan</span>
                <p className="text-slate-800 font-semibold text-sm">{item.keterangan}</p>
              </div>

              {/* Informasi Pencatat / Inputer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Dicatat / Diinput Oleh</span>
                  <p className="text-xs font-bold text-slate-800">
                    {item.profil_pengurus?.nama_lengkap || 'Pengurus Tidak Teridentifikasi'}
                  </p>
                  {item.profil_pengurus?.role && (
                    <span className="text-[10px] text-slate-500 font-medium capitalize">
                      Role: {item.profil_pengurus.role.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Waktu Transaksi</span>
                    <span className="font-semibold text-slate-700">{formatDate(item.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wilayah RW</span>
                    <span className="font-semibold text-slate-700">RW {item.rw}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Foto Nota */}
          <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-700">Foto Bukti Nota</h3>
            {item.url_foto_nota ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <img
                    src={item.url_foto_nota}
                    alt="Foto Nota Pengeluaran"
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
                <div className="text-right">
                  <a
                    href={item.url_foto_nota}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline"
                  >
                    <span>Buka Foto Ukuran Penuh</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 rounded-xl text-xs text-slate-400">
                Tidak ada foto nota terlampir
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}