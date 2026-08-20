import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = body.username?.toString().trim().toLowerCase();
    const password = body.password?.toString().trim();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'NIK/Username dan KK/Password wajib diisi!' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Format email default sistem warga
    const defaultEmail = username.includes('@') ? username : `${username}@warga.balong.id`;

    // -------------------------------------------------------------------
    // TAHAP 1: OTHENTIKASI LANGSUNG (Untuk user yang sudah ubah User/Pass)
    // -------------------------------------------------------------------
    // Coba login langsung menggunakan Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
      email: defaultEmail,
      password: password,
    });

    if (!authErr && authData.session) {
      return NextResponse.json({ success: true, session: authData.session });
    }

    // -------------------------------------------------------------------
    // TAHAP 2: JIKA TAHAP 1 GAGAL, CEK VIA NIK / USERNAME KUSTOM
    // -------------------------------------------------------------------
    // A. Cari di Supabase Auth berdasarkan metadata username_kustom
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const matchedUser = usersList?.users.find(
      (u) => u.user_metadata?.username_kustom?.toLowerCase() === username
    );

    if (matchedUser && matchedUser.email) {
      // Coba login dengan email asli dari user yang cocok username kustomnya
      const { data: customAuthData, error: customAuthErr } = await supabaseAdmin.auth.signInWithPassword({
        email: matchedUser.email,
        password: password,
      });

      if (!customAuthErr && customAuthData.session) {
        return NextResponse.json({ success: true, session: customAuthData.session });
      }
    }

    // -------------------------------------------------------------------
    // TAHAP 3: FALLBACK DARI TABEL DATA_WARGA (Untuk Warga Login Pertama Kali)
    // -------------------------------------------------------------------
    const { data: warga } = await supabaseAdmin
      .from('data_warga')
      .select('nik, no_kk, nama_lengkap')
      .eq('nik', username)
      .maybeSingle();

    if (!warga) {
      return NextResponse.json(
        { message: 'Akses Ditolak: NIK/Username tidak terdaftar dalam sistem!' },
        { status: 400 }
      );
    }

    if (warga.no_kk !== password) {
      return NextResponse.json(
        { message: 'Akses Ditolak: Kombinasi NIK dan No. KK / Password tidak cocok!' },
        { status: 400 }
      );
    }

    // Jika NIK & KK cocok tetapi akun Auth belum pernah dibuat otomatis:
    const initialEmail = `${warga.nik}@warga.balong.id`;
    
    await supabaseAdmin.auth.admin.createUser({
      email: initialEmail,
      password: warga.no_kk,
      email_confirm: true,
      user_metadata: {
        full_name: warga.nama_lengkap,
        nik: warga.nik,
        role: 'warga',
      },
    });

    const { data: newSession, error: sessionErr } = await supabaseAdmin.auth.signInWithPassword({
      email: initialEmail,
      password: warga.no_kk,
    });

    if (sessionErr) {
      return NextResponse.json({ message: sessionErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: newSession.session });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}