'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserCheck,
  Crown,
  Calendar,
  Wallet
} from 'lucide-react';

interface PilihanIuranDetail {
  nama_pilihan?: string;
  nama_kelas?: string;
  nominal: number;
}

interface MasterIuranItem {
  id: number;
  id_wilayah?: number;
  nama_iuran: string;
  tarif_nominal?: number;
  is_active?: boolean;
  min_usia?: number;
  max_usia?: number;
  wajib_bekerja?: boolean;
  hanya_kepala_keluarga?: boolean;
  kelas_iuran?: PilihanIuranDetail[];
  pilihan_iuran?: PilihanIuranDetail[];
}

interface WargaItem {
  nik?: string;
  no_kk?: string;
  nama_lengkap: string;
  status_warga?: 'AKTIF' | 'MENINGGAL' | 'PINDAH';
  tanggal_lahir?: string;
  pekerjaan?: string;
  status_pekerjaan?: string;
  status_ekonomi?: string;
  shdk?: string;
  status_hubungan?: string;
  is_kepala?: boolean;
  pilihan_iuran?: string;
  kelas_iuran?: string;
}

interface KartuKeluargaItem {
  no_kk: string;
  id_wilayah?: number;
  alamat?: string;
  nama_kepala_keluarga?: string;
  pilihan_iuran?: string;
  kelas_iuran?: string;
  data_warga?: WargaItem[];
  warga?: WargaItem[];
  wilayah_rt_rw?: { id?: number; rt: string; rw: string; nama_kampung?: string };
}

