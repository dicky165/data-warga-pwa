// src/lib/generateSurat.ts
import jsPDF from 'jspdf';

export interface DataSurat {
  jenisSurat: 'KEMATIAN' | 'BELUM_BEKERJA' | 'SKTM_BEROBAT';
  namaWarga: string;
  nik: string;
  noKK: string;
  ttl: string;
  alamat: string;
  rt: string;
  rw: string;
  desa: string;
  tglWafat?: string;
  sebabWafat?: string;
}

export const cetakSuratPengantar = (data: DataSurat) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Kop Surat Simple RT/RW
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(`RUKUN TETANGGA ${data.rt} RUKUN WARGA ${data.rw}`, 105, 15, { align: 'center' });
  doc.text(`DESA/KELURAHAN ${data.desa.toUpperCase()}`, 105, 21, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);

  // Judul Surat
  doc.setFontSize(11);
  let judul = 'SURAT PENGANTAR / KETERANGAN';
  if (data.jenisSurat === 'KEMATIAN') judul = 'SURAT PENGANTAR KETERANGAN KEMATIAN';
  if (data.jenisSurat === 'BELUM_BEKERJA') judul = 'SURAT KETERANGAN BELUM BEKERJA';
  if (data.jenisSurat === 'SKTM_BEROBAT') judul = 'SURAT KETERANGAN TIDAK MAMPU (BEROBAT)';

  doc.text(judul, 105, 35, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.text(`Nomor: ..... / RT.${data.rt}-RW.${data.rw} / ${new Date().getFullYear()}`, 105, 41, { align: 'center' });

  // Isi Data Warga
  doc.text('Yang bertanda tangan di bawah ini Ketua RT/RW setempat, menerangkan bahwa:', 20, 55);

  const detail = [
    [`Nama Lengkap`, `: ${data.namaWarga}`],
    [`NIK`, `: ${data.nik}`],
    [`No. Kartu Keluarga`, `: ${data.noKK}`],
    [`Tempat, Tgl Lahir`, `: ${data.ttl}`],
    [`Alamat`, `: ${data.alamat}`],
  ];

  let startY = 63;
  detail.forEach(([label, val]) => {
    doc.text(label, 25, startY);
    doc.text(val, 70, startY);
    startY += 6;
  });

  // Dynamic Keterangan Berdasarkan Jenis Surat
  startY += 4;
  if (data.jenisSurat === 'KEMATIAN') {
    doc.text('Bahwa nama tersebut di atas benar telah meninggal dunia pada:', 20, startY);
    startY += 6;
    doc.text(`- Tanggal Wafat : ${data.tglWafat || '-'}`, 25, startY);
    startY += 6;
    doc.text(`- Penyebab       : ${data.sebabWafat || 'Sakit / Usia Lanjut'}`, 25, startY);
    startY += 8;
    doc.text('Surat pengantar ini dibuat untuk keperluan pengurusan Akta Kematian di Desa/Kelurahan.', 20, startY);
  } else if (data.jenisSurat === 'BELUM_BEKERJA') {
    doc.text('Bahwa nama tersebut di atas benar merupakan warga kami yang saat ini statusnya', 20, startY);
    startY += 6;
    doc.text('SEDANG TIDAK BEKERJA / BELUM BEKERJA.', 20, startY);
    startY += 8;
    doc.text('Surat pengantar ini dibuat sebagai kelengkapan administrasi pengurusan ke Desa/Kelurahan.', 20, startY);
  } else if (data.jenisSurat === 'SKTM_BEROBAT') {
    doc.text('Bahwa nama tersebut di atas benar warga kami dari keluarga Kurang Mampu (BDM).', 20, startY);
    startY += 6;
    doc.text('Surat pengantar ini diberikan untuk keperluan Pengurusan SKTM Berobat / Layanan Kesehatan', 20, startY);
    startY += 6;
    doc.text('di Rumah Sakit / Puskesmas.', 20, startY);
  }

  // Tanda Tangan Block
  const ttY = startY + 25;
  doc.text(`Wilayah RT ${data.rt}, ${today}`, 130, ttY);
  doc.text('Ketua RT', 35, ttY + 6);
  doc.text('Ketua RW', 140, ttY + 6);

  doc.text('( .................................... )', 25, ttY + 30);
  doc.text('( .................................... )', 130, ttY + 30);

  // Auto Download PDF
  doc.save(`Surat_${data.jenisSurat}_${data.namaWarga.replace(/\s+/g, '_')}.pdf`);
};