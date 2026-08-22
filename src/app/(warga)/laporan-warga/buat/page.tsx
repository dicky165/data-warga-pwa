'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Send } from 'lucide-react';
import Link from 'next/link';

export default function WargaBuatLaporanPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fileFoto, setFileFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    judul: '',
    kategori: 'Kerusakan Fasilitas',
    deskripsi: '',
    lokasi_detail: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Ambil Profil Warga
      const { data: profile } = await supabase
        .from('data_warga')
        .select('nama_lengkap, no_hp')
        .eq('id_user', user?.id || '')
        .maybeSingle();

      let fotoUrl = '';

      // Upload Foto ke Supabase Storage jika ada
      if (fileFoto) {
        const fileExt = fileFoto.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-laporan')
          .upload(fileName, fileFoto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('foto-laporan')
          .getPublicUrl(fileName);

        fotoUrl = publicUrlData.publicUrl;
      }

      // Insert ke database
      const { error: insertError } = await supabase.from('laporan_kejadian').insert({
        pelapor_id: user?.id || null,
        nama_pelapor: profile?.nama_lengkap || user?.email || 'Warga',
        no_hp_pelapor: profile?.no_hp || '',
        role_pelapor: 'warga',
        judul: formData.judul,
        kategori: formData.kategori,
        deskripsi: formData.deskripsi,
        lokasi_detail: formData.lokasi_detail,
        foto_url: fotoUrl,
        status: 'PENDING'
      });

      if (insertError) throw insertError;

      alert('Laporan Anda berhasil dikirim!');
      router.push('/laporan-warga');
    } catch (err: any) {
      alert(`Gagal mengirim laporan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/laporan-warga" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-base font-bold text-slate-800">Buat Laporan Kejadian</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Laporan *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Lampu Jalan RT 03 Mati"
            value={formData.judul}
            onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori *</label>
          <select
            value={formData.kategori}
            onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold text-slate-700"
          >
            <option value="Kerusakan Fasilitas">Kerusakan Fasilitas</option>
            <option value="Keamanan">Keamanan / Ketertiban</option>
            <option value="Kebersihan">Kebersihan & Sampah</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lokasi Detail *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Depan Pos Kamling RT 02"
            value={formData.lokasi_detail}
            onChange={(e) => setFormData({ ...formData, lokasi_detail: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deskripsi Laporan *</label>
          <textarea
            rows={3}
            required
            placeholder="Jelaskan detail kejadian atau kerusakan..."
            value={formData.deskripsi}
            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
          ></textarea>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Foto Bukti (Opsional)</label>
          <div className="space-y-2">
            {previewFoto && (
              <div className="h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-500 font-semibold">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>{fileFoto ? 'Ganti Foto' : 'Ambil / Upload Foto'}</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all text-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Kirim Laporan</span>
        </button>
      </form>
    </div>
  );
}