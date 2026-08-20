'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  FileText, Plus, Clock, CheckCircle2, XCircle, 
  ChevronRight, Calendar, User, X, FileCheck, Send, Printer
} from 'lucide-react';

interface SuratPengantar {
  id: string | number;
  no_surat?: string;
  no_urut?: number;
  nik_warga: string;
  jenis_surat: string;
  keterangan: string;
  status: 'pending' | 'disetujui' | 'approved' | 'ditolak' | string;
  tanggal_surat?: string;
  created_at: string;
  id_wilayah_rt_rw?: number;
}

// Map Tampilan Nama Jenis Surat yang Ramah Pengguna
const JENIS_SURAT_MAP: Record<string, string> = {
  PENGANTAR_UMUM: 'Surat Pengantar Umum',
  KETERANGAN_UMUM: 'Surat Keterangan Umum',
  DOMISILI: 'Surat Keterangan Domisili',
  PINDAH_DOMISILI: 'Surat Pindah Domisili',
  SKTM: 'Surat Keterangan Tidak Mampu (SKTM)',
  SKCK: 'Surat Pengantar SKCK',
  USAHA: 'Surat Keterangan Usaha',
  KETERANGAN_UMKM: 'Surat Keterangan UMKM',
  IJIN_KERAMAIAN: 'Surat Izin Keramaian',
  KEMATIAN: 'Surat Keterangan Kematian',
  PINDAH: 'Surat Pindah',
};

