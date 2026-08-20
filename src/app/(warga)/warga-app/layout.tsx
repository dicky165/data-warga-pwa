'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, MailCheck, ShieldCheck, User } from 'lucide-react';

export default function WargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Beranda', href: '/warga-app', icon: Home },
    { label: 'Cek Iuran', href: '/warga-app/iuran', icon: Receipt },
    { label: 'Layanan Surat', href: '/warga-app/surat', icon: MailCheck },
    { label: 'Akun', href: '/warga-app/akun', icon: User }, // <-- Menu baru
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 antialiased">
      {/* Header Warga */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800">Portal Warga Balong</h1>
            <p className="text-[10px] text-slate-400">RW 010 - Informasi & Layanan</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Warga Terverifikasi</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">{children}</main>

      {/* Bottom Nav Warga */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-400 hover:text-emerald-600 font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}