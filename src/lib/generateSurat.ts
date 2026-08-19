import jsPDF from 'jspdf';

export type JenisSuratPengantar = 
  | 'KTP_KK'
  | 'AKTA'
  | 'SKCK'
  | 'NIKAH_PINDAH'
  | 'IZIN_KERAMAIAN'
  | 'SKTM_UMKM'
  | 'KEMATIAN'
  | 'BELUM_BEKERJA'
  | 'SKTM_BEROBAT';

export interface DataSurat {
  jenisSurat: JenisSuratPengantar;
  namaWarga: string;
  nik: string;
  noKK: string;
  ttl?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  alamat: string;
  rt: string;
  rw: string;
  desa: string;
  
  // Data Tambahan Opsional
  pekerjaan?: string;
  agama?: string;
  statusPerkawinan?: string;
  keperluan?: string;
  namaUsaha?: string; // Khusus UMKM
  tglWafat?: string;   // Khusus Kematian
  sebabWafat?: string; // Khusus Kematian

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

// Helper untuk merapikan Tempat & Tanggal Lahir ke Format Indonesia
const formatTtlIndo = (tempat?: string, tanggal?: string, rawTtl?: string): string => {
  // 1. Jika tempat dan tanggal terpisah diisi
  if (tempat || tanggal) {
    const tempatFormatted = tempat
      ? tempat.trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
      : '-';

    if (!tanggal || !tanggal.trim()) {
      return tempatFormatted;
    }

    const dateObj = new Date(tanggal);
    if (!isNaN(dateObj.getTime())) {
      const tglIndo = dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      return `${tempatFormatted}, ${tglIndo}`;
    }

    return `${tempatFormatted}, ${tanggal}`;
  }

  // 2. Fallback jika hanya membawa string 'ttl' Gabungan (misal: "bandung, 1975-12-01")
  if (rawTtl && rawTtl.trim()) {
    const parts = rawTtl.split(',');
    if (parts.length === 2) {
      const tmpt = parts[0].trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
      const tglStr = parts[1].trim();
      const dateObj = new Date(tglStr);

      if (!isNaN(dateObj.getTime())) {
        const tglIndo = dateObj.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        return `${tmpt}, ${tglIndo}`;
      }
      return `${tmpt}, ${tglStr}`;
    }
    return rawTtl;
  }

  return '-';
};

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

  // --- 1. KOP SURAT ---
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text(`RUKUN TETANGGA ${data.rt} RUKUN WARGA ${data.rw}`, 105, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`DESA / KELURAHAN ${data.desa.toUpperCase()}`, 105, 21, { align: 'center' });
  doc.setLineWidth(0.8);
  doc.line(20, 25, 190, 25);
  doc.setLineWidth(0.2);
  doc.line(20, 26, 190, 26);

  // --- 2. JUDUL SURAT & NOMOR ---
  doc.setFontSize(11);
  let judul = 'SURAT PENGANTAR / KETERANGAN';
  let kodeKode = 'SP';

  switch (data.jenisSurat) {
    case 'KTP_KK':
      judul = 'SURAT PENGANTAR PERMOHONAN KTP / KK';
      kodeKode = 'SP-KTP';
      break;
    case 'AKTA':
      judul = 'SURAT PENGANTAR PERMOHONAN AKTA KELAHIRAN';
      kodeKode = 'SP-AKTA';
      break;
    case 'SKCK':
      judul = 'SURAT PENGANTAR SKCK (CATATAN KEPOLISIAN)';
      kodeKode = 'SP-SKCK';
      break;
    case 'NIKAH_PINDAH':
      judul = 'SURAT PENGANTAR NIKAH / PINDAH DOMISILI';
      kodeKode = 'SP-NIKAH';
      break;
    case 'IZIN_KERAMAIAN':
      judul = 'SURAT PENGANTAR IZIN KERAMAIAN / KEGIATAN';
      kodeKode = 'SP-KERAMAIAN';
      break;
    case 'SKTM_UMKM':
      judul = 'SURAT KETERANGAN DOMISILI USAHA MIKRO (UMKM)';
      kodeKode = 'SK-UMKM';
      break;
    case 'KEMATIAN':
      judul = 'SURAT PENGANTAR KETERANGAN KEMATIAN';
      kodeKode = 'SK-KEMATIAN';
      break;
    case 'BELUM_BEKERJA':
      judul = 'SURAT KETERANGAN BELUM BEKERJA';
      kodeKode = 'SK-BELUM-KERJA';
      break;
    case 'SKTM_BEROBAT':
      judul = 'SURAT KETERANGAN TIDAK MAMPU (BEROBAT)';
      kodeKode = 'SKTM-BEROBAT';
      break;
  }

