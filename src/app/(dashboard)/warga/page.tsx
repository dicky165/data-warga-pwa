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
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  Briefcase,
  Heart,
  Droplet,
  FileSpreadsheet,
  FileText,
  Printer,
  AlertCircle,
  UserCheck,
  Crown
} from 'lucide-react';
import { cetakSuratPengantar } from '@/lib/generateSurat';

interface WilayahItem {
  id: number;
  nama_kampung: string;
  rw: string;
  rt: string;
}

interface AnggotaWarga {
  nik: string;
  nama_lengkap: string;
  no_whatsapp: string;
  is_active: boolean;
  shdk?: string;
  status_hubungan?: string;
  is_kepala?: boolean;
  kelas_iuran?: string; // Field Kelas Iuran (A / B / C)
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
  created_at?: string;
}

interface GroupKartuKeluarga {
  no_kk: string;
  alamat?: string;
  id_wilayah?: number;
  nama_kampung?: string;
  rt?: string;
  rw?: string;
  anggota: AnggotaWarga[];
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

// Opsi 3 Kelas Iuran A / B / C
const KELAS_IURAN_OPTIONS = ['A', 'B', 'C'];

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterRT, setSelectedFilterRT] = useState<string>('ALL');
  const [expandedKK, setExpandedKK] = useState<{ [no_kk: string]: boolean }>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNik, setSelectedNik] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nik: '',
    no_kk: '',
    nama_lengkap: '',
    shdk: 'Kepala Keluarga',
    kelas_iuran: 'A', // Default Kelas A
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

  const fetchWilayah = async () => {
    const { data } = await supabase
      .from('wilayah_rt_rw')
      .select('id, nama_kampung, rw, rt')
      .order('rw', { ascending: true })
      .order('rt', { ascending: true });

    if (data) {
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
        wilayah_rt_rw (
          id,
          nama_kampung,
          rt,
          rw
        ),
        data_warga (
          nik,
          nama_lengkap,
          shdk,
          status_hubungan,
          is_kepala,
          kelas_iuran,
          no_whatsapp,
          is_active,
          tempat_lahir,
          tanggal_lahir,
          agama,
          status_perkawinan,
          pekerjaan,
          golongan_darah,
          status_warga,
          tanggal_wafat,
          penyebab_wafat,
          status_pekerjaan,
          status_ekonomi,
          created_at
        )
      `);

    if (!error && data) {
      const mappedGroups: GroupKartuKeluarga[] = data.map((kk: any) => {
        const wil = kk.wilayah_rt_rw;
        const rawAnggota = (kk.data_warga || []) as AnggotaWarga[];

        // Pengurutan: Kepala Keluarga di indeks paling atas [0]
        const sortedAnggota = [...rawAnggota].sort((a, b) => {
          const isKepalaA = isKepalaCheck(a);
          const isKepalaB = isKepalaCheck(b);
          if (isKepalaA && !isKepalaB) return -1;
          if (!isKepalaA && isKepalaB) return 1;

          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });

        const anggotaList: AnggotaWarga[] = sortedAnggota.map((w: any) => ({
          nik: w.nik,
          nama_lengkap: w.nama_lengkap,
          shdk: w.shdk || w.status_hubungan || 'Anggota',
          status_hubungan: w.status_hubungan,
          is_kepala: w.is_kepala,
          kelas_iuran: w.kelas_iuran || 'A',
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
          nama_kampung: wil?.nama_kampung || '',
          rt: wil?.rt || '',
          rw: wil?.rw || '',
          anggota: anggotaList
        };
      });

      setListGroupKK(mappedGroups);
    }

    setLoading(false);
  };

  useEffect(() => {
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
        shdk: wargaEdit.shdk || 'Anggota',
        kelas_iuran: wargaEdit.kelas_iuran || 'A',
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
        shdk: isKKFirstMember ? 'Kepala Keluarga' : 'Anak',
        kelas_iuran: 'A',
        no_whatsapp: '',
        id_wilayah: listWilayah.length > 0 ? String(listWilayah[0].id) : '',
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
          alamat: formData.alamat || ''
        }, { onConflict: 'no_kk' });

      if (errKK) throw new Error(`Gagal simpan KK: ${errKK.message}`);

      const payloadWarga: any = {
        nik: formData.nik,
        no_kk: formData.no_kk,
        nama_lengkap: formData.nama_lengkap,
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

  const handleCetakSuratWarga = (
    warga: AnggotaWarga, 
    group: GroupKartuKeluarga, 
    jenis: 'KEMATIAN' | 'BELUM_BEKERJA' | 'SKTM_BEROBAT'
  ) => {
    cetakSuratPengantar({
      jenisSurat: jenis,
      namaWarga: warga.nama_lengkap,
      nik: warga.nik,
      noKK: group.no_kk,
      ttl: `${warga.tempat_lahir || '-'}${warga.tanggal_lahir ? ', ' + warga.tanggal_lahir : ''}`,
      alamat: group.alamat || '-',
      rt: group.rt || '01',
      rw: group.rw || '01',
      desa: group.nama_kampung || 'Sukasari',
      tglWafat: warga.tanggal_wafat,
      sebabWafat: warga.penyebab_wafat
    });
  };

  const filteredGroups = listGroupKK.filter((group) => {
    const query = searchQuery.toLowerCase();
    
    const matchesSearch =
      group.no_kk.includes(query) ||
      (group.alamat && group.alamat.toLowerCase().includes(query)) ||
      group.anggota.some(a => 
        a.nama_lengkap.toLowerCase().includes(query) || 
        a.nik.includes(query) ||
        (a.pekerjaan && a.pekerjaan.toLowerCase().includes(query))
      );

    const matchesRT = selectedFilterRT === 'ALL' || group.rt === selectedFilterRT;

    return matchesSearch && matchesRT;
  });

  const totalAnggotaTerdaftar = filteredGroups.reduce((acc, curr) => acc + curr.anggota.length, 0);

  // EXPORT EXCEL TANPA KOLOM KELAS IURAN
  const handleExportExcel = () => {
    if (filteredGroups.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const excelRows: any[] = [];

    filteredGroups.forEach((group) => {
      group.anggota.forEach((warga) => {
        const u = hitungUmur(warga.tanggal_lahir);
        excelRows.push({
          'NO KK': group.no_kk,
          'HUB. KELUARGA (SHDK)': warga.shdk || '-',
          'NAMA LENGKAP': warga.nama_lengkap,
          'NIK': warga.nik,
          'STATUS WARGA': warga.status_warga,
          'STATUS KERJA': warga.status_pekerjaan,
          'STATUS EKONOMI': warga.status_ekonomi,
          'TEMPAT LAHIR': warga.tempat_lahir || '-',
          'TGL LAHIR': warga.tanggal_lahir || '-',
          'USIA': u !== null ? `${u} Thn` : '-',
          'AGAMA': warga.agama || '-',
          'STATUS PERKAWINAN': warga.status_perkawinan || '-',
          'PEKERJAAN': warga.pekerjaan || '-',
          'GOL. DARAH': warga.golongan_darah || '-',
          'NO. WHATSAPP': warga.no_whatsapp || '-',
          'RT': group.rt || '-',
          'RW': group.rw || '-',
          'KAMPUNG/DESA': group.nama_kampung || '-',
          'ALAMAT LENGKAP': group.alamat || '-'
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data KK Warga');

    XLSX.writeFile(workbook, `Data_KK_Warga_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // EXPORT PDF TANPA KOLOM KELAS IURAN
  const handleExportPDF = () => {
    if (filteredGroups.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

    doc.setFontSize(14);
    doc.text('KARTU DATA WARGA / REKAPITULASI KELUARGA', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} | Total: ${filteredGroups.length} KK (${totalAnggotaTerdaftar} Jiwa)`, 14, 21);

    const tableColumns = [
      'No. KK',
      'Nama Lengkap',
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

        tableRows.push([
          idx === 0 ? group.no_kk : '',
          warga.nama_lengkap,
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

    doc.save(`Rekap_Data_Kartu_Keluarga_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Kelola Data Warga</h2>
          <p className="text-[11px] text-slate-400">
            {filteredGroups.length} KK ({totalAnggotaTerdaftar} Jiwa)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah KK / Warga</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIK, No. KK, pekerjaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-medium"
          />
        </div>

        <div className="relative min-w-[130px]">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedFilterRT}
            onChange={(e) => setSelectedFilterRT(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
          >
            <option value="ALL">Semua RT</option>
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
            const isExpanded = expandedKK[group.no_kk] ?? true;
            
            const kepalaWarga = group.anggota.find(w => isKepalaCheck(w)) || group.anggota[0];
            const kepalaKeluarga = kepalaWarga?.nama_lengkap || 'Kepala Keluarga Belum Diisi';

            return (
              <div
                key={group.no_kk}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Header KK */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                        KK: {group.no_kk}
                      </span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" /> {kepalaKeluarga}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Home className="w-3 h-3 text-sky-600" /> RT {group.rt || '-'}/RW {group.rw || '-'}
                      </span>
                      {group.nama_kampung && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" /> {group.nama_kampung}
                        </span>
                      )}
                      {group.alamat && (
                        <span className="text-slate-400 font-normal">
                          • {group.alamat}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenModal(group.no_kk, undefined, group)}
                      title="Tambah Anggota ke KK ini"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[10px] rounded-xl transition-all"
                    >
                      <Plus className="w-3 h-3 text-sky-600" />
                      <span>Anggota</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(group.no_kk)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sub-List NIK Warga */}
                {isExpanded && (
                  <div className="p-3 space-y-2 bg-white">
                    {group.anggota.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic px-1">
                        Belum ada anggota keluarga terdaftar di KK ini.
                      </p>
                    ) : (
                      group.anggota.map((warga, idx) => {
                        const umur = hitungUmur(warga.tanggal_lahir);
                        const isKepala = isKepalaCheck(warga);

                        return (
                          <div
                            key={warga.nik}
                            className={`p-3 rounded-xl border text-xs space-y-2 ${
                              warga.status_warga === 'MENINGGAL' 
                                ? 'bg-rose-50/40 border-rose-200' 
                                : 'bg-slate-50/70 border-slate-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-400 text-[10px]">{idx + 1}.</span>
                                  <span className="font-bold text-slate-800">{warga.nama_lengkap}</span>
                                  
                                  {/* Badge SHDK */}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                                    isKepala 
                                      ? 'text-amber-800 bg-amber-100 border-amber-300' 
                                      : 'text-sky-800 bg-sky-50 border-sky-200'
                                  }`}>
                                    {warga.shdk || (isKepala ? 'Kepala Keluarga' : 'Anggota')}
                                  </span>

                                  {/* Badge Kelas Iuran A / B / C (Hanya tampil di Dashboard) */}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${
                                    warga.kelas_iuran === 'A'
                                      ? 'text-purple-800 bg-purple-100 border-purple-300'
                                      : warga.kelas_iuran === 'B'
                                      ? 'text-blue-800 bg-blue-100 border-blue-300'
                                      : 'text-slate-700 bg-slate-100 border-slate-200'
                                  }`}>
                                    {warga.kelas_iuran === 'A' && <Crown className="w-2.5 h-2.5 text-amber-600" />}
                                    Kelas {warga.kelas_iuran || 'A'}
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

                                  {/* Badge Status Pekerjaan */}
                                  {warga.status_pekerjaan === 'TIDAK_BEKERJA' && (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                      TIDAK BEKERJA
                                    </span>
                                  )}

                                  {/* Badge Ekonomi */}
                                  {warga.status_ekonomi === 'TIDAK_MAMPU' && (
                                    <span className="text-[9px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded-md">
                                      KURANG MAMPU
                                    </span>
                                  )}

                                  {warga.golongan_darah && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                      <Droplet className="w-2.5 h-2.5" /> Gol: {warga.golongan_darah}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  NIK: {warga.nik}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {warga.no_whatsapp && (
                                  <button
                                    onClick={() => handleSendWA(warga.nama_lengkap, warga.no_whatsapp)}
                                    title="Kirim WA"
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenModal(group.no_kk, warga, group)}
                                  title="Edit Anggota"
                                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-all"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnggota(warga.nik)}
                                  title="Hapus Anggota"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Catatan Kematian */}
                            {warga.status_warga === 'MENINGGAL' && (
                              <div className="p-2 bg-rose-100/50 rounded-lg text-[10px] text-rose-800 flex items-center gap-2 border border-rose-200/60">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Wafat: <strong>{warga.tanggal_wafat || '-'}</strong> | Sebab: {warga.penyebab_wafat || 'Usia Lanjut / Sakit'}</span>
                              </div>
                            )}

                            {/* Action Tombol Cetak Surat Pengantar */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Printer className="w-3 h-3 text-slate-400" /> Surat:
                              </span>
                              {warga.status_warga === 'MENINGGAL' ? (
                                <button
                                  onClick={() => handleCetakSuratWarga(warga, group, 'KEMATIAN')}
                                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[9px] font-semibold hover:bg-rose-700 transition-all"
                                >
                                  Surat Kematian
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleCetakSuratWarga(warga, group, 'BELUM_BEKERJA')}
                                    className="px-2 py-0.5 bg-amber-600 text-white rounded text-[9px] font-semibold hover:bg-amber-700 transition-all"
                                  >
                                    Belum Bekerja
                                  </button>
                                  <button
                                    onClick={() => handleCetakSuratWarga(warga, group, 'SKTM_BEROBAT')}
                                    className="px-2 py-0.5 bg-purple-600 text-white rounded text-[9px] font-semibold hover:bg-purple-700 transition-all"
                                  >
                                    SKTM Berobat
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Detail Tambahan */}
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
                                    <Briefcase className="w-3 h-3 text-slate-400" /> {warga.pekerjaan}
                                  </span>
                                )}
                                {warga.status_perkawinan && (
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-slate-400" /> {warga.status_perkawinan}
                                  </span>
                                )}
                                {warga.agama && (
                                  <span className="text-slate-400">
                                    • Agama: {warga.agama}
                                  </span>
                                )}
                                {warga.no_whatsapp && (
                                  <span className="flex items-center gap-1 text-slate-600 font-mono">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" /> {warga.no_whatsapp}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit Warga */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] flex flex-col justify-between shadow-2xl pb-8 sm:pb-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-800">
                {selectedNik ? 'Edit Data Anggota' : 'Tambah Anggota / KK Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="warga-form" onSubmit={handleSubmit} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap Anggota *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dicky Kostaman"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Input SHDK & Dropdown Kelas Iuran (A/B/C) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hub. Keluarga (SHDK) *
                  </label>
                  <select
                    required
                    value={formData.shdk}
                    onChange={(e) => setFormData({ ...formData, shdk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium text-slate-800"
                  >
                    {SHDK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kelas Tarif Iuran *
                  </label>
                  <select
                    required
                    value={formData.kelas_iuran}
                    onChange={(e) => setFormData({ ...formData, kelas_iuran: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-bold text-purple-700"
                  >
                    {KELAS_IURAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>Kelas {opt}</option>
                    ))}
                  </select>
                </div>
              </div>

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

              {/* Status Warga, Pekerjaan & Ekonomi */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Warga
                  </label>
                  <select
                    value={formData.status_warga}
                    onChange={(e) => setFormData({ ...formData, status_warga: e.target.value as any })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="AKTIF">Aktif</option>
                    <option value="MENINGGAL">Meninggal</option>
                    <option value="PINDAH">Pindah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sts Pekerjaan
                  </label>
                  <select
                    value={formData.status_pekerjaan}
                    onChange={(e) => setFormData({ ...formData, status_pekerjaan: e.target.value as any })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="BEKERJA">Bekerja</option>
                    <option value="TIDAK_BEKERJA">Tidak Kerja</option>
                    <option value="MENCARI_KERJA">Cari Kerja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sts Ekonomi
                  </label>
                  <select
                    value={formData.status_ekonomi}
                    onChange={(e) => setFormData({ ...formData, status_ekonomi: e.target.value as any })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="MAMPU">Mampu</option>
                    <option value="TIDAK_MAMPU">Tidak Mampu</option>
                  </select>
                </div>
              </div>

              {/* Form Tambahan untuk Kematian */}
              {formData.status_warga === 'MENINGGAL' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <span className="font-semibold text-rose-800 text-[11px]">Catatan Kematian:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-rose-700 font-semibold mb-1">Tanggal Wafat</label>
                      <input
                        type="date"
                        value={formData.tanggal_wafat}
                        onChange={(e) => setFormData({ ...formData, tanggal_wafat: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-rose-700 font-semibold mb-1">Penyebab Wafat</label>
                      <input
                        type="text"
                        placeholder="Contoh: Sakit / Usia Lanjut"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  />
                  {hitungUmur(formData.tanggal_lahir) !== null && (
                    <p className="text-[10px] text-sky-600 font-semibold mt-1">
                      Usia: {hitungUmur(formData.tanggal_lahir)} Tahun
                    </p>
                  )}
                </div>
              </div>

              {/* Agama & Status Perkawinan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Agama <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <select
                    value={formData.agama}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Pilih Agama --</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Status Perkawinan <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <select
                    value={formData.status_perkawinan}
                    onChange={(e) => setFormData({ ...formData, status_perkawinan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
              </div>

              {/* Pekerjaan & Golongan Darah */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Profesi Pekerjaan <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Karyawan Swasta"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Gol. Darah <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <select
                    value={formData.golongan_darah}
                    onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Gol. --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Wilayah RT / RW *
                </label>
                <select
                  required
                  value={formData.id_wilayah}
                  onChange={(e) => setFormData({ ...formData, id_wilayah: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Pilih Wilayah RT/RW --</option>
                  {listWilayah.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama_kampung} (RT {w.rt} / RW {w.rw})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Alamat Lengkap / Blok Rumah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Merdeka No. 12 / Blok A3"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nomor WhatsApp <span className="text-[9px] text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={formData.no_whatsapp}
                  onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                />
              </div>
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                form="warga-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{selectedNik ? 'Simpan Edit' : 'Simpan Warga'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}