'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  LogOut, 
  Key, 
  Loader2, 
  Receipt, 
  Wallet, 
  ChevronRight
} from 'lucide-react';

function AkunPetugasContent() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile State
  const [userInfo, setUserInfo] = useState<{
    email: string;
    namaLengkap: string;
    jabatan: string;
    rw: string;
    rt: string;
  }>({
    email: '',
    namaLengkap: '',
    jabatan: 'Petugas Lapangan',
    rw: '-',
    rt: '-'
  });

  // Stats State
  const [stats, setStats] = useState({
    totalTransaksi: 0,
    totalNominal: 0,
  });

  // State Change Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // 1. Fetch Profile & Stats Transaksi Khusus Petugas Ini
  const fetchProfileAndStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch Detail Profil Pengurus
      const { data: profile } = await supabase
        .from('profil_pengurus')
        .select('nama_lengkap, id_jabatan, id_wilayah')
        .eq('id', user.id)
        .single();

      setUserInfo({
        email: user.email || '-',
        namaLengkap: profile?.nama_lengkap || user.user_metadata?.full_name || 'Petugas Lapangan',
        jabatan: 'Petugas Lapangan / Penagih',
        rw: '-',
        rt: '-'
      });

      // Fetch Stats Transaksi yang HANYA dicatat oleh Petugas Ini (pencatat_by_id)
      const { data: transaksi, error } = await supabase
        .from('pembayaran_iuran')
        .select('jumlah_bayar')
        .eq('pencatat_by_id', user.id);

      if (error) throw error;

      if (transaksi) {
        const totalCount = transaksi.length;
        const totalAmount = transaksi.reduce((acc, curr) => acc + Number(curr.jumlah_bayar || 0), 0);
        setStats({
          totalTransaksi: totalCount,
          totalNominal: totalAmount
        });
      }
    } catch (err: any) {
      console.error('Gagal memuat profil:', err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchProfileAndStats();
  }, [fetchProfileAndStats]);

  // 2. Fungsi Logout
  const handleLogout = async () => {
    const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari akun petugas?');
    if (!confirmLogout) return;

    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      alert('Gagal keluar: ' + err.message);
      setLoggingOut(false);
    }
  };

  // 3. Ubah Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Kata sandi minimal 6 karakter');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert('✅ Kata sandi berhasil diperbarui!');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      alert('Gagal mengupdate password: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs font-medium">Memuat profil akun...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-br from-teal-700 to-emerald-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-bold text-2xl shrink-0 shadow-md">
            {userInfo.namaLengkap.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{userInfo.namaLengkap}</h2>
            <p className="text-xs text-teal-100/80 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
              {userInfo.jabatan}
            </p>
            <p className="text-[11px] text-teal-200/70 truncate mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {userInfo.email}
            </p>
          </div>
        </div>
      </div>

      {/* Ringkasan Performa Penagihan (Sesuai Petugas Login) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Total Diberikan</p>
            <p className="text-sm font-bold text-slate-800">{stats.totalTransaksi} Transaksi</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Total Terkumpul</p>
            <p className="text-xs font-bold text-teal-700">
              Rp {stats.totalNominal.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* Pengaturan & Akses Akun */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
        <div className="p-3.5 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Pengaturan Keamanan
          </h3>
        </div>

        {/* Tombol Toggle Form Password */}
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <span>Ubah Kata Sandi</span>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
        </button>

        {/* Form Ubah Password (Collapsible) */}
        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="p-3.5 bg-slate-50 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Kata Sandi</span>
            </button>
          </form>
        )}

        {/* Tombol Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full p-3.5 text-left flex items-center justify-between hover:bg-rose-50/50 transition-colors text-xs font-semibold text-rose-600"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </div>
            <span>Keluar Akun (Logout)</span>
          </div>
        </button>
      </div>

      {/* App Version Info */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-400 font-medium">
          Aplikasi Penagihan Iuran Lapangan v1.0 &bull; 2026
        </p>
      </div>
    </div>
  );
}

export default function AkunPetugasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs">Memuat halaman akun...</span>
        </div>
      }
    >
      <AkunPetugasContent />
    </Suspense>
  );
}