import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Tambahkan ini agar kalau dibuka di browser keluar tulisan tes, bukan error 405
export async function GET() {
  return NextResponse.json({ message: 'API Endpoint Create Pengurus Ready!' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nama_lengkap, role, rw_tugas, no_whatsapp } = body;

    if (!email || !password || !nama_lengkap) {
      return NextResponse.json(
        { error: 'Email, password, dan nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Kunci konfigurasi Supabase (SUPABASE_SERVICE_ROLE_KEY) belum ada di .env.local' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Buat User di Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nama_lengkap,
        role: role || 'pengurus',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Simpan ke tabel profil_pengurus
    const { error: profileError } = await supabaseAdmin
      .from('profil_pengurus')
      .upsert({
        id: userId,
        nama_lengkap,
        role: role || 'pengurus',
        rw_tugas: rw_tugas || '01',
        no_whatsapp: no_whatsapp || null,
        email: email,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Akun pengurus berhasil dibuat',
      user: { id: userId, email, nama_lengkap },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}