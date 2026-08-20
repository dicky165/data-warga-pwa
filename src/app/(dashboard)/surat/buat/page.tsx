'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, Save, Loader2, User, FileText, Tag, Search, Check, ChevronDown } from 'lucide-react';

interface WargaOption {
  nik: string;
  nama_lengkap: string;
}

export default function BuatSuratPage() {
  const router = useRouter();
  const supabase = createClient();

  const [listWarga, setListWarga] = useState<WargaOption[]>([]);
  const [loadingWarga, setLoadingWarga] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Combobox Search State
  const [searchWarga, setSearchWarga] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [nikWarga, setNikWarga] = useState('');
  const [namaPemohon, setNamaPemohon] = useState('');
  const [rt, setRt] = useState('001');
  const [rw, setRw] = useState('010');
  const [jenisSurat, setJenisSurat] = useState('IJIN_KERAMAIAN');
  const [keterangan, setKeterangan] = useState('');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    fetchWarga();

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchWarga() {
    try {
      setLoadingWarga(true);
      const { data, error } = await supabase
        .from('data_warga')
        .select('nik, nama_lengkap')
        .order('nama_lengkap', { ascending: true });

      if (!error && data) {
        setListWarga(data);
      }
    } catch (err) {
      console.error('Gagal memuat data warga:', err);
    } finally {
      setLoadingWarga(false);
    }
  }

  // Filter daftar warga berdasarkan apa yang diketik
  const filteredWarga = listWarga.filter(
    (w) =>
      w.nama_lengkap.toLowerCase().includes(searchWarga.toLowerCase()) ||
      w.nik.toLowerCase().includes(searchWarga.toLowerCase())
  );

  // Fungsi saat item warga dipilih dari dropdown
  const handleSelectWarga = (warga: WargaOption) => {
    setNikWarga(warga.nik);
    setNamaPemohon(warga.nama_lengkap);
    setSearchWarga(`${warga.nama_lengkap} (${warga.nik})`);
    setIsOpenDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nikWarga || !namaPemohon || !keterangan) {
      setErrorMsg('Mohon lengkapi seluruh kolom bertanda bintang (*)');
      return;
    }

    try {
      setSubmitting(true);

      // Generate string unik untuk placeholder no_surat agar tidak melanggar UNIQUE constraint
      const uniquePendingNo = `PENDING-${nikWarga}-${Date.now()}`;

      const payload = {
        no_urut: 0,
        no_surat: uniquePendingNo, // 👈 Dibuat unik menggunakan NIK + Timestamp
        nik_warga: nikWarga,
        jenis_surat: jenisSurat,
        keterangan: keterangan,
        tanggal_surat: new Date().toISOString().split('T')[0],
        status: 'pending',
        detail_tambahan: {
          nama_pemohon: namaPemohon,
          catatan: catatan,
          rt: rt,
          rw: rw,
        },
      };

      const { error } = await supabase
        .from('surat_pengantar')
        .insert([payload]);

      if (error) throw error;

      // Kembali ke halaman daftar surat untuk Approve
      router.push('/surat');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan surat pengantar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <h1 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-sky-600" />
          Buat Surat Pengantar
        </h1>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Searchable Combobox Pilih Warga */}
        <div className="relative" ref={dropdownRef}>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-sky-600" />
            Cari / Pilih Warga
          </label>
          
          <div className="relative">
            <input
              type="text"
              placeholder={loadingWarga ? 'Memuat data warga...' : 'Ketik Nama atau NIK warga...'}
              value={searchWarga}
              disabled={loadingWarga}
              onFocus={() => setIsOpenDropdown(true)}
              onChange={(e) => {
                setSearchWarga(e.target.value);
                setIsOpenDropdown(true);
              }}
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <ChevronDown 
              className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${isOpenDropdown ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* List Option Dropdown */}
          {isOpenDropdown && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
              {filteredWarga.length === 0 ? (
                <div className="p-3 text-[11px] text-slate-400 text-center">
                  Warga tidak ditemukan
                </div>
              ) : (
                filteredWarga.map((w) => (
                  <button
                    key={w.nik}
                    type="button"
                    onClick={() => handleSelectWarga(w)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{w.nama_lengkap}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIK: {w.nik}</div>
                    </div>
                    {nikWarga === w.nik && <Check className="w-3.5 h-3.5 text-sky-600" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Nama Lengkap Pemohon */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
            Nama Pemohon <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Masukkan nama pemohon..."
            value={namaPemohon}
            onChange={(e) => setNamaPemohon(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            required
          />
        </div>

        {/* NIK Warga */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
            NIK Warga <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="320545..."
            value={nikWarga}
            onChange={(e) => setNikWarga(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            required
          />
        </div>

        {/* Jenis Surat */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-sky-600" />
            Jenis Surat <span className="text-rose-500">*</span>
          </label>
          <select
            value={jenisSurat}
            onChange={(e) => setJenisSurat(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="IJIN_KERAMAIAN">IJIN KERAMAIAN</option>
            <option value="DOMISILI">SURAT KETERANGAN DOMISILI</option>
            <option value="SKCK">SURAT PENGANTAR SKCK</option>
            <option value="SKTM">SURAT KETERANGAN MISKIN (SKTM)</option>
            <option value="USAHA">SURAT KETERANGAN USAHA</option>
            <option value="KETERANGAN_UMUM">SURAT KETERANGAN UMUM</option>
            <option value="PENGANTAR_UMUM">SURAT PENGANTAR UMUM</option>
            <option value="KETERANGAN_UMKM">SURAT KETERANGAN UMKM</option>
            <option value="PINDAH_DOMISILI">SURAT PINDAH DOMISILI</option>
            <option value="PINDAH">SURAT PINDAH</option>
            <option value="KEMATIAN">SURAT KETERANGAN KEMATIAN</option>
          </select>
        </div>

        {/* RT / RW */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">RT</label>
            <input
              type="text"
              value={rt}
              onChange={(e) => setRt(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">RW</label>
            <input
              type="text"
              value={rw}
              onChange={(e) => setRw(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Keperluan / Maksud */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            Keperluan / Maksud <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="Misal: Pernikahan / Acara Khitanan..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            required
          />
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            placeholder="Misal: Acara dangdutan sampai malam hari..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan Pengajuan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Pengajuan Surat
            </>
          )}
        </button>
      </form>
    </div>
  );
}