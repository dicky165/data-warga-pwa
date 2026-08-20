import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Jalankan middleware pada seluruh rute KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api/ (Seluruh API routes seperti /api/auth/login-warga, /api/whatsapp, dll)
     * - sw.js & workbox-*.js (Service Worker PWA)
     * - favicon.ico, manifest.json, icons/ (PWA assets)
     */
    '/((?!_next/static|_next/image|api/|sw\\.js|workbox-.*\\.js|favicon\\.ico|manifest\\.json|icons/).*)',
  ],
};