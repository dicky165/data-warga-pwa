'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Receipt, 
  Loader2,
  ChevronRight,
  Users
} from 'lucide-react';

interface StatRT {
  rt: string;
  rw: string;
  totalKK: number;
  totalKasMasuk: number;
  totalWarga: number;
  kematian: number;
  kawin: number;
  belumKawin: number;
  ceraiHidup: number;
  ceraiMati: number;
  bekerja: number;
  belumBekerja: number;
}

function DashboardContent() {
  const [totalKeseluruhanKK, setTotalKeseluruhanKK] = useState<number>(0);
  const [statsPerRT, setStatsPerRT] = useState<StatRT[]>([]);
  const [namaRW, setNamaRW] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // State Keuangan Total
  const [totalKasMasuk, setTotalKasMasuk] = useState<number>(0);
  const [totalKasKeluar, setTotalKasKeluar] = useState<number>(0);
  const [masukBulanIni, setMasukBulanIni] = useState<number>(0);
  const [keluarBulanIni, setKeluarBulanIni] = useState<number>(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        // Inisialisasi Supabase di dalam handler/effect agar tidak gagal saat build static collection
        const supabase = createClient();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // ---------------------------------------------------------------------
        // 1. Ambil Data Warga tanpa FK Join paksaan
        // ---------------------------------------------------------------------
        const { data: dataWarga, error: errWarga } = await supabase
          .from('data_warga')
          .select('*');

        if (errWarga) {
          throw new Error(`Error Data Warga: ${errWarga.message || JSON.stringify(errWarga)}`);
        }

        // ---------------------------------------------------------------------
        // 2. Ambil Data Pembayaran Iuran
        // ---------------------------------------------------------------------
        const { data: dataPembayaran, error: errPembayaran } = await supabase
          .from('pembayaran_iuran')
          .select('no_kk, jumlah_bayar, periode_bulan, periode_tahun, created_at');

        if (errPembayaran) {
          console.warn('Warning pembayaran iuran:', errPembayaran.message);
        }

        // ---------------------------------------------------------------------
        // 3. Map Pemasukan per No KK & Hitung Total Keuangan
        // ---------------------------------------------------------------------
        const mapTotalBayarPerKK: { [no_kk: string]: number } = {};
        let totalMasuk = 0;
        let masukBulan = 0;

        if (dataPembayaran) {
          dataPembayaran.forEach((p: any) => {
            const nominal = Number(p.jumlah_bayar) || 0;
            totalMasuk += nominal;

            const kkKey = String(p.no_kk || '').trim();
            if (kkKey) {
              mapTotalBayarPerKK[kkKey] = (mapTotalBayarPerKK[kkKey] || 0) + nominal;
            }

            const isThisMonth = p.periode_bulan 
              ? (p.periode_bulan === currentMonth && p.periode_tahun === currentYear)
              : (new Date(p.created_at).getMonth() + 1 === currentMonth && new Date(p.created_at).getFullYear() === currentYear);

            if (isThisMonth) {
              masukBulan += nominal;
            }
          });
        }

        // ---------------------------------------------------------------------
        // 4. Olah Sebaran RT & Demografi Warga Lengkap
        // ---------------------------------------------------------------------
        if (dataWarga) {
          const mapRT: { [key: string]: StatRT } = {};
          let detectedRW = '';
          const uniqueKKSet = new Set<string>();

          dataWarga.forEach((warga: any) => {
            const rtVal = String(warga.rt || warga.id_rt || '01').padStart(2, '0');
            const rwVal = String(warga.rw || warga.id_rw || '010').padStart(3, '0');
            const key = `RT_${rtVal}_RW_${rwVal}`;

            if (rwVal) detectedRW = rwVal;

            if (!mapRT[key]) {
              mapRT[key] = {
                rt: rtVal,
                rw: rwVal,
                totalKK: 0,
                totalKasMasuk: 0,
                totalWarga: 0,
                kematian: 0,
                kawin: 0,
                belumKawin: 0,
                ceraiHidup: 0,
                ceraiMati: 0,
                bekerja: 0,
                belumBekerja: 0
              };
            }

            const stat = mapRT[key];
            const noKK = String(warga.no_kk || '').trim();
            const shdk = String(warga.shdk || warga.status_hubungan || '').toLowerCase();
            const isKepala = warga.is_kepala === true || shdk.includes('kepala');

            // Hitung Total KK
            if (isKepala) {
              stat.totalKK += 1;
            }
            if (noKK) {
              uniqueKKSet.add(noKK);
            }

            // Tambahkan nominal bayar jika warga ini Kepala Keluarga
            if (isKepala && noKK && mapTotalBayarPerKK[noKK]) {
              stat.totalKasMasuk += mapTotalBayarPerKK[noKK];
            }

            // Status Keberadaan / Kematian Warga
            const statusWarga = String(warga.status_warga || '').toLowerCase();
            if (statusWarga === 'wafat' || statusWarga === 'meninggal' || warga.tanggal_wafat) {
              stat.kematian += 1;
            } else {
              stat.totalWarga += 1;

              // Status Perkawinan
              const statusKawin = String(warga.status_perkawinan || '').toLowerCase();
              if (statusKawin.includes('belum kawin') || statusKawin.includes('lajang')) {
                stat.belumKawin += 1;
              } else if (statusKawin.includes('cerai hidup')) {
                stat.ceraiHidup += 1;
              } else if (statusKawin.includes('cerai mati')) {
                stat.ceraiMati += 1;
              } else if (statusKawin.includes('kawin') || statusKawin.includes('menikah')) {
                stat.kawin += 1;
              }

              // ---------------------------------------------------------------------
              // Status Pekerjaan (Klasifikasi Akurat)
              // ---------------------------------------------------------------------
              const valStatusPekerjaan = String(warga.status_pekerjaan || '').toLowerCase().trim();
              const valPekerjaan = String(warga.pekerjaan || '').toLowerCase().trim();

              const isBelumBekerja = 
                valStatusPekerjaan.includes('belum') ||
                valStatusPekerjaan.includes('tidak') ||
                valStatusPekerjaan.includes('pengangguran') ||
                valPekerjaan.includes('belum') ||
                valPekerjaan.includes('tidak bekerja') ||
                valPekerjaan.includes('pelajar') ||
                valPekerjaan.includes('mahasiswa') ||
                valPekerjaan.includes('ibu rumah tangga') ||
                valPekerjaan === 'irt' ||
                valPekerjaan === '' ||
                valPekerjaan === '-';

              if (isBelumBekerja) {
                stat.belumBekerja += 1;
              } else {
                stat.bekerja += 1;
              }
            }
          });

          const resultRT = Object.values(mapRT).sort((a, b) => a.rt.localeCompare(b.rt));
          
          const totalHitungKK = resultRT.reduce((acc, curr) => acc + curr.totalKK, 0);
          setTotalKeseluruhanKK(totalHitungKK > 0 ? totalHitungKK : uniqueKKSet.size);

          setStatsPerRT(resultRT);
          setNamaRW(detectedRW);
        }

        // ---------------------------------------------------------------------
        // 5. Hitung Pengeluaran Kas
        // ---------------------------------------------------------------------
        const { data: dataPengeluaran, error: errPengeluaran } = await supabase
          .from('pengeluaran_kas')
          .select('nominal_keluar, created_at');

        if (errPengeluaran) {
          console.warn('Warning pengeluaran kas:', errPengeluaran.message);
        }

        let totalKeluar = 0;
        let keluarBulan = 0;

        if (dataPengeluaran) {
          dataPengeluaran.forEach((k: any) => {
            const nominal = Number(k.nominal_keluar) || 0;
            totalKeluar += nominal;

            const date = new Date(k.created_at);
            if (date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear) {
              keluarBulan += nominal;
            }
          });
        }

        setTotalKasMasuk(totalMasuk);
        setTotalKasKeluar(totalKeluar);
        setMasukBulanIni(masukBulan);
        setKeluarBulanIni(keluarBulan);

      } catch (err: any) {
        console.error('Gagal memuat data dashboard:', err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalSaldoBersih = totalKasMasuk - totalKasKeluar;

  return (
    <div className="space-y-4 pb-12">
      {/* Card Saldo Kas Utama */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-3xl p-5 text-white shadow-lg shadow-sky-600/20 relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sky-100 text-xs font-medium">
              Total Saldo Kas RW {namaRW ? namaRW : '010'}
            </p>
            <h2 className="text-2xl font-black mt-1 tracking-tight">
              Rp {totalSaldoBersih.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-sky-200">Masuk (Bulan ini)</p>
              <p className="font-bold">Rp {masukBulanIni.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/20 rounded-xl text-rose-300">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] text-sky-200">Keluar (Bulan ini)</p>
              <p className="font-bold">Rp {keluarBulanIni.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Aksi Cepat */}
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
        Aksi Cepat
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/iuran"
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-200 transition-all group"
        >
          <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Bayar Iuran</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Catat transaksi warga</p>
        </Link>

        <Link
          href="/pengeluaran"
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-rose-200 transition-all group"
        >
          <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Foto Nota Kas</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Upload pengeluaran</p>
        </Link>
      </div>

      {/* Section Rincian Sebaran Data Warga & Kas RT */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sebaran Data Warga & Kas RT
          </h3>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
            Total: {totalKeseluruhanKK} KK
          </span>
        </div>

        {loading ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
            <span className="text-xs">Memuat sebaran RT...</span>
          </div>
        ) : statsPerRT.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            Belum ada data warga terdaftar.
          </div>
        ) : (
          <div className="space-y-3">
            {statsPerRT.map((item) => (
              <div
                key={`rt-${item.rt}`}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3"
              >
                {/* Header RT & Akses Link Detail */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold text-xs">
                      RT {item.rt}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        RT {item.rt} / RW {item.rw}
                      </h4>
                      <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                        Kas Masuk: Rp {item.totalKasMasuk.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-700 font-bold text-[11px] rounded-md">
                      {item.totalKK} KK
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-md flex items-center gap-1">
                      <Users className="w-3 h-3" /> {item.totalWarga}
                    </span>
                    <Link href={`/warga?rt=${item.rt}`} className="text-slate-400 hover:text-sky-600 ml-1">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Grid Rincian Status Perkawinan, Kematian & Pekerjaan */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Perkawinan & Kematian */}
                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                    <span className="font-bold text-slate-600 block text-[10px]">Perkawinan & Wafat</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Belum Kawin:</span>
                      <span className="font-bold text-slate-700">{item.belumKawin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kawin:</span>
                      <span className="font-bold text-emerald-600">{item.kawin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cerai Hidup:</span>
                      <span className="font-bold text-amber-600">{item.ceraiHidup}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cerai Mati:</span>
                      <span className="font-bold text-purple-600">{item.ceraiMati}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-rose-600 font-medium">Kematian:</span>
                      <span className="font-bold text-rose-600">{item.kematian}</span>
                    </div>
                  </div>

                  {/* Status Pekerjaan */}
                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-600 block text-[10px]">Pekerjaan</span>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-500">Bekerja:</span>
                        <span className="font-bold text-indigo-600">{item.bekerja}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-500">Belum Bekerja:</span>
                        <span className="font-bold text-slate-600">{item.belumBekerja}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[9px] text-slate-400">
                      *Warga hidup terdaftar
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
          <span className="text-xs">Memuat dashboard...</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}