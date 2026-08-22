'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Wallet, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  Receipt, 
  Search,
  UserCheck,
  Loader2,
  Calendar,
  LogOut
} from 'lucide-react';

interface PembayaranItem {
  id: number;
  no_kk: string;
  jumlah_bayar: number;
  periode_bulan: number;
  periode_tahun: number;
  created_at?: string;
  is_disetor?: boolean;
  tgl_disetor?: string | null;
  status_setoran?: string | null;
  petugas?: { nama_lengkap: string };
  pencatat_by_id?: string;
  petugas_id?: string;
}

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function RekapIuranContent() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'semua' | 'belum' | 'sudah'>('semua');
  const [searchTerm, setSearchTerm] = useState('');

  const [totalBelum, setTotalBelum] = useState(0);
  const [totalSudah, setTotalSudah] = useState(0);

  const [listPembayaran, setListPembayaran] = useState<PembayaranItem[]>([]);
  const [unsubmittedIds, setUnsubmittedIds] = useState<number[]>([]);

  const handleLogout = async () => {
    if (!window.confirm('Apakah Anda yakin ingin keluar dari akun petugas?')) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      alert('Gagal keluar: ' + err.message);
      setLoggingOut(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dataPetugas } = await supabase
        .from('profil_pengurus')
        .select('id, nama_lengkap');

      const pengurusMap = new Map<string, string>();
      if (dataPetugas) {
        dataPetugas.forEach((p) => pengurusMap.set(p.id, p.nama_lengkap));
      }

      const { data: listData, error } = await supabase
        .from('pembayaran_iuran')
        .select('*')
        .or(`pencatat_by_id.eq.${user.id},petugas_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (listData) {
        let lumsumBelum = 0;
        let lumsumSudah = 0;
        const pendingIds: number[] = [];

        const formatted = listData.map((item: any) => {
          const nominal = Number(item.jumlah_bayar || 0);
          if (item.is_disetor) {
            lumsumSudah += nominal;
          } else {
            lumsumBelum += nominal;
            // Ambil ID transaksi yang belum disetor penuh/approved
            if (item.status_setoran !== 'APPROVED') {
              pendingIds.push(item.id);
            }
          }

          const targetId = item.petugas_id || item.pencatat_by_id;
          const namaDitemukan = targetId ? pengurusMap.get(targetId) : null;

          return {
            ...item,
            petugas: {
              nama_lengkap: namaDitemukan || 'Petugas Penagih'
            }
          };
        });

        setTotalBelum(lumsumBelum);
        setTotalSudah(lumsumSudah);
        setUnsubmittedIds(pendingIds);
        setListPembayaran(formatted as PembayaranItem[]);
      }
    } catch (err: any) {
      console.error('Gagal mengambil data rekapan:', err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // FIX: Fungsi pengajuan setoran kas ke Bendahara
  const handleSetorKeBendahara = async () => {
    if (unsubmittedIds.length === 0 || totalBelum <= 0) return;
    
    const confirmSetor = window.confirm(
      `Apakah Anda yakin ingin mengajukan setoran kas fisik sebesar Rp ${totalBelum.toLocaleString('id-ID')} (${unsubmittedIds.length} transaksi) ke Bendahara?`
    );
    if (!confirmSetor) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Sesi login berakhir. Silakan login kembali.');
        return;
      }

      // Update status_setoran ke 'PENDING' dan isi id_petugas_penyetor
      const { data, error } = await supabase
        .from('pembayaran_iuran')
        .update({
          status_setoran: 'PENDING',
          id_petugas_penyetor: user.id,
        })
        .in('id', unsubmittedIds)
        .select();

      if (error) {
        console.error('Error Supabase Update:', error);
        throw new Error(error.message);
      }

      alert('✅ Setoran kas berhasil diajukan! Silakan temui Bendahara untuk serah terima kas.');
      fetchData();
    } catch (err: any) {
      alert('Gagal mengajukan setoran: ' + err.message + '\n\nPastikan Policy RLS Supabase mengizinkan Update.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredList = listPembayaran.filter((item) => {
    const matchStatus =
      filterStatus === 'semua' ? true : filterStatus === 'belum' ? !item.is_disetor : item.is_disetor;
    const matchSearch =
      item.no_kk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.petugas?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Rekap Setoran Saya
          </h2>
          <p className="text-[11px] text-slate-400">
            Kas tunai yang Anda catat dan setorkan
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all text-xs font-semibold shadow-sm flex items-center gap-1"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-xl transition-all text-xs font-semibold shadow-sm flex items-center gap-1"
            title="Keluar"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Ringkasan Status Kas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Di Tangan Saya</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-lg font-black text-amber-950">Rp {totalBelum.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-amber-700/80">Belum disetor</p>
        </div>

        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kas Bendahara</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-lg font-black text-emerald-950">Rp {totalSudah.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-emerald-700/80">Sudah disetor</p>
        </div>
      </div>

      {/* Tombol Serah Terima Kas */}
      {totalBelum > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs">Serah Terima Kas Lapangan</h3>
              <p className="text-[10px] text-slate-400">
                Ada <span className="text-amber-400 font-bold">Rp {totalBelum.toLocaleString('id-ID')}</span> kas tunai yang perlu disetorkan.
              </p>
            </div>
          </div>
          <button
            onClick={handleSetorKeBendahara}
            disabled={submitting}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            <span>{submitting ? 'Memproses Update...' : 'Setorkan Kas ke Bendahara'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Filters */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No. KK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
          />
        </div>

        <div className="grid grid-cols-3 bg-slate-200/60 p-1 rounded-2xl text-[11px] font-semibold">
          <button
            onClick={() => setFilterStatus('semua')}
            className={`py-1.5 rounded-xl transition-all ${
              filterStatus === 'semua' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterStatus('belum')}
            className={`py-1.5 rounded-xl transition-all ${
              filterStatus === 'belum' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            Belum Disetor
          </button>
          <button
            onClick={() => setFilterStatus('sudah')}
            className={`py-1.5 rounded-xl transition-all ${
              filterStatus === 'sudah' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            Sudah Disetor
          </button>
        </div>
      </div>

      {/* List Transaksi */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat rekapan...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm text-slate-400 text-xs">
            Tidak ada transaksi ditemukan
          </div>
        ) : (
          filteredList.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between gap-3 text-xs">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-800">
                    {BULAN_LIST[item.periode_bulan - 1]} {item.periode_tahun}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">KK: {item.no_kk}</span>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                  {item.created_at && (
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </span>
                  )}
                  {item.petugas?.nama_lengkap && (
                    <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <UserCheck className="w-3 h-3" />
                      {item.petugas.nama_lengkap}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg block text-xs">
                  + Rp {Number(item.jumlah_bayar).toLocaleString('id-ID')}
                </span>
                
                {item.is_disetor ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Disetor
                  </span>
                ) : item.status_setoran === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    <Clock className="w-2.5 h-2.5" /> Menunggu Bendahara
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    <Clock className="w-2.5 h-2.5" /> Belum Diajukan
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function RekapIuranPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs">Memuat rekapan setoran...</span>
      </div>
    }>
      <RekapIuranContent />
    </Suspense>
  );
}