export default function LayananSuratWargaPage() {
  const [suratList, setSuratList] = useState<SuratPengantar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State Modal Form & Detail
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<SuratPengantar | null>(null);

  // State Form Input Warga (Default memakai nilai Enum)
  const [userNik, setUserNik] = useState<string>('');
  const [jenisSurat, setJenisSurat] = useState<string>('PENGANTAR_UMUM');
  const [keterangan, setKeterangan] = useState<string>('');

  const supabase = createClient();

  // Fetch Data Pengajuan Surat Milik Warga yang Login
  const fetchSuratWarga = async () => {
    try {
      setIsLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) return;

      const nik = user.user_metadata?.nik || user.email?.split('@')[0];
      setUserNik(nik);

      if (nik) {
        const { data, error } = await supabase
          .from('surat_pengantar')
          .select('*')
          .eq('nik_warga', String(nik).trim())
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSuratList(data || []);
      }
    } catch (err) {
      console.error('Error fetching surat data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuratWarga();
  }, [supabase]);

  // Handle Submit Form Pengajuan Surat Baru
  const handleSubmitSurat = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userNik) {
      alert('NIK Pemohon tidak ditemukan. Pastikan Anda sudah login.');
      return;
    }

    if (!keterangan.trim()) {
      alert('Harap isi keperluan pengajuan surat.');
      return;
    }

    try {
      setIsSubmitting(true);

      const uniquePendingNo = `PENDING-${String(userNik).trim()}-${Date.now()}`;

      const payload = {
        nik_warga: String(userNik).trim(),
        jenis_surat: jenisSurat,
        keterangan: keterangan.trim(),
        status: 'pending',
        tanggal_surat: new Date().toISOString().split('T')[0],
        no_urut: 0,
        no_surat: uniquePendingNo,
        detail_tambahan: {}
      };

      const { error } = await supabase
        .from('surat_pengantar')
        .insert([payload]);

      if (error) {
        console.error('Supabase Insert Error:', error);
        throw new Error(error.message);
      }

      alert('Pengajuan surat berhasil dikirim!');
      setKeterangan('');
      setJenisSurat('PENGANTAR_UMUM');
      setIsFormOpen(false);
      fetchSuratWarga();
    } catch (err: any) {
      console.error('Error submitting surat:', err);
      alert('Gagal mengirim pengajuan: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper Badge Status
  const renderStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'disetujui' || statusLower === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Disetujui
        </span>
      );
    }
    if (statusLower === 'ditolak' || statusLower === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold rounded-lg border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-extrabold rounded-lg border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
        Diproses
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER SECTION */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Layanan Surat</h2>
            <p className="text-[10px] text-slate-400">Pengajuan Surat Pengantar RT/RW</p>
          </div>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat</span>
        </button>
      </div>

      {/* DAFTAR RIWAYAT PENGAJUAN SURAT */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Riwayat Pengajuan
          </h3>
          <span className="text-[10px] text-slate-400">{suratList.length} Berkas</span>
        </div>

        {isLoading ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            Memuat daftar surat...
          </div>
        ) : suratList.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center space-y-2">
            <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-500">Belum ada pengajuan surat.</p>
            <p className="text-[10px] text-slate-400">Klik "+ Buat Surat" di atas untuk mengajukan surat pengantar.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {suratList.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedSurat(item)}
                className="p-3.5 bg-white hover:bg-slate-50/80 active:scale-[0.99] rounded-2xl border border-slate-100 shadow-sm transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    {JENIS_SURAT_MAP[item.jenis_surat] || item.jenis_surat}
                  </span>
                  {renderStatusBadge(item.status)}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700">Keperluan:</span> {item.keterangan || '-'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex items-center gap-0.5 text-emerald-600 font-bold">
                    <span>Lihat Detail</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORM BUAT SURAT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-bold">Pengajuan Surat Baru</h3>
                  <p className="text-[10px] text-emerald-100">Lengkapi data keperluan surat Anda</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-700 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSurat} className="p-4 space-y-3.5">
              {/* NIK Auto Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">NIK Pemohon</label>
                <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{userNik || 'Memuat NIK...'}</span>
                </div>
              </div>

              {/* Jenis Surat Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Jenis Surat</label>
                <select
                  value={jenisSurat}
                  onChange={(e) => setJenisSurat(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PENGANTAR_UMUM">Surat Pengantar Umum</option>
                  <option value="KETERANGAN_UMUM">Surat Keterangan Umum</option>
                  <option value="DOMISILI">Surat Keterangan Domisili</option>
                  <option value="PINDAH_DOMISILI">Surat Pindah Domisili</option>
                  <option value="SKTM">Surat Keterangan Tidak Mampu (SKTM)</option>
                  <option value="SKCK">Surat Pengantar SKCK</option>
                  <option value="USAHA">Surat Keterangan Usaha</option>
                  <option value="KETERANGAN_UMKM">Surat Keterangan UMKM</option>
                  <option value="IJIN_KERAMAIAN">Surat Izin Keramaian</option>
                  <option value="KEMATIAN">Surat Keterangan Kematian</option>
                  <option value="PINDAH">Surat Pindah</option>
                </select>
              </div>

              {/* Keperluan / Keterangan */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Keperluan / Alasan</label>
                <textarea
                  required
                  rows={3}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Persyaratan pembuatan KTP baru / Persyaratan beasiswa sekolah..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Tombol Action */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  {isSubmitting ? (
                    <span>Mengirim...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Pengajuan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SURAT / PRATINJAU */}
      {selectedSurat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Detail Pengajuan Surat</h3>
                  <p className="text-[10px] text-slate-300">ID Pengajuan: #{selectedSurat.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSurat(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status Pengajuan</span>
                {renderStatusBadge(selectedSurat.status)}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor Surat</p>
                  <p className="font-mono font-bold text-slate-800">
                    {selectedSurat.no_surat?.startsWith('PENDING') || !selectedSurat.no_surat
                      ? 'Belum Diterbitkan (Menunggu RT/RW)'
                      : selectedSurat.no_surat}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Jenis Surat</p>
                  <p className="font-bold text-slate-800">
                    {JENIS_SURAT_MAP[selectedSurat.jenis_surat] || selectedSurat.jenis_surat}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Keperluan</p>
                  <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700 leading-relaxed border border-slate-100">
                    {selectedSurat.keterangan || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Pengajuan</p>
                  <p className="text-slate-700 font-medium">
                    {new Date(selectedSurat.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal Action */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              {(selectedSurat.status?.toLowerCase() === 'disetujui' || selectedSurat.status?.toLowerCase() === 'approved') && (
                <Link
                  href={`/surat/cetak/${selectedSurat.id}`}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Surat</span>
                </Link>
              )}
              <button
                onClick={() => setSelectedSurat(null)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}