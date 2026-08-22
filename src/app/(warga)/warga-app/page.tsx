'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Megaphone, Pin, Calendar, LogOut, User, 
  CreditCard, Users, Phone, ShieldCheck, X, ChevronRight,
  Wallet, ArrowDownRight, ArrowUpRight, Receipt, Landmark, Image as ImageIcon, ExternalLink, FileText, Sparkles, AlertCircle
} from 'lucide-react';

interface AnggotaKeluarga {
  nik: string;
  nama_lengkap: string;
  shdk?: string;
  is_kepala?: boolean;
}

interface WargaProfile {
  nama_lengkap: string;
  nik: string;
  no_kk: string;
  no_whatsapp?: string;
  rt?: string;
  rw?: string;
  jumlah_anggota_kk?: number;
}

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  kategori: string;
  pinned: boolean;
  rw: string;
  lampiran_url?: string | null;
  lampiran_type?: string | null;
  created_at: string;
  profil_pengurus?: { nama_lengkap: string } | null;
}

interface PengeluaranKas {
  id: number;
  id_wilayah?: number;
  rw?: string;
  nominal_keluar: number;
  keterangan: string;
  url_foto_nota?: string;
  pencatat_by_id?: string;
  created_at: string;
}

export default function WargaBerandaPage() {
  const [profile, setProfile] = useState<WargaProfile | null>(null);
  const [anggotaList, setAnggotaList] = useState<AnggotaKeluarga[]>([]);
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranKas[]>([]);
  
  // Ringkasan Kas
  const [kasRT, setKasRT] = useState({ pemasukan: 0, pengeluaran: 0, saldo: 0 });
  const [kasRW, setKasRW] = useState({ pemasukan: 0, pengeluaran: 0, saldo: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State Modal Preview Nota/Bukti Pengeluaran & Lampiran Pengumuman
  const [selectedNota, setSelectedNota] = useState<PengeluaranKas | null>(null);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Format Mata Uang Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper fungsi untuk cek pengumuman baru (kurang dari 3 hari)
  const isPengumumanBaru = (createdAtStr: string) => {
    const createdDate = new Date(createdAtStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Dapatkan user session
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
          console.warn('User tidak terautentikasi:', authErr);
          setIsLoading(false);
          return;
        }

        // 2. Ambil NIK dari metadata atau prefix email
        const userNik = user.user_metadata?.nik || user.email?.split('@')[0];

        if (!userNik) {
          console.warn('NIK tidak ditemukan pada metadata user.');
          setIsLoading(false);
          return;
        }

        const cleanNik = String(userNik).trim();

        // 3. Query data_warga
        const { data: wargaData, error: wargaErr } = await supabase
          .from('data_warga')
          .select('nama_lengkap, nik, no_kk, no_whatsapp')
          .eq('nik', cleanNik)
          .limit(1);

        if (wargaErr) {
          console.error('Error fetching data_warga:', wargaErr.message || wargaErr);
        }

        const warga = wargaData && wargaData.length > 0 ? wargaData[0] : null;
        let fetchedAnggota: AnggotaKeluarga[] = [];

        // 4. Jika no_kk ada, ambil Anggota KK
        if (warga?.no_kk) {
          const { data: anggota, error: anggotaErr } = await supabase
            .from('data_warga')
            .select('nik, nama_lengkap, shdk, is_kepala')
            .eq('no_kk', warga.no_kk)
            .order('is_kepala', { ascending: false });

          if (anggotaErr) {
            console.error('Error fetching anggota:', anggotaErr.message || anggotaErr);
          } else if (anggota) {
            fetchedAnggota = anggota;
            setAnggotaList(anggota);
          }
        }

        // Set Profile Warga
        setProfile({
          nama_lengkap: warga?.nama_lengkap || user.user_metadata?.full_name || 'Warga Balong',
          nik: warga?.nik || cleanNik,
          no_kk: warga?.no_kk || '-',
          no_whatsapp: warga?.no_whatsapp || user.phone || '-',
          rt: '01',
          rw: '01',
          jumlah_anggota_kk: fetchedAnggota.length || 1,
        });

        // 5. Fetch Data Pemasukan & Pengeluaran Kas
        const { data: iuranData } = await supabase.from('pembayaran_iuran').select('jumlah_bayar');
        const { data: pengeluaranData } = await supabase.from('pengeluaran_kas').select('*').order('created_at', { ascending: false });

        const totalIn = iuranData?.reduce((acc, item) => acc + Number(item.jumlah_bayar || 0), 0) || 0;
        const totalOut = pengeluaranData?.reduce((acc, item) => acc + Number(item.nominal_keluar || 0), 0) || 0;

        if (pengeluaranData) {
          setPengeluaranList(pengeluaranData);
        }

        // Estimasi Alokasi Kas
        setKasRT({
          pemasukan: totalIn * 0.4,
          pengeluaran: totalOut * 0.3,
          saldo: (totalIn * 0.4) - (totalOut * 0.3),
        });

        setKasRW({
          pemasukan: totalIn * 0.6,
          pengeluaran: totalOut * 0.7,
          saldo: (totalIn * 0.6) - (totalOut * 0.7),
        });

        // 6. Query Pengumuman
        const { data: pengumumanData } = await supabase
          .from('pengumuman')
          .select(`*, profil_pengurus:penulis_by_id(nama_lengkap)`)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });

        setPengumumanList(pengumumanData || []);

      } catch (err) {
        console.error('Unexpected error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-5 pb-10">
      {/* CARD HIJAU: IDENTITAS WARGA LENGKAP */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-3xl shadow-md border border-emerald-500/20 relative overflow-hidden">
        <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-[11px] font-medium text-emerald-200 tracking-wide uppercase">
              Selamat Datang,
            </p>
            <h2 className="text-lg font-extrabold tracking-tight mt-0.5">
              {isLoading ? 'Memuat Data...' : profile?.nama_lengkap || 'Warga Balong'}
            </h2>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-500/80 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm transition-all border border-rose-400/30 active:scale-95 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>

        {/* METADATA INFO WARGA */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-emerald-500/30 text-xs relative z-10">
          <div className="bg-emerald-900/40 backdrop-blur-md p-2.5 rounded-xl border border-emerald-400/20 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[9px] text-emerald-200/80 font-medium uppercase">NIK</p>
              <p className="font-bold truncate text-[11px]">{profile?.nik || '-'}</p>
            </div>
          </div>

          <div className="bg-emerald-900/40 backdrop-blur-md p-2.5 rounded-xl border border-emerald-400/20 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[9px] text-emerald-200/80 font-medium uppercase">NO. KK</p>
              <p className="font-bold truncate text-[11px]">{profile?.no_kk || '-'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-900/40 hover:bg-emerald-900/70 backdrop-blur-md p-2.5 rounded-xl border border-emerald-400/30 flex items-center justify-between text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Users className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[9px] text-emerald-200/80 font-medium uppercase">Anggota KK</p>
                <p className="font-bold text-[11px] text-emerald-100">
                  {anggotaList.length || profile?.jumlah_anggota_kk || 1} Jiwa
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          <div className="bg-emerald-900/40 backdrop-blur-md p-2.5 rounded-xl border border-emerald-400/20 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[9px] text-emerald-200/80 font-medium uppercase">No. WA</p>
              <p className="font-bold truncate text-[11px]">{profile?.no_whatsapp || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION TRANSPARANSI KAS & KEUANGAN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Transparansi Kas RT / RW
            </h3>
          </div>
        </div>

        {/* RINGKASAN SALDO RT & RW */}
        <div className="grid grid-cols-2 gap-3">
          {/* CARD KAS RT */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                KAS RT {profile?.rt || ''}
              </span>
              <Landmark className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Total Saldo Kas</p>
              <p className="text-sm font-extrabold text-slate-800">{formatRupiah(kasRT.saldo)}</p>
            </div>
            <div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-1 text-[9px]">
              <div className="text-emerald-600 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" />
                <span className="truncate">{formatRupiah(kasRT.pemasukan)}</span>
              </div>
              <div className="text-rose-500 flex items-center gap-0.5 justify-end">
                <ArrowUpRight className="w-3 h-3" />
                <span className="truncate">{formatRupiah(kasRT.pengeluaran)}</span>
              </div>
            </div>
          </div>

          {/* CARD KAS RW */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                KAS RW {profile?.rw || ''}
              </span>
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Total Saldo Kas</p>
              <p className="text-sm font-extrabold text-slate-800">{formatRupiah(kasRW.saldo)}</p>
            </div>
            <div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-1 text-[9px]">
              <div className="text-emerald-600 flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3" />
                <span className="truncate">{formatRupiah(kasRW.pemasukan)}</span>
              </div>
              <div className="text-rose-500 flex items-center gap-0.5 justify-end">
                <ArrowUpRight className="w-3 h-3" />
                <span className="truncate">{formatRupiah(kasRW.pengeluaran)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* LIST DAFTAR PENGELUARAN */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              <h4 className="text-xs font-bold text-slate-800">Rincian Pengeluaran Kas</h4>
            </div>
            <span className="text-[10px] text-slate-400">{pengeluaranList.length} Transaksi</span>
          </div>

          {pengeluaranList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Belum ada pencatatan pengeluaran.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pengeluaranList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedNota(item)}
                  className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.99] rounded-xl flex items-center justify-between text-xs transition-all border border-transparent hover:border-slate-200 group"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 truncate">{item.keterangan || 'Pengeluaran Kas'}</p>
                      {item.url_foto_nota && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                          <ImageIcon className="w-2.5 h-2.5" />
                          Nota
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {item.rw ? ` • RW ${item.rw}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-rose-600 text-xs">
                      -{formatRupiah(item.nominal_keluar)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETAIL BUKTI/NOTA PENGELUARAN */}
      {selectedNota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-slate-100 space-y-0">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold">Bukti Pengeluaran Kas</h3>
                  <p className="text-[10px] text-slate-300">
                    {new Date(selectedNota.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNota(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative w-full h-56 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                {selectedNota.url_foto_nota ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedNota.url_foto_nota}
                    alt="Bukti Pengeluaran"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400 space-y-1">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium">Foto bukti / nota tidak diunggah oleh petugas</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Keterangan / Keperluan</p>
                  <p className="text-xs font-bold text-slate-800">{selectedNota.keterangan || '-'}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Total Pengeluaran</p>
                  <p className="text-sm font-extrabold text-rose-600">
                    -{formatRupiah(selectedNota.nominal_keluar)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              {selectedNota.url_foto_nota && (
                <a
                  href={selectedNota.url_foto_nota}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Gambar Asli</span>
                </a>
              )}
              <button
                onClick={() => setSelectedNota(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL ANGGOTA KELUARGA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-bold">Anggota Keluarga</h3>
                  <p className="text-[10px] text-emerald-100">No. KK: {profile?.no_kk}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-700 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
              {anggotaList.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-4">
                  Tidak ditemukan data anggota keluarga.
                </p>
              ) : (
                anggotaList.map((item, index) => (
                  <div
                    key={item.nik || index}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">{item.nama_lengkap}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIK: {item.nik}</p>
                    </div>

                    {item.is_kepala ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-lg">
                        Kepala Keluarga
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-medium bg-slate-200 text-slate-600 rounded-lg">
                        {item.shdk || 'Anggota'}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION PENGUMUMAN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pengumuman & Informasi
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            Memuat pengumuman...
          </div>
        ) : pengumumanList.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            Belum ada pengumuman terbaru saat ini.
          </div>
        ) : (
          pengumumanList.map((item) => {
            const isBaru = isPengumumanBaru(item.created_at);

            return (
              <div
                key={item.id}
                className={`p-4 bg-white rounded-2xl border shadow-sm space-y-3 ${
                  item.pinned ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* BADGE PENTING */}
                  {(item.pinned || item.kategori === 'Darurat') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-md border border-rose-200">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      Penting
                    </span>
                  )}

                  {/* BADGE BARU */}
                  {isBaru && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md border border-emerald-200">
                      <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                      Baru
                    </span>
                  )}

                  {item.pinned && !item.kategori.includes('Darurat') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                      <Pin className="w-3 h-3 fill-amber-600" />
                      Disematkan
                    </span>
                  )}

                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                    {item.kategori}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-800">{item.judul}</h4>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{item.isi}</p>

                {/* Tombol Akses Lampiran (Tidak Langsung Menampilkan Gambar) */}
                {item.lampiran_url && (
                  <div className="pt-1">
                    {item.lampiran_type === 'image' || item.lampiran_url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                      <button 
                        onClick={() => setActiveImageModal(item.lampiran_url!)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors active:scale-95"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>Lihat Lampiran Foto</span>
                      </button>
                    ) : (
                      <a
                        href={item.lampiran_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-semibold border border-sky-100 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-sky-600" />
                        <span>Lihat / Download Surat Edaran (PDF)</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                  <span>Oleh: {item.profil_pengurus?.nama_lengkap || 'Pengurus RW'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Lightbox Perbesar Gambar Pengumuman */}
      {activeImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex flex-col items-center">
            <button 
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeImageModal} 
              alt="Gambar Lampiran Pengumuman" 
              className="max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}