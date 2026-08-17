'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Loader2, 
  Building2, 
  UserCheck 
} from 'lucide-react';

interface MasterDesa {
  id: number;
  nama_desa: string;
}

interface WilayahRTRW {
  id: number;
  id_desa: number;
  nama_kampung: string;
  rw: string;
  rt: string;
  nama_ketua_rt: string;
  master_desa?: MasterDesa;
}

export default function WilayahPage() {
  const supabase = createClient();

  const [listWilayah, setListWilayah] = useState<WilayahRTRW[]>([]);
  const [listDesa, setListDesa] = useState<MasterDesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id_desa: '',
    nama_kampung: '',
    rw: '',
    rt: '',
    nama_ketua_rt: ''
  });

  // 1. Fetch Master Desa
  const fetchDesa = async () => {
    const { data } = await supabase.from('master_desa').select('id, nama_desa');
    if (data) {
      setListDesa(data as MasterDesa[]);
    }
  };

  // 2. Fetch Daftar Wilayah RT/RW
  const fetchWilayah = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wilayah_rt_rw')
      .select(`
        id,
        id_desa,
        nama_kampung,
        rw,
        rt,
        nama_ketua_rt,
        master_desa (
          id,
          nama_desa
        )
      `)
      .order('rw', { ascending: true })
      .order('rt', { ascending: true });

    if (!error && data) {
      setListWilayah(data as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDesa();
    fetchWilayah();
  }, []);

  // Modal Handler
  const handleOpenModal = (wilayah?: WilayahRTRW) => {
    if (wilayah) {
      setSelectedId(wilayah.id);
      setFormData({
        id_desa: String(wilayah.id_desa),
        nama_kampung: wilayah.nama_kampung || '',
        rw: wilayah.rw || '',
        rt: wilayah.rt || '',
        nama_ketua_rt: wilayah.nama_ketua_rt || ''
      });
    } else {
      setSelectedId(null);
      setFormData({
        id_desa: listDesa.length > 0 ? String(listDesa[0].id) : '',
        nama_kampung: '',
        rw: '',
        rt: '',
        nama_ketua_rt: ''
      });
    }
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        id_desa: parseInt(formData.id_desa),
        nama_kampung: formData.nama_kampung,
        rw: formData.rw,
        rt: formData.rt,
        nama_ketua_rt: formData.nama_ketua_rt
      };

      if (selectedId) {
        // Update
        const { error } = await supabase
          .from('wilayah_rt_rw')
          .update(payload)
          .eq('id', selectedId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('wilayah_rt_rw')
          .insert([payload]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchWilayah();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data wilayah');
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus RT/RW ini? Data KK terikat mungkin akan terpengaruh.')) {
      const { error } = await supabase.from('wilayah_rt_rw').delete().eq('id', id);
      if (!error) {
        fetchWilayah();
      } else {
        alert('Gagal menghapus data wilayah');
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800">Kelola Wilayah (RT / RW)</h2>
          <p className="text-[11px] text-slate-400">Total: {listWilayah.length} Wilayah Terdaftar</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah RT/RW</span>
        </button>
      </div>

      {/* List Wilayah */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat data wilayah...</span>
        </div>
      ) : listWilayah.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Belum ada wilayah RT/RW yang diisi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listWilayah.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2 relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block bg-sky-50 text-sky-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    RT {w.rt} / RW {w.rw}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mt-1">{w.nama_kampung}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(w)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 text-slate-600">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ketua RT: <strong>{w.nama_ketua_rt || '-'}</strong></span>
                </div>
                {w.master_desa && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Desa/Kel: {w.master_desa.nama_desa}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit Wilayah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedId ? 'Edit Wilayah RT/RW' : 'Tambah Wilayah RT/RW'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="wilayah-form" onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pilih Desa/Kelurahan *
                </label>
                <select
                  required
                  value={formData.id_desa}
                  onChange={(e) => setFormData({ ...formData, id_desa: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  <option value="">-- Pilih Desa --</option>
                  {listDesa.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama_desa}
                    </option>
                  ))}
                </select>
                {listDesa.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    *Tabel master_desa masih kosong. Isi data master_desa dulu di Supabase.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Kampung / Perumahan / Dusun *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Perumahan Bumi Asri"
                  value={formData.nama_kampung}
                  onChange={(e) => setFormData({ ...formData, nama_kampung: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. RT *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 001"
                    value={formData.rt}
                    onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. RW *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 005"
                    value={formData.rw}
                    onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Ketua RT
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. H. Ahmad"
                  value={formData.nama_ketua_rt}
                  onChange={(e) => setFormData({ ...formData, nama_ketua_rt: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                form="wilayah-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Wilayah</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}