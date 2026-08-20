'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Lock, KeyRound, Save, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AkunWargaPage() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nik, setNik] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setNamaLengkap(user.user_metadata?.full_name || 'Warga');
        setNik(user.user_metadata?.nik || user.email?.split('@')[0] || '-');
        setUsername(user.user_metadata?.username_kustom || '');
      }
    };
    loadUserData();
  }, [supabase]);

  const handleUpdateProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error('Konfirmasi kata sandi tidak cocok!');
      }

      if (newPassword && newPassword.length < 6) {
        throw new Error('Kata sandi minimal 6 karakter!');
      }

      // 1. Update metadata username kustom
      const updatePayload: any = {
        data: { username_kustom: username.trim().toLowerCase() }
      };

      // 2. Update password jika diisi
      if (newPassword) {
        updatePayload.password = newPassword;
      }

      const { error } = await supabase.auth.updateUser(updatePayload);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Pengaturan akun berhasil diperbarui!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui akun' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Profil Banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">{namaLengkap}</h2>
          <p className="text-xs text-slate-400">NIK: {nik}</p>
        </div>
      </div>

      {/* Form Ubah Profil & Keamanan */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pengaturan Akun & Keamanan
          </h3>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfil} className="space-y-3">
          {/* Username Kustom */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Username Kustom (Opsional)</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buat username kustom..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Dapat digunakan sebagai pengganti NIK saat login portal warga.
            </p>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* Kata Sandi Baru */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="Kosongkan jika tidak ingin mengubah"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Konfirmasi Kata Sandi */}
          {newPassword && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Konfirmasi Kata Sandi Baru</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Simpan Perubahan...' : 'Simpan Perubahan'}</span>
          </button>
        </form>
      </div>

      {/* Tombol Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-2xl border border-rose-100 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar Dari Portal Warga</span>
      </button>
    </div>
  );
}