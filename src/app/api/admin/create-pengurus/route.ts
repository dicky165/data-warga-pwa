import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Endpoint GET untuk pengetesan ketersediaan API
export async function GET() {
  return NextResponse.json({ message: 'API Endpoint Create Pengurus/Petugas Ready!' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nama_lengkap, role, id_desa, rw_tugas, no_whatsapp } = body;

    // Validasi field wajib
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
        { error: 'Kunci konfigurasi Supabase (SUPABASE_SERVICE_ROLE_KEY) belum dikonfigurasi di file .env.local' },
        { status: 500 }
      );
    }

    // Client khusus Admin dengan Service Role Key untuk bypass RLS & membuat user
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
        role: role || 'petugas',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Simpan profil lengkap ke tabel profil_pengurus sesuai skema database
    const { error: profileError } = await supabaseAdmin
      .from('profil_pengurus')
      .upsert({
        id: userId,
        nama_lengkap,
        role: role || 'petugas',
        id_desa: id_desa ? Number(id_desa) : 2,
        rw_tugas: rw_tugas || '010',
        no_whatsapp: no_whatsapp || null,
        email: email,
      });

    // Rollback: Hapus user dari Supabase Auth jika gagal insert ke tabel profil
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Akun berhasil dibuat',
      user: { id: userId, email, nama_lengkap, role: role || 'petugas' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
}