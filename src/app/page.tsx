
// This is now a redirector component.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the app's main page or login
    const token = sessionStorage.getItem('authToken');
    if (token) {
      router.replace('/factura');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Cargando...</p>
    </div>
  );
}
