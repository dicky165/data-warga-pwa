'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FileText, X, Loader2, Send } from 'lucide-react';

interface ModalBuatSuratProps {
  isOpen: boolean;
  onClose: () => void;
  nikWarga: string;
  namaWarga: string;
  rt: string;
  rw: string;
}

// Nilai 'id' disesuaikan persis dengan jenis_surat_enum pada database Supabase Anda
const JENIS_SURAT_OPTIONS = [
  { id: 'PINDAH_DOMISILI', label: 'Surat Keterangan Pindah Domisili' },
  { id: 'IJIN_KERAMAIAN', label: 'Surat Izin Keramaian / Acara' },
  { id: 'KETERANGAN_UMKM', label: 'Surat Keterangan Usaha / UMKM' },
  { id: 'KETERANGAN_UMUM', label: 'Surat Pengantar / Keterangan Umum' },
];

export default function ModalBuatSurat({
  isOpen,
  onClose,
  nikWarga,
  namaWarga,
  rt,
  rw,
}: ModalBuatSuratProps) {
  const router = useRouter();
  const supabase = createClient();

  // Inisialisasi state default dengan nilai enum yang valid di database
  const [jenisSurat, setJenisSurat] = useState('PINDAH_DOMISILI');
  const [keterangan, setKeterangan] = useState('');
  const [catatanDetail, setCatatanDetail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!keterangan.trim()) {
        alert('Mohon isi keperluan / keterangan pengajuan surat.');
        setLoading(false);
        return;
      }

      // 1. Ambil nomor urut surat terakhir untuk penomoran otomatis
      const { data: lastSurat } = await supabase
        .from('surat_pengantar')
        .select('no_urut')
        .order('no_urut', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNoUrut = (lastSurat?.no_urut || 0) + 1;
      const todayStr = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD
      const romawiBulan = [
        'I', 'II', 'III', 'IV', 'V', 'VI', 
        'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
      ][new Date().getMonth()];
      const tahun = new Date().getFullYear();
      
      // Format no_surat contoh: 001/PR/RT001-RW010/VIII/2026
      const formatNoSurat = `${String(nextNoUrut).padStart(3, '0')}/PR/RT${rt}-RW${rw}/${romawiBulan}/${tahun}`;

      // 2. Insert ke database sesuai skema tabel surat_pengantar
      const payload = {
        no_surat: formatNoSurat,
        no_urut: nextNoUrut,
        nik_warga: nikWarga,
        jenis_surat: jenisSurat,
        keterangan: keterangan,
        tanggal_surat: todayStr,
        detail_tambahan: {
          nama_pemohon: namaWarga,
          rt: rt,
          rw: rw,
          catatan: catatanDetail || null,
        },
      };

      const { data, error } = await supabase
        .from('surat_pengantar')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Gagal menyimpan data surat pengantar.');
      }

      onClose();

      // 3. Redireksi ke halaman cetak/preview surat
      if (data?.id) {
        router.push(`/surat/cetak/${data.id}`);
      } else {
        alert('Surat berhasil dibuat!');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat membuat surat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100 flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-600" />
            Buat Surat Pengantar RT/RW
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informasi Pemohon */}
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-0.5">
          <div>
            Pemohon: <strong className="text-slate-800">{namaWarga}</strong>
          </div>
          <div>
            NIK: <span className="font-mono text-slate-700">{nikWarga}</span> | Wilayah: <strong>RT {rt} / RW {rw}</strong>
          </div>
        </div>

        {/* Form Pengajuan */}
        <form id="form-buat-surat" onSubmit={handleSubmit} className="space-y-3 py-4 text-xs">
          {/* Jenis Surat */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Pilih Jenis Surat Pengantar *
            </label>
            <select
              required
              value={jenisSurat}
              onChange={(e) => setJenisSurat(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
            >
              {JENIS_SURAT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Keterangan / Keperluan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Maksud / Keterangan Keperluan *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Contoh: Permohonan izin acara perkawinan / Pengurusan surat pindah domisili"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Detail Tambahan (JSONB) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Catatan Detail Tambahan <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan yang akan disimpan ke detail_tambahan"
              value={catatanDetail}
              onChange={(e) => setCatatanDetail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="form-buat-surat"
            disabled={loading}
            className="w-1/2 py-2.5 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Simpan & Cetak Surat</span>
          </button>
        </div>
      </div>
    </div>
  );
}