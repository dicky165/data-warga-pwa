'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message || 'Gagal masuk. Periksa email dan kata sandi Anda.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
      {/* Header Form */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-sky-600/30">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Sistem Data Warga</h1>
        <p className="text-xs text-slate-500 mt-1">
          Masuk untuk mengelola data RT/RW & Transparansi Kas
        </p>
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
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Alamat Email
          </label>
          <div className="relative flex items-center">
            <Mail className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pengurus@rt-rw.id"
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Kata Sandi
          </label>
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Tombol Masuk (Min Touch Target 44px / h-12) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-sky-600/20"
        >
          <LogIn className="w-5 h-5" />
          <span>{loading ? 'Memproses...' : 'Masuk Aplikasi'}</span>
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">
          Aplikasi Manajemen Warga PWA &copy; 2026
        </p>
      </div>
    </div>
  );
}