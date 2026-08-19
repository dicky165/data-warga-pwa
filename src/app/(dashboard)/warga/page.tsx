'use client';

export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Loader2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  Briefcase,
  Heart,
  Droplet,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Crown,
  FileCheck
} from 'lucide-react';

// Import Modal Buat Surat yang baru dibuat
import ModalBuatSurat from '@/components/surat/ModalBuatSurat';

interface WilayahItem {
  id: number;
  nama_kampung: string;
  rw: string;
  rt: string;
  nama_ketua_rt?: string;
  no_hp_ketua_rt?: string;
  url_ttd_ketua_rt?: string;
  nama_ketua_rw?: string;
  no_hp_ketua_rw?: string;
  url_ttd_ketua_rw?: string;
}

interface AnggotaWarga {
  nik: string;
  nama_lengkap: string;
  nama_panggilan?: string;
  no_whatsapp: string;
  is_active: boolean;
  shdk?: string;
  status_hubungan?: string;
  is_kepala?: boolean;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  agama?: string;
  status_perkawinan?: string;
  pekerjaan?: string;
  golongan_darah?: string;
  status_warga?: 'AKTIF' | 'MENINGGAL' | 'PINDAH';
  tanggal_wafat?: string;
  penyebab_wafat?: string;
  status_pekerjaan?: 'BEKERJA' | 'TIDAK_BEKERJA' | 'MENCARI_KERJA';
  status_ekonomi?: 'MAMPU' | 'TIDAK_MAMPU';
  kelas_iuran?: string;
  created_at?: string;
}

interface GroupKartuKeluarga {
  no_kk: string;
  alamat?: string;
  id_wilayah?: number;
  kelas_iuran: string;
  is_wajib_ronda?: boolean;
  nama_kampung?: string;
  rt?: string;
  rw?: string;
  nama_ketua_rt?: string;
  no_hp_ketua_rt?: string;
  url_ttd_ketua_rt?: string;
  nama_ketua_rw?: string;
  no_hp_ketua_rw?: string;
  url_ttd_ketua_rw?: string;
  anggota: AnggotaWarga[];
  wilayah_rt_rw?: {
    master_desa?: {
      nama_desa?: string;
    };
  };
}

const SHDK_OPTIONS = [
  'Kepala Keluarga',
  'Suami',
  'Istri',
  'Anak',
  'Menantu',
  'Cucu',
  'Orang Tua',
  'Mertua',
  'Famili Lain',
  'Lainnya'
];

const PILIHAN_IURAN_OPTIONS = ['A', 'B', 'C'];

