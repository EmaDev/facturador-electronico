// This is a placeholder for a dynamic page.
// In a real application, you would fetch customer data based on the ID.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Customer } from '@/lib/types';

// Mock data fetching
const initialCustomers: Customer[] = [
    { id: '1', name: 'Acme Inc.', email: 'contact@acme.com', address: '123 Acme St, Business City, 12345', taxId: 'ACME12345' },
    { id: '2', name: 'Stark Industries', email: 'tony@stark.com', address: '10880 Malibu Point, 90265', taxId: 'STARKIND54321' },
    { id: '3', name: 'Wayne Enterprises', email: 'bruce@wayne.com', address: '1007 Mountain Drive, Gotham', taxId: 'WAYNEENT9876' },
    { id: '4', name: 'Cyberdyne Systems', email: 'info@cyberdyne.com', address: '18144 El Camino Real, Sunnyvale', taxId: 'CYBERDYNESYS' },
    { id: '5', name: 'Ollivanders Wand Shop', email: 'sales@ollivanders.co.uk', address: 'Diagon Alley, London', taxId: 'OWS123' },
    { id: '6', name: 'Gekko & Co', email: 'gordon@gekko.com', address: 'Wall Street, NYC', taxId: 'GEKKO99' },
    { id: '7', name: 'Soylent Corp', email: 'hr@soylent.com', address: '123 Megacorp Plaza', taxId: 'SOYLENTGR' },
    { id: '8', name: 'Globex Corporation', email: 'hank.scorpio@globex.com', address: 'Cypress Creek', taxId: 'GLOBEXCORP' },
];

const getCustomerById = (id: string): Customer | undefined => {
  return initialCustomers.find(c => c.id === id);
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = getCustomerById(params.id);

  if (!customer) {
    return (
      <div className="text-center">
        <p className="text-xl text-muted-foreground">Customer not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/crm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CRM
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
                <CardDescription>Customer Details and History</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/crm"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
            <div className="space-y-1">
                <p className="font-semibold">Email:</p>
                <p className="text-muted-foreground">{customer.email}</p>
            </div>
            <div className="space-y-1">
                <p className="font-semibold">Address:</p>
                <p className="text-muted-foreground">{customer.address}</p>
            </div>
             <div className="space-y-1">
                <p className="font-semibold">Tax ID:</p>
                <p className="text-muted-foreground">{customer.taxId}</p>
            </div>
        </div>

        <Separator className="my-6" />

        <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Purchase History</h3>
            <div className="rounded-md border min-h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground">No purchase history available yet.</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