interface PembayaranIuranDisplayItem {
  id: number;
  id_iuran: number;
  no_kk: string;
  jumlah_bayar: number;
  periode_bulan: number;
  periode_tahun: number;
  created_at?: string;
  petugas_id?: string;
  pencatat_by_id?: string;
  petugas?: { nama_lengkap: string };
  master_iuran?: { nama_iuran: string };
}

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function IuranContent() {
  const searchParams = useSearchParams();

  const [listPembayaran, setListPembayaran] = useState<PembayaranIuranDisplayItem[]>([]);
  const [listMasterIuran, setListMasterIuran] = useState<MasterIuranItem[]>([]);
  const [listKK, setListKK] = useState<KartuKeluargaItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterRT, setFilterRT] = useState<string>('ALL');
  const [listRT, setListRT] = useState<string[]>([]);
  const [filterBulan, setFilterBulan] = useState<number>(1);
  const [filterTahun, setFilterTahun] = useState<number>(2026);
  const [mounted, setMounted] = useState(false);
  
  // State Role User
  const [userRole, setUserRole] = useState<string>('PENGURUS');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // State Modal Detail Riwayat Pembayaran Warga
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedKkDetail, setSelectedKkDetail] = useState<{
    nama: string;
    no_kk: string;
    wilayah: string;
    pembayaranList: PembayaranIuranDisplayItem[];
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id_iuran: '',
    no_kk: '',
    tarif_per_bulan: '',
    total_uang_diterima: '',
    periode_bulan: '1',
    periode_tahun: '2026'
  });

  useEffect(() => {
    const rtQuery = searchParams.get('rt');
    if (rtQuery) {
      setFilterRT(rtQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    setFilterBulan(currentMonth);
    setFilterTahun(currentYear);
    setFormData((prev) => ({
      ...prev,
      periode_bulan: String(currentMonth),
      periode_tahun: String(currentYear)
    }));
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // 0. Cek Role User Logged In
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profil_pengurus')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role) {
          setUserRole(String(profile.role).toUpperCase());
        }
      }

      // 1. Fetch Master Jenis Iuran
      const { data: dataIuran, error: errorIuran } = await supabase
        .from('master_iuran')
        .select('*')
        .eq('is_active', true);
      
      if (errorIuran) console.error('Error fetching master_iuran:', errorIuran.message);
      if (dataIuran) setListMasterIuran(dataIuran as MasterIuranItem[]);

      // 2. Fetch Kartu Keluarga
      let { data: dataKK, error: errorKK } = await supabase
        .from('kartu_keluarga')
        .select(`
          *,
          wilayah_rt_rw (*),
          data_warga (*)
        `);

      if (errorKK || !dataKK) {
        const fallbackRes = await supabase
          .from('kartu_keluarga')
          .select(`
            *,
            wilayah_rt_rw (*),
            warga (*)
          `);
        dataKK = fallbackRes.data;
      }
        
      if (dataKK) {
        const formattedKK = dataKK as unknown as KartuKeluargaItem[];
        setListKK(formattedKK);

        const rts = Array.from(
          new Set(
            formattedKK
              .map((item) => item.wilayah_rt_rw?.rt)
              .filter((rt): rt is string => Boolean(rt))
          )
        ).sort((a, b) => a.localeCompare(b));
        
        setListRT(rts);
      }

      // 3. Fetch Profil Pengurus
      const { data: dataPetugas } = await supabase
        .from('profil_pengurus')
        .select('id, nama_lengkap');
        
      const pengurusMap = new Map<string, string>();
      let defaultNamaPengurus = 'Petugas';

      if (dataPetugas && dataPetugas.length > 0) {
        dataPetugas.forEach((p) => pengurusMap.set(p.id, p.nama_lengkap));
        defaultNamaPengurus = dataPetugas[0].nama_lengkap;
      }

      if (user && pengurusMap.has(user.id)) {
        defaultNamaPengurus = pengurusMap.get(user.id)!;
      }

      // 4. Fetch Transaksi Pembayaran
      const { data: dataPembayaran, error: errorPembayaran } = await supabase
        .from('pembayaran_iuran')
        .select('*')
        .order('created_at', { ascending: false });

      if (errorPembayaran) console.error('Error fetching pembayaran:', errorPembayaran.message);

      if (dataPembayaran) {
        const formattedData = dataPembayaran.map((item: any) => {
          const targetId = item.petugas_id || item.pencatat_by_id;
          const namaDitemukan = targetId ? pengurusMap.get(targetId) : null;

          return {
            ...item,
            petugas: {
              nama_lengkap: namaDitemukan || defaultNamaPengurus
            }
          };
        });
        setListPembayaran(formattedData as PembayaranIuranDisplayItem[]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hitung Usia Warga
  const getUsia = (tanggalLahir?: string): number => {
    if (!tanggalLahir) return -1;
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    if (isNaN(birthDate.getTime())) return -1;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAnggotaWarga = (kk: KartuKeluargaItem): WargaItem[] => {
    return kk.data_warga || kk.warga || [];
  };

  const getPilihanWarga = (kk: KartuKeluargaItem): { kepala: WargaItem | undefined; pilihan: string } => {
    const listWarga = getAnggotaWarga(kk);
    const kepala = listWarga.find((w) => {
      const shdk = (w.shdk || w.status_hubungan || '').toLowerCase();
      return shdk === 'kepala keluarga' || shdk === 'kepala' || w.is_kepala === true;
    });

    const valStr = (
      kk.kelas_iuran || 
      kk.pilihan_iuran || 
      kepala?.status_ekonomi ||
      kepala?.pilihan_iuran || 
      kepala?.kelas_iuran || 
      listWarga[0]?.status_ekonomi ||
      listWarga[0]?.pilihan_iuran || 
      listWarga[0]?.kelas_iuran || 
      'B'
    ).toUpperCase();

    let pilihan = 'B';
    if (valStr.includes('A')) pilihan = 'A';
    else if (valStr.includes('C')) pilihan = 'C';
    else if (valStr.includes('B')) pilihan = 'B';

    return { kepala, pilihan };
  };

  const getTarifEfektifKK = (kk: KartuKeluargaItem, master: MasterIuranItem): { tarif: number; catatan: string } => {
    const listWarga = getAnggotaWarga(kk);
    const totalWarga = listWarga.length;
    
    const isTunggalMeninggal = totalWarga === 1 && listWarga[0]?.status_warga === 'MENINGGAL';
    if (totalWarga === 0 || isTunggalMeninggal) {
      return { tarif: 0, catatan: 'Bebas Iuran' };
    }

    const wargaAktif = listWarga.filter(w => w.status_warga !== 'MENINGGAL');
    
    if (master.min_usia || master.max_usia || master.wajib_bekerja || master.hanya_kepala_keluarga) {
      const adaWargaMemenuhiKriteria = wargaAktif.some(w => {
        const usia = getUsia(w.tanggal_lahir);
        const minUsiaPass = master.min_usia ? (usia === -1 || usia >= master.min_usia) : true;
        const maxUsiaPass = master.max_usia ? (usia === -1 || usia <= master.max_usia) : true;

        const strPekerjaan = (w.status_pekerjaan || w.pekerjaan || '').toLowerCase();
        const bekerjaPass = master.wajib_bekerja 
          ? (strPekerjaan !== '' && !strPekerjaan.includes('tidak bekerja') && !strPekerjaan.includes('belum')) 
          : true;

        const shdk = (w.shdk || w.status_hubungan || '').toLowerCase();
        const isKepala = shdk.includes('kepala') || w.is_kepala === true;
        const kepalaPass = master.hanya_kepala_keluarga ? isKepala : true;

        return minUsiaPass && maxUsiaPass && bekerjaPass && kepalaPass;
      });

      if (!adaWargaMemenuhiKriteria && wargaAktif.length > 0) {
        return { tarif: 0, catatan: 'Bebas Iuran (Kriteria)' };
      }
    }

    const { pilihan } = getPilihanWarga(kk);
    const tarifDefault = Number(master.tarif_nominal || 0);

    const arrayPilihan = master.kelas_iuran || master.pilihan_iuran;

    if (Array.isArray(arrayPilihan) && arrayPilihan.length > 0) {
      const matchPilihan = arrayPilihan.find((k) => {
        const key = String(k.nama_pilihan || k.nama_kelas || '').toUpperCase();
        return key.includes(pilihan);
      });

      if (matchPilihan && matchPilihan.nominal !== undefined && matchPilihan.nominal !== null) {
        return {
          tarif: Number(matchPilihan.nominal),
          catatan: `Pilihan ${pilihan}`
        };
      }
    }

    return { tarif: tarifDefault, catatan: `Pilihan ${pilihan} (Default)` };
  };

  const isPetugas = userRole === 'PETUGAS' || userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  const handleOpenQuickPay = (noKk: string = '', idIuran: string = '', defaultNominalBayar: number = 0) => {
    if (!isPetugas) return; // Hanya petugas yang bisa membuka modal bayar

    let tarifPerBulanVal = defaultNominalBayar;

    if (noKk && idIuran) {
      const kkObj = listKK.find(k => k.no_kk === noKk);
      const masterObj = listMasterIuran.find(m => String(m.id) === idIuran);
      if (kkObj && masterObj) {
        const { tarif } = getTarifEfektifKK(kkObj, masterObj);
        tarifPerBulanVal = tarif;
      }
    }

    setFormData({
      id_iuran: idIuran,
      no_kk: noKk,
      tarif_per_bulan: tarifPerBulanVal > 0 ? String(tarifPerBulanVal) : '',
      total_uang_diterima: defaultNominalBayar > 0 ? String(defaultNominalBayar) : (tarifPerBulanVal > 0 ? String(tarifPerBulanVal) : ''),
      periode_bulan: String(filterBulan),
      periode_tahun: String(filterTahun)
    });
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (nama: string, noKk: string, wilayah: string) => {
    const historyPembayaran = listPembayaran
      .filter((p) => p.no_kk === noKk)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    setSelectedKkDetail({
      nama,
      no_kk: noKk,
      wilayah,
      pembayaranList: historyPembayaran
    });
    setIsDetailModalOpen(true);
  };

  const hitungDistribusiUang = () => {
    const tarifNominal = parseFloat(formData.tarif_per_bulan) || 0;
    let totalUang = parseFloat(formData.total_uang_diterima) || 0;
    const selectedBulan = parseInt(formData.periode_bulan) || 1;
    const selectedTahun = parseInt(formData.periode_tahun) || 2026;

    if (tarifNominal <= 0 || totalUang <= 0 || !formData.no_kk || !formData.id_iuran) return [];

    const rincian: { bulan: number; tahun: number; nominalAlokasi: number; status: string }[] = [];

    const pembayaranKK = listPembayaran.filter(
      (p) => p.no_kk === formData.no_kk && String(p.id_iuran) === formData.id_iuran
    );

    const periodeMap = new Map<string, number>();
    pembayaranKK.forEach((p) => {
      const key = `${p.periode_tahun}-${p.periode_bulan}`;
      periodeMap.set(key, (periodeMap.get(key) || 0) + Number(p.jumlah_bayar || 0));
    });

    let curBulan = selectedBulan;
    let curTahun = selectedTahun;

    while (totalUang > 0) {
      const key = `${curTahun}-${curBulan}`;
      const sudahDibayar = periodeMap.get(key) || 0;
      const kurang = tarifNominal - sudahDibayar;

      if (kurang <= 0) {
        curBulan++;
        if (curBulan > 12) {
          curBulan = 1;
          curTahun++;
        }
        continue;
      }

      let nominalAlokasi = 0;
      let statusStr = 'PELUNASAN';

      if (totalUang >= kurang) {
        nominalAlokasi = kurang;
        totalUang -= kurang;
        statusStr = sudahDibayar > 0 ? 'PELUNASAN' : 'LUNAS';
      } else {
        nominalAlokasi = totalUang;
        const totalBaru = sudahDibayar + totalUang;
        statusStr = `PARSIAL (Sisa Kurang Rp ${(tarifNominal - totalBaru).toLocaleString('id-ID')})`;
        totalUang = 0;
      }

      rincian.push({
        bulan: curBulan,
        tahun: curTahun,
        nominalAlokasi,
        status: statusStr
      });

      curBulan++;
      if (curBulan > 12) {
        curBulan = 1;
        curTahun++;
      }
    }

    return rincian;
  };

  const listAlokasi = hitungDistribusiUang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPetugas) {
      alert('Akses Ditolak: Pengurus tidak memiliki akses untuk mencatat pelunasan.');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Sesi login Anda telah berakhir. Silakan login kembali.');
        setSaving(false);
        return;
      }

      if (!formData.id_iuran || !formData.no_kk || !formData.total_uang_diterima) {
        alert('Mohon lengkapi semua kolom wajib!');
        setSaving(false);
        return;
      }

      const alokasi = hitungDistribusiUang();
      if (alokasi.length === 0) {
        alert('Nominal uang yang dimasukkan tidak valid!');
        setSaving(false);
        return;
      }

      const payloadBatch = alokasi.map((item) => ({
        id_iuran: parseInt(formData.id_iuran),
        no_kk: formData.no_kk,
        jumlah_bayar: item.nominalAlokasi,
        periode_bulan: item.bulan,
        periode_tahun: item.tahun,
        petugas_id: user.id,
        pencatat_by_id: user.id
      }));

      const { error } = await supabase
        .from('pembayaran_iuran')
        .insert(payloadBatch);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        id_iuran: '',
        no_kk: '',
        tarif_per_bulan: '',
        total_uang_diterima: '',
        periode_bulan: String(filterBulan),
        periode_tahun: String(filterTahun)
      });

      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pembayaran iuran');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isPetugas) return;

    if (confirm('Apakah Anda yakin ingin menghapus catatan pembayaran ini?')) {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('pembayaran_iuran')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error saat menghapus:', error);
        alert(`Gagal menghapus catatan pembayaran: ${error.message}`);
      } else {
        alert('Data pembayaran berhasil dihapus!');
        fetchData();
      }
    }
  };

  const reportData = listKK.map((kk) => {
    const listWarga = getAnggotaWarga(kk);
    const { kepala, pilihan } = getPilihanWarga(kk);

    const namaWarga = 
      kk.nama_kepala_keluarga || 
      kepala?.nama_lengkap || 
      listWarga[0]?.nama_lengkap || 
      'Warga';
    
    const pembayaranKK = listPembayaran.filter(
      (p) => p.no_kk === kk.no_kk && 
             p.periode_bulan === Number(filterBulan) && 
             p.periode_tahun === Number(filterTahun)
    );

    let totalSudahBayarKK = 0;
    let totalKekuranganKK = 0;

    const itemsIuran = listMasterIuran.map((master) => {
      const { tarif, catatan } = getTarifEfektifKK(kk, master);
      const tarifAsli = Number(master.tarif_nominal || 0);

      const transaksi = pembayaranKK.filter((p) => p.id_iuran === master.id);
      const totalDibayar = transaksi.reduce((sum, item) => sum + Number(item.jumlah_bayar || 0), 0);
      
      totalSudahBayarKK += totalDibayar;

      let status: 'LUNAS' | 'BELUM_LUNAS' | 'BELUM_BAYAR' | 'BEBAS_IURAN' = 'BELUM_BAYAR';
      let sisaKekurangan = 0;

      if (tarif === 0) {
        status = 'BEBAS_IURAN';
        sisaKekurangan = 0;
      } else if (totalDibayar >= tarif) {
        status = 'LUNAS';
      } else if (totalDibayar > 0 && totalDibayar < tarif) {
        status = 'BELUM_LUNAS';
        sisaKekurangan = tarif - totalDibayar;
      } else {
        status = 'BELUM_BAYAR';
        sisaKekurangan = tarif;
      }

      totalKekuranganKK += sisaKekurangan;

      return {
        master_id: master.id,
        nama_iuran: master.nama_iuran,
        tarif_nominal: tarifAsli,
        tarif_efektif: tarif,
        catatan_tarif: catatan,
        total_dibayar: totalDibayar,
        sisa_kekurangan: sisaKekurangan,
        status,
        transaksiList: transaksi
      };
    });

    return {
      no_kk: kk.no_kk,
      nama_warga: namaWarga,
      pilihan_iuran: pilihan,
      wilayah_rt_rw: kk.wilayah_rt_rw,
      total_sudah_bayar: totalSudahBayarKK,
      total_kekurangan: totalKekuranganKK,
      itemsIuran
    };
  });

  const filteredReport = reportData.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = item.nama_warga.toLowerCase().includes(query) || item.no_kk.includes(query);
    const matchesRT = filterRT === 'ALL' || item.wilayah_rt_rw?.rt === filterRT;

    return matchesSearch && matchesRT;
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800">Status & Catatan Iuran</h2>
          <p className="text-[11px] text-slate-400">
            Periode: {mounted ? BULAN_LIST[filterBulan - 1] : ''} {mounted ? filterTahun : ''}
          </p>
        </div>
        
        {/* Tombol hanya dimunculkan jika user adalah Petugas / Admin */}
        {isPetugas && (
          <button
            type="button"
            onClick={() => handleOpenQuickPay()}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Bayar Iuran</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama warga atau No. KK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={filterRT}
              onChange={(e) => setFilterRT(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer appearance-none shadow-sm truncate"
            >
              <option value="ALL">Semua RT</option>
              {listRT.map((rt) => (
                <option key={rt} value={rt}>
                  RT {rt}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer appearance-none shadow-sm text-center"
            >
              {BULAN_LIST.map((b, idx) => (
                <option key={idx} value={idx + 1}>{b}</option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={filterTahun}
            onChange={(e) => setFilterTahun(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm text-center"
          />
        </div>
      </div>

      {loading || !mounted ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat status iuran...</span>
        </div>
      ) : filteredReport.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Tidak ada data warga ditemukan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReport.map((kk) => {
            const wil = kk.wilayah_rt_rw;
            const textWilayah = wil ? `(RT ${wil.rt}/RW ${wil.rw})` : '';

            return (
              <div
                key={kk.no_kk}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(kk.nama_warga, kk.no_kk, textWilayah)}
                      className="text-left group cursor-pointer"
                      title="Klik untuk melihat riwayat pembayaran warga ini"
                    >
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors flex items-center gap-1.5 flex-wrap">
                        <span>{kk.nama_warga}</span>
                        <span className="text-slate-400 font-normal text-xs">{textWilayah}</span>
                        
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          kk.pilihan_iuran === 'A'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : kk.pilihan_iuran === 'C'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {kk.pilihan_iuran === 'A' && <Crown className="w-2.5 h-2.5 text-amber-500" />}
                          Pilihan {kk.pilihan_iuran}
                        </span>
                      </h3>
                    </button>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">KK: {kk.no_kk}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Total Dibayar</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg inline-block">
                      Rp {kk.total_sudah_bayar.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {kk.itemsIuran.map((iuran, index) => (
                    <div 
                      key={iuran.master_id} 
                      className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-bold text-slate-400">{index + 1}.</span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-700 truncate block">
                            {iuran.nama_iuran}
                          </span>
                          <span className="text-slate-500 text-[10px] block font-medium">
                            Tarif ({iuran.catatan_tarif}): <strong className="text-emerald-600">Rp {iuran.tarif_efektif.toLocaleString('id-ID')}</strong>
                          </span>
                          {iuran.transaksiList.length > 0 && iuran.transaksiList[0].petugas?.nama_lengkap && (
                            <span className="text-[9px] text-sky-600 font-medium flex items-center gap-0.5 mt-0.5">
                              <UserCheck className="w-3 h-3 inline" /> Penerima: {iuran.transaksiList[0].petugas.nama_lengkap}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {iuran.status === 'BEBAS_IURAN' && (
                          <div className="flex items-center gap-1 text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Bebas Iuran</span>
                          </div>
                        )}

                        {iuran.status === 'LUNAS' && (
                          <div className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Lunas</span>
                          </div>
                        )}

                        {iuran.status === 'BELUM_LUNAS' && (
                          isPetugas ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickPay(kk.no_kk, String(iuran.master_id), iuran.sisa_kekurangan)}
                              className="flex items-center gap-1 text-amber-600 font-bold bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Klik untuk melunasi kekurangan"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Kurang Rp {iuran.sisa_kekurangan.toLocaleString('id-ID')}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-600 font-bold bg-amber-100/70 px-2.5 py-1 rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Kurang Rp {iuran.sisa_kekurangan.toLocaleString('id-ID')}</span>
                            </div>
                          )
                        )}

                        {iuran.status === 'BELUM_BAYAR' && (
                          isPetugas ? (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickPay(kk.no_kk, String(iuran.master_id), iuran.sisa_kekurangan)}
                              className="flex items-center gap-1 text-rose-600 font-bold bg-rose-100/70 hover:bg-rose-200/80 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Belum Dibayar</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 font-bold bg-rose-100/70 px-2.5 py-1 rounded-lg">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Belum Dibayar</span>
                            </div>
                          )
                        )}

                        {isPetugas && iuran.transaksiList.map((tr) => (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => handleDelete(tr.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all ml-1"
                            title="Hapus transaksi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {kk.total_kekurangan > 0 && (
                  <div className="flex justify-between items-center pt-1 px-1 text-[11px]">
                    <span className="text-slate-400 font-medium">Sisa Kekurangan Bulan Ini:</span>
                    <span className="font-bold text-rose-600">
                      - Rp {kk.total_kekurangan.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail Riwayat Pembayaran Warga */}
      {isDetailModalOpen && selectedKkDetail && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl pb-8 sm:pb-5 max-h-[85vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{selectedKkDetail.nama}</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  KK: {selectedKkDetail.no_kk} {selectedKkDetail.wilayah}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body / Daftar Transaksi */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 text-xs">
              <h4 className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5 mb-2">
                <Wallet className="w-3.5 h-3.5 text-sky-600" /> Riwayat Pembayaran Masuk
              </h4>

              {selectedKkDetail.pembayaranList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                  <CreditCard className="w-7 h-7 mx-auto text-slate-300" />
                  <p className="font-semibold text-xs">Belum ada riwayat pembayaran</p>
                </div>
              ) : (
                selectedKkDetail.pembayaranList.map((tr) => (
                  <div 
                    key={tr.id}
                    className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Periode: {BULAN_LIST[tr.periode_bulan - 1]} {tr.periode_tahun}
                        </span>
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                          Lunas
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                        {tr.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> 
                            {new Date(tr.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                        {tr.petugas?.nama_lengkap && (
                          <span className="flex items-center gap-1 text-sky-600 font-semibold">
                            <UserCheck className="w-3 h-3" /> Penerima: {tr.petugas.nama_lengkap}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 block">
                        + Rp {Number(tr.jumlah_bayar).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Form Pembayaran */}
      {isModalOpen && isPetugas && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-bold text-slate-800">Catat Pembayaran Iuran</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="iuran-form" onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pilih Warga / No. KK *
                </label>
                <select
                  required
                  value={formData.no_kk}
                  onChange={(e) => {
                    const nextNoKk = e.target.value;
                    const kkTarget = listKK.find(k => k.no_kk === nextNoKk);
                    const selectedMaster = listMasterIuran.find(i => String(i.id) === formData.id_iuran);

                    let nominalNom = 0;
                    if (kkTarget && selectedMaster) {
                      const { tarif } = getTarifEfektifKK(kkTarget, selectedMaster);
                      nominalNom = tarif;
                    }

                    setFormData(prev => ({
                      ...prev,
                      no_kk: nextNoKk,
                      tarif_per_bulan: nominalNom > 0 ? String(nominalNom) : prev.tarif_per_bulan,
                      total_uang_diterima: nominalNom > 0 ? String(nominalNom) : prev.total_uang_diterima
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Pilih Kartu Keluarga --</option>
                  {listKK.map((kk) => {
                    const listWarga = getAnggotaWarga(kk);
                    const { kepala, pilihan } = getPilihanWarga(kk);
                    const nama = kk.nama_kepala_keluarga || kepala?.nama_lengkap || listWarga[0]?.nama_lengkap || 'Warga';
                    const rt = kk.wilayah_rt_rw?.rt ? `(RT ${kk.wilayah_rt_rw.rt})` : '';
                    return (
                      <option key={kk.no_kk} value={kk.no_kk}>
                        {nama} {rt} [Pilihan {pilihan}] - KK: {kk.no_kk}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jenis Iuran *
                </label>
                <select
                  required
                  value={formData.id_iuran}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedMaster = listMasterIuran.find(i => String(i.id) === selectedId);
                    const kkTarget = listKK.find(k => k.no_kk === formData.no_kk);

                    let nominalDefault = selectedMaster?.tarif_nominal || 0;
                    if (kkTarget && selectedMaster) {
                      const { tarif } = getTarifEfektifKK(kkTarget, selectedMaster);
                      nominalDefault = tarif;
                    }

                    setFormData(prev => ({ 
                      ...prev, 
                      id_iuran: selectedId,
                      tarif_per_bulan: nominalDefault > 0 ? String(nominalDefault) : prev.tarif_per_bulan,
                      total_uang_diterima: nominalDefault > 0 ? String(nominalDefault) : prev.total_uang_diterima
                    }));
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Pilih Jenis Iuran --</option>
                  {listMasterIuran.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_iuran} (Default: Rp {Number(m.tarif_nominal || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mulai Periode Pembayaran */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mulai Periode Bulan *
                  </label>
                  <select
                    value={formData.periode_bulan}
                    onChange={(e) => setFormData({ ...formData, periode_bulan: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                  >
                    {BULAN_LIST.map((b, idx) => (
                      <option key={idx} value={idx + 1}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tahun *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.periode_tahun}
                    onChange={(e) => setFormData({ ...formData, periode_tahun: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Tarif Per Bulan vs Total Uang Diterima */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tarif Resmi / Bln (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="20000"
                    value={formData.tarif_per_bulan}
                    onChange={(e) => setFormData({ ...formData, tarif_per_bulan: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-sky-700 mb-1">
                    Total Uang Diterima (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Misal: 50000 atau 10000"
                    value={formData.total_uang_diterima}
                    onChange={(e) => setFormData({ ...formData, total_uang_diterima: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-sky-400 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold text-slate-900 bg-sky-50/30"
                  />
                </div>
              </div>

              {/* Preset Tombol Cepat Jumlah Bulan */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Preset Cepat (Kelipatan Tarif):
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 6, 12].map((m) => {
                    const tarif = parseFloat(formData.tarif_per_bulan) || 0;
                    const val = tarif * m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (tarif > 0) {
                            setFormData({ ...formData, total_uang_diterima: String(val) });
                          }
                        }}
                        className="flex-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 text-[10px] font-semibold text-slate-600 transition-all"
                      >
                        {m === 12 ? '1 Thn' : `${m} Bln`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Box Rincian Alokasi Distribusi Uang */}
              {listAlokasi.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-sky-600" /> Rincian Alokasi Uang:
                    </span>
                    <span className="text-sky-700">{listAlokasi.length} Periode Bulan</span>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {listAlokasi.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-slate-600">
                          {BULAN_LIST[item.bulan - 1]} {item.tahun}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">
                            Rp {item.nominalAlokasi.toLocaleString('id-ID')}
                          </span>
                          <span className={`ml-1.5 font-semibold ${
                            item.status.includes('PARSIAL') ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            ({item.status})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                form="iuran-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Pembayaran</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function IuranPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat status iuran...</span>
        </div>
      }
    >
      <IuranContent />
    </Suspense>
  );
}