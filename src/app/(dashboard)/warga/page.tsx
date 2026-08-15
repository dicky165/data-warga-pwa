'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Users, 
  Search, 
  UserPlus, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  X, 
  Phone, 
  Home, 
  Loader2 
} from 'lucide-react';

interface Warga {
  id: string;
  nama_lengkap: string;
  no_kk: string;
  nik?: string;
  blok_rumah: string;
  nomor_rumah: string;
  nomor_wa: string;
  status_keluarga: string;
  status_warga: string;
}

export default function WargaPage() {
  const supabase = createClient();
  
  const [daftarWarga, setDaftarWarga] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWarga, setSelectedWarga] = useState<Warga | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    no_kk: '',
    nik: '',
    blok_rumah: '',
    nomor_rumah: '',
    nomor_wa: '',
    status_keluarga: 'Kepala Keluarga',
    status_warga: 'Tetap'
  });

  // Ambil Data Warga dari Supabase
  const fetchWarga = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('warga')
      .select('*')
      .order('blok_rumah', { ascending: true });

    if (!error && data) {
      setDaftarWarga(data as Warga[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWarga();
  }, []);

  // Format Nomor WhatsApp ke Standar Internasional (62)
  const formatWA = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  // Buka Modal Tambah/Edit
  const handleOpenModal = (warga?: Warga) => {
    if (warga) {
      setSelectedWarga(warga);
      setFormData({
        nama_lengkap: warga.nama_lengkap,
        no_kk: warga.no_kk,
        nik: warga.nik || '',
        blok_rumah: warga.blok_rumah,
        nomor_rumah: warga.nomor_rumah,
        nomor_wa: warga.nomor_wa,
        status_keluarga: warga.status_keluarga,
        status_warga: warga.status_warga
      });
    } else {
      setSelectedWarga(null);
      setFormData({
        nama_lengkap: '',
        no_kk: '',
        nik: '',
        blok_rumah: '',
        nomor_rumah: '',
        nomor_wa: '',
        status_keluarga: 'Kepala Keluarga',
        status_warga: 'Tetap'
      });
    }
    setIsModalOpen(true);
  };

  // Simpan/Edit Data Warga
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (selectedWarga) {
      // Update
      const { error } = await supabase
        .from('warga')
        .update(formData)
        .eq('id', selectedWarga.id);

      if (!error) {
        setIsModalOpen(false);
        fetchWarga();
      } else {
        alert('Gagal mengedit data warga');
      }
    } else {
      // Insert Baru
      const { error } = await supabase
        .from('warga')
        .insert([formData]);

      if (!error) {
        setIsModalOpen(false);
        fetchWarga();
      } else {
        alert('Gagal menambahkan data warga');
      }
    }
    setSaving(false);
  };

  // Hapus Data Warga
  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data warga ini?')) {
      const { error } = await supabase.from('warga').delete().eq('id', id);
      if (!error) {
        fetchWarga();
      } else {
        alert('Gagal menghapus data');
      }
    }
  };

  // Kirim Pesan Tagihan WhatsApp
  const handleSendWA = (warga: Warga) => {
    const waNumber = formatWA(warga.nomor_wa);
    const pesan = `Halo Bpk/Ibu *${warga.nama_lengkap}* (Blok ${warga.blok_rumah} No. ${warga.nomor_rumah}),\n\nInformasi tagihan iuran kas RT/RW bulan ini telah tersedia. Mohon lakukan pembayaran kas secara berkala.\n\nTerima Kasih.\n*Pengurus RT 001 / RW 001*`;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(pesan)}`;
    window.open(url, '_blank');
  };

  // Filter Data Berdasarkan Pencarian
  const filteredWarga = daftarWarga.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.nama_lengkap.toLowerCase().includes(query) ||
      item.blok_rumah.toLowerCase().includes(query) ||
      item.nomor_rumah.toLowerCase().includes(query) ||
      item.no_kk.includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800">Kelola Data Warga</h2>
          <p className="text-[11px] text-slate-400">Total: {daftarWarga.length} KK Terdaftar</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah KK</span>
        </button>
      </div>

      {/* Input Pencarian */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, blok, no rumah, atau KK..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Daftar Tabel Warga */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat data warga...</span>
        </div>
      ) : filteredWarga.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Tidak ada data warga ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWarga.map((warga) => (
            <div
              key={warga.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{warga.nama_lengkap}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg">
                      <Home className="w-3 h-3" /> Blok {warga.blok_rumah} No. {warga.nomor_rumah}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg">
                      {warga.status_warga}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(warga)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(warga.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {warga.nomor_wa}
                </div>

                {/* Tombol Kirim Tagihan WhatsApp */}
                <button
                  onClick={() => handleSendWA(warga)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-xl active:scale-95 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit Data Warga */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedWarga ? 'Edit Data Warga' : 'Tambah Kepala Keluarga Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Subagja"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. Kartu Keluarga (KK) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="16 digit No KK"
                    value={formData.no_kk}
                    onChange={(e) => setFormData({ ...formData, no_kk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    NIK (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="16 digit NIK"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Blok Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: A2"
                    value={formData.blok_rumah}
                    onChange={(e) => setFormData({ ...formData, blok_rumah: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nomor Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 15"
                    value={formData.nomor_rumah}
                    onChange={(e) => setFormData({ ...formData, nomor_rumah: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nomor WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 08123456789"
                  value={formData.nomor_wa}
                  onChange={(e) => setFormData({ ...formData, nomor_wa: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Keluarga
                  </label>
                  <select
                    value={formData.status_keluarga}
                    onChange={(e) => setFormData({ ...formData, status_keluarga: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Anggota Keluarga">Anggota Keluarga</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Tempat Tinggal
                  </label>
                  <select
                    value={formData.status_warga}
                    onChange={(e) => setFormData({ ...formData, status_warga: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="Tetap">Warga Tetap</option>
                    <option value="Kontrak">Warga Kontrak</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{selectedWarga ? 'Simpan Perubahan' : 'Tambah Warga'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}