const hitungUmur = (tanggalLahirStr?: string): number | null => {
  if (!tanggalLahirStr) return null;
  const birthDate = new Date(tanggalLahirStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
};

export default function WargaPage() {
  const supabase = createClient();
  
  const [listGroupKK, setListGroupKK] = useState<GroupKartuKeluarga[]>([]);
  const [listWilayah, setListWilayah] = useState<WilayahItem[]>([]);
  const [pengaturanAplikasi, setPengaturanAplikasi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterRT, setSelectedFilterRT] = useState<string>('ALL');
  const [expandedKK, setExpandedKK] = useState<{ [no_kk: string]: boolean }>({});
  
  // State Modal Tambah/Edit Warga
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNik, setSelectedNik] = useState<string | null>(null);

  // State Modal Surat Pengantar Terpisah Baru
  const [isModalSuratOpen, setIsModalSuratOpen] = useState(false);
  const [selectedWargaSurat, setSelectedWargaSurat] = useState<{ warga: AnggotaWarga; group: GroupKartuKeluarga } | null>(null);

  const [formData, setFormData] = useState({
    nik: '',
    no_kk: '',
    nama_lengkap: '',
    nama_panggilan: '',
    shdk: 'Kepala Keluarga',
    kelas_iuran: 'A',
    is_wajib_ronda: false,
    no_whatsapp: '',
    id_wilayah: '',
    alamat: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    agama: '',
    status_perkawinan: '',
    pekerjaan: '',
    golongan_darah: '',
    status_warga: 'AKTIF',
    tanggal_wafat: '',
    penyebab_wafat: '',
    status_pekerjaan: 'BEKERJA',
    status_ekonomi: 'MAMPU'
  });

  const fetchPengaturan = async () => {
    const { data } = await supabase
      .from('pengaturan_aplikasi')
      .select('*')
      .maybeSingle();

    if (data) {
      setPengaturanAplikasi(data);
    }
  };

  const fetchWilayah = async () => {
    const { data, error } = await supabase
      .from('wilayah_rt_rw')
      .select('*')
      .order('rw', { ascending: true })
      .order('rt', { ascending: true });

    if (error) {
      console.error('Error fetching wilayah:', error.message || error);
    } else if (data) {
      setListWilayah(data as WilayahItem[]);
    }
  };

  const isKepalaCheck = (w: AnggotaWarga): boolean => {
    const s = (w.shdk || w.status_hubungan || '').toLowerCase().trim();
    return s === 'kepala keluarga' || s === 'kepala' || s === 'kepala rumah tangga' || w.is_kepala === true;
  };

  const fetchWarga = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('kartu_keluarga')
      .select(`
        no_kk,
        alamat,
        id_wilayah,
        kelas_iuran,
        is_wajib_ronda,
        wilayah_rt_rw (
          *,
          master_desa ( * )
        ),
        data_warga ( * )
      `);

    if (error) {
      console.error('Error fetching data warga:', error.message || error);
    }

    if (!error && data) {
      const getShdkPriority = (warga: AnggotaWarga): number => {
        const shdk = (warga.shdk || warga.status_hubungan || '').toLowerCase().trim();
        const isKepala = isKepalaCheck(warga);

        if (isKepala) return 1;
        if (shdk.includes('istri')) return 2;
        if (shdk.includes('anak')) return 3;
        return 4;
      };

      const mappedGroups: GroupKartuKeluarga[] = data.map((kk: any) => {
        const wil = Array.isArray(kk.wilayah_rt_rw) ? kk.wilayah_rt_rw[0] : kk.wilayah_rt_rw;
        const rawAnggota = (kk.data_warga || []) as AnggotaWarga[];

        const sortedAnggota = [...rawAnggota].sort((a, b) => {
          const priorityA = getShdkPriority(a);
          const priorityB = getShdkPriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          if (priorityA === 3) {
            const timeA = a.tanggal_lahir ? new Date(a.tanggal_lahir).getTime() : 0;
            const timeB = b.tanggal_lahir ? new Date(b.tanggal_lahir).getTime() : 0;

            if (timeA && timeB) {
              return timeA - timeB;
            }
            if (timeA && !timeB) return -1;
            if (!timeA && timeB) return 1;
          }

          return a.nama_lengkap.localeCompare(b.nama_lengkap, 'id', { sensitivity: 'base' });
        });

        const anggotaList: AnggotaWarga[] = sortedAnggota.map((w: any) => ({
          nik: w.nik,
          nama_lengkap: w.nama_lengkap,
          nama_panggilan: w.nama_panggilan || '',
          shdk: w.shdk || w.status_hubungan || 'Anggota',
          status_hubungan: w.status_hubungan,
          is_kepala: w.is_kepala,
          no_whatsapp: w.no_whatsapp || '',
          is_active: w.is_active ?? true,
          tempat_lahir: w.tempat_lahir || '',
          tanggal_lahir: w.tanggal_lahir || '',
          agama: w.agama || '',
          status_perkawinan: w.status_perkawinan || '',
          pekerjaan: w.pekerjaan || '',
          golongan_darah: w.golongan_darah || '',
          status_warga: w.status_warga || 'AKTIF',
          tanggal_wafat: w.tanggal_wafat || '',
          penyebab_wafat: w.penyebab_wafat || '',
          status_pekerjaan: w.status_pekerjaan || 'BEKERJA',
          status_ekonomi: w.status_ekonomi || 'MAMPU',
          created_at: w.created_at
        }));

        return {
          no_kk: kk.no_kk,
          alamat: kk.alamat || '',
          id_wilayah: kk.id_wilayah,
          kelas_iuran: kk.kelas_iuran || 'A',
          nama_kampung: wil?.nama_kampung || '',
          is_wajib_ronda: kk.is_wajib_ronda ?? false,
          rt: wil?.rt || '',
          rw: wil?.rw || '',
          nama_ketua_rt: wil?.nama_ketua_rt || '',
          no_hp_ketua_rt: wil?.no_hp_ketua_rt || '',
          url_ttd_ketua_rt: wil?.url_ttd_ketua_rt || '',
          nama_ketua_rw: wil?.nama_ketua_rw || '',
          url_ttd_ketua_rw: wil?.url_ttd_ketua_rw || '',
          wilayah_rt_rw: wil,
          anggota: anggotaList
        };
      });

      mappedGroups.sort((groupA, groupB) => {
        const kepalaA = groupA.anggota.find(w => isKepalaCheck(w)) || groupA.anggota[0];
        const kepalaB = groupB.anggota.find(w => isKepalaCheck(w)) || groupB.anggota[0];

        const namaKepalaA = kepalaA?.nama_lengkap || '';
        const namaKepalaB = kepalaB?.nama_lengkap || '';

        return namaKepalaA.localeCompare(namaKepalaB, 'id', { sensitivity: 'base' });
      });

      setListGroupKK(mappedGroups);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPengaturan();
    fetchWilayah();
    fetchWarga();
  }, []);

  const toggleExpand = (no_kk: string) => {
    setExpandedKK(prev => ({ ...prev, [no_kk]: !prev[no_kk] }));
  };

  const formatWA = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleOpenModal = (defaultNoKK: string = '', wargaEdit?: AnggotaWarga, groupKK?: GroupKartuKeluarga) => {
    if (wargaEdit && groupKK) {
      setSelectedNik(wargaEdit.nik);
      setFormData({
        nik: wargaEdit.nik,
        no_kk: groupKK.no_kk,
        nama_lengkap: wargaEdit.nama_lengkap,
        nama_panggilan: wargaEdit.nama_panggilan || '',
        shdk: wargaEdit.shdk || 'Anggota',
        is_wajib_ronda: groupKK?.is_wajib_ronda ?? false,
        kelas_iuran: wargaEdit.kelas_iuran || groupKK.kelas_iuran || 'A',
        no_whatsapp: wargaEdit.no_whatsapp,
        id_wilayah: groupKK.id_wilayah ? String(groupKK.id_wilayah) : '',
        alamat: groupKK.alamat || '',
        tempat_lahir: wargaEdit.tempat_lahir || '',
        tanggal_lahir: wargaEdit.tanggal_lahir || '',
        agama: wargaEdit.agama || '',
        status_perkawinan: wargaEdit.status_perkawinan || '',
        pekerjaan: wargaEdit.pekerjaan || '',
        golongan_darah: wargaEdit.golongan_darah || '',
        status_warga: wargaEdit.status_warga || 'AKTIF',
        tanggal_wafat: wargaEdit.tanggal_wafat || '',
        penyebab_wafat: wargaEdit.penyebab_wafat || '',
        status_pekerjaan: wargaEdit.status_pekerjaan || 'BEKERJA',
        status_ekonomi: wargaEdit.status_ekonomi || 'MAMPU'
      });
    } else {
      setSelectedNik(null);
      const isKKFirstMember = !defaultNoKK;
      setFormData({
        nik: '',
        no_kk: defaultNoKK,
        nama_lengkap: '',
        nama_panggilan: '',
        shdk: isKKFirstMember ? 'Kepala Keluarga' : 'Anak',
        kelas_iuran: groupKK?.kelas_iuran || 'A',
        is_wajib_ronda: groupKK?.is_wajib_ronda ?? false,
        no_whatsapp: '',
        id_wilayah: groupKK?.id_wilayah ? String(groupKK.id_wilayah) : (listWilayah.length > 0 ? String(listWilayah[0].id) : ''),
        alamat: groupKK?.alamat || '',
        tempat_lahir: '',
        tanggal_lahir: '',
        agama: '',
        status_perkawinan: '',
        pekerjaan: '',
        golongan_darah: '',
        status_warga: 'AKTIF',
        tanggal_wafat: '',
        penyebab_wafat: '',
        status_pekerjaan: 'BEKERJA',
        status_ekonomi: 'MAMPU'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedIdWilayah = formData.id_wilayah ? parseInt(formData.id_wilayah) : null;

      if (!formData.nik || !formData.no_kk) {
        alert('NIK dan No. KK wajib diisi!');
        setSaving(false);
        return;
      }

      const { error: errKK } = await supabase
        .from('kartu_keluarga')
        .upsert({
          no_kk: formData.no_kk,
          id_wilayah: selectedIdWilayah,
          alamat: formData.alamat || '',
          kelas_iuran: formData.kelas_iuran,
          is_wajib_ronda: formData.is_wajib_ronda
        }, { onConflict: 'no_kk' });

      if (errKK) throw new Error(`Gagal simpan KK: ${errKK.message}`);

      const payloadWarga: any = {
        nik: formData.nik,
        no_kk: formData.no_kk,
        nama_lengkap: formData.nama_lengkap,
        nama_panggilan: formData.nama_panggilan || null,
        shdk: formData.shdk,
        kelas_iuran: formData.kelas_iuran,
        no_whatsapp: formData.no_whatsapp || '',
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        agama: formData.agama || null,
        status_perkawinan: formData.status_perkawinan || null,
        pekerjaan: formData.pekerjaan || null,
        golongan_darah: formData.golongan_darah || null,
        status_warga: formData.status_warga,
        tanggal_wafat: formData.status_warga === 'MENINGGAL' ? formData.tanggal_wafat || null : null,
        penyebab_wafat: formData.status_warga === 'MENINGGAL' ? formData.penyebab_wafat || null : null,
        status_pekerjaan: formData.status_pekerjaan,
        status_ekonomi: formData.status_ekonomi,
        is_active: formData.status_warga === 'AKTIF'
      };

      const { error: errWarga } = await supabase
        .from('data_warga')
        .upsert(payloadWarga, { onConflict: 'nik' });

      if (errWarga) throw new Error(`Gagal simpan Warga: ${errWarga.message}`);

      setIsModalOpen(false);
      fetchWarga();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnggota = async (nik: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus anggota keluarga ini?')) {
      const { error } = await supabase.from('data_warga').delete().eq('nik', nik);
      if (!error) {
        fetchWarga();
      } else {
        alert('Gagal menghapus anggota warga');
      }
    }
  };

  const handleSendWA = (nama: string, phone: string) => {
    if (!phone) {
      alert('Nomor WhatsApp belum diisi');
      return;
    }
    const waNumber = formatWA(phone);
    const pesan = `Halo Bpk/Ibu *${nama}*,\n\nInformasi RT/RW telah diperbarui. Mohon cek aplikasi dashboard warga.\n\nTerima Kasih.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  // DIPINDAHKAN & DIMODIFIKASI: Mengarahkan pembuatan surat ke ModalBuatSurat yang baru
  const handleOpenModalSurat = (warga: AnggotaWarga, group: GroupKartuKeluarga) => {
    setSelectedWargaSurat({ warga, group });
    setIsModalSuratOpen(true);
  };

  const filteredGroups = listGroupKK.filter((group) => {
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = 
      group.no_kk.includes(query) ||
      (group.alamat && group.alamat.toLowerCase().includes(query)) ||
      group.anggota.some(
        (w) =>
          w.nama_lengkap.toLowerCase().includes(query) ||
          (w.nama_panggilan && w.nama_panggilan.toLowerCase().includes(query)) ||
          w.nik.includes(query) ||
          (w.pekerjaan && w.pekerjaan.toLowerCase().includes(query))
      );

    const matchesRT = selectedFilterRT === 'ALL' || group.rt === selectedFilterRT;

    return matchesSearch && matchesRT;
  });

  const totalAnggotaTerdaftar = listGroupKK.reduce((acc, curr) => acc + curr.anggota.length, 0);

  const handleExportExcel = () => {
    const exportData: any[] = [];
    filteredGroups.forEach((group) => {
      group.anggota.forEach((warga) => {
        const u = hitungUmur(warga.tanggal_lahir);
        exportData.push({
          'No. KK': group.no_kk,
          'Pilihan Iuran KK': `Pilihan ${warga.kelas_iuran || group.kelas_iuran || 'A'}`,
          'Nama Lengkap': warga.nama_lengkap,
          'Nama Panggilan/Alias': warga.nama_panggilan || '',
          'SHDK': warga.shdk || 'Anggota',
          'NIK': warga.nik,
          'Status Warga': warga.status_warga,
          'Status Pekerjaan': warga.status_pekerjaan,
          'Status Ekonomi': warga.status_ekonomi,
          'Tempat Lahir': warga.tempat_lahir || '',
          'Tanggal Lahir': warga.tanggal_lahir || '',
          'Usia (Tahun)': u !== null ? u : '',
          'No. WhatsApp': warga.no_whatsapp || '',
          'RT': group.rt || '',
          'RW': group.rw || '',
          'Kampung': group.nama_kampung || '',
          'Alamat': group.alamat || ''
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Warga');
    XLSX.writeFile(workbook, `Data_Warga_RT_RW_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    
    doc.setFontSize(14);
    doc.text('KARTU DATA WARGA / REKAPITULASI KELUARGA', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total: ${filteredGroups.length} KK (${totalAnggotaTerdaftar} Jiwa)`, 14, 21);

    const tableColumns = [
      'No. KK',
      'Pilihan Iuran',
      'Nama Lengkap (Alias)',
      'SHDK',
      'NIK',
      'Status',
      'Pekerjaan',
      'Ekonomi',
      'Tempat, Tgl Lahir',
      'Usia',
      'RT/RW',
      'Alamat'
    ];

    const tableRows: any[] = [];

    filteredGroups.forEach((group) => {
      group.anggota.forEach((warga, idx) => {
        const u = hitungUmur(warga.tanggal_lahir);
        const ttl = `${warga.tempat_lahir ? warga.tempat_lahir + ', ' : ''}${warga.tanggal_lahir || '-'}`;
        const rtrw = `RT ${group.rt || '-'}/RW ${group.rw || '-'}`;
        const namaDisplay = warga.nama_panggilan 
          ? `${warga.nama_lengkap} (${warga.nama_panggilan})` 
          : warga.nama_lengkap;

        tableRows.push([
          idx === 0 ? group.no_kk : '',
          idx === 0 ? `Pilihan ${group.kelas_iuran || 'A'}` : '',
          namaDisplay,
          warga.shdk || 'Anggota',
          warga.nik,
          warga.status_warga,
          warga.status_pekerjaan,
          warga.status_ekonomi,
          ttl,
          u !== null ? `${u} th` : '-',
          rtrw,
          group.alamat || '-'
        ]);
      });
    });

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Data_Warga_RT_RW_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            Data Penduduk & Kartu Keluarga
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data Kartu Keluarga, anggota warga, pilihan tarif iuran KK, hingga cetak surat pengantar RT/RW
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah KK / Warga</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan Nama, Nama Panggilan, NIK, No. KK, atau Alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedFilterRT}
            onChange={(e) => setSelectedFilterRT(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
          >
            <option value="ALL">Semua Wilayah RT</option>
            {listWilayah.map((wil) => (
              <option key={wil.id} value={wil.rt}>
                RT {wil.rt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Group List KK */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat data warga...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Tidak ada data Kartu Keluarga ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedKK[group.no_kk] ?? false;
            const kepalaWarga = group.anggota.find(w => isKepalaCheck(w)) || group.anggota[0];
            const kepalaKeluarga = kepalaWarga
              ? (kepalaWarga.nama_panggilan 
                  ? `${kepalaWarga.nama_lengkap} (${kepalaWarga.nama_panggilan})` 
                  : kepalaWarga.nama_lengkap)
              : 'Kepala Keluarga Belum Diisi';

            return (
              <div 
                key={group.no_kk}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Header KK Card */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                        KK: {group.no_kk}
                      </span>
                      
                      <span className="text-xs font-bold text-slate-800">
                        {kepalaKeluarga}
                      </span>

                      {/* Badge Pilihan Tarif Iuran KK */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        group.kelas_iuran === 'A' ? 'text-purple-800 bg-purple-100 border-purple-300' :
                        group.kelas_iuran === 'B' ? 'text-blue-800 bg-blue-100 border-blue-300' :
                        'text-slate-700 bg-slate-100 border-slate-200'
                      }`}>
                        {group.kelas_iuran === 'A' && <Crown className="w-3 h-3 text-amber-600" />}
                        Pilihan {group.kelas_iuran || 'A'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        group.is_wajib_ronda !== false
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          : 'text-amber-800 bg-amber-50 border-amber-200'
                      }`}>
                        {group.is_wajib_ronda !== false ? 'Wajib Ronda' : 'Bebas Ronda'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        RT {group.rt || '-'}/RW {group.rw || '-'} ({group.nama_kampung || '-'})
                      </span>
                      {group.alamat && (
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3 text-slate-400" />
                          {group.alamat}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(group.no_kk, undefined, group)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3 text-sky-600" />
                      <span>Tambah Anggota</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(group.no_kk)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Anggota List */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {group.anggota.map((warga) => {
                      const isKepala = isKepalaCheck(warga);
                      const umur = hitungUmur(warga.tanggal_lahir);

                      return (
                        <div 
                          key={warga.nik} 
                          className={`p-3 sm:p-4 hover:bg-slate-50/50 transition-colors space-y-2 ${
                            warga.status_warga === 'MENINGGAL' ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-800">
                                {warga.nama_lengkap}
                              </span>

                              {/* Badge Nama Panggilan/Alias */}
                              {warga.nama_panggilan && (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  "{warga.nama_panggilan}"
                                </span>
                              )}

                              {/* SHDK */}
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                                isKepala 
                                  ? 'text-amber-800 bg-amber-100 border-amber-300' 
                                  : 'text-sky-800 bg-sky-50 border-sky-200'
                              }`}>
                                {warga.shdk || (isKepala ? 'Kepala Keluarga' : 'Anggota')}
                              </span>

                              {/* Badge Status Warga */}
                              {warga.status_warga === 'MENINGGAL' ? (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded-md">
                                  WAFAT
                                </span>
                              ) : warga.status_warga === 'PINDAH' ? (
                                <span className="text-[9px] font-bold text-slate-600 bg-slate-200 border border-slate-300 px-1.5 py-0.2 rounded-md">
                                  PINDAH
                                </span>
                              ) : null}

                              {/* Badge Pekerjaan & Ekonomi */}
                              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md ${
                                warga.status_pekerjaan === 'BEKERJA' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {warga.status_pekerjaan || 'BEKERJA'}
                              </span>

                              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded-md ${
                                warga.status_ekonomi === 'MAMPU' 
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {warga.status_ekonomi || 'MAMPU'}
                              </span>
                            </div>

                            {/* Actions Buttons / Surat Menyurat Menu */}
                            <div className="flex items-center gap-1.5">
                              {/* MODIFIKASI: Tombol Pindah Jalur ke Modal Buat Surat */}
                              <button
                                onClick={() => handleOpenModalSurat(warga, group)}
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title="Buat & Cetak Surat Pengantar RT/RW"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-sky-600" />
                                <span>Buat Surat</span>
                              </button>

                              <button
                                onClick={() => handleOpenModal(group.no_kk, warga, group)}
                                className="p-1 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit Anggota Warga"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteAnggota(warga.nik)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Hapus Anggota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {warga.no_whatsapp && (
                                <button
                                  onClick={() => handleSendWA(warga.nama_lengkap, warga.no_whatsapp)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                  title="Kirim WA"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {(warga.tempat_lahir || warga.tanggal_lahir || warga.pekerjaan || warga.agama || warga.status_perkawinan || warga.no_whatsapp) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              {(warga.tempat_lahir || warga.tanggal_lahir) && (
                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {warga.tempat_lahir ? `${warga.tempat_lahir}, ` : ''}
                                  {warga.tanggal_lahir || '-'}
                                  {umur !== null && (
                                    <span className="ml-0.5 bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded-md text-[9px]">
                                      ({umur} thn)
                                    </span>
                                  )}
                                </span>
                              )}

                              {warga.pekerjaan && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-3 h-3 text-slate-400" />
                                  {warga.pekerjaan}
                                </span>
                              )}

                              {warga.agama && (
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-slate-400" />
                                  {warga.agama}
                                </span>
                              )}

                              {warga.golongan_darah && (
                                <span className="flex items-center gap-1">
                                  <Droplet className="w-3 h-3 text-rose-400" />
                                  Gol. Darah {warga.golongan_darah}
                                </span>
                              )}

                              {warga.no_whatsapp && (
                                <span className="flex items-center gap-1 font-mono text-slate-600">
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  {warga.no_whatsapp}
                                </span>
                              )}

                              <span className="font-mono text-slate-400">
                                NIK: {warga.nik}
                              </span>
                            </div>
                          )}

                          {warga.status_warga === 'MENINGGAL' && (
                            <div className="mt-1 p-2 bg-rose-50 rounded-xl border border-rose-100 text-[10px] text-rose-800 flex items-center justify-between">
                              <span>
                                <strong>Tgl Wafat:</strong> {warga.tanggal_wafat || '-'}
                              </span>
                              <span>
                                <strong>Penyebab:</strong> {warga.penyebab_wafat || '-'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit Warga */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                {selectedNik ? 'Edit Data Anggota Warga' : formData.no_kk ? 'Tambah Anggota Keluarga' : 'Tambah Kartu Keluarga & Warga'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="warga-form" onSubmit={handleSubmit} className="space-y-3 py-3 overflow-y-auto flex-1 text-xs pr-1">
              
              {/* SHDK & Pilihan Tarif Iuran KK */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Hubungan Keluarga (SHDK) *
                  </label>
                  <select
                    required
                    value={formData.shdk}
                    onChange={(e) => setFormData({ ...formData, shdk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium text-slate-800 cursor-pointer"
                  >
                    {SHDK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pilihan Tarif Iuran KK *
                  </label>
                  <select
                    required
                    value={formData.kelas_iuran}
                    onChange={(e) => setFormData({ ...formData, kelas_iuran: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-bold text-purple-700 cursor-pointer"
                  >
                    {PILIHAN_IURAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>Pilihan {opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NIK & No KK */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    NIK Anggota (16 Digit) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedNik}
                    placeholder="16 Digit NIK"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    No. KK Induk (16 Digit) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="16 Digit No. KK"
                    value={formData.no_kk}
                    onChange={(e) => setFormData({ ...formData, no_kk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Nama Lengkap & Nama Panggilan / Alias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Sesuai KTP/KK"
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Panggilan / Alias <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Boni / Pak De"
                    value={formData.nama_panggilan}
                    onChange={(e) => setFormData({ ...formData, nama_panggilan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-amber-900 bg-amber-50/40"
                  />
                </div>
              </div>

              {/* Status Warga */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Status Keberadaan Warga *
                </label>
                <select
                  value={formData.status_warga}
                  onChange={(e) => setFormData({ ...formData, status_warga: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="AKTIF">AKTIF (Masih Hidup & Tinggal di Wilayah)</option>
                  <option value="MENINGGAL">MENINGGAL (Meninggal Dunia)</option>
                  <option value="PINDAH">PINDAH (Pindah Domisili)</option>
                </select>
              </div>

              {/* Detail Kematian */}
              {formData.status_warga === 'MENINGGAL' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Informasi Kematian Warga
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-rose-700 mb-1">
                        Tanggal Meninggal
                      </label>
                      <input
                        type="date"
                        value={formData.tanggal_wafat}
                        onChange={(e) => setFormData({ ...formData, tanggal_wafat: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-rose-700 mb-1">
                        Penyebab Meninggal
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sakit Tua / Lanjut Usia"
                        value={formData.penyebab_wafat}
                        onChange={(e) => setFormData({ ...formData, penyebab_wafat: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tempat & Tanggal Lahir */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tempat Lahir <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bandung"
                    value={formData.tempat_lahir}
                    onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tanggal Lahir <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Perkawinan & Agama */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Perkawinan
                  </label>
                  <select
                    value={formData.status_perkawinan}
                    onChange={(e) => setFormData({ ...formData, status_perkawinan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Agama
                  </label>
                  <select
                    value={formData.agama}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Agama --</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              </div>

              {/* Status Pekerjaan & Pekerjaan Detail */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kategori Pekerjaan
                  </label>
                  <select
                    value={formData.status_pekerjaan}
                    onChange={(e) => setFormData({ ...formData, status_pekerjaan: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold cursor-pointer"
                  >
                    <option value="BEKERJA">BEKERJA</option>
                    <option value="TIDAK_BEKERJA">TIDAK BEKERJA</option>
                    <option value="MENCARI_KERJA">MENCARI KERJA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Pekerjaan / Profesi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Karyawan Swasta"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Ekonomi & Golongan Darah */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kategori Ekonomi
                  </label>
                  <select
                    value={formData.status_ekonomi}
                    onChange={(e) => setFormData({ ...formData, status_ekonomi: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-semibold cursor-pointer"
                  >
                    <option value="MAMPU">MAMPU</option>
                    <option value="TIDAK_MAMPU">TIDAK MAMPU (SKTM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Golongan Darah
                  </label>
                  <select
                    value={formData.golongan_darah}
                    onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="">-</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              {/* Wilayah RT/RW */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Wilayah RT / RW *
                </label>
                <select
                  required
                  value={formData.id_wilayah}
                  onChange={(e) => setFormData({ ...formData, id_wilayah: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Wilayah RT/RW --</option>
                  {listWilayah.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama_kampung} (RT {w.rt} / RW {w.rw})
                    </option>
                  ))}
                </select>
              </div>

              {/* Alamat Teritorial */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Alamat Rumah / Jalan <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Sukasari No. 12"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* No. WhatsApp */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  No. WhatsApp / HP Aktif <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={formData.no_whatsapp}
                  onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
              </div>

              {/* Status Tugas Ronda Warga */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 my-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-800">
                    Wajib Ikut Ronda Malam / Siskamling?
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formData.is_wajib_ronda 
                      ? 'Aktif — Keluarga ini masuk ke dalam jadwal ronda malam.' 
                      : 'Nonaktif — Keluarga ini mendapat dispensasi / bebas ronda.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.is_wajib_ronda}
                  onClick={() => setFormData({ ...formData, is_wajib_ronda: !formData.is_wajib_ronda })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                    formData.is_wajib_ronda ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      formData.is_wajib_ronda ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="warga-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Data Warga</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SURAT MODULAR TERPISAH BARU */}
      {isModalSuratOpen && selectedWargaSurat && (
        <ModalBuatSurat
          isOpen={isModalSuratOpen}
          onClose={() => setIsModalSuratOpen(false)}
          nikWarga={selectedWargaSurat.warga.nik}
          namaWarga={selectedWargaSurat.warga.nama_lengkap}
          rt={selectedWargaSurat.group.rt || '001'}
          rw={selectedWargaSurat.group.rw || '010'}
        />
      )}
    </div>
  );
}