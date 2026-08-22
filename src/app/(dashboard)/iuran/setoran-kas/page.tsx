'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  HandCoins, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  UserCheck, 
  Loader2, 
  Calendar,
  Wallet,
  Building2
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
  pencatat_by_id?: string;
  petugas_id?: string;
  petugas_nama?: string;
}

interface PetugasSummary {
  petugasId: string;
  namaPetugas: string;
  totalNominalBelum: number;
  totalTransaksiBelum: number;
  items: PembayaranItem[];
}

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function SetoranKasContent() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'menunggu' | 'riwayat'>('menunggu');

  // Grouped Summary Data
  const [petugasSummaries, setPetugasSummaries] = useState<PetugasSummary[]>([]);
  const [riwayatDisetor, setRiwayatDisetor] = useState<PembayaranItem[]>([]);
  const [totalKasDiLapangan, setTotalKasDiLapangan] = useState(0);

  // Fetch Data Transaksi untuk Bendahara
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Profil Pengurus/Petugas
      const { data: dataPetugas } = await supabase
        .from('profil_pengurus')
        .select('id, nama_lengkap');

      const pengurusMap = new Map<string, string>();
      if (dataPetugas) {
        dataPetugas.forEach((p) => pengurusMap.set(p.id, p.nama_lengkap));
      }

      // 2. Fetch Semua Pembayaran Iuran
      const { data: listData, error } = await supabase
        .from('pembayaran_iuran')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (listData) {
        const groupedMap = new Map<string, PetugasSummary>();
        const riwayat: PembayaranItem[] = [];
        let grandTotalBelum = 0;

        listData.forEach((item: any) => {
          const targetId = item.pencatat_by_id || item.petugas_id || 'unknown';
          const namaPetugas = pengurusMap.get(targetId) || 'Petugas Penagih';
          const nominal = Number(item.jumlah_bayar || 0);

          const formattedItem: PembayaranItem = {
            ...item,
            petugas_nama: namaPetugas
          };

          if (item.is_disetor) {
            riwayat.push(formattedItem);
          } else {
            grandTotalBelum += nominal;

            if (!groupedMap.has(targetId)) {
              groupedMap.set(targetId, {
                petugasId: targetId,
                namaPetugas: namaPetugas,
                totalNominalBelum: 0,
                totalTransaksiBelum: 0,
                items: []
              });
            }

            const current = groupedMap.get(targetId)!;
            current.totalNominalBelum += nominal;
            current.totalTransaksiBelum += 1;
            current.items.push(formattedItem);
          }
        });

        setTotalKasDiLapangan(grandTotalBelum);
        setPetugasSummaries(Array.from(groupedMap.values()));
        setRiwayatDisetor(riwayat);
      }
    } catch (err: any) {
      console.error('Gagal mengambil data setoran kas:', err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bendahara Mengonfirmasi Terima Kas dari Petugas Tertentu
  const handleKonfirmasiTerimaKas = async (summary: PetugasSummary) => {
    const confirmTerima = window.confirm(
      `Apakah Anda yakin telah menerima uang tunai sebesar Rp ${summary.totalNominalBelum.toLocaleString('id-ID')} dari ${summary.namaPetugas}?`
    );
    if (!confirmTerima) return;

    setSubmittingId(summary.petugasId);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const bendaharaId = userData?.user?.id;

      // Update seluruh transaksi milik petugas tersebut yang belum disetor
      const { error } = await supabase
        .from('pembayaran_iuran')
        .update({
          is_disetor: true,
          tgl_disetor: new Date().toISOString(),
          id_petugas_penyetor: summary.petugasId,
        })
        .eq('is_disetor', false)
        .or(`pencatat_by_id.eq.${summary.petugasId},petugas_id.eq.${summary.petugasId}`);

      if (error) throw error;

      alert(`✅ Setoran kas dari ${summary.namaPetugas} berhasil dikonfirmasi dan masuk Kas Utama!`);
      fetchData();
    } catch (err: any) {
      alert('Gagal mengonfirmasi setoran kas: ' + err.message);
    } finally {
      setSubmittingId(null);
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

  // Filter List Riwayat
  const filteredRiwayat = riwayatDisetor.filter((item) => {
    return (
      item.no_kk?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.petugas_nama?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <HandCoins className="w-5 h-5 text-amber-600" />
            Konfirmasi Setoran Kas
          </h2>
          <p className="text-[11px] text-slate-400">
            Verifikasi penerimaan kas fisik dari Petugas Lapangan
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all text-xs font-semibold shadow-sm shrink-0 flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ringkasan Kas yang Harus Diterima */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-amber-100 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Total Kas Di Tangan Petugas
          </p>
          <p className="text-xl font-black">
            Rp {totalKasDiLapangan.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
          <Wallet className="w-5 h-5" />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-2 bg-slate-200/60 p-1 rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('menunggu')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'menunggu'
              ? 'bg-white text-slate-800 shadow-sm font-bold'
              : 'text-slate-600'
          }`}
        >
          Perlu Diterima ({petugasSummaries.length})
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`py-2 rounded-xl transition-all ${
            activeTab === 'riwayat'
              ? 'bg-white text-emerald-700 shadow-sm font-bold'
              : 'text-slate-600'
          }`}
        >
          Riwayat Diterima
        </button>
      </div>

      {/* Content Tab 1: Menunggu Konfirmasi (Grouped per Petugas) */}
      {activeTab === 'menunggu' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-xs">Memuat data setoran...</span>
            </div>
          ) : petugasSummaries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Semua kas lapangan dari petugas telah disetorkan.
            </div>
          ) : (
            petugasSummaries.map((summary) => (
              <div
                key={summary.petugasId}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">{summary.namaPetugas}</h3>
                      <p className="text-[10px] text-slate-400">
                        {summary.totalTransaksiBelum} Transaksi Belum Disetor
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-amber-700 block">
                      Rp {summary.totalNominalBelum.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Tombol Terima Uang */}
                <button
                  onClick={() => handleKonfirmasiTerimaKas(summary)}
                  disabled={submittingId === summary.petugasId}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  {submittingId === summary.petugasId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Konfirmasi Terima Kas Tunai</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content Tab 2: Riwayat Diterima */}
      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari KK / Petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
            />
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat riwayat...</span>
              </div>
            ) : filteredRiwayat.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm text-slate-400 text-xs">
                Tidak ada riwayat setoran ditemukan
              </div>
            ) : (
              filteredRiwayat.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">
                        {BULAN_LIST[item.periode_bulan - 1]} {item.periode_tahun}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">KK: {item.no_kk}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      {item.tgl_disetor && (
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          Disetor: {formatDate(item.tgl_disetor)}
                        </span>
                      )}
                      {item.petugas_nama && (
                        <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                          <UserCheck className="w-3 h-3" />
                          {item.petugas_nama}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg block text-xs">
                      Rp {Number(item.jumlah_bayar).toLocaleString('id-ID')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      <Building2 className="w-2.5 h-2.5" /> Kas Utama
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetoranKasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <span className="text-xs">Memuat halaman setoran kas...</span>
        </div>
      }
    >
      <SetoranKasContent />
    </Suspense>
  );
}