import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Customer } from '@/lib/types';
import InvoiceListClient from '@/components/crm/InvoiceListClient';

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_URL ?? 'http://localhost:3000';

async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const r = await fetch(`${NEST_API_URL}/customers/${id}`, { cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) return null;
    return (data?.customer ?? null) as Customer | null;
  } catch {
    return null;
  }
}

type InvoiceRecord = {
  id: string;
  emitterCuit: string;
  ptoVta: number;
  customerId: string;

  cbteTipo: number;
  cbteNumero: number;
  cbtePtoVtaStr: string;
  cbteNumeroStr: string;
  numberStr: string;

  cae: string;
  caeVto: string;
  fechaEmisionIso: string;
  qrUrl?: string;

  impNeto: number;
  impIva: number;
  impTotal: number;
  impTotConc: number;
  impOpEx: number;
  impTrib: number;

  ivaItems: Array<{ Id: number; BaseImp: number; Importe: number }>;

  items: Array<{
    id: string;
    description: string;
    code?: string | null;
    qty: number;
    unitPriceInput: number;
    discountPct: number;
    taxRate: number;
    afipRateId: number;
    unitNet: number;
    unitIva: number;
    unitFinal: number;
    lineNet: number;
    lineIva: number;
    lineFinal: number;
  }>;

  customerName: string;
  customerTaxId: string;
  customerAddress?: string;
  customerEmail?: string;
  customerIvaCond?: string;

  isFacturaA: boolean;

  createdAt?: string | Date;
};

async function getInvoicesByCustomer(customerId: string): Promise<InvoiceRecord[]> {
  try {
    const r = await fetch(`${NEST_API_URL}/invoices?customerId=${encodeURIComponent(customerId)}`, { cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) return [];
    return (data?.invoices ?? []) as InvoiceRecord[];
  } catch {
    return [];
  }
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, invoices] = await Promise.all([
    getCustomerById(params.id),
    getInvoicesByCustomer(params.id),
  ]);

  if (!customer) {
    return (
      <div className="text-center">
        <p className="text-xl text-muted-foreground">Cliente no encontrado.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/dashboard/crm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al CRM
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>Detalles e Historial del Cliente</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/crm"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Lista</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
          <div className="space-y-1">
            <p className="font-semibold">Email:</p>
            <p className="text-muted-foreground">{customer.email ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Dirección:</p>
            <p className="text-muted-foreground">{customer.address ?? '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">CUIT/CUIL:</p>
            <p className="text-muted-foreground">{customer.taxId ?? '-'}</p>
          </div>
        </div>

        <Separator className="my-6" />

        <InvoiceListClient invoices={invoices} customer={customer} />
      </CardContent>
    </Card>
  );
}