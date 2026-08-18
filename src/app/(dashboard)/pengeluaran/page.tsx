'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CameraUploader from '@/components/camera/camera-uploader';
import { Receipt, FileText, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function PengeluaranPage() {
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [fotoNota, setFotoNota] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nominal || !keterangan || !fotoNota) {
      setErrorMessage('Harap isi nominal, keterangan, dan ambil foto nota terlebih dahulu!');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // 1. Dapatkan data pengurus/user yang sedang login
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Sesi login telah berakhir. Silakan re-login kembali.');
      }

      // 2. Ambil data profil pengurus untuk mendapatkan RW Tugas
      const { data: pengurus } = await supabase
        .from('profil_pengurus')
        .select('rw_tugas')
        .eq('id', user.id)
        .maybeSingle();

      const userRw = pengurus?.rw_tugas || '010';

      // 3. Unggah foto nota ke Supabase Storage (Bucket: nota-pengeluaran)
      const fileExt = fotoNota.name.split('.').pop() || 'jpg';
      const fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('nota-pengeluaran')
        .upload(fileName, fotoNota, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (
          uploadError.message?.toLowerCase().includes('not found') ||
          uploadError.message?.includes('Bucket')
        ) {
          throw new Error(
            'Bucket "nota-pengeluaran" belum ditemukan di Supabase Storage. Harap pastikan Bucket bernama "nota-pengeluaran" sudah dibuat di Dashboard Supabase.'
          );
        }
        throw uploadError;
      }

      // 4. Ambil URL Publik Nota
      const { data: publicUrlData } = supabase.storage
        .from('nota-pengeluaran')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // 5. Simpan catatan ke tabel pengeluaran_kas
      const cleanNominal = parseFloat(nominal.replace(/\D/g, ''));

      const { error: insertError } = await supabase
        .from('pengeluaran_kas')
        .insert({
          rw: userRw,
          nominal_keluar: cleanNominal,
          keterangan: keterangan.trim(),
          url_foto_nota: publicUrl,
          pencatat_by_id: user.id,
        });

      if (insertError) throw insertError;

      // Reset Form & Tampilkan Notifikasi Sukses
      setNominal('');
      setKeterangan('');
      setFotoNota(null);
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error: any) {
      console.error('Gagal mencatat pengeluaran:', error);
      setErrorMessage(error.message || 'Terjadi kesalahan saat menyimpan pengeluaran kas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 p-2 sm:p-0">
      {/* Header Card */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800">Catat Pengeluaran Kas</h1>
          <p className="text-xs text-slate-500">Unggah foto nota dan rincian dana keluar RT/RW</p>
        </div>
      </div>

      {/* Pesan Sukses */}
      {showSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2.5 shadow-sm transition-all">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengeluaran kas berhasil dicatat dan foto nota telah tersimpan!</span>
        </div>
      )}

      {/* Pesan Error */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Gagal Menyimpan</span>
            <span className="block text-slate-600">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
        {/* Input Nominal (Prefix Rp pengganti logo $) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nominal Pengeluaran <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 select-none">
              Rp
            </span>
            <input
              type="number"
              required
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full h-12 pl-14 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono transition-all"
            />
          </div>
        </div>

        {/* Input Keterangan Transaksi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Keterangan Penggunaan Dana <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <FileText className="w-5 h-5 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Pembelian 2 bola lampu jalan & konsumsi gotong royong"
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Upload Kamera Native / Upload Foto Nota */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Foto Bukti Nota Keuangan <span className="text-rose-500">*</span>
          </label>
          <CameraUploader onImageCaptured={(file) => setFotoNota(file)} />
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 mt-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-sky-600/20 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengunggah Data & Nota...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Simpan Pengeluaran Kas</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}