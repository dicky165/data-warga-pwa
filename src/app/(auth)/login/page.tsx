'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, User, Lock, LogIn, AlertCircle, Users, BadgeCheck } from 'lucide-react';

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<'warga' | 'pengurus' | 'petugas'>('warga');
  const [identifier, setIdentifier] = useState(''); // NIK/Username (Warga) atau Email (Pengurus & Petugas)
  const [password, setPassword] = useState('');     // No. KK/Password (Warga) atau Password (Pengurus & Petugas)
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (loginMode === 'warga') {
        // 1. LOGIN WARGA
        const res = await fetch('/api/auth/login-warga', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: identifier.trim(),
            password: password.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Gagal masuk. Periksa NIK/Username dan No. KK/Kata Sandi Anda.');
        }

        await supabase.auth.setSession(data.session);
        router.push('/warga-app');

      } else if (loginMode === 'petugas') {
        // 2. LOGIN PETUGAS LAPANGAN
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });

        if (error) {
          throw new Error(error.message || 'Gagal masuk. Periksa email dan kata sandi petugas Anda.');
        }

        router.push('/iuran/catat');

      } else {
        // 3. LOGIN PENGURUS (ADMIN)
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });

        if (error) {
          throw new Error(error.message || 'Gagal masuk. Periksa email dan kata sandi Anda.');
        }

        router.push('/');
      }

      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 max-w-sm mx-auto">
      {/* Header Form */}
      <div className="flex flex-col items-center text-center mb-5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg transition-all ${
            loginMode === 'warga'
              ? 'bg-emerald-600 shadow-emerald-600/30'
              : loginMode === 'petugas'
              ? 'bg-teal-600 shadow-teal-600/30'
              : 'bg-sky-600 shadow-sky-600/30'
          }`}
        >
          {loginMode === 'warga' ? (
            <Users className="w-8 h-8" />
          ) : loginMode === 'petugas' ? (
            <BadgeCheck className="w-8 h-8" />
          ) : (
            <ShieldCheck className="w-8 h-8" />
          )}
        </div>
        <h1 className="text-xl font-bold text-slate-800">Sistem Data Warga</h1>
        <p className="text-xs text-slate-500 mt-1">
          {loginMode === 'warga'
            ? 'Portal Layanan & Transparansi Warga'
            : loginMode === 'petugas'
            ? 'Aplikasi Penagihan & Catat Iuran Lapangan'
            : 'Masuk untuk Pengurus RT/RW'}
        </p>
      </div>

      {/* Tab Switcher Mode Login (3 Pilihan) */}
      <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold mb-5 gap-0.5">
        <button
          type="button"
          onClick={() => {
            setLoginMode('warga');
            setErrorMessage(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            loginMode === 'warga'
              ? 'bg-white text-emerald-600 shadow-sm font-bold'
              : 'text-slate-500'
          }`}
        >
          Warga
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('petugas');
            setErrorMessage(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            loginMode === 'petugas'
              ? 'bg-white text-teal-600 shadow-sm font-bold'
              : 'text-slate-500'
          }`}
        >
          Petugas
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('pengurus');
            setErrorMessage(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            loginMode === 'pengurus'
              ? 'bg-white text-sky-600 shadow-sm font-bold'
              : 'text-slate-500'
          }`}
        >
          Pengurus
        </button>
      </div>

      {/* Pesan Error */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Login */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Field Identitas / Username / Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            {loginMode === 'warga' ? 'Username / NIK' : 'Alamat Email'}
          </label>
          <div className="relative flex items-center">
            <User className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                loginMode === 'warga'
                  ? 'Masukkan NIK atau Username Anda'
                  : loginMode === 'petugas'
                  ? 'petugas@rt-rw.id'
                  : 'pengurus@rt-rw.id'
              }
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Field Kata Sandi / No. KK */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            {loginMode === 'warga' ? 'Kata Sandi / No. KK' : 'Kata Sandi'}
          </label>
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                loginMode === 'warga'
                  ? 'Masukkan No. KK atau Kata Sandi'
                  : '••••••••'
              }
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full h-12 mt-2 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md ${
            loginMode === 'warga'
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
              : loginMode === 'petugas'
              ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-teal-600/20'
              : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sky-600/20'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span>
            {loading
              ? 'Memproses...'
              : loginMode === 'warga'
              ? 'Masuk Portal Warga'
              : loginMode === 'petugas'
              ? 'Masuk Mode Petugas'
              : 'Masuk Aplikasi Admin'}
          </span>
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">
          Aplikasi Manajemen Warga PWA &copy; 2026
        </p>
      </div>
    </div>
  );
}