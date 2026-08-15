import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key untuk bypass RLS R/W saat diakses oleh Server Bot WA
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    /**
     * Catatan: Format payload menyesuaikan penyedia gateway WA (seperti Fonnte / Wablas).
     * Contoh di bawah menggunakan standar parameter umum: 'sender' dan 'message'.
     */
    const senderNumber = body.sender || body.from;
    const incomingMessage = (body.message || body.text || '').toLowerCase().trim();

    if (!senderNumber || !incomingMessage) {
      return NextResponse.json({ status: 'ignored', message: 'No message content' });
    }

    // Normalisasi format nomor WA (misal: 0812xxx -> 62812xxx)
    let formattedPhone = senderNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    // 1. Cari data warga berdasarkan nomor WhatsApp
    const { data: warga, error: wargaError } = await supabaseAdmin
      .from('data_warga')
      .select('nik, no_kk, nama_lengkap, kartu_keluarga(id_wilayah, wilayah_rt_rw(rt, rw, nama_kampung))')
      .eq('no_whatsapp', formattedPhone)
      .single();

    if (wargaError || !warga) {
      return NextResponse.json({
        reply: `Maaf, nomor WhatsApp Anda (${formattedPhone}) belum terdaftar di sistem RT/RW. Silakan hubungi pengurus RT untuk mendaftarkan nomor Anda.`,
      });
    }

    const namaWarga = warga.nama_lengkap;
    const noKK = warga.no_kk;
    const wilayahInfo = (warga.kartu_keluarga as any)?.wilayah_rt_rw;

    // -------------------------------------------------------------------------
    // PERINTAH 1: "info iuran"
    // -------------------------------------------------------------------------
    if (incomingMessage === 'info iuran') {
      const { data: masterIuran } = await supabaseAdmin
        .from('master_iuran')
        .select('*')
        .eq('is_active', true);

      const { data: historiBayar } = await supabaseAdmin
        .from('pembayaran_iuran')
        .select('id_iuran, jumlah_bayar')
        .eq('no_kk', noKK);

      let totalTagihanText = `*INFO IURAN WARGA*\n`;
      totalTagihanText += `Yth. *${namaWarga}*\n`;
      totalTagihanText += `Wilayah: ${wilayahInfo?.nama_kampung || 'RT'} (RT ${wilayahInfo?.rt || '-'}/RW ${wilayahInfo?.rw || '-'})\n`;
      totalTagihanText += `------------------------------------\n\n`;

      if (masterIuran && masterIuran.length > 0) {
        masterIuran.forEach((item, index) => {
          const totalDibayar = (historiBayar || [])
            .filter((p) => p.id_iuran === item.id)
            .reduce((acc, curr) => acc + Number(curr.jumlah_bayar), 0);

          const tarif = Number(item.tarif_nominal);
          const sisa = tarif - totalDibayar;

          if (sisa <= 0) {
            totalTagihanText += `${index + 1}. *${item.nama_iuran}*: Rp ${tarif.toLocaleString('id-ID')} / Rp ${tarif.toLocaleString('id-ID')} *(LUNAS)* ✅\n`;
          } else {
            totalTagihanText += `${index + 1}. *${item.nama_iuran}*: Rp ${totalDibayar.toLocaleString('id-ID')} / Rp ${tarif.toLocaleString('id-ID')} *(Kurang Rp ${sisa.toLocaleString('id-ID')})* ⚠️\n`;
          }
        });
      } else {
        totalTagihanText += `Belum ada data iuran aktif.\n`;
      }

      totalTagihanText += `\n_Terima kasih atas partisipasi Anda membangun kampung!_`;

      return NextResponse.json({ reply: totalTagihanText });
    }

    // -------------------------------------------------------------------------
    // PERINTAH 2: "info kas"
    // -------------------------------------------------------------------------
    if (incomingMessage === 'info kas') {
      // Hitung Total Iuran Masuk
      const { data: totalIuranData } = await supabaseAdmin
        .from('pembayaran_iuran')
        .select('jumlah_bayar');

      const totalMasuk = (totalIuranData || []).reduce(
        (acc, curr) => acc + Number(curr.jumlah_bayar),
        0
      );

      // Hitung Total Pengeluaran Kas
      const { data: totalKeluarData } = await supabaseAdmin
        .from('pengeluaran_kas')
        .select('nominal_keluar');

      const totalKeluar = (totalKeluarData || []).reduce(
        (acc, curr) => acc + Number(curr.nominal_keluar),
        0
      );

      const saldoKas = totalMasuk - totalKeluar;

      let replyKas = `*TRANSPARANSI KAS RT/RW*\n`;
      replyKas += `Lokasi: ${wilayahInfo?.nama_kampung || 'Kampung'} RT ${wilayahInfo?.rt || '-'}/RW ${wilayahInfo?.rw || '-'}\n`;
      replyKas += `------------------------------------\n`;
      replyKas += `📥 Total Pemasukan: Rp ${totalMasuk.toLocaleString('id-ID')}\n`;
      replyKas += `📤 Total Pengeluaran: Rp ${totalKeluar.toLocaleString('id-ID')}\n`;
      replyKas += `💰 *SISA SALDO KAS: Rp ${saldoKas.toLocaleString('id-ID')}*\n`;
      replyKas += `------------------------------------\n`;
      replyKas += `_Laporan ini diperbarui secara otomatis dari sistem PWA Data Warga._`;

      return NextResponse.json({ reply: replyKas });
    }

    // -------------------------------------------------------------------------
    // DEFAULT RESPONSE (Jika pesan tidak dikenali)
    // -------------------------------------------------------------------------
    const defaultReply = `Halo *${namaWarga}*,\nKetik salah satu perintah berikut:\n\n1. *info iuran* : Cek status tagihan iuran Anda\n2. *info kas* : Cek rincian saldo kas RT/RW`;

    return NextResponse.json({ reply: defaultReply });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}