import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 antialiased">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}