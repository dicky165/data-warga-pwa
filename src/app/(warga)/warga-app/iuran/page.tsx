'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Wallet, 
  CheckCircle2, 
  Calendar, 
  Receipt, 
  ShieldAlert, 
  AlertCircle, 
  XCircle,
  Filter,
  UserCheck,
  ChevronRight,
  X,
  CreditCard,
  Loader2
} from 'lucide-react';

interface MasterIuranItem {
  id: number;
  nama_iuran: string;
  tarif_nominal?: number;
  is_active?: boolean;
}

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
  petugas?: { nama_lengkap: string };
  master_iuran?: { 
    nama_iuran: string;
    tarif_nominal?: number;
  } | null;
}

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function IuranWargaPage() {
  const [iuranList, setIuranList] = useState<PembayaranIuran[]>([]);
  const [masterList, setMasterList] = useState<MasterIuranItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userNoKk, setUserNoKk] = useState<string | null>(null);
  const [namaKepala, setNamaKepala] = useState<string>('');
  
  // Filter State
  const [filterBulan, setFilterBulan] = useState<number>(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState<number>(new Date().getFullYear());

  // Modal Detail State
  const [selectedTx, setSelectedTx] = useState<PembayaranIuran | null>(null);

  const supabase = createClient();

  const fetchIuranData = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        setIsLoading(false);
        return;
      }

      const userNik = user.user_metadata?.nik || user.email?.split('@')[0];

      // 1. Fetch Master Iuran Aktif
      const { data: masterData } = await supabase
        .from('master_iuran')
        .select('*')
        .eq('is_active', true);

      if (masterData) {
        setMasterList(masterData as MasterIuranItem[]);
      }

      if (userNik) {
        // 2. Ambil No. KK & Profil dari tabel data_warga
        const { data: wargaData } = await supabase
          .from('data_warga')
          .select('no_kk, nama_lengkap')
          .eq('nik', userNik)
          .maybeSingle();

        const targetNoKk = wargaData?.no_kk || user.user_metadata?.no_kk || userNik;
        setUserNoKk(targetNoKk);
        if (wargaData?.nama_lengkap) setNamaKepala(wargaData.nama_lengkap);

        if (targetNoKk) {
          // 3. Query profil pengurus untuk pemetaan nama petugas
          const { data: dataPetugas } = await supabase
            .from('profil_pengurus')
            .select('id, nama_lengkap');

          const pengurusMap = new Map<string, string>();
          if (dataPetugas) {
            dataPetugas.forEach((p) => pengurusMap.set(p.id, p.nama_lengkap));
          }

          // 4. Query pembayaran_iuran beserta master_iuran
          const { data, error } = await supabase
            .from('pembayaran_iuran')
            .select(`
              *,
              master_iuran:id_iuran(nama_iuran, tarif_nominal)
            `)
            .eq('no_kk', targetNoKk)
            .order('periode_tahun', { ascending: false })
            .order('periode_bulan', { ascending: false });

          if (error) {
            console.error('Gagal mengambil data iuran:', error.message);
          } else if (data) {
            const formatted = data.map((item: any) => {
              const pId = item.petugas_id || item.pencatat_by_id;
              return {
                ...item,
                petugas: {
                  nama_lengkap: pId ? pengurusMap.get(pId) || 'Pengurus RT/RW' : 'Pengurus RT/RW'
                }
              };
            });
            setIuranList(formatted as PembayaranIuran[]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching iuran:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchIuranData();
  }, [fetchIuranData]);

  // Kalkulasi Total Pembayaran
  const totalDibayarTahunIni = iuranList
    .filter((item) => Number(item.periode_tahun) === Number(filterTahun))
    .reduce((acc, curr) => acc + Number(curr.jumlah_bayar || 0), 0);

  // Filter Riwayat yang Ditampilkan
  const filteredList = iuranList.filter((item) => {
    const matchTahun = Number(item.periode_tahun) === Number(filterTahun);
    const matchBulan = filterBulan === 0 || Number(item.periode_bulan) === Number(filterBulan);
    return matchTahun && matchBulan;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Iuran Keluarga</h1>
            <p className="text-[11px] text-slate-400">
              {namaKepala ? `KK: ${namaKepala}` : `No. KK: ${userNoKk || '-'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Card Ringkasan Total */}
      <div className="p-5 bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 text-white rounded-3xl shadow-lg shadow-emerald-600/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-emerald-50 font-medium">
              Total Pembayaran {filterTahun}
            </span>
            <h2 className="text-2xl font-black mt-2 tracking-tight">
              Rp {totalDibayarTahunIni.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
            <Receipt className="w-6 h-6 text-emerald-100" />
          </div>
        </div>
      </div>

      {/* Ringkasan Status Bulan Ini */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 px-1 flex items-center justify-between">
          <span>Status Iuran {BULAN_LIST[filterBulan - 1]} {filterTahun}</span>
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {masterList.map((master) => {
            const tarif = Number(master.tarif_nominal || 0);
            const txBulanIni = iuranList.filter(
              (p) =>
                p.id_iuran === master.id &&
                Number(p.periode_bulan) === Number(filterBulan) &&
                Number(p.periode_tahun) === Number(filterTahun)
            );

            const totalBayar = txBulanIni.reduce((acc, curr) => acc + Number(curr.jumlah_bayar || 0), 0);
            const selisih = tarif - totalBayar;
            const isLunas = tarif > 0 ? totalBayar >= tarif : totalBayar > 0;

            return (
              <div
                key={master.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{master.nama_iuran}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Tarif: Rp {tarif.toLocaleString('id-ID')} / bulan
                  </p>
                </div>

                <div>
                  {isLunas ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Lunas
                    </span>
                  ) : totalBayar > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-xl border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Kurang Rp {selisih.toLocaleString('id-ID')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-xl border border-rose-100">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Belum Dibayar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls & Filter */}
      <div className="flex items-center gap-2 pt-2">
        <div className="relative flex-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filterBulan}
            onChange={(e) => setFilterBulan(Number(e.target.value))}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value={0}>Semua Bulan</option>
            {BULAN_LIST.map((b, idx) => (
              <option key={idx} value={idx + 1}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <input
          type="number"
          value={filterTahun}
          onChange={(e) => setFilterTahun(Number(e.target.value))}
          className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm text-center"
        />
      </div>

      {/* Daftar Riwayat Transaksi */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 px-1">
          Riwayat Pembayaran {filterBulan > 0 ? BULAN_LIST[filterBulan - 1] : ''} {filterTahun}
        </h3>

        {isLoading ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat catatan pembayaran...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Belum Ada Catatan Transaksi</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Tidak ada catatan pembayaran iuran untuk periode yang dipilih.
            </p>
          </div>
        ) : (
          filteredList.map((item) => {
            const dibayar = Number(item.jumlah_bayar || 0);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedTx(item)}
                className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold uppercase text-slate-400">
                      {item.periode_bulan ? BULAN_LIST[item.periode_bulan - 1].substring(0, 3) : 'IUR'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {item.periode_tahun}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {item.master_iuran?.nama_iuran || 'Iuran Warga'}
                    </h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>{item.petugas?.nama_lengkap}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                    + Rp {dibayar.toLocaleString('id-ID')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detail Transaksi */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bukti Pembayaran Iuran
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs">
              <div className="text-center pb-2 border-b border-slate-200">
                <span className="text-[10px] text-slate-400 font-medium uppercase">Jumlah Dibayar</span>
                <h2 className="text-2xl font-black text-emerald-600 mt-0.5">
                  Rp {Number(selectedTx.jumlah_bayar).toLocaleString('id-ID')}
                </h2>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Jenis Iuran:</span>
                  <span className="font-bold text-slate-700">
                    {selectedTx.master_iuran?.nama_iuran || 'Iuran Warga'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Periode:</span>
                  <span className="font-semibold text-slate-700">
                    {BULAN_LIST[selectedTx.periode_bulan - 1]} {selectedTx.periode_tahun}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal Pencatatan:</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedTx.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Petugas / Penerima:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedTx.petugas?.nama_lengkap}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">No. KK:</span>
                  <span className="font-mono text-slate-600">{selectedTx.no_kk}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 bg-slate-800 text-white font-semibold rounded-xl text-xs hover:bg-slate-900 transition-all"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}