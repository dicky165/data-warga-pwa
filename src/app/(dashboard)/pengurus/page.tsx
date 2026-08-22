'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  UserPlus, 
  Users, 
  Search, 
  Trash2, 
  X, 
  Loader2, 
  Key, 
  Copy, 
  Check, 
  ShieldCheck, 
  Phone,
  Building,
  Mail,
  MapPin
} from 'lucide-react';

interface PengurusItem {
  id: string;
  nama_lengkap: string;
  role: string;
  id_desa?: number;
  rw_tugas?: string;
  no_whatsapp?: string;
  email?: string;
}

export default function DaftarPengurusPage() {
  const supabase = createClient();

  const [listPengurus, setListPengurus] = useState<PengurusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nama_lengkap: '',
    role: 'petugas',
    id_desa: 1,
    rw_tugas: '01',
    no_whatsapp: ''
  });

  const fetchPengurus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil_pengurus')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      if (data) setListPengurus(data);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPengurus();
  }, [fetchPengurus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/admin/create-pengurus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textError = await res.text();
        console.error('Server HTML Error Response:', textError);
        throw new Error(
          `Server mengembalikan format non-JSON (Status: ${res.status}).`
        );
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahkan akun pengurus/petugas');
      }

      alert(`✅ Akun berhasil dibuat!\n\nEmail: ${formData.email}\nPassword: ${formData.password}\nRole: ${formData.role.toUpperCase()}`);

      setIsModalOpen(false);
      setFormData({
        email: '',
        password: '',
        nama_lengkap: '',
        role: 'petugas',
        id_desa: 1,
        rw_tugas: '01',
        no_whatsapp: ''
      });

      fetchPengurus();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat membuat akun');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePengurus = async (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun "${nama}" secara permanen?`)) {
      try {
        const res = await fetch(`/api/admin/delete-pengurus?id=${id}`, {
          method: 'DELETE',
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || 'Gagal menghapus akun');
        }

        alert('Akun pengurus/petugas berhasil dihapus sepenuhnya.');
        fetchPengurus();
      } catch (err: any) {
        alert(err.message || 'Terjadi kesalahan saat menghapus data');
      }
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPengurus = listPengurus.filter((p) =>
    p.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.rw_tugas?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>Manajemen Akun Pengurus & Petugas</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Kelola & Buatkan Akun Login Pengurus RT/RW serta Petugas Penagih Iuran
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun</span>
        </button>
      </div>

      {/* Control Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, email, role, atau RW..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-medium"
        />
      </div>

      {/* Main List Pengurus & Petugas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat daftar akun...</span>
        </div>
      ) : filteredPengurus.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Belum ada data pengurus/petugas terdaftar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPengurus.map((pengurus) => (
            <div
              key={pengurus.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 truncate">
                    {pengurus.nama_lengkap}
                  </h3>
                  
                  {/* Badge Role Terpisah */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    pengurus.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : pengurus.role === 'petugas'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}>
                    {pengurus.role?.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  {pengurus.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {pengurus.email}
                    </span>
                  )}
                  {pengurus.rw_tugas && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      RW {pengurus.rw_tugas}
                    </span>
                  )}
                  {pengurus.id_desa && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Desa ID: {pengurus.id_desa}
                    </span>
                  )}
                  {pengurus.no_whatsapp && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {pengurus.no_whatsapp}
                    </span>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                    ID: {pengurus.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(pengurus.id, pengurus.id)}
                    className="text-slate-400 hover:text-sky-600 p-0.5 rounded"
                    title="Salin User ID"
                  >
                    {copiedId === pengurus.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeletePengurus(pengurus.id, pengurus.nama_lengkap)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="Hapus Akun"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl pb-8 sm:pb-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span>Buat Akun Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="pengurus-form" onSubmit={handleSubmit} className="space-y-3 text-xs">
              
              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso (Penagih RT 02)"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                />
              </div>

              {/* Email Login */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email Login *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: petugas.rt02@desa.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                />
              </div>

              {/* Password Login */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Password Login *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Buatkan password (min. 6 karakter)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono text-slate-800"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* ID Desa & Role */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ID Desa *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 1"
                    value={formData.id_desa}
                    onChange={(e) => setFormData({ ...formData, id_desa: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Role Akses *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="petugas">Petugas Penagih</option>
                    <option value="pengurus">Pengurus RT/RW</option>
                    <option value="admin">Admin / RW</option>
                  </select>
                </div>
              </div>

              {/* RW Tugas & No WhatsApp */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    RW Tugas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 01"
                    value={formData.rw_tugas}
                    onChange={(e) => setFormData({ ...formData, rw_tugas: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.no_whatsapp}
                    onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                  />
                </div>
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
                form="pengurus-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buat Akun</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}