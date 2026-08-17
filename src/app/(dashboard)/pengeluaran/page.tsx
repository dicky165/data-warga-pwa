'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CameraUploader from '@/components/camera/camera-uploader';
import { Receipt, DollarSign, FileText, Send, CheckCircle2 } from 'lucide-react';

export default function PengeluaranPage() {
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [fotoNota, setFotoNota] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominal || !keterangan || !fotoNota) {
      alert('Harap isi nominal, keterangan, dan ambil foto nota!');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // 1. Unggah foto nota ke Supabase Storage (Bucket: nota-pengeluaran)
      const fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('nota-pengeluaran')
        .upload(fileName, fotoNota);

      if (uploadError) throw uploadError;

      // Dapatkan URL Publik Nota
      const { data: publicUrlData } = supabase.storage
        .from('nota-pengeluaran')
        .getPublicUrl(fileName);

      // 2. Simpan Transaksi Keuangan ke Tabel pengeluaran_kas
      const { data: userData } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from('pengeluaran_kas')
        .insert({
          rw: '001', // Default RW
          nominal_keluar: parseFloat(nominal.replace(/\D/g, '')),
          keterangan,
          url_foto_nota: publicUrlData.publicUrl,
          pencatat_by_id: userData.user?.id,
        });

      if (insertError) throw insertError;

      // Reset Form
      setNominal('');
      setKeterangan('');
      setFotoNota(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Gagal mencatat pengeluaran:', error);
      alert(error.message || 'Terjadi kesalahan saat menyimpan pengeluaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800">Catat Pengeluaran Kas</h1>
          <p className="text-xs text-slate-500">Unggah foto nota dan rincian dana keluar</p>
        </div>
      </div>

      {showSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Pengeluaran kas berhasil dicatat dan nota tersimpan!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        {/* Input Nominal Pengeluaran */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nominal Pengeluaran (Rp)
          </label>
          <div className="relative flex items-center">
            <DollarSign className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="number"
              required
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
            />
          </div>
        </div>

        {/* Input Keterangan Transaksi */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Keterangan Penggunaan Dana
          </label>
          <div className="relative flex items-center">
            <FileText className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Pembelian 2 bola lampu jalan & konsumsi gotong royong"
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>
        </div>

        {/* Upload Nota via Kamera Native HP */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Foto Bukti Nota Keuangan
          </label>
          <CameraUploader onImageCaptured={(file) => setFotoNota(file)} />
        </div>

        {/* Submit Button (Target Touch 44px+) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-sky-600/20"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Mengunggah Data...' : 'Simpan Pengeluaran'}</span>
        </button>
      </form>
    </div>
  );
}