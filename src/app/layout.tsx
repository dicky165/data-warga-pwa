import React from 'react';
import Link from 'next/link';
import { Home, PlusCircle, Receipt, Users, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 antialiased">
      {/* Header Mobile */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800">PWA Data Warga</h1>
            <p className="text-[10px] text-slate-400">RT 001 / RW 001</p>
          </div>
        </div>

        {/* Tombol Logout (Redirect ke Login) */}
        <Link
          href="/login"
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
        </Link>
      </header>

      {/* Area Konten Utama */}
      <main className="p-4 max-w-md mx-auto">{children}</main>

      {/* Navigation Bar Bawah (Mobile Bottom Nav) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center max-w-md mx-auto">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-sky-600 font-semibold"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Beranda</span>
        </Link>

        <Link
          href="/pembayaran"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-600"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px]">Iuran</span>
        </Link>

        <Link
          href="/pengeluaran"
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-600"
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">Nota Kas</span>
        </Link>
      </nav>
    </div>
  );
}