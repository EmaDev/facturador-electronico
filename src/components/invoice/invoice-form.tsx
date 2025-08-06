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
import { UserSearch, PlusCircle, Trash2, Printer, Send } from 'lucide-react';
import type { Customer, InvoiceItem } from '@/lib/types';
import { InvoicePreview } from './invoice-preview';

const mockCustomers: Customer[] = [
  { id: '1', name: 'Acme Inc.', email: 'contact@acme.com', address: '123 Acme St, Business City, 12345', taxId: 'ACME12345' },
  { id: '2', name: 'Stark Industries', email: 'tony@stark.com', address: '10880 Malibu Point, 90265', taxId: 'STARKIND54321' },
  { id: '3', name: 'Wayne Enterprises', email: 'bruce@wayne.com', address: '1007 Mountain Drive, Gotham', taxId: 'WAYNEENT9876' },
];

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  code: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').optional().default(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

export function InvoiceForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const filteredCustomers = useMemo(() =>
    searchTerm
      ? mockCustomers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : mockCustomers,
    [searchTerm]
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
    reset();
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };
  
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(invoiceItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totals = useMemo(() => {
    const subtotal = invoiceItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount / 100)), 0);
    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  }, [invoiceItems]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      <Card className="w-full max-w-5xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Customer Details</h3>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search for a customer..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!popoverOpen) setPopoverOpen(true);
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
                      <p className="p-2 text-sm text-muted-foreground">No customer found.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {selectedCustomer && (
              <div className="bg-secondary p-4 rounded-lg text-sm transition-all duration-300 ease-in-out">
                <p className="font-bold">{selectedCustomer.name}</p>
                <p className="text-muted-foreground">{selectedCustomer.email}</p>
                <p className="text-muted-foreground">{selectedCustomer.address}</p>
                <p className="text-muted-foreground">Tax ID: {selectedCustomer.taxId}</p>
              </div>
            )}
          </div>
          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Invoice Items</h3>
            <form onSubmit={handleSubmit(handleAddItem)} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start mb-4">
              <Input {...register('name')} placeholder="Item Name" className="md:col-span-4" />
              <Input {...register('code')} placeholder="Code" className="md:col-span-2" />
              <Input {...register('quantity')} type="number" placeholder="Qty" className="md:col-span-1" />
              <Input {...register('price')} type="number" step="0.01" placeholder="Price" className="md:col-span-2" />
              <Input {...register('discount')} type="number" placeholder="Discount %" className="md:col-span-2" />
              <Button type="submit" size="icon" className="md:col-span-1 bg-accent hover:bg-accent/90">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </form>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
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
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No items added yet.</TableCell>
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
                    <TableCell colSpan={5} className="text-right font-semibold">Discount</TableCell>
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
            Preview & Print
          </Button>
          <Button variant="default" disabled={!selectedCustomer || invoiceItems.length === 0} onClick={() => setPreviewOpen(true)}>
            Facturar
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
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
