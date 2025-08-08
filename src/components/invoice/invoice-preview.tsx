"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';
import type { Customer, InvoiceItem } from '@/lib/types';
import { useEffect, useState } from 'react';

interface InvoicePreviewProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer: Customer;
  items: InvoiceItem[];
  totals: { subtotal: number; totalDiscount: number; total: number; };
}

export function InvoicePreview({ isOpen, onOpenChange, customer, items, totals }: InvoicePreviewProps) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date().toLocaleDateString());
    }
  }, [isOpen]);

  const triggerPrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0">
        <div className="printable-area max-h-[90vh] overflow-y-auto">
            <DialogHeader className="no-print p-6 pb-0">
              <DialogTitle className="font-headline">Invoice Preview</DialogTitle>
              <DialogDescription>This is a preview of the invoice to be generated.</DialogDescription>
            </DialogHeader>
            
            <div className="text-sm p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-primary font-headline">INVOICE</h2>
                        <p className="text-muted-foreground">Invoice #: INV-2024-001</p>
                        <p className="text-muted-foreground">Date: {currentDate}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-lg">Invoice Flow Inc.</h3>
                        <p className="text-muted-foreground">123 Innovation Drive</p>
                        <p className="text-muted-foreground">Tech City, CA 94043</p>
                        <p className="text-muted-foreground">contact@invoiceflow.com</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="font-semibold text-primary mb-2">Bill To:</h4>
                    <div className="p-4 bg-secondary/50 rounded-md">
                        <p className="font-bold">{customer.name}</p>
                        <p className="text-muted-foreground">{customer.address}</p>
                        <p className="text-muted-foreground">{customer.email}</p>
                        <p className="text-muted-foreground">Tax ID: {customer.taxId}</p>
                    </div>
                </div>

                <Separator className="my-6" />
                
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    {item.code && <div className="text-xs text-muted-foreground">Code: {item.code}</div>}
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.price * item.quantity * (1-item.discount / 100))}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="flex justify-end mt-6">
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-destructive">-{formatCurrency(totals.totalDiscount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg py-3">
                            <span>Total</span>
                            <span>{formatCurrency(totals.total)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs text-muted-foreground">
                    <p>Thank you for your business!</p>
                    <p>Please make payment within 30 days.</p>
                </div>
            </div>
        </div>

        <DialogFooter className="no-print p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={triggerPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
