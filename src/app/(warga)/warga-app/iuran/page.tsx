'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Wallet, CheckCircle2, Calendar, Receipt, ShieldAlert, AlertCircle } from 'lucide-react';

interface PembayaranIuran {
  id: number;
  id_iuran?: number;
  no_kk: string;
  jumlah_bayar: number;
  periode_bulan: number;
  periode_tahun: number;
  pencatat_by_id?: string;
  petugas_id?: string;
  created_at: string;
  master_iuran?: { 
    nama_iuran: string;
    tarif_nominal?: number;
    kelas_iuran?: Array<{ nama: string; nominal: number }>;
  } | null;
}

const namaBulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function IuranWargaPage() {
  const [iuranList, setIuranList] = useState<PembayaranIuran[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userNoKk, setUserNoKk] = useState<string | null>(null);
  const [totalDibayar, setTotalDibayar] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    const fetchIuranByNoKK = async () => {
      try {
        setIsLoading(true);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          setIsLoading(false);
          return;
        }

        const userNik = user.user_metadata?.nik || user.email?.split('@')[0];

        if (userNik) {
          // 1. Ambil No. KK dari tabel data_warga
          const { data: wargaData } = await supabase
            .from('data_warga')
            .select('no_kk')
            .eq('nik', userNik)
            .maybeSingle();

          const targetNoKk = wargaData?.no_kk || user.user_metadata?.no_kk || userNik;
          setUserNoKk(targetNoKk);

          if (targetNoKk) {
            // 2. Query pembayaran_iuran beserta kolom tarif_nominal dari master_iuran
            const { data, error } = await supabase
              .from('pembayaran_iuran')
              .select(`
                *,
                master_iuran:id_iuran(nama_iuran, tarif_nominal, kelas_iuran)
              `)
              .eq('no_kk', targetNoKk)
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Gagal mengambil data iuran:', error.message);
            } else if (data) {
              setIuranList(data);

              const total = data.reduce(
                (acc, curr) => acc + Number(curr.jumlah_bayar || 0),
                0
              );
              setTotalDibayar(total);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching iuran:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIuranByNoKK();
  }, [supabase]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Riwayat & Tagihan Iuran</h1>
            <p className="text-xs text-slate-500">Pantau status pembayaran iuran keluarga Anda</p>
          </div>
        </div>
      </div>

      {/* Ringkasan Pembayaran */}
      <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">
            Total Pembayaran (KK: {userNoKk || '-'})
          </p>
          <h2 className="text-xl font-extrabold mt-0.5">
            Rp {totalDibayar.toLocaleString('id-ID')}
          </h2>
        </div>
        <Receipt className="w-8 h-8 text-emerald-200/50" />
      </div>

      {/* Daftar Riwayat Iuran */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Catatan Pembayaran No. KK
        </h3>

        {isLoading ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            Memuat data iuran keluarga...
          </div>
        ) : iuranList.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-100 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Belum Ada Catatan Iuran</p>
            <p className="text-[11px] text-slate-400">
              Belum ada riwayat pembayaran yang dicatat untuk No. KK: {userNoKk || '-'}
            </p>
          </div>
        ) : (
          iuranList.map((item) => {
            // Ambil nominal tarif dari kolom tarif_nominal (fallback 20000 jika kosong)
            const nominalTarif = Number(item.master_iuran?.tarif_nominal) || 20000;
            const dibayar = Number(item.jumlah_bayar || 0);
            const selisih = nominalTarif - dibayar;
            const isLunas = selisih <= 0;

            return (
              <div
                key={item.id}
                className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {item.master_iuran?.nama_iuran || 'iuran wajib'}
                  </span>

                  {/* Dynamic Status Badge */}
                  {isLunas ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Lunas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Kurang Rp {selisih.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Periode: {item.periode_bulan ? namaBulan[item.periode_bulan - 1] : '-'} {item.periode_tahun || ''}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600">
                    Rp {dibayar.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}