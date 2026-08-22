'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Coins,
  Plus,
  Trash2,
  Edit3,
  X,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Briefcase,
  Layers,
  Crown,
  Percent,
  Banknote,
  Gift
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface WilayahItem {
  id: number;
  rt: string;
  rw: string;
}

interface KelasIuranItem {
  nama_kelas: string;
  nominal: number;
}

interface MasterIuranItem {
  id: number;
  id_wilayah?: number;
  nama_iuran: string;
  tarif_nominal: number;
  is_active: boolean;
  min_usia?: number | null;
  max_usia?: number | null;
  wajib_bekerja?: boolean;
  kelas_iuran?: KelasIuranItem[] | null;
  tipe_fee?: 'none' | 'persen' | 'nominal';
  persen_fee_petugas?: number;
  nominal_fee_petugas?: number;
  wilayah_rt_rw?: {
    rt: string;
    rw: string;
  };
}

export default function MasterIuranPage() {
  const supabase = createClient();

  const [listMaster, setListMaster] = useState<MasterIuranItem[]>([]);
  const [listWilayah, setListWilayah] = useState<WilayahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nama_iuran: '',
    tarif_nominal: '',
    id_wilayah: '',
    is_active: true,
    min_usia: '',
    max_usia: '',
    wajib_bekerja: false,
    kelas_iuran: [
      { nama_kelas: 'A', nominal: 0 },
      { nama_kelas: 'B', nominal: 0 },
      { nama_kelas: 'C', nominal: 0 }
    ] as KelasIuranItem[],
    tipe_fee: 'none' as 'none' | 'persen' | 'nominal',
    persen_fee_petugas: '',
    nominal_fee_petugas: ''
  });

  // Fetch Master Data Iuran & Wilayah
  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: dataIuran } = await supabase
        .from('master_iuran')
        .select(`
          id,
          id_wilayah,
          nama_iuran,
          tarif_nominal,
          is_active,
          min_usia,
          max_usia,
          wajib_bekerja,
          kelas_iuran,
          tipe_fee,
          persen_fee_petugas,
          nominal_fee_petugas,
          wilayah_rt_rw ( id, rt, rw )
        `)
        .order('id', { ascending: true });

      if (dataIuran) {
        setListMaster(dataIuran as unknown as MasterIuranItem[]);
      }

      const { data: dataWilayah } = await supabase
        .from('wilayah_rt_rw')
        .select('id, rt, rw')
        .order('rt', { ascending: true });

      if (dataWilayah) {
        setListWilayah(dataWilayah);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // EXPORT ENGINE
  // ---------------------------------------------------------------------------
  const prepareExportData = async () => {
    try {
      const supabase = createClient();

      const { data: masterIuran, error: errMaster } = await supabase
        .from('master_iuran')
        .select('id, nama_iuran')
        .order('id', { ascending: true });

      if (errMaster) throw new Error(`Tabel master_iuran: ${errMaster.message}`);

      const { data: dataPetugas, error: errPetugas } = await supabase
        .from('profil_pengurus')
        .select('id, nama_lengkap');

      if (errPetugas) {
        console.warn('Gagal mengambil profil_pengurus:', errPetugas.message);
      }

      const pengurusMap = new Map<string, string>();
      let defaultNamaPengurus = 'Petugas / Umum';

      if (dataPetugas && dataPetugas.length > 0) {
        dataPetugas.forEach((p: any) => {
          if (p.id && p.nama_lengkap) {
            pengurusMap.set(String(p.id).toLowerCase().trim(), p.nama_lengkap);
          }
        });
        defaultNamaPengurus = dataPetugas[0].nama_lengkap;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        const cleanUserId = String(user.id).toLowerCase().trim();
        if (pengurusMap.has(cleanUserId)) {
          defaultNamaPengurus = pengurusMap.get(cleanUserId)!;
        }
      }

      const { data: dataWarga, error: errWarga } = await supabase
        .from('data_warga')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (errWarga) throw new Error(`Tabel data_warga: ${errWarga.message}`);
      if (!dataWarga || dataWarga.length === 0) throw new Error('Data warga kosong');

      const kkMap = new Map<string, any>();
      dataWarga.forEach((warga: any) => {
        const keyKK = (warga.no_kk || warga.nik || 'TANPA_KK').trim();
        const shdk = String(warga.shdk || warga.status_hubungan || '').toLowerCase();
        const isKepala = warga.is_kepala === true || shdk === 'kepala keluarga' || shdk === 'kepala';

        if (!kkMap.has(keyKK) || isKepala) {
          kkMap.set(keyKK, warga);
        }
      });
      const penanggungJawabList = Array.from(kkMap.values());

      const { data: pembayaran, error: errPembayaran } = await supabase
        .from('pembayaran_iuran')
        .select('*');

      if (errPembayaran) throw new Error(`Tabel pembayaran_iuran: ${errPembayaran.message}`);

      const getNamaPetugas = (lb: any) => {
        const rawId = lb.petugas_id || lb.pencatat_by_id;
        if (!rawId) return defaultNamaPengurus;

        const cleanId = String(rawId).toLowerCase().trim();
        return pengurusMap.get(cleanId) || defaultNamaPengurus;
      };

      let totalSeharusnyaAda = 0;
      let totalSudahDiserahkan = 0;
      let totalBelumDiserahkan = 0;

      const rekapPetugasMap = new Map<string, { total: number; diserahkan: number; belum: number }>();

      pembayaran?.forEach((p: any) => {
        const nominal = Number(p.jumlah_bayar || 0);
        const isDiserahkan = Boolean(p.is_diserahkan || p.status_setor === 'diserahkan' || p.is_settled);

        totalSeharusnyaAda += nominal;
        if (isDiserahkan) {
          totalSudahDiserahkan += nominal;
        } else {
          totalBelumDiserahkan += nominal;
        }

        const namaPetugas = getNamaPetugas(p);
        const curr = rekapPetugasMap.get(namaPetugas) || { total: 0, diserahkan: 0, belum: 0 };

        rekapPetugasMap.set(namaPetugas, {
          total: curr.total + nominal,
          diserahkan: curr.diserahkan + (isDiserahkan ? nominal : 0),
          belum: curr.belum + (!isDiserahkan ? nominal : 0)
        });
      });

      const rekapPetugasRows = Array.from(rekapPetugasMap.entries()).map(([namaPetugas, val], idx) => ({
        no: idx + 1,
        nama_petugas: namaPetugas,
        total_terkumpul: `Rp ${val.total.toLocaleString('id-ID')}`,
        sudah_diserahkan: `Rp ${val.diserahkan.toLocaleString('id-ID')}`,
        belum_diserahkan: `Rp ${val.belum.toLocaleString('id-ID')}`
      }));

      const rows = penanggungJawabList.map((warga: any, index: number) => {
        const rowObj: any = {
          no: index + 1,
          nama: warga.nama_lengkap || 'Warga',
          no_kk: warga.no_kk || '-'
        };

        masterIuran?.forEach((iuran: any) => {
          const logBayar = pembayaran?.filter(
            (p: any) =>
              String(p.no_kk || '').trim() === String(warga.no_kk || '').trim() &&
              Number(p.id_iuran) === Number(iuran.id)
          );

          if (logBayar && logBayar.length > 0) {
            const rincianTransaksi = logBayar.map((lb: any) => {
              const nominal = Number(lb.jumlah_bayar || 0);
              const namaPenagih = getNamaPetugas(lb);
              const st = Boolean(lb.is_diserahkan || lb.status_setor === 'diserahkan' || lb.is_settled)
                ? 'Diserahkan'
                : 'Di Petugas';
              return `Rp ${nominal.toLocaleString('id-ID')} [${namaPenagih} - ${st}]`;
            }).join('; ');

            rowObj[iuran.nama_iuran] = rincianTransaksi;
          } else {
            rowObj[iuran.nama_iuran] = 'Belum Bayar';
          }
        });

        return rowObj;
      });

      return {
        masterIuran: masterIuran || [],
        rows,
        rekapPetugasRows,
        summary: {
          totalSeharusnyaAda,
          totalSudahDiserahkan,
          totalBelumDiserahkan
        }
      };
    } catch (error: any) {
      console.error('Export Error Detail:', error);
      alert(`Gagal menyiapkan data export: ${error.message}`);
      return null;
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const rawData = await prepareExportData();
      if (!rawData) return;

      const workbook = XLSX.utils.book_new();

      const summarySheetData = [
        { 'Kategori Kas': 'TOTAL SEHARUSNYA (KAS)', Nominal: rawData.summary.totalSeharusnyaAda },
        { 'Kategori Kas': 'SUDAH DISERAHKAN KE BENDAHARA', Nominal: rawData.summary.totalSudahDiserahkan },
        { 'Kategori Kas': 'MASIH DI TANGAN PETUGAS', Nominal: rawData.summary.totalBelumDiserahkan },
        {},
        { 'Kategori Kas': '--- REKAP PER PETUGAS ---', Nominal: '' }
      ];

      const worksheetSummary = XLSX.utils.json_to_sheet(summarySheetData);
      XLSX.utils.sheet_add_json(worksheetSummary, rawData.rekapPetugasRows, { origin: 'A7' });
      XLSX.utils.book_append_sheet(workbook, worksheetSummary, 'Ringkasan Kas & Petugas');

      const worksheetWarga = XLSX.utils.json_to_sheet(rawData.rows);
      XLSX.utils.book_append_sheet(workbook, worksheetWarga, 'Rekap Iuran Warga');

      XLSX.writeFile(workbook, `Rekap_Kas_Bendahara_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      alert(`Gagal membuat berkas Excel: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const rawData = await prepareExportData();
      if (!rawData) return;

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAPITULASI PEMBAYARAN IURAN WARGA & KAS BENDAHARA', 14, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 18);

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, 22, 269, 18, 2, 2, 'FD');

      doc.setFontSize(9);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('TOTAL SEHARUSNYA (KAS):', 20, 29);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${rawData.summary.totalSeharusnyaAda.toLocaleString('id-ID')}`, 20, 35);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('SUDAH DISERAHKAN KE BENDAHARA:', 100, 29);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${rawData.summary.totalSudahDiserahkan.toLocaleString('id-ID')}`, 100, 35);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text('MASIH DI TANGAN PETUGAS:', 190, 29);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${rawData.summary.totalBelumDiserahkan.toLocaleString('id-ID')}`, 190, 35);

      doc.setTextColor(0, 0, 0);

      const tableHeaders = [
        'No',
        'Penanggung Jawab (Kepala KK)',
        'No KK',
        ...rawData.masterIuran.map((m) => m.nama_iuran)
      ];

      const tableBody = rawData.rows.map((row: any) => [
        row.no,
        row.nama,
        row.no_kk,
        ...rawData.masterIuran.map((m) => row[m.nama_iuran])
      ]);

      autoTable(doc, {
        startY: 44,
        head: [tableHeaders],
        body: tableBody,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [2, 132, 199] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      if (finalY > 150) {
        doc.addPage();
      }

      const startYPetugas = finalY > 150 ? 20 : finalY + 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAPITULASI POSISI UANG PER PETUGAS', 14, startYPetugas - 4);

      const petugasHeaders = [
        'No',
        'Nama Petugas / Pengambil Iuran',
        'Total Terkumpul',
        'Sudah Diserahkan',
        'Masih di Tangan Petugas'
      ];
      const petugasBody = rawData.rekapPetugasRows.map((rp: any) => [
        rp.no,
        rp.nama_petugas,
        rp.total_terkumpul,
        rp.sudah_diserahkan,
        rp.belum_diserahkan
      ]);

      autoTable(doc, {
        startY: startYPetugas,
        head: [petugasHeaders],
        body: petugasBody,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [240, 253, 244] }
      });

      doc.save(`Rekap_Kas_Bendahara_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      alert(`Gagal membuat berkas PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER PILIHAN IURAN (A / B / C)
  // ---------------------------------------------------------------------------
  const handleNominalKelasChange = (namaKelas: string, nominalStr: string) => {
    const val = parseFloat(nominalStr) || 0;
    setFormData((prev) => ({
      ...prev,
      kelas_iuran: prev.kelas_iuran.map((k) =>
        k.nama_kelas === namaKelas ? { ...k, nominal: val } : k
      )
    }));
  };

  // Modal Handlers
  const handleOpenModal = (item?: MasterIuranItem) => {
    if (item) {
      setEditId(item.id);

      const existingKelas = Array.isArray(item.kelas_iuran) ? item.kelas_iuran : [];
      const mergedKelas = ['A', 'B', 'C'].map((label) => {
        const found = existingKelas.find((k) => k.nama_kelas === label);
        return {
          nama_kelas: label,
          nominal: found ? found.nominal : (item.tarif_nominal || 0)
        };
      });

      setFormData({
        nama_iuran: item.nama_iuran || '',
        tarif_nominal: item.tarif_nominal ? String(item.tarif_nominal) : '',
        id_wilayah: item.id_wilayah ? String(item.id_wilayah) : '',
        is_active: item.is_active ?? true,
        min_usia: item.min_usia !== null && item.min_usia !== undefined ? String(item.min_usia) : '',
        max_usia: item.max_usia !== null && item.max_usia !== undefined ? String(item.max_usia) : '',
        wajib_bekerja: item.wajib_bekerja ?? false,
        kelas_iuran: mergedKelas,
        tipe_fee: item.tipe_fee || 'none',
        persen_fee_petugas: item.persen_fee_petugas ? String(item.persen_fee_petugas) : '',
        nominal_fee_petugas: item.nominal_fee_petugas ? String(item.nominal_fee_petugas) : ''
      });
    } else {
      setEditId(null);
      setFormData({
        nama_iuran: '',
        tarif_nominal: '',
        id_wilayah: '',
        is_active: true,
        min_usia: '',
        max_usia: '',
        wajib_bekerja: false,
        kelas_iuran: [
          { nama_kelas: 'A', nominal: 0 },
          { nama_kelas: 'B', nominal: 0 },
          { nama_kelas: 'C', nominal: 0 }
        ],
        tipe_fee: 'none',
        persen_fee_petugas: '',
        nominal_fee_petugas: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!formData.nama_iuran) {
        alert('Nama iuran wajib diisi!');
        setSaving(false);
        return;
      }

      const payload = {
        nama_iuran: formData.nama_iuran,
        tarif_nominal: formData.tarif_nominal ? parseFloat(formData.tarif_nominal) : 0,
        id_wilayah: formData.id_wilayah ? parseInt(formData.id_wilayah) : null,
        is_active: formData.is_active,
        min_usia: formData.min_usia !== '' ? parseInt(formData.min_usia) : null,
        max_usia: formData.max_usia !== '' ? parseInt(formData.max_usia) : null,
        wajib_bekerja: formData.wajib_bekerja,
        kelas_iuran: formData.kelas_iuran,
        tipe_fee: formData.tipe_fee,
        persen_fee_petugas: formData.tipe_fee === 'persen' && formData.persen_fee_petugas ? parseFloat(formData.persen_fee_petugas) : 0,
        nominal_fee_petugas: formData.tipe_fee === 'nominal' && formData.nominal_fee_petugas ? parseFloat(formData.nominal_fee_petugas) : 0
      };

      if (editId) {
        const { error } = await supabase
          .from('master_iuran')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_iuran')
          .insert(payload);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data master iuran');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: MasterIuranItem) => {
    const { error } = await supabase
      .from('master_iuran')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (!error) {
      fetchData();
    } else {
      alert('Gagal memperbarui status iuran');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus jenis iuran ini?')) {
      const { error } = await supabase.from('master_iuran').delete().eq('id', id);
      if (!error) {
        fetchData();
      } else {
        alert('Gagal menghapus data. Terikat dengan data pembayaran iuran.');
      }
    }
  };

  const filteredList = listMaster.filter((item) =>
    item.nama_iuran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Master Jenis Iuran</h2>
          <p className="text-[11px] text-slate-400">Total Jenis: {filteredList.length}</p>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Iuran</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Cari jenis iuran..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm font-medium"
        />
      </div>

      {/* List Master Iuran */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Memuat master iuran...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-400">
          <Coins className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Belum ada jenis iuran yang ditambahkan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-4 border transition-all shadow-sm flex flex-col justify-between space-y-3 ${item.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.is_active ? 'bg-sky-50 text-sky-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{item.nama_iuran}</h3>
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                      Default: Rp {item.tarif_nominal?.toLocaleString('id-ID')}
                      <span className="text-[10px] text-slate-400 font-normal"> / periode</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tag Kriteria & Syarat + Fee Badge */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {/* Badge Fee Petugas */}
                {item.tipe_fee === 'persen' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded-md border border-amber-200/60">
                    <Percent className="w-3 h-3 text-amber-600" />
                    Fee Petugas: {item.persen_fee_petugas}%
                  </span>
                )}
                {item.tipe_fee === 'nominal' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-200/60">
                    <Banknote className="w-3 h-3 text-emerald-600" />
                    Fee Petugas: Rp {item.nominal_fee_petugas?.toLocaleString('id-ID')}
                  </span>
                )}
                {(!item.tipe_fee || item.tipe_fee === 'none') && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-medium rounded-md">
                    Tanpa Fee Petugas
                  </span>
                )}

                {(item.min_usia !== null && item.min_usia !== undefined) || (item.max_usia !== null && item.max_usia !== undefined) ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded-md border border-amber-200/60">
                    <UserCheck className="w-3 h-3 text-amber-600" />
                    {item.min_usia && item.max_usia
                      ? `Usia: ${item.min_usia} - ${item.max_usia} Thn`
                      : item.min_usia
                        ? `Min Usia: ${item.min_usia} Thn`
                        : `Max Usia: ${item.max_usia} Thn`
                    }
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-medium rounded-md">
                    Semua Usia
                  </span>
                )}

                {item.wajib_bekerja ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-md border border-indigo-200/60">
                    <Briefcase className="w-3 h-3 text-indigo-600" />
                    Wajib Bekerja
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-medium rounded-md">
                    Semua Status Kerja
                  </span>
                )}
              </div>

              {/* Tampilan 3 Pilihan Iuran A / B / C */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-sky-600" /> Tarif Pilihan Warga (A / B / C):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['A', 'B', 'C'] as const).map((kelasKey) => {
                    const kelasItem = Array.isArray(item.kelas_iuran)
                      ? item.kelas_iuran.find((k) => k.nama_kelas === kelasKey)
                      : null;
                    const nominalVal = kelasItem ? kelasItem.nominal : item.tarif_nominal;

                    return (
                      <div
                        key={kelasKey}
                        className={`p-1.5 rounded-lg border text-center flex flex-col justify-center ${kelasKey === 'A'
                            ? 'bg-purple-50/60 border-purple-200 text-purple-900'
                            : kelasKey === 'B'
                              ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                              : 'bg-slate-100/70 border-slate-200 text-slate-800'
                          }`}
                      >
                        <span className="text-[9px] font-bold flex items-center justify-center gap-0.5">
                          {kelasKey === 'A' && <Crown className="w-2.5 h-2.5 text-amber-600" />}
                          Pilihan {kelasKey}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          Rp {nominalVal ? nominalVal.toLocaleString('id-ID') : '0'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Wilayah & Active Badge */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500">
                  {item.wilayah_rt_rw
                    ? `Wilayah: RT ${item.wilayah_rt_rw.rt} / RW ${item.wilayah_rt_rw.rw}`
                    : 'Semua Wilayah (Umum)'
                  }
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${item.is_active
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                >
                  {item.is_active ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>Nonaktif</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Master Iuran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl pb-8 sm:pb-5">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-bold text-slate-800">
                {editId ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form id="master-iuran-form" onSubmit={handleSubmit} className="space-y-4 text-xs">

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Iuran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Iuran Kebersihan RT"
                  value={formData.nama_iuran}
                  onChange={(e) => setFormData({ ...formData, nama_iuran: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tarif Nominal Default (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 25000"
                  value={formData.tarif_nominal}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = parseFloat(val) || 0;
                    setFormData({
                      ...formData,
                      tarif_nominal: val,
                      kelas_iuran: formData.kelas_iuran.map((k) => ({
                        ...k,
                        nominal: k.nominal === 0 ? numVal : k.nominal
                      }))
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold text-slate-800"
                />
              </div>

              {/* SECTION BARU: FEEOPSIONAL / KOMISI PETUGAS PENAGIH */}
              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-600" /> Fee / Komisi Petugas Penagih
                  </span>
                  <p className="text-[10px] text-amber-700/90 mt-0.5">
                    Pengaturan komisi insentif untuk petugas yang menagih iuran ini.
                  </p>
                </div>

                {/* Radio Pilihan Tipe Fee */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe_fee: 'none' })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all ${formData.tipe_fee === 'none'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Tanpa Fee
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe_fee: 'persen' })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${formData.tipe_fee === 'persen'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Persen (%)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe_fee: 'nominal' })}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${formData.tipe_fee === 'nominal'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Flat (Rp)
                  </button>
                </div>

                {/* Input Sesuai Tipe Fee */}
                {formData.tipe_fee === 'persen' && (
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-1">
                    <label className="block text-[10px] font-bold text-amber-900">
                      Persentase Fee (%) *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Contoh: 5 (artinya 5%)"
                        value={formData.persen_fee_petugas}
                        onChange={(e) => setFormData({ ...formData, persen_fee_petugas: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 font-bold text-slate-400">%</span>
                    </div>
                  </div>
                )}

                {formData.tipe_fee === 'nominal' && (
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-1">
                    <label className="block text-[10px] font-bold text-amber-900">
                      Nominal Fee per Transaksi (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Contoh: 2000"
                      value={formData.nominal_fee_petugas}
                      onChange={(e) => setFormData({ ...formData, nominal_fee_petugas: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* SECTION: TARIF BERDASARKAN PILIHAN IURAN WARGA (A / B / C) */}
              <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" /> Tarif Khusus Berdasarkan Pilihan Warga (A / B / C)
                  </span>
                  <p className="text-[10px] text-purple-700 mt-0.5">
                    Tentukan tarif iuran spesifik sesuai kategori Pilihan Warga.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {formData.kelas_iuran.map((k) => (
                    <div
                      key={k.nama_kelas}
                      className={`p-2.5 rounded-xl border bg-white space-y-1 ${k.nama_kelas === 'A'
                          ? 'border-purple-200'
                          : k.nama_kelas === 'B'
                            ? 'border-blue-200'
                            : 'border-slate-200'
                        }`}
                    >
                      <label className="block text-[10px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Pilihan {k.nama_kelas}</span>
                        {k.nama_kelas === 'A' && <Crown className="w-3 h-3 text-amber-500" />}
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Rp"
                        value={k.nominal}
                        onChange={(e) => handleNominalKelasChange(k.nama_kelas, e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: KRITERIA USIA & WARGA BEKERJA */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Kriteria Wajib Iuran (Aturan Pembebasan)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Minimal Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 17"
                      value={formData.min_usia}
                      onChange={(e) => setFormData({ ...formData, min_usia: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Maksimal Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 60"
                      value={formData.max_usia}
                      onChange={(e) => setFormData({ ...formData, max_usia: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium bg-white"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  *Jika kosong, berlaku umum untuk semua rentang usia.
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-600 block">
                      Khusus Warga Sedang Bekerja?
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Jika diaktifkan, warga yang tidak bekerja dibebaskan iuran.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, wajib_bekerja: !formData.wajib_bekerja })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${formData.wajib_bekerja ? 'bg-sky-600' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.wajib_bekerja ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* WILAYAH SPESIFIK */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Wilayah Spesifik (Opsional)
                </label>
                <select
                  value={formData.id_wilayah}
                  onChange={(e) => setFormData({ ...formData, id_wilayah: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                >
                  <option value="">Berlaku Semua Wilayah (Umum)</option>
                  {listWilayah.map((w) => (
                    <option key={w.id} value={w.id}>
                      RT {w.rt} / RW {w.rw}
                    </option>
                  ))}
                </select>
              </div>

              {/* STATUS AKTIF / NONAKTIF */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-semibold text-slate-600">Status Aktifkan Iuran:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-sky-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

            </form>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                form="master-iuran-form"
                disabled={saving}
                className="w-1/2 py-3 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-700 flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editId ? 'Simpan' : 'Tambah'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}