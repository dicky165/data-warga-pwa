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

  // Properti Pejabat RT & RW
  namaKetuaRt?: string;
  nama_ketua_rt?: string;
  noHpKetuaRt?: string;
  urlTtdKetuaRt?: string;
  url_ttd_ketua_rt?: string;

  namaKetuaRw?: string;
  nama_ketua_rw?: string;
  noHpKetuaRw?: string;
  urlTtdKetuaRw?: string;
  url_ttd_ketua_rw?: string;
}

const loadImage = (url?: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!url || !url.trim() || (!url.startsWith('http') && !url.startsWith('data:image'))) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const cetakSuratPengantar = async (data: DataSurat) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const namaRt = data.namaKetuaRt || data.nama_ketua_rt || '';
  const namaRw = data.namaKetuaRw || data.nama_ketua_rw || '';
  const ttdRtUrl = data.urlTtdKetuaRt || data.url_ttd_ketua_rt || '';
  const ttdRwUrl = data.urlTtdKetuaRw || data.url_ttd_ketua_rw || '';

  const [imgRt, imgRw] = await Promise.all([
    loadImage(ttdRtUrl),
    loadImage(ttdRwUrl)
  ]);

  // Kop Surat
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

  // Dynamic Keterangan
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

  // --- BLOK TANDA TANGAN (PRESISI & RATA TENGAH) ---
  const ttY = startY + 20;
  const leftX = 55;   // Titik tengah kolom kiri (RT)
  const rightX = 155; // Titik tengah kolom kanan (RW)

  doc.setFont('times', 'normal');
  // Tanggal sejajar tepat di atas "Ketua RW"
  doc.text(`Wilayah RT ${data.rt}, ${today}`, rightX, ttY, { align: 'center' });
  
  // Jabatan RT & RW Rata Tengah
  doc.text('Ketua RT', leftX, ttY + 6, { align: 'center' });
  doc.text('Ketua RW', rightX, ttY + 6, { align: 'center' });

  // Gambar TTD Terpasang Tepat di Tengah Kolom
  if (imgRt) {
    doc.addImage(imgRt, 'PNG', leftX - 17.5, ttY + 9, 35, 18);
  }
  if (imgRw) {
    doc.addImage(imgRw, 'PNG', rightX - 17.5, ttY + 9, 35, 18);
  }

  // Nama Pejabat Cetak Tebal & Rata Tengah
  doc.setFont('times', 'bold');
  const labelRt = namaRt.trim() ? `( ${namaRt} )` : '( .................................... )';
  const labelRw = namaRw.trim() ? `( ${namaRw} )` : '( .................................... )';

  doc.text(labelRt, leftX, ttY + 32, { align: 'center' });
  doc.text(labelRw, rightX, ttY + 32, { align: 'center' });

  doc.save(`Surat_${data.jenisSurat}_${data.namaWarga.replace(/\s+/g, '_')}.pdf`);
};