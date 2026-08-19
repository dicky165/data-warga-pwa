export interface JenisSuratConfig {
  id: 'PINDAH_DOMISILI' | 'IJIN_KERAMAIAN' | 'KETERANGAN_UMKM' | 'KETERANGAN_UMUM';
  label: string;
  kodeSurat: string; // misal: 'SKP' untuk Pindah, 'SKU' untuk UMKM
  deskripsi?: string;
}

export const LIST_JENIS_SURAT: JenisSuratConfig[] = [
  { 
    id: 'PINDAH_DOMISILI', 
    label: 'Surat Pengantar Pindah Domisili', 
    kodeSurat: 'SKP',
    deskripsi: 'Untuk keperluan kepindahan alamat tempat tinggal warga'
  },
  { 
    id: 'IJIN_KERAMAIAN', 
    label: 'Surat Izin Keramaian / Acara', 
    kodeSurat: 'SIK',
    deskripsi: 'Untuk izin penyelenggaraan acara/hajat di lingkungan'
  },
  { 
    id: 'KETERANGAN_UMKM', 
    label: 'Surat Keterangan Usaha (UMKM)', 
    kodeSurat: 'SKU',
    deskripsi: 'Untuk bukti kepemilikan/pengelolaan usaha lokal'
  },
  { 
    id: 'KETERANGAN_UMUM', 
    label: 'Surat Pengantar Keterangan Umum', 
    kodeSurat: 'SKU-U',
    deskripsi: 'Untuk keperluan administrasi umum lainnya'
  },
];