'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Megaphone, Plus, Pin, Loader2, Calendar, Trash2, Paperclip, FileText, Image as ImageIcon, ExternalLink, X } from 'lucide-react';

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  kategori: string;
  pinned: boolean;
  rw: string;
  lampiran_url?: string | null;
  lampiran_type?: string | null; // 'image' | 'pdf'
  created_at: string;
  profil_pengurus?: {
    nama_lengkap: string;
  } | null;
}

export default function PengumumanPage() {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [kategori, setKategori] = useState('Informasi');
  const [pinned, setPinned] = useState(false);
  const [rw, setRw] = useState('010');
  
  // File State
  const [fileLampiran, setFileLampiran] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Modal Image Preview State
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  const supabase = createClient();

  const fetchPengumuman = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pengumuman')
        .select(`
          *,
          profil_pengurus:penulis_by_id (nama_lengkap)
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setList(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil pengumuman:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPengumuman();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFileLampiran(selectedFile);

      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Verifikasi Authentication User
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Sesi login Anda telah berakhir. Silakan re-login terlebih dahulu.');
      }

      let uploadedLampiranUrl = null;
      let uploadedLampiranType = null;

      // 2. Upload File Lampiran jika ada
      if (fileLampiran) {
        const fileExt = fileLampiran.name.split('.').pop();
        const fileName = `pengumuman_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('lampiran-pengumuman')
          .upload(fileName, fileLampiran);

        if (uploadError) {
          throw new Error(`Gagal mengunggah lampiran: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('lampiran-pengumuman')
          .getPublicUrl(fileName);

        uploadedLampiranUrl = publicUrlData.publicUrl;
        uploadedLampiranType = fileLampiran.type.startsWith('image/') ? 'image' : 'pdf';
      }

      // 3. Insert Pengumuman dengan User ID yang Terverifikasi
      const { error } = await supabase.from('pengumuman').insert([
        {
          judul,
          isi,
          kategori,
          pinned,
          rw,
          lampiran_url: uploadedLampiranUrl,
          lampiran_type: uploadedLampiranType,
          penulis_by_id: user.id, // Dipastikan bernilai UUID terautentikasi
        },
      ]);

      if (error) {
        // Penanganan jika ID user belum terdaftar di tabel profil_pengurus
        if (error.code === '23503') {
          throw new Error('Akun Anda belum terdaftar di profil pengurus. Silakan hubungi admin.');
        }
        throw error;
      }

      // Reset form
      setJudul('');
      setIsi('');
      setKategori('Informasi');
      setPinned(false);
      setFileLampiran(null);
      setPreviewUrl(null);
      setShowForm(false);
      
      // Refresh list
      fetchPengumuman();
    } catch (err: any) {
      alert(`Gagal membuat pengumuman: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;

    try {
      const { error } = await supabase.from('pengumuman').delete().eq('id', id);
      if (error) throw error;
      setList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const getKategoriBadge = (kat: string) => {
    switch (kat) {
      case 'Darurat':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Kegiatan':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Pengumuman Warga</h1>
            <p className="text-xs text-slate-500">Kelola informasi & pemberitahuan untuk warga</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Batal' : 'Buat Pengumuman'}</span>
        </button>
      </div>

      {/* Form Input */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
            Form Pengumuman Baru
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Judul Pengumuman *</label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Kerja Bakti Hari Minggu"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="Informasi">Informasi</option>
                  <option value="Kegiatan">Kegiatan</option>
                  <option value="Darurat">Darurat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Wilayah RW</label>
                <input
                  type="text"
                  value={rw}
                  onChange={(e) => setRw(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Isi Pengumuman *</label>
              <textarea
                required
                rows={4}
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Tuliskan detail pengumuman secara lengkap..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Input File Lampiran */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sematkan Foto / Surat Edaran (PDF/Gambar)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-slate-600 text-xs font-medium">
                  <Paperclip className="w-4 h-4 text-sky-600" />
                  <span>{fileLampiran ? fileLampiran.name : 'Pilih File (JPG, PNG, PDF)'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {fileLampiran && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileLampiran(null);
                      setPreviewUrl(null);
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {previewUrl && (
                <div className="mt-2 h-32 w-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="pinned"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <label htmlFor="pinned" className="text-xs text-slate-600 cursor-pointer select-none">
                Sematkan Pengumuman (*Penting / Pinned di Atas*)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan & Terbitkan</span>
            </button>
          </div>
        </form>
      )}

      {/* List Pengumuman */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 text-xs text-slate-400">
          Belum ada pengumuman yang dibuat.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-white rounded-2xl border shadow-sm transition-all space-y-3 ${
                item.pinned ? 'border-amber-300 bg-amber-50/20' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                      <Pin className="w-3 h-3 fill-amber-600" />
                      Disematkan
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getKategoriBadge(
                      item.kategori
                    )}`}
                  >
                    {item.kategori}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">RW {item.rw}</span>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-800">{item.judul}</h3>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{item.isi}</p>

              {/* Tampilan Lampiran jika ada */}
              {item.lampiran_url && (
                <div className="pt-2">
                  {item.lampiran_type === 'image' || item.lampiran_url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                    <div 
                      onClick={() => setActiveImageModal(item.lampiran_url!)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 max-h-60 bg-slate-100 w-full"
                    >
                      <img 
                        src={item.lampiran_url} 
                        alt={item.judul} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>Klik untuk memperbesar</span>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={item.lampiran_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 p-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-semibold border border-sky-100 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span>Lihat Lampiran Dokumen / PDF</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                <span>Penulis: {item.profil_pengurus?.nama_lengkap || 'Pengurus'}</span>
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
          ))}
        </div>
      )}

      {/* Modal Lightbox untuk Perbesar Gambar */}
      {activeImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setActiveImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex flex-col items-center">
            <button 
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={activeImageModal} 
              alt="Gambar Pengumuman" 
              className="max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}