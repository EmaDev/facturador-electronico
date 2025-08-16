
"use client";

import { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { UserSearch, PlusCircle, Trash2, Printer, Send, UserPlus } from 'lucide-react';
import type { Customer, InvoiceItem } from '@/lib/types';
import { InvoicePreview } from './invoice-preview';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const initialCustomers: Customer[] = [
  { id: '1', name: 'Acme Inc.', email: 'contact@acme.com', address: '123 Acme St, Business City, 12345', taxId: 'ACME12345' },
  { id: '2', name: 'Stark Industries', email: 'tony@stark.com', address: '10880 Malibu Point, 90265', taxId: 'STARKIND54321' },
  { id: '3', name: 'Wayne Enterprises', email: 'bruce@wayne.com', address: '1007 Mountain Drive, Gotham', taxId: 'WAYNEENT9876' },
];

const itemSchema = z.object({
  name: z.string().min(1, 'El nombre del item es requerido'),
  code: z.string().optional(),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  discount: z.coerce.number().min(0, 'El descuento no puede ser negativo').max(100, 'El descuento no puede ser mayor a 100%').optional().default(0),
});

const customerSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Dirección de email inválida'),
  address: z.string().min(5, 'La dirección es requerida'),
  taxId: z.string().min(1, 'El CUIT/CUIL es requerido'),
});

type ItemFormData = z.infer<typeof itemSchema>;
type CustomerFormData = z.infer<typeof customerSchema>;

export function InvoiceForm() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      address: '',
      taxId: '',
    },
  });

  const filteredCustomers = useMemo(() =>
    searchTerm
      ? customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : customers,
    [searchTerm, customers]
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPopoverOpen(false);
    setSearchTerm(customer.name);
  };

  const handleAddItem: SubmitHandler<ItemFormData> = (data) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      ...data,
      discount: data.discount || 0,
    };
    setInvoiceItems([...invoiceItems, newItem]);
    itemForm.reset();
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };
  
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(invoiceItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateCustomer: SubmitHandler<CustomerFormData> = (data) => {
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      ...data,
    };
    setCustomers([...customers, newCustomer]);
    handleSelectCustomer(newCustomer);
    setCreateCustomerOpen(false);
    customerForm.reset();
  };

  const totals = useMemo(() => {
    const subtotal = invoiceItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount / 100)), 0);
    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  }, [invoiceItems]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <>
      <Card className="w-full max-w-5xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Factura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Detalles del Cliente</h3>
              <div className="flex gap-2">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative flex-grow">
                      <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar un cliente..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (!popoverOpen) setPopoverOpen(true);
                          if (selectedCustomer) setSelectedCustomer(null);
                        }}
                        className="pl-10"
                        autoComplete="off"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectCustomer(customer)}
                            className="p-2 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                            tabIndex={0}
                          >
                            {customer.name}
                          </div>
                        ))
                      ) : (
                        <button
                          onClick={() => {
                            setPopoverOpen(false);
                            setCreateCustomerOpen(true);
                            customerForm.setValue('name', searchTerm);
                          }}
                          className="w-full text-left p-2 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none flex items-center"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Crear nuevo cliente "{searchTerm}"
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" onClick={() => setCreateCustomerOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </div>
            {selectedCustomer && (
              <div className="bg-secondary p-4 rounded-lg text-sm transition-all duration-300 ease-in-out">
                <p className="font-bold">{selectedCustomer.name}</p>
                <p className="text-muted-foreground">{selectedCustomer.email}</p>
                <p className="text-muted-foreground">{selectedCustomer.address}</p>
                <p className="text-muted-foreground">CUIT/CUIL: {selectedCustomer.taxId}</p>
              </div>
            )}
          </div>
          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Items de la Factura</h3>
            <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start mb-4">
              <Input {...itemForm.register('name')} placeholder="Nombre del Item" className="md:col-span-4" />
              <Input {...itemForm.register('code')} placeholder="Código" className="md:col-span-2" />
              <Input {...itemForm.register('quantity')} type="number" placeholder="Cant." className="md:col-span-1" />
              <Input {...itemForm.register('price')} type="number" step="0.01" placeholder="Precio" className="md:col-span-2" />
              <Input {...itemForm.register('discount')} type="number" placeholder="Dto. %" className="md:col-span-2" />
              <Button type="submit" size="icon" className="md:col-span-1 bg-accent hover:bg-accent/90">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </form>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Dto.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.length > 0 ? invoiceItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.code}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-right ml-auto h-8"
                          min="1"
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{item.discount}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price * item.quantity * (1 - item.discount / 100))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No hay items agregados.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {invoiceItems.length > 0 &&
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-semibold">Subtotal</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totals.subtotal)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                   <TableRow>
                    <TableCell colSpan={5} className="text-right font-semibold">Descuento</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">-{formatCurrency(totals.totalDiscount)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow className="text-lg font-bold bg-secondary/50">
                    <TableCell colSpan={5} className="text-right">Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
                }
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" disabled={!selectedCustomer || invoiceItems.length === 0} onClick={() => setPreviewOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Vista Previa e Imprimir
          </Button>
          <Button variant="default" disabled={!selectedCustomer || invoiceItems.length === 0} onClick={() => setPreviewOpen(true)}>
            Facturar
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            <DialogDescription>Complete los detalles para crear un nuevo cliente.</DialogDescription>
          </DialogHeader>
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(handleCreateCustomer)} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={() => setCreateCustomerOpen(false)}>Cancelar</Button>
                <Button type="submit">Crear Cliente</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {selectedCustomer && (
        <InvoicePreview 
          isOpen={previewOpen} 
          onOpenChange={setPreviewOpen} 
          customer={selectedCustomer} 
          items={invoiceItems} 
          totals={totals}
        />
      )}
    </>
  );
}
