"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Eye, Search } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccountStore } from '@/store/account';

const customerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Dirección de email inválida'),
  address: z.string().min(5, 'La dirección es requerida'),
  taxId: z.string().min(1, 'El CUIT/CUIL es requerido'),
  pointsOfSale: z.string().min(1, 'El punto de venta es requerido'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const ITEMS_PER_PAGE = 5;
const API_BASE = process.env.NEXT_PUBLIC_NEST_URL ?? 'http://localhost:3000';

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchByCuit, setSearchByCuit] = useState(false);

  // Traemos el CUIT del emisor desde el store (o podrías leer de sessionStorage si preferís)
  const auth = useAccountStore(s => s.auth);

  // Cargar clientes desde el backend
  useEffect(() => {
    const cuit = auth?.cuitEmisor || sessionStorage.getItem('user_cuit') || '';
    if (!cuit) return;

    (async () => {
      try {
        const r = await fetch(`${API_BASE}/customers?emitterCuit=${encodeURIComponent(cuit)}`);
        const json = await r.json();
        if (!r.ok) throw new Error(json?.message || 'No se pudo cargar clientes');
        // json = { ok: true, customers: [...] }
        setCustomers(Array.isArray(json?.customers) ? json.customers : []);
      } catch (e) {
        console.error('Error cargando clientes:', e);
      }
    })();
  }, [auth?.cuitEmisor]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c =>
      searchByCuit
        ? (c.taxId ?? '').toLowerCase().includes(term)
        : (c.name ?? '').toLowerCase().includes(term)
    );
  }, [customers, searchTerm, searchByCuit]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    customerForm.reset({
      name: customer.name ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      taxId: customer.taxId ?? '',
      pointsOfSale: String((customer as any).pointsOfSale ?? ''),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer: SubmitHandler<CustomerFormData> = async (data) => {
    if (!editingCustomer?.id) return;

    try {
      const r = await fetch(`${API_BASE}/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          address: data.address,
          taxId: data.taxId,
          pointsOfSale: parseInt(data.pointsOfSale)
        }),
      });
      const json = await r.json();
      if (!r.ok || !json?.ok) throw new Error(json?.message || 'No se pudo actualizar el cliente');

      const updated = json.customer; // tu controller devuelve { ok: true, customer }
      setCustomers(prev =>
        prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    } catch (e: any) {
      console.error('Error al actualizar cliente:', e?.message ?? e);
      // Podrías mostrar un toast aquí
    }
  };

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Clientes (CRM)</CardTitle>
          <CardDescription>Busque, edite y gestione sus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={searchByCuit ? "Buscar por CUIT..." : "Buscar por Nombre..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="search-type"
                checked={searchByCuit}
                onCheckedChange={(checked) => setSearchByCuit(!!checked)}
              />
              <label
                htmlFor="search-type"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Buscar por CUIT
              </label>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CUIT/CUIL</TableHead>
                  <TableHead>Punto de Venta</TableHead>
                  <TableHead className="w-[140px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.length > 0 ? paginatedCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.taxId}</TableCell>
                    <TableCell>{(customer as any).pointsOfSale ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/crm/${customer.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No se encontraron clientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-end w-full space-x-2">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}>
              Siguiente
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualice los detalles de este cliente.</DialogDescription>
          </DialogHeader>
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(handleUpdateCustomer)} className="space-y-4">
              <FormField
                control={customerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Acme St, Business City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT/CUIL</FormLabel>
                    <FormControl>
                      <Input placeholder="20123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customerForm.control}
                name="pointsOfSale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Punto de Venta</FormLabel>
                    <FormControl>
                      <Input placeholder="0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}