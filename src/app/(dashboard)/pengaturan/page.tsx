'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings, 
  MapPin, 
  Building2, 
  Phone, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  X,
  Layers
} from 'lucide-react';

interface MasterDesa {
  id?: number;
  nama_desa: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
}

interface PengaturanUmum {
  id?: number;
  id_desa?: number;
  rw_utama: string;
  nama_kampung: string;
  alamat_sekretariat: string;
  nama_pejabat_rw: string;
  no_hp_pejabat_rw: string;
  url_ttd_pejabat_rw: string;
  nama_desa: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
}

// Interface disesuaikan persis dengan kolom database wilayah_rt_rw
interface WilayahRTRW {
  id?: number;
  id_desa?: number;
  rw: string;
  rt: string;
  nama_kampung?: string;
  nama_ketua_rt?: string;
  no_hp_ketua_rt?: string;
  url_ttd_ketua_rt?: string;
  nama_ketua_rw?: string;
  no_hp_ketua_rw?: string;
  url_ttd_ketua_rw?: string;
}

export default function PengaturanPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'umum' | 'wilayah'>('umum');
  const [loading, setLoading] = useState(true);
  const [savingUmum, setSavingUmum] = useState(false);
  const [savingWilayah, setSavingWilayah] = useState(false);
  const [uploadingTTD, setUploadingTTD] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formDataUmum, setFormDataUmum] = useState<PengaturanUmum>({
    rw_utama: '010',
    nama_kampung: '',
    alamat_sekretariat: '',
    nama_pejabat_rw: '',
    no_hp_pejabat_rw: '',
    url_ttd_pejabat_rw: '',
    nama_desa: '',
    kecamatan: '',
    kabupaten_kota: '',
    provinsi: ''
  });

  const [listWilayah, setListWilayah] = useState<WilayahRTRW[]>([]);
  const [isModalWilayahOpen, setIsModalWilayahOpen] = useState(false);
  const [modalWilayahData, setModalWilayahData] = useState<WilayahRTRW>({
    rw: '010',
    rt: '',
    nama_kampung: '',
    nama_ketua_rt: '',
    no_hp_ketua_rt: '',
    url_ttd_ketua_rt: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Pengaturan Umum & Desa
      const { data: config, error: errConfig } = await supabase
        .from('pengaturan_aplikasi')
        .select(`
          id, id_desa, rw_utama, nama_kampung, alamat_sekretariat,
          nama_pejabat, no_hp_pejabat, url_ttd_pejabat,
          master_desa ( id, nama_desa, kecamatan, kabupaten_kota, provinsi )
        `)
        .limit(1)
        .maybeSingle();

      if (errConfig) throw errConfig;

      if (config) {
        const desa = (Array.isArray(config.master_desa) ? config.master_desa[0] : config.master_desa) as MasterDesa | undefined;
        setFormDataUmum({
          id: config.id,
          id_desa: config.id_desa || desa?.id,
          rw_utama: config.rw_utama || '010',
          nama_kampung: config.nama_kampung || '',
          alamat_sekretariat: config.alamat_sekretariat || '',
          nama_pejabat_rw: config.nama_pejabat || '',
          no_hp_pejabat_rw: config.no_hp_pejabat || '',
          url_ttd_pejabat_rw: config.url_ttd_pejabat || '',
          nama_desa: desa?.nama_desa || '',
          kecamatan: desa?.kecamatan || '',
          kabupaten_kota: desa?.kabupaten_kota || '',
          provinsi: desa?.provinsi || ''
        });
      }

      // 2. Ambil Daftar Wilayah RT/RW dari database
      const { data: wilayah, error: errWilayah } = await supabase
        .from('wilayah_rt_rw')
        .select('*')
        .order('rw', { ascending: true })
        .order('rt', { ascending: true });

      if (errWilayah) throw errWilayah;
      setListWilayah(wilayah || []);

    } catch (err: any) {
      console.error('Error load settings:', err);
      setMessage({ type: 'error', text: 'Gagal memuat data pengaturan.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadTTD = async (e: React.ChangeEvent<HTMLInputElement>, isModal: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTTD(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const fileName = `ttd_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: storageData, error: storageError } = await supabase.storage
          .from('signatures')
          .upload(fileName, file, { upsert: true });

        let finalUrl = base64String;
        if (!storageError && storageData) {
          const { data: publicUrlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(fileName);
          finalUrl = publicUrlData.publicUrl;
        }

        if (isModal) {
          setModalWilayahData(prev => ({ ...prev, url_ttd_ketua_rt: finalUrl }));
        } else {
          setFormDataUmum(prev => ({ ...prev, url_ttd_pejabat_rw: finalUrl }));
        }
        setUploadingTTD(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingTTD(false);
      alert('Gagal mengunggah file tanda tangan');
    }
  };

  const handleSaveUmum = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUmum(true);
    setMessage(null);

    try {
      let currentDesaId = formDataUmum.id_desa;

      if (currentDesaId) {
        await supabase.from('master_desa').update({
          nama_desa: formDataUmum.nama_desa,
          kecamatan: formDataUmum.kecamatan,
          kabupaten_kota: formDataUmum.kabupaten_kota,
          provinsi: formDataUmum.provinsi
        }).eq('id', currentDesaId);
      } else {
        const { data: newDesa } = await supabase.from('master_desa').insert({
          nama_desa: formDataUmum.nama_desa,
          kecamatan: formDataUmum.kecamatan,
          kabupaten_kota: formDataUmum.kabupaten_kota,
          provinsi: formDataUmum.provinsi
        }).select().single();
        currentDesaId = newDesa?.id;
      }

      const payload = {
        id_desa: currentDesaId,
        rw_utama: formDataUmum.rw_utama,
        nama_kampung: formDataUmum.nama_kampung,
        alamat_sekretariat: formDataUmum.alamat_sekretariat,
        nama_pejabat: formDataUmum.nama_pejabat_rw,
        no_hp_pejabat: formDataUmum.no_hp_pejabat_rw,
        url_ttd_pejabat: formDataUmum.url_ttd_pejabat_rw,
        updated_at: new Date().toISOString()
      };

      if (formDataUmum.id) {
        await supabase.from('pengaturan_aplikasi').update(payload).eq('id', formDataUmum.id);
      } else {
        await supabase.from('pengaturan_aplikasi').insert(payload);
      }

      setMessage({ type: 'success', text: 'Pengaturan umum berhasil disimpan!' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan data' });
    } finally {
      setSavingUmum(false);
    }
  };

  const handleSaveWilayah = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWilayah(true);

    try {
      const payload = {
        rw: modalWilayahData.rw,
        rt: modalWilayahData.rt,
        nama_kampung: modalWilayahData.nama_kampung || formDataUmum.nama_kampung,
        nama_ketua_rt: modalWilayahData.nama_ketua_rt,
        no_hp_ketua_rt: modalWilayahData.no_hp_ketua_rt,
        url_ttd_ketua_rt: modalWilayahData.url_ttd_ketua_rt,
        id_desa: formDataUmum.id_desa
      };

      if (modalWilayahData.id) {
        await supabase.from('wilayah_rt_rw').update(payload).eq('id', modalWilayahData.id);
      } else {
        await supabase.from('wilayah_rt_rw').insert(payload);
      }

      setIsModalWilayahOpen(false);
      fetchData();
      setMessage({ type: 'success', text: `Data RT ${modalWilayahData.rt} / RW ${modalWilayahData.rw} berhasil disimpan!` });
    } catch (err: any) {
      alert('Gagal menyimpan RT/RW: ' + err.message);
    } finally {
      setSavingWilayah(false);
    }
  };

  const handleDeleteWilayah = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus wilayah ini?')) return;
    try {
      await supabase.from('wilayah_rt_rw').delete().eq('id', id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data wilayah');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-2">
        <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
        <span className="text-xs">Memuat data pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            Pengaturan Wilayah & Templat Surat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data wilayah Desa, RW, RT, serta Tanda Tangan Digital Pejabat penanggung jawab.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('umum')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'umum' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Umum & Desa
          </button>
          <button
            onClick={() => setActiveTab('wilayah')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'wilayah' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2. Daftar RT & RW ({listWilayah.length})
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: PENGATURAN UMUM / DESA */}
      {activeTab === 'umum' && (
        <form onSubmit={handleSaveUmum} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              Data Administrasi Umum Desa / Kecamatan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kampung / Dusun *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sukasari"
                  value={formDataUmum.nama_kampung}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, nama_kampung: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Desa / Kelurahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sukamaju"
                  value={formDataUmum.nama_desa}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, nama_desa: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kecamatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cibeunying"
                  value={formDataUmum.kecamatan}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, kecamatan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kota / Kabupaten *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kabupaten Bandung"
                  value={formDataUmum.kabupaten_kota}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, kabupaten_kota: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Provinsi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jawa Barat"
                  value={formDataUmum.provinsi}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, provinsi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RW Utama Pusat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 010"
                  value={formDataUmum.rw_utama}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, rw_utama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Sekretariat RT/RW</label>
              <input
                type="text"
                placeholder="Contoh: Jl. Sukasari No. 10 RT 01 RW 10"
                value={formDataUmum.alamat_sekretariat}
                onChange={(e) => setFormDataUmum({ ...formDataUmum, alamat_sekretariat: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-600" />
              Penanggung Jawab Utama (Ketua RW {formDataUmum.rw_utama})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ketua RW *</label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. H. Ahmad Supardi"
                  value={formDataUmum.nama_pejabat_rw}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, nama_pejabat_rw: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. HP / WhatsApp Ketua RW *</label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={formDataUmum.no_hp_pejabat_rw}
                  onChange={(e) => setFormDataUmum({ ...formDataUmum, no_hp_pejabat_rw: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanda Tangan Ketua RW (PNG Transparan)</label>
              <div className="flex items-center gap-4 pt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadTTD(e, false)}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
                {formDataUmum.url_ttd_pejabat_rw && (
                  <img src={formDataUmum.url_ttd_pejabat_rw} alt="TTD RW" className="h-10 object-contain border p-1 rounded-lg bg-white" />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingUmum}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
            >
              {savingUmum ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Pengaturan Umum</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: KELOLA MULTI RT & MULTI RW */}
      {activeTab === 'wilayah' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daftar RT & Penanggung Jawab</h2>
              <p className="text-xs text-slate-500">
                RW {formDataUmum.rw_utama} memiliki {listWilayah.length} RT. Tambahkan RT beserta nama Ketua RT dan TTD-nya.
              </p>
            </div>
            <button
              onClick={() => {
                setModalWilayahData({
                  rw: formDataUmum.rw_utama || '010',
                  rt: '',
                  nama_kampung: formDataUmum.nama_kampung || '',
                  nama_ketua_rt: '',
                  no_hp_ketua_rt: '',
                  url_ttd_ketua_rt: ''
                });
                setIsModalWilayahOpen(true);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah RT Baru
            </button>
          </div>

          {/* Grid RT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listWilayah.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-200 transition-all space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg">
                    RT {item.rt} / RW {item.rw}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setModalWilayahData(item);
                        setIsModalWilayahOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => item.id && handleDeleteWilayah(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-800">{item.nama_ketua_rt || 'Belum diisi'}</div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {item.no_hp_ketua_rt || '-'}
                  </div>
                </div>

                {item.url_ttd_ketua_rt ? (
                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> TTD Ada
                    </span>
                    <img src={item.url_ttd_ketua_rt} alt="TTD" className="h-7 max-w-[80px] object-contain" />
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-400 italic">
                    Belum ada TTD
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL EDIT / TAMBAH RT */}
      {isModalWilayahOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {modalWilayahData.id ? 'Edit RT / Pejabat' : 'Tambah RT Baru'}
              </h3>
              <button onClick={() => setIsModalWilayahOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWilayah} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor RW *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 010"
                    value={modalWilayahData.rw}
                    onChange={(e) => setModalWilayahData({ ...modalWilayahData, rw: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor RT *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 001"
                    value={modalWilayahData.rt}
                    onChange={(e) => setModalWilayahData({ ...modalWilayahData, rt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ketua RT *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Sugeng"
                  value={modalWilayahData.nama_ketua_rt || ''}
                  onChange={(e) => setModalWilayahData({ ...modalWilayahData, nama_ketua_rt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. HP / WA Ketua RT</label>
                <input
                  type="text"
                  placeholder="Contoh: 081298765432"
                  value={modalWilayahData.no_hp_ketua_rt || ''}
                  onChange={(e) => setModalWilayahData({ ...modalWilayahData, no_hp_ketua_rt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanda Tangan Digital (.PNG Transparan)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadTTD(e, true)}
                  className="w-full text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                />
                {modalWilayahData.url_ttd_ketua_rt && (
                  <div className="mt-2 p-2 bg-slate-50 border rounded-xl flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600 font-semibold">Tanda Tangan Siap</span>
                    <img src={modalWilayahData.url_ttd_ketua_rt} alt="TTD" className="h-8 object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalWilayahOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWilayah || uploadingTTD}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center gap-1"
                >
                  {savingWilayah && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan RT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}