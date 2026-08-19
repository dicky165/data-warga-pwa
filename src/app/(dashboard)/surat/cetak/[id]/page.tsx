'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Printer, ArrowLeft, Loader2, Download } from 'lucide-react';

interface WilayahRtRw {
  rt: string;
  rw: string;
  nama_kampung?: string;
  nama_ketua_rt?: string;
  nama_ketua_rw?: string;
  url_ttd_ketua_rt?: string;
  url_ttd_ketua_rw?: string;
  id_desa?: number;
  master_desa?: {
    nama_desa: string;
    kecamatan: string;
    kabupaten_kota: string;
    provinsi: string;
  };
}

interface SuratDetail {
  id: string;
  no_surat: string;
  nik_warga: string;
  jenis_surat: string;
  keterangan: string;
  tanggal_surat: string;
  id_wilayah_rt_rw?: number;
  detail_tambahan: {
    nama_pemohon?: string;
    catatan?: string;
    alamat_lokasi?: string;
    rt?: string;
    rw?: string;
  };
}

export default function CetakSuratPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [surat, setSurat] = useState<SuratDetail | null>(null);
  const [wilayah, setWilayah] = useState<WilayahRtRw | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        setLoading(true);

        // 1. Fetch Data Surat
        const { data: suratData, error: suratError } = await supabase
          .from('surat_pengantar')
          .select('*')
          .eq('id', id)
          .single();

        if (suratError) throw suratError;
        setSurat(suratData);

        let rawRt = suratData?.detail_tambahan?.rt || '';
        let rawRw = suratData?.detail_tambahan?.rw || '';

        if (!rawRt || !rawRw) {
          const matchRt = suratData?.no_surat?.match(/RT(\d+)/i);
          const matchRw = suratData?.no_surat?.match(/RW(\d+)/i);
          if (matchRt) rawRt = matchRt[1];
          if (matchRw) rawRw = matchRw[1];
        }

        const cleanRt = rawRt ? String(parseInt(rawRt, 10)) : '';
        const paddedRt = cleanRt ? cleanRt.padStart(3, '0') : '';
        const cleanRw = rawRw ? String(parseInt(rawRw, 10)) : '';
        const paddedRw = cleanRw ? cleanRw.padStart(3, '0') : '';

        // 2. Fetch Data Wilayah RT/RW
        let queryWilayah = supabase.from('wilayah_rt_rw').select('*');

        if (suratData?.id_wilayah_rt_rw) {
          queryWilayah = queryWilayah.eq('id', suratData.id_wilayah_rt_rw);
        } else if (cleanRt && cleanRw) {
          queryWilayah = queryWilayah
            .in('rt', [cleanRt, paddedRt, rawRt])
            .in('rw', [cleanRw, paddedRw, rawRw]);
        }

        const { data: listWilayah } = await queryWilayah;
        const targetWilayah = listWilayah && listWilayah.length > 0 ? listWilayah[0] : null;

        if (targetWilayah) {
          if (targetWilayah.id_desa) {
            const { data: desaData } = await supabase
              .from('master_desa')
              .select('*')
              .eq('id', targetWilayah.id_desa)
              .maybeSingle();

            targetWilayah.master_desa = desaData;
          } else {
            const { data: desaFallback } = await supabase
              .from('master_desa')
              .select('*')
              .limit(1)
              .maybeSingle();

            targetWilayah.master_desa = desaFallback;
          }

          setWilayah(targetWilayah);
        } else {
          const { data: defaultWilayah } = await supabase
            .from('wilayah_rt_rw')
            .select('*, master_desa(*)')
            .limit(1)
            .maybeSingle();
          
          if (defaultWilayah) setWilayah(defaultWilayah);
        }

      } catch (err: any) {
        setError(err.message || 'Gagal memuat data surat.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, supabase]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          <span>Memuat dokumen surat...</span>
        </div>
      </div>
    );
  }

  if (error || !surat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
          <p className="text-sm text-red-600 font-semibold mb-3">
            {error || 'Data surat tidak ditemukan.'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const desa = wilayah?.master_desa;
  const rtDisplay = wilayah?.rt || surat.detail_tambahan?.rt || '001';
  const rwDisplay = wilayah?.rw || surat.detail_tambahan?.rw || '010';

  // Penentuan Alamat / Lokasi Acara dari database
  const lokasiAcara = surat.detail_tambahan?.alamat_lokasi 
    || (wilayah?.nama_kampung ? `Kp. ${wilayah.nama_kampung}` : 'Kp. Balong');

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }
        @media print {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          header, footer, nav, aside, [class*="navbar"], [class*="header"], [class*="bottom"], .no-print {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #print-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            min-height: 0 !important;
          }

          #lembar-surat {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div id="print-wrapper" className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white flex flex-col items-center">
        {/* Navigasi / Bar Tombol */}
        <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between no-print">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 px-3.5 py-2 rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export ke PDF
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Langsung
            </button>
          </div>
        </div>

        {/* 📄 LEMBAR SURAT PENGANTAR */}
        <div 
          id="lembar-surat"
          className="w-[210mm] bg-white p-12 shadow-lg text-slate-900 font-serif border border-slate-200 box-sizing-border"
        >
          {/* Kop Surat Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              PEMERINTAH {desa?.kabupaten_kota || 'KABUPATEN BANDUNG'}
            </h2>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-0.5">
              KECAMATAN {desa?.kecamatan || 'PASIRJAMBU'}, DESA/KELURAHAN {desa?.nama_desa || 'CISONDARI'}
            </h3>
            <h3 className="text-base font-bold uppercase tracking-wider mt-1">
              RUKUN TETANGGA {rtDisplay} / RUKUN WARGA {rwDisplay}
            </h3>
          </div>

          {/* Judul & Nomor Surat */}
          <div className="text-center mb-6">
            <h1 className="text-base font-bold underline uppercase tracking-wide">
              SURAT PENGANTAR
            </h1>
            <p className="text-xs font-mono text-slate-700 mt-1">
              Nomor: {surat.no_surat}
            </p>
          </div>

          {/* Isi Surat */}
          <div className="text-xs leading-relaxed space-y-3">
            <p>
              Yang bertanda tangan di bawah ini Pengurus RT {rtDisplay} / RW {rwDisplay}, menerangkan bahwa:
            </p>

            <table className="w-full text-left border-collapse my-3 font-sans text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 w-36 font-semibold text-slate-700">Nama Lengkap</td>
                  <td className="py-1.5 w-4">:</td>
                  <td className="py-1.5 font-bold text-slate-900">{surat.detail_tambahan?.nama_pemohon || '-'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 font-semibold text-slate-700">NIK Warga</td>
                  <td className="py-1.5">:</td>
                  <td className="py-1.5 font-mono font-semibold">{surat.nik_warga}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 font-semibold text-slate-700">Jenis Surat</td>
                  <td className="py-1.5">:</td>
                  <td className="py-1.5 font-semibold text-sky-950">
                    {surat.jenis_surat.replace(/_/g, ' ')}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 font-semibold text-slate-700 align-top">Keperluan / Maksud</td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 align-top leading-relaxed">{surat.keterangan}</td>
                </tr>
                
                {/* 📍 BARIS LOKASI / ALAMAT (Diambil Otomatis dari nama_kampung di DB) */}
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 font-semibold text-slate-700 align-top">
                    {surat.jenis_surat.toLowerCase().includes('keramaian') ? 'Lokasi Acara' : 'Alamat / Kampung'}
                  </td>
                  <td className="py-1.5 align-top">:</td>
                  <td className="py-1.5 align-top text-slate-900 font-medium">
                    {lokasiAcara} RT {rtDisplay} / RW {rwDisplay} Desa {desa?.nama_desa || 'Cisondari'}
                  </td>
                </tr>

                {surat.detail_tambahan?.catatan && (
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-700 align-top">Catatan Tambahan</td>
                    <td className="py-1.5 align-top">:</td>
                    <td className="py-1.5 align-top text-slate-600">{surat.detail_tambahan.catatan}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="pt-1">
              Demikian surat pengantar ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh yang berkepentingan.
            </p>
          </div>

          {/* Area Tanggal & Tanda Tangan */}
          <div className="mt-12 pt-4 font-sans text-xs">
            <div className="text-right mb-4 text-slate-600">
              Dibuat tanggal: {new Date(surat.tanggal_surat).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>

            <div className="flex justify-between items-end text-center">
              {/* Ketua RT */}
              <div className="w-56 flex flex-col justify-between min-h-[120px]">
                <p className="font-semibold text-slate-800">
                  Ketua RT {rtDisplay}
                </p>
                
                {wilayah?.url_ttd_ketua_rt ? (
                  <div className="my-1 flex justify-center">
                    <img 
                      src={wilayah.url_ttd_ketua_rt} 
                      alt="TTD RT" 
                      className="h-14 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14" />
                )}

                <p className="font-bold underline uppercase text-slate-900">
                  ( {wilayah?.nama_ketua_rt || 'BPK. ILI'} )
                </p>
              </div>

              {/* Ketua RW */}
              <div className="w-56 flex flex-col justify-between min-h-[120px]">
                <p className="font-semibold text-slate-800">
                  Ketua RW {rwDisplay}
                </p>

                {wilayah?.url_ttd_ketua_rw ? (
                  <div className="my-1 flex justify-center">
                    <img 
                      src={wilayah.url_ttd_ketua_rw} 
                      alt="TTD RW" 
                      className="h-14 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14" />
                )}

                <p className="font-bold underline uppercase text-slate-900">
                  ( {wilayah?.nama_ketua_rw || 'BPK. ADE'} )
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}