'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Megaphone, Plus, Pin, Loader2, Calendar, Tag, Trash2 } from 'lucide-react';

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  kategori: string;
  pinned: boolean;
  rw: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('pengumuman').insert([
        {
          judul,
          isi,
          kategori,
          pinned,
          rw,
          penulis_by_id: user?.id,
        },
      ]);

      if (error) throw error;

      // Reset form
      setJudul('');
      setIsi('');
      setKategori('Informasi');
      setPinned(false);
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Judul Pengumuman</label>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Isi Pengumuman</label>
              <textarea
                required
                rows={4}
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Tuliskan detail pengumuman secara lengkap..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
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
              className={`p-4 bg-white rounded-2xl border shadow-sm transition-all space-y-2 ${
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
    </div>
  );
}