  doc.text(judul, 105, 35, { align: 'center' });
  
  // Garis bawah judul
  const textWidth = doc.getTextWidth(judul);
  doc.line(105 - (textWidth / 2), 36, 105 + (textWidth / 2), 36);

  doc.setFont('times', 'normal');
  doc.text(`Nomor: ${kodeKode}/...../RT.${data.rt}-RW.${data.rw}/${new Date().getFullYear()}`, 105, 42, { align: 'center' });

  // --- 3. ISI DATA WARGA ---
  doc.text('Yang bertanda tangan di bawah ini Pengurus RT/RW setempat, menerangkan dengan sebenarnya bahwa:', 20, 53);

  // Format Teks & TTL Indonesia
  const agamaWarga = data.agama ? data.agama.toUpperCase() : '-';
  const pekerjaanWarga = data.pekerjaan ? data.pekerjaan.toUpperCase() : '-';
  const ttlRapi = formatTtlIndo(data.tempatLahir, data.tanggalLahir, data.ttl);

  const detail = [
    [`Nama Lengkap`, `: ${data.namaWarga}`],
    [`NIK`, `: ${data.nik}`],
    [`No. Kartu Keluarga`, `: ${data.noKK}`],
    [`Tempat, Tgl Lahir`, `: ${ttlRapi}`],
    [`Agama`, `: ${agamaWarga}`],
    [`Pekerjaan`, `: ${pekerjaanWarga}`],
    [`Alamat Lengkap`, `: ${data.alamat}`],
  ];

  let startY = 60;
  detail.forEach(([label, val]) => {
    doc.text(label, 25, startY);
    doc.text(val, 70, startY);
    startY += 6;
  });

  // --- 4. DYNAMIC ISI KETERANGAN BERDASARKAN PERUNTUKAN ---
  startY += 4;
  doc.setFont('times', 'normal');

