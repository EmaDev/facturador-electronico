
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { Customer } from '@/lib/types';

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

const customerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Dirección de email inválida'),
  address: z.string().min(5, 'La dirección es requerida'),
  taxId: z.string().min(1, 'El CUIT/CUIL es requerido'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const ITEMS_PER_PAGE = 5;

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return customers.slice(startIndex, endIndex);
  }, [customers, currentPage]);


  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });
  
  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    customerForm.reset({
      name: customer.name,
      email: customer.email,
      address: customer.address,
      taxId: customer.taxId,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateCustomer: SubmitHandler<CustomerFormData> = (data) => {
    if (!editingCustomer) return;
    
    setCustomers(customers.map(c => 
      c.id === editingCustomer.id ? { ...c, ...data } : c
    ));
    setIsEditDialogOpen(false);
    setEditingCustomer(null);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };


  // In a real app, you'd have a function to handle deleting customers.
  // const handleDelete = (id: string) => console.log(`Deleting customer ${id}`);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Clientes (CRM)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>CUIT/CUIL</TableHead>
                  <TableHead className="w-[140px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.length > 0 ? paginatedCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell>{customer.taxId}</TableCell>
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
                    Página {currentPage} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
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
                      <Input placeholder="ACME12345" {...field} />
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
