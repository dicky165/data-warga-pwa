'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Mail, 
  Plus, 
  Search, 
  Printer, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Pencil, 
  Trash2,
  Clock,
  XCircle
} from 'lucide-react';

interface SuratItem {
  id: string;
  no_surat: string;
  no_urut?: number;
  nik_warga: string;
  jenis_surat: string;
  keterangan: string;
  tanggal_surat: string;
  status?: string;
  detail_tambahan?: {
    nama_pemohon?: string;
  };
  warga?: {
    nama?: string;
  } | null;
}

export default function SuratPage() {
  const supabase = createClient();
  const [listSurat, setListSurat] = useState<SuratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSurat();
  }, []);

  async function fetchSurat() {
    try {
      setLoading(true);

      // 1. Ambil data surat_pengantar
      const { data: suratData, error: suratError } = await supabase
        .from('surat_pengantar')
        .select('*')
        .order('created_at', { ascending: false });

      if (suratError) throw suratError;
      if (!suratData || suratData.length === 0) {
        setListSurat([]);
        return;
      }

      // 2. Ambil semua NIK unik
      const nikList = Array.from(
        new Set(suratData.map((s) => String(s.nik_warga).trim()).filter(Boolean))
      );

      // 3. Query nama_lengkap dari tabel data_warga
      let wargaMap: Record<string, string> = {};
      if (nikList.length > 0) {
        const { data: wargaData } = await supabase
          .from('data_warga')
          .select('nik, nama_lengkap')
          .in('nik', nikList);

        if (wargaData) {
          wargaData.forEach((w) => {
            wargaMap[String(w.nik).trim()] = w.nama_lengkap;
          });
        }
      }

      // 4. Gabungkan data nama warga ke item surat
      const formattedSurat = suratData.map((item) => {
        const cleanNik = String(item.nik_warga).trim();
        const namaWarga = wargaMap[cleanNik] || item.detail_tambahan?.nama_pemohon || 'Warga (Tanpa Nama)';

        return {
          ...item,
          warga: {
            nama: namaWarga,
          },
        };
      });

      setListSurat(formattedSurat);
    } catch (err: any) {
      console.error('Gagal mengambil data surat:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fungsi Approve (Setujui) & Tolak Surat
  async function handleUpdateStatus(id: string, statusBaru: 'disetujui' | 'ditolak') {
    try {
      setUpdatingId(id);

      let updatePayload: any = { status: statusBaru };

      // Jika disetujui, buat nomor surat otomatis dan nomor urut baru
      if (statusBaru === 'disetujui') {
        const { data: lastSurat } = await supabase
          .from('surat_pengantar')
          .select('no_urut')
          .order('no_urut', { ascending: false })
          .limit(1)
          .single();

        const nextUrut = (lastSurat?.no_urut || 0) + 1;
        const bulanRomi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()];
        const tahun = new Date().getFullYear();

        updatePayload.no_urut = nextUrut;
        updatePayload.no_surat = `${String(nextUrut).padStart(3, '0')}/PR/RT001-RW010/${bulanRomi}/${tahun}`;
      }

      const { error } = await supabase
        .from('surat_pengantar')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      // Update state lokal secara instan
      setListSurat((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatePayload } : item
        )
      );

      alert(`Surat berhasil ${statusBaru === 'disetujui' ? 'disetujui' : 'ditolak'}!`);
    } catch (err: any) {
      console.error('Gagal update status:', err);
      alert('Gagal memperbarui status surat: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Fungsi Hapus Surat
  async function handleDelete(id: string) {
    const isConfirmed = window.confirm('Apakah Anda yakin ingin menghapus data surat ini?');
    if (!isConfirmed) return;

    try {
      setDeletingId(id);

      const { error, count } = await supabase
        .from('surat_pengantar')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw new Error(error.message);

      if (count === 0) {
        throw new Error('Data gagal dihapus dari database. Periksa izin/policy RLS Supabase Anda.');
      }

      setListSurat((prev) => prev.filter((item) => item.id !== id));
      alert('Data surat berhasil dihapus.');
    } catch (err: any) {
      console.error('Error delete:', err);
      alert(`Gagal menghapus surat: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // Helper Badge Status Surat
  const renderStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'disetujui':
      case 'selesai':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Disetujui
          </span>
        );
      case 'ditolak':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-600 font-bold">
            <XCircle className="w-3.5 h-3.5" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Diproses
          </span>
        );
    }
  };

  // Filter pencarian berdasarkan nama, NIK, atau nomor surat
  const filteredSurat = listSurat.filter((item) => {
    const q = searchQuery.toLowerCase();
    const nama = item.warga?.nama?.toLowerCase() || '';
    const noSurat = item.no_surat?.toLowerCase() || '';
    const nik = item.nik_warga?.toLowerCase() || '';
    const jenis = item.jenis_surat?.toLowerCase() || '';

    return nama.includes(q) || noSurat.includes(q) || nik.includes(q) || jenis.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-sky-600" />
            Surat Menyurat
          </h1>
          <p className="text-xs text-slate-500">Kelola & cetak surat pengantar RT/RW</p>
        </div>

        <Link
          href="/surat/buat"
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Buat Surat
        </Link>
      </div>

      {/* Input Pencarian */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, NIK, atau no. surat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
        />
      </div>

      {/* Status Loading */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat data surat...</span>
        </div>
      ) : filteredSurat.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Belum Ada Data Surat</p>
          <p className="text-[11px] text-slate-400">
            {searchQuery ? 'Data yang Anda cari tidak ditemukan.' : 'Silakan buat surat pengantar baru.'}
          </p>
        </div>
      ) : (
        /* Daftar Surat */
        <div className="space-y-2.5">
          {filteredSurat.map((surat) => (
            <div
              key={surat.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-sky-50 text-sky-700 font-semibold text-[10px] rounded-md mb-1">
                    {surat.jenis_surat.replace(/_/g, ' ')}
                  </span>
                  <h2 className="text-xs font-bold text-slate-800">
                    {surat.warga?.nama || 'Warga (Tanpa Nama)'}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400">NIK: {surat.nik_warga}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {surat.no_surat === 'PENDING' || !surat.no_surat ? 'PENDING' : surat.no_surat}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(surat.tanggal_surat).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Keterangan */}
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg line-clamp-2">
                <span className="font-semibold text-slate-700">Keperluan:</span> {surat.keterangan}
              </p>

              {/* Baris Status & Aksi Tombol */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-50 mt-1">
                {renderStatusBadge(surat.status)}

                <div className="flex items-center gap-1.5">
                  {/* Tombol Approve & Tolak untuk surat status pending / diproses */}
                  {(!surat.status || surat.status.toLowerCase() === 'pending' || surat.status.toLowerCase() === 'diproses') && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(surat.id, 'disetujui')}
                        disabled={updatingId === surat.id}
                        className="flex items-center gap-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {updatingId === surat.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(surat.id, 'ditolak')}
                        disabled={updatingId === surat.id}
                        className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Tolak
                      </button>
                    </>
                  )}

                  {/* Tombol Edit */}
                  <Link
                    href={`/surat/edit/${surat.id}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>

                  {/* Tombol Hapus */}
                  <button
                    onClick={() => handleDelete(surat.id)}
                    disabled={deletingId === surat.id}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {deletingId === surat.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus
                  </button>

                  {/* Tombol Cetak (Hanya aktif jika status disetujui / selesai) */}
                  {(surat.status?.toLowerCase() === 'disetujui' || surat.status?.toLowerCase() === 'selesai') && (
                    <Link
                      href={`/surat/cetak/${surat.id}`}
                      className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}