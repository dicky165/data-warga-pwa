'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  AlertTriangle, 
  Search, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  MapPin, 
  User, 
  Phone, 
  Image as ImageIcon,
  MessageSquare,
  X
} from 'lucide-react';

interface LaporanItem {
  id: number;
  created_at: string;
  nama_pelapor: string;
  no_hp_pelapor: string;
  role_pelapor: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi_detail: string;
  foto_url: string;
  status: 'PENDING' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  catatan_pengurus: string;
}

export default function DashboardLaporanPage() {
  const supabase = createClient();

  const [listLaporan, setListLaporan] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [selectedLaporan, setSelectedLaporan] = useState<LaporanItem | null>(null);
  const [statusForm, setStatusForm] = useState<'PENDING' | 'DIPROSES' | 'SELESAI' | 'DITOLAK'>('DIPROSES');
  const [catatanForm, setCatatanForm] = useState('');

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('laporan_kejadian')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setListLaporan(data as LaporanItem[]);
    } catch (err: any) {
      console.error('Error fetching laporan:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
  }, []);

  const handleOpenModal = (item: LaporanItem) => {
    setSelectedLaporan(item);
    setStatusForm(item.status);
    setCatatanForm(item.catatan_pengurus || '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLaporan) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('laporan_kejadian')
        .update({
          status: statusForm,
          catatan_pengurus: catatanForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLaporan.id);

      if (error) throw error;

      setSelectedLaporan(null);
      fetchLaporan();
    } catch (err: any) {
      alert(`Gagal memperbarui laporan: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const filteredList = listLaporan.filter((item) => {
    const matchSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nama_pelapor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lokasi_detail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-[10px] border border-amber-200"><Clock className="w-3 h-3" /> Menunggu</span>;
      case 'DIPROSES':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 font-bold rounded-lg text-[10px] border border-sky-200"><RefreshCw className="w-3 h-3 animate-spin" /> Diproses</span>;
      case 'SELESAI':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Selesai</span>;
      case 'DITOLAK':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-200"><XCircle className="w-3 h-3" /> Ditolak</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Manajemen Laporan Kejadian</h2>
          <p className="text-[11px] text-slate-400">Pantau & tindak lanjuti aduan warga dan petugas</p>
        </div>
        <button
          onClick={fetchLaporan}
          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all text-xs flex items-center gap-1 font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul, nama pelapor, lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-medium"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-semibold text-slate-700"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">Menunggu (Pending)</option>
          <option value="DIPROSES">Sedang Diproses</option>
          <option value="SELESAI">Selesai</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
      </div>

      {/* List Laporan */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat data laporan...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Tidak ada laporan yang ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredList.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    {item.kategori}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">{item.judul}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.deskripsi}</p>
                </div>

                {item.foto_url && (
                  <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                    <img src={item.foto_url} alt={item.judul} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-medium text-slate-700 truncate">{item.lokasi_detail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-sky-500" /> {item.nama_pelapor} ({item.role_pelapor})
                    </span>
                    {item.no_hp_pelapor && (
                      <a href={`https://wa.me/${item.no_hp_pelapor}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 font-bold hover:underline">
                        <Phone className="w-3 h-3" /> WA
                      </a>
                    )}
                  </div>
                </div>

                {item.catatan_pengurus && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 block">Catatan Pengurus:</span>
                    {item.catatan_pengurus}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenModal(item)}
                className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl transition-all border border-sky-200/60"
              >
                Tindak Lanjut / Ubah Status
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tindak Lanjut */}
      {selectedLaporan && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Tindak Lanjut Laporan</h3>
              <button onClick={() => setSelectedLaporan(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Laporan</label>
                <select
                  value={statusForm}
                  onChange={(e) => setStatusForm(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="PENDING">Menunggu (Pending)</option>
                  <option value="DIPROSES">Sedang Diproses</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="DITOLAK">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Catatan Pengurus / Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Sudah dikoordinasikan ke petugas kebersihan untuk ditangani sore ini."
                  value={catatanForm}
                  onChange={(e) => setCatatanForm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLaporan(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="w-1/2 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 flex items-center justify-center gap-1"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}