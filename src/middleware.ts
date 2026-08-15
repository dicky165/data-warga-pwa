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
     * - favicon.ico, manifest.json, icons/ (PWA assets)
     * - api/whatsapp (Webhook Bot WA tidak memerlukan cookie sesi browser)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|api/whatsapp).*)',
  ],
};