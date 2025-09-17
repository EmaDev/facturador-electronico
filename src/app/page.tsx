'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/account';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { auth, loadFromSessionStorage, fetchAccount } = useAccountStore();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    loadFromSessionStorage();
  }, [mounted, loadFromSessionStorage]);

  useEffect(() => {
    if (!mounted) return;
    const token = auth?.token || (typeof window !== 'undefined' ? sessionStorage.getItem('authToken') : null);
    if (token) {
      // opcional: precargar cuenta
      fetchAccount().finally(() => router.replace('/factura'));
    } else {
      router.replace('/login');
    }
  }, [mounted, auth?.token, fetchAccount, router]);

  if (!mounted) return null;
  return <div className="flex items-center justify-center min-h-screen">Cargando…</div>;
}