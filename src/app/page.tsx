import { redirect } from 'next/navigation';

export default function RootPage() {
  // Langsung mengarahkan pengguna ke halaman dashboard utama
  redirect('/');
}