  switch (data.jenisSurat) {
    case 'KTP_KK':
      doc.text('Orang tersebut di atas adalah benar-benar warga kami yang berdomisili di alamat tersebut.', 20, startY);
      startY += 6;
      doc.text('Surat pengantar ini dibuat sebagai persyaratan pembuatan / pembaruan Kartu Tanda Penduduk (KTP)', 20, startY);
      startY += 6;
      doc.text('dan / atau Kartu Keluarga (KK) di tingkat Desa/Kelurahan & Kecamatan.', 20, startY);
      break;

    case 'AKTA':
      doc.text('Orang tersebut di atas adalah benar-benar warga kami dan mengajukan permohonan penerbitan', 20, startY);
      startY += 6;
      doc.text('Akta Kelahiran bagi anggota keluarganya.', 20, startY);
      startY += 6;
      doc.text('Surat pengantar ini diberikan untuk melengkapi persyaratan administrasi di Kantor Desa / Kelurahan.', 20, startY);
      break;

    case 'SKCK':
      doc.text('Bahwa nama tersebut di atas adalah benar warga kami yang berkelakuan baik, tidak sedang dalam', 20, startY);
      startY += 6;
      doc.text('proses hukum, serta belum pernah terlibat dalam tindakan kriminal atau kejahatan apapun.', 20, startY);
      startY += 6;
      doc.text(`Surat pengantar ini dibuat untuk keperluan: ${data.keperluan || 'Pengurusan SKCK di Kepolisian (Polsek/Polres)'}.`, 20, startY);
      break;

    case 'NIKAH_PINDAH':
      doc.text('Bahwa nama tersebut di atas adalah benar warga kami yang bermaksud mengurus administrasi', 20, startY);
      startY += 6;
      doc.text('Pernikahan / Surat Keterangan Pindah Domisili Keluar Wilayah.', 20, startY);
      startY += 6;
      doc.text('Demikian surat pengantar ini dibuat agar dapat dipergunakan sebagaimana mestinya di tingkat Desa.', 20, startY);
      break;

    case 'IZIN_KERAMAIAN':
      doc.text('Bahwa nama tersebut di atas berniat mengadakan kegiatan/acara keramaian di lingkungan warga.', 20, startY);
      startY += 6;
      doc.text(`Keperluan Acara : ${data.keperluan || 'Resepsi / Syukuran / Kegiatan Masyarakat'}`, 25, startY);
      startY += 6;
      doc.text('Pada dasarnya Pengurus RT/RW tidak keberatan selama menjaga ketertiban, kebersihan, dan keharmonisan.', 20, startY);
      break;

    case 'SKTM_UMKM':
      doc.text('Bahwa nama tersebut di atas benar warga kami yang memiliki Usaha Mikro / Kecil (UMKM) berupa:', 20, startY);
      startY += 6;
      doc.text(`- Nama / Jenis Usaha : ${data.namaUsaha || data.keperluan || 'Usaha Perdagangan / Jasa'}`, 25, startY);
      startY += 6;
      doc.text('- Lokasi Usaha        : Wilayah RT ' + data.rt + ' RW ' + data.rw + ' Desa ' + data.desa, 25, startY);
      startY += 6;
      doc.text('Surat keterangan domisili usaha ini diberikan sebagai persyaratan pengajuan bantuan / legalitas UMKM.', 20, startY);
      break;

    case 'KEMATIAN':
      doc.text('Bahwa nama tersebut di atas benar-benar telah Meninggal Dunia pada:', 20, startY);
      startY += 6;
      const tglWafatRapi = data.tglWafat ? formatTtlIndo('', data.tglWafat) : '-';
      doc.text(`- Tanggal Meninggal : ${tglWafatRapi}`, 25, startY);
      startY += 6;
      doc.text(`- Penyebab          : ${data.sebabWafat || 'Sakit / Lanjut Usia'}`, 25, startY);
      startY += 8;
      doc.text('Surat pengantar ini dibuat untuk keperluan Pengurusan Akta Kematian di Desa/Kelurahan.', 20, startY);
      break;

    case 'BELUM_BEKERJA':
      doc.text('Bahwa nama tersebut di atas benar merupakan warga kami yang saat ini statusnya', 20, startY);
      startY += 6;
      doc.setFont('times', 'bold');
      doc.text('SEDANG TIDAK BEKERJA / BELUM BEKERJA.', 20, startY);
      doc.setFont('times', 'normal');
      startY += 8;
      doc.text('Surat pengantar ini dibuat sebagai kelengkapan administrasi melamar pekerjaan / pendaftaran.', 20, startY);
      break;

    case 'SKTM_BEROBAT':
      doc.text('Bahwa nama tersebut di atas benar warga kami yang berasal dari keluarga Kurang Mampu (BDM).', 20, startY);
      startY += 6;
      doc.text('Surat pengantar ini diberikan untuk keperluan Pengurusan SKTM Berobat / Layanan Kesehatan / BPJS', 20, startY);
      startY += 6;
      doc.text('di Rumah Sakit atau Puskesmas setempat.', 20, startY);
      break;
  }

  // --- 5. PARAGRAF PENUTUP ---
  startY += 12;
  doc.text('Demikian surat pengantar/keterangan ini kami buat dengan sebenarnya untuk dapat dipergunakan', 20, startY);
  startY += 6;
  doc.text('sebagaimana mestinya oleh yang berkepentingan.', 20, startY);

  // --- 6. BLOK TANDA TANGAN ---
  const ttY = startY + 15;
  const leftX = 55;   // Center kolom RT
  const rightX = 155; // Center kolom RW

  doc.setFont('times', 'normal');
  doc.text(`Wilayah RT ${data.rt}, ${today}`, rightX, ttY, { align: 'center' });
  
  doc.text('Ketua RT', leftX, ttY + 6, { align: 'center' });
  doc.text('Ketua RW', rightX, ttY + 6, { align: 'center' });

  // Gambar TTD
  if (imgRt) {
    doc.addImage(imgRt, 'PNG', leftX - 17.5, ttY + 9, 35, 18);
  }
  if (imgRw) {
    doc.addImage(imgRw, 'PNG', rightX - 17.5, ttY + 9, 35, 18);
  }

  // Nama Pejabat Cetak Tebal
  doc.setFont('times', 'bold');
  const labelRt = namaRt.trim() ? `( ${namaRt} )` : '( .................................... )';
  const labelRw = namaRw.trim() ? `( ${namaRw} )` : '( .................................... )';

  doc.text(labelRt, leftX, ttY + 32, { align: 'center' });
  doc.text(labelRw, rightX, ttY + 32, { align: 'center' });

  // Download PDF
  doc.save(`Surat_${data.jenisSurat}_${data.namaWarga.replace(/\s+/g, '_')}.pdf`);
};