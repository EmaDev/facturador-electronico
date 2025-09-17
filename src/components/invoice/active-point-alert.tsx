'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';
import { useAccountStore } from '@/store/account';

const pad4 = (n: number | string) => String(n).padStart(4, '0');

export const ActivePointAlert = () => {
  const { account, auth, activePv, setActivePv, ensureAuthAndAccountLoaded } = useAccountStore();
  const [ready, setReady] = useState(false);

  // Cargar auth + cuenta + activePv desde sessionStorage en montaje
  useEffect(() => {
    (async () => {
      await ensureAuthAndAccountLoaded();
      setReady(true);
    })();
  }, [ensureAuthAndAccountLoaded]);

  // Lista de puntos de venta desde la cuenta (id es el número AFIP)
  const puntos = account?.puntosVenta ?? [];

  // valor actual del select
  const selectedId = useMemo(() => {
    if (!puntos?.length) return undefined;
    // si tengo activePv, lo uso; si no, tomo el primero
    const current = activePv ?? puntos[0]?.id;
    return current !== undefined ? String(current) : undefined;
  }, [puntos, activePv]);

  const handlePointOfSaleChange = (value: string) => {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      setActivePv(num); // persiste en store + sessionStorage
      // asegurar CUIT
      if (typeof window !== 'undefined') {
        const cuit = account?.cuit ?? auth?.cuitEmisor ?? '';
        if (cuit) sessionStorage.setItem('user_cuit', cuit);
      }
    }
  };

  if (!ready) return null;

  const current = puntos.find(p => String(p.id) === selectedId);

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-8 items-center">
      <Alert className="md:col-span-2 bg-[#ffe4bc] border-primary/20">
        <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-primary">
          <span className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Estás facturando desde:&nbsp;
            <strong>
              {current?.fantasia ?? '—'} (N° {current?.id != null ? pad4(current.id) : '----'})
            </strong>
          </span>

          <Select onValueChange={handlePointOfSaleChange} value={selectedId}>
            <SelectTrigger className="w-full md:w-[220px] bg-background">
              <SelectValue placeholder="Cambiar punto de venta" />
            </SelectTrigger>
            <SelectContent>
              {puntos.map((pos) => (
                <SelectItem key={pos.id} value={String(pos.id)}>
                  {pos.fantasia} — {pad4(pos.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AlertDescription>
      </Alert>
    </div>
  );
};