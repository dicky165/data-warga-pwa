'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Camera, Send, Loader2, MapPin, AlertTriangle } from 'lucide-react';

export default function PetugasLaporanPage() {
  const supabase = createClient();

  const [listLaporan, setListLaporan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [fileFoto, setFileFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    judul: '',
    kategori: 'Kerusakan Fasilitas',
    deskripsi: '',
    lokasi_detail: ''
  });

  const fetchPetugasLaporan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('laporan_kejadian')
        .select('*')
        .eq('pelapor_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setListLaporan(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetugasLaporan();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Ambil Profil Pengurus/Petugas
      const { data: profile } = await supabase
        .from('profil_pengurus')
        .select('nama_lengkap, no_hp')
        .eq('id', user?.id || '')
        .maybeSingle();

      let fotoUrl = '';

      if (fileFoto) {
        const fileExt = fileFoto.name.split('.').pop();
        const fileName = `petugas_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-laporan')
          .upload(fileName, fileFoto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('foto-laporan')
          .getPublicUrl(fileName);

        fotoUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('laporan_kejadian').insert({
        pelapor_id: user?.id || null,
        nama_pelapor: profile?.nama_lengkap || 'Petugas Lapangan',
        no_hp_pelapor: profile?.no_hp || '',
        role_pelapor: 'petugas',
        judul: formData.judul,
        kategori: formData.kategori,
        deskripsi: formData.deskripsi,
        lokasi_detail: formData.lokasi_detail,
        foto_url: fotoUrl,
        status: 'PENDING'
      });

      if (insertError) throw insertError;

      setShowModal(false);
      setFormData({ judul: '', kategori: 'Kerusakan Fasilitas', deskripsi: '', lokasi_detail: '' });
      setFileFoto(null);
      setPreviewFoto(null);
      fetchPetugasLaporan();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Laporan Temuan Lapangan</h2>
          <p className="text-[11px] text-slate-400">Lapor fasilitas rusak / kejadian saat bertugas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Lapor Temuan</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs">Memuat laporan...</span>
        </div>
      ) : listLaporan.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Belum ada temuan yang Anda laporkan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listLaporan.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                  {item.kategori}
                </span>
                <span className="text-[10px] font-bold">
                  {item.status === 'PENDING' && <span className="text-amber-600">Pending</span>}
                  {item.status === 'DIPROSES' && <span className="text-sky-600">Diproses</span>}
                  {item.status === 'SELESAI' && <span className="text-emerald-600">Selesai</span>}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-800">{item.judul}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{item.deskripsi}</p>

              {item.foto_url && (
                <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100">
                  <img src={item.foto_url} alt={item.judul} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{item.lokasi_detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Input Form Petugas */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Input Temuan Lapangan</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Kejadian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pagar Lapangan Rusak"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori *</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
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
                  placeholder="Contoh: Gang Masjid RT 01"
                  value={formData.lokasi_detail}
                  onChange={(e) => setFormData({ ...formData, lokasi_detail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deskripsi *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Penjelasan singkat temuan..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Foto Bukti</label>
                {previewFoto && (
                  <div className="h-32 w-full mb-2 rounded-xl overflow-hidden bg-slate-100">
                    <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-500 font-semibold">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>{fileFoto ? 'Ganti Foto' : 'Ambil Foto'}</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-1"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kirim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}