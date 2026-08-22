'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PlusCircle, Receipt, Users, Coins, LogOut, Mail, Megaphone, HandCoins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // State untuk menyimpan jumlah antrean notification
  const [pendingSuratCount, setPendingSuratCount] = useState<number>(0);
  const [unsubmittedIuranCount, setUnsubmittedIuranCount] = useState<number>(0);

  // Fungsi Fetch Hitungan Data Pending
  const fetchCounts = async () => {
    // 1. Hitung Surat Pengantar berstatus 'pending'
    const { count: suratCount } = await supabase
      .from('surat_pengantar')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingSuratCount(suratCount || 0);

    // 2. Hitung Pembayaran Iuran yang belum disetor (is_disetor = false)
    const { count: iuranCount } = await supabase
      .from('pembayaran_iuran')
      .select('*', { count: 'exact', head: true })
      .eq('is_disetor', false);

    setUnsubmittedIuranCount(iuranCount || 0);
  };

  useEffect(() => {
    fetchCounts();

    // Setup Realtime Listener Supabase
    const channel = supabase
      .channel('dashboard-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'surat_pengantar' },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pembayaran_iuran' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fungsi Logout Supabase
  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  // Konfigurasi Navigasi Bawah
  const navItems = [
    {
      label: 'Beranda',
      href: '/',
      icon: Home,
      badge: 0,
    },
    {
      label: 'Warga',
      href: '/warga',
      icon: Users,
      badge: 0,
    },
    {
      label: 'Surat',
      href: '/surat',
      icon: Mail,
      badge: pendingSuratCount,
    },
    {
      label: 'Iuran',
      href: '/iuran',
      icon: PlusCircle,
      badge: unsubmittedIuranCount,
    },
    {
      label: 'Master Iuran',
      href: '/master-iuran',
      icon: Coins,
      badge: 0,
    },
    {
      label: 'Nota Kas',
      href: '/pengeluaran',
      icon: Receipt,
      badge: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 antialiased">
      {/* Header Mobile */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800">Data Warga Balong</h1>
            <p className="text-[10px] text-slate-400">RT 001 - RT 002 / RW 010</p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-1.5">
          {/* Shortcut Konfirmasi Setoran Kas Petugas */}
          <Link
            href="/iuran/setoran-kas"
            title="Konfirmasi Setoran Kas"
            className={`relative p-2 rounded-xl transition-all flex items-center gap-1 ${
              pathname.startsWith('/iuran/setoran-kas')
                ? 'bg-amber-100 text-amber-700 font-semibold'
                : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600'
            }`}
          >
            <HandCoins className="w-4 h-4" />
            {unsubmittedIuranCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unsubmittedIuranCount > 99 ? '99+' : unsubmittedIuranCount}
              </span>
            )}
          </Link>

          {/* Shortcut Pengumuman */}
          <Link
            href="/pengumuman"
            title="Pengumuman Warga"
            className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
              pathname.startsWith('/pengumuman')
                ? 'bg-sky-100 text-sky-600 font-semibold'
                : 'bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600'
            }`}
          >
            <Megaphone className="w-4 h-4" />
          </Link>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Area Konten */}
      <main className="p-4 max-w-md mx-auto">{children}</main>

      {/* Navigation Bar Bawah */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 transition-colors ${
                isActive
                  ? 'text-sky-600 font-semibold'
                  : 'text-slate-400 hover:text-sky-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] font-bold h-3.5 min-w-[14px] px-0.5 rounded-full flex items-center justify-center border border-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}