
"use client";

import { useState, useMemo, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import QRCode from "qrcode";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Send, FileText, Info, Calendar, Printer } from 'lucide-react';
import type { Customer, InvoiceItem } from '@/lib/types';
import { createLog, fecaesolicitar, feCompUltimoAutorizado, fetchLogs } from '@/services/wsfe';
import { generateInvoicePdf, downloadBlob } from "@/services/generateInvoicePdf";
import { buildAfipQrURL, deepGet, mapCondIvaToId, mapFacturaToCbteAsocTipo, normalizeAfipDate, pickFirstDet, resolveCbteTipo, resolveCustomerDocTipo, todayAfip } from "@/lib/afip";
import { useToast } from '@/hooks/use-toast';
import CustomerPicker, { CustomerPickerHandle } from './customer-picker';
import { computePerItemTax } from "@/lib/tax";
import { ActivePointAlert } from './active-point-alert';
import { useAccountStore } from '@/store/account';
import { saveInvoice, SaveInvoicePayload } from '@/lib/invoices';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { useInvoiceProcessor } from '@/hooks/useInvoiceProcessor';


const itemSchema = z.object({
  name: z.string().min(1, 'El nombre del item es requerido'),
  code: z.string().optional(),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  discount: z.coerce.number().min(0, 'El descuento no puede ser negativo').max(100, 'El descuento no puede ser mayor a 100%').optional().default(0),
});


type ItemFormData = z.infer<typeof itemSchema>;

const documentTypes = [
  { id: '1', name: 'Factura A' },
  { id: '6', name: 'Factura B' },
  { id: '11', name: 'Factura C' },
  { id: '3', name: 'Nota de Crédito A' },
  { id: '8', name: 'Nota de Crédito B' },
  { id: '13', name: 'Nota de Crédito C' },
];


export function InvoiceForm() {
  const [isloading, setIsLoading] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const { toast } = useToast();
  const customerPickerRef = useRef<CustomerPickerHandle>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(documentTypes[0]); // o el default
  const [associatedInvoice, setAssociatedInvoice] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // formato YYYY-MM-DD
  });
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

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

  const totals = useMemo(() => {
    const subtotal = invoiceItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount / 100)), 0);
    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  }, [invoiceItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const handleDocumentTypeChange = (id: string) => {
    const found = documentTypes.find(d => d.id === id);
    if (found) setSelectedDocumentType(found);
  };

  const resetInvoiceState = () => {
    setIsLoading(false);

    // reset cliente y búsqueda
    setSelectedCustomer(null);
    customerPickerRef.current?.reset();

    // reset ítems
    setInvoiceItems([]);

    // reset comprobante
    setSelectedDocumentType(documentTypes[0]);

    // reset formulario ítems
    itemForm.reset({
      name: '',
      code: '',
      quantity: undefined as unknown as number,
      price: undefined as unknown as number,
      discount: undefined as unknown as number,
    });
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setSelectedDocumentType(documentTypes[0]);
  };

  const { createInvoice, isLoading } = useInvoiceProcessor({
    onSuccess: () => {
      resetInvoiceState(); // Resetea el form cuando todo sale bien
    },
  });

  const isCreditNote = ['3', '8', '13'].includes(selectedDocumentType.id);
  const isFacturaA = useMemo(() => selectedDocumentType.id === '1', [selectedDocumentType]);

  const isSubmitDisabled =
    !selectedCustomer ||
    invoiceItems.length === 0 ||
    isLoading ||
    (isCreditNote && !associatedInvoice.trim());

  const isQuoteDisabled =
    !selectedCustomer ||
    invoiceItems.length === 0 ||
    isLoading || // Carga de facturación
    isQuoteLoading; // Carga de presupuesto

  const handleFormSubmit = async () => {
    if (!selectedCustomer) return; // Validación simple en el componente

    await createInvoice(
      selectedCustomer,
      invoiceItems,
      selectedDocumentType.id,
      invoiceDate,
      associatedInvoice
    );
  };

  // --- ¡NUEVA FUNCIÓN PARA EL PRESUPUESTO! ---
  const handlePrintQuote = async () => {
    if (isQuoteDisabled) return; // Doble chequeo

    setIsQuoteLoading(true);

    try {
      const { auth, account, activePv, invoiceTemplatesByPv } = useAccountStore.getState();
      // 1. Calcular totales (simulando el tipo de factura para los impuestos)
      const cbteTipo = Number(selectedDocumentType.id);
      const { lines } = computePerItemTax(invoiceItems, cbteTipo);
      const { iso } = todayAfip(invoiceDate);

      // 2. Obtener datos del emisor (igual que en el orchestrator)
      const dataPtventa = account?.puntosVenta?.find(ptvta => ptvta.id === activePv);
      const tpl = invoiceTemplatesByPv?.[activePv!];
      const seller = {
        companyName: account?.companyname || '-----',
        fantasyName: dataPtventa?.fantasia || account?.companyname || '-----',
        companyAddress: dataPtventa?.domicilio || account?.domicilio || '----',
        companyPhone: account?.telefono || '',
        vatCondition: account?.ivaCondition || '',
        logoDataUrl: tpl?.logoUrl || ""
      };

      const cuitEmisor = auth?.cuitEmisor || "";

      // 3. Construir el payload del PDF
      const pdfPayload = {
        seller,
        header: {
          // --- Campos Personalizados para Presupuesto ---
          documentTitle: "PRESUPUESTO", // <-- ¡IMPORTANTE!
          number: "S/N", // Sin número oficial
          date: iso.split('-').reverse().join('/'),
          cae: '---',
          caeVto: '---',
          qrUrl: '', // Sin QR

          // --- Campos Estándar ---
          cuit: cuitEmisor.replace(/^(\d{2})(\d{8})(\d{1})$/, '$1-$2-$3'),
          ingresosBrutos: account?.iibb || "---",
          inicioActividades: account?.startactivity || "",
          cbteTipo: cbteTipo, // Pasamos el tipo para que el PDF sepa si mostrar columnas de IVA
        },
        customer: {
          name: selectedCustomer!.name,
          domicilio: selectedCustomer!.address,
          condIVA: selectedCustomer!.ivaCondition ?? '—',
          condVenta: 'Contado', // O 'A convenir'
          cuit: selectedCustomer!.taxId,
          localidad: '-',
          provincia: '-',
          telefono: selectedCustomer!.email ?? '-',
        },
        items: lines, // Usamos los items con impuestos calculados
        footerHtml: `<p style="font-size: 10px; text-align: center;">Presupuesto válido por 15 días. Este documento no es una factura válida.</p>`,
      };

      // 4. Generar y descargar el PDF
      const blob = await generateInvoicePdf(pdfPayload, {
        currency: "ARS",
        rowsPerFirstPage: 12,
        rowsPerPage: 22,
        showCustomerOnAllPages: false,
      });

      downloadBlob(blob, `Presupuesto-${selectedCustomer!.name.replace(/\s/g, '_')}.pdf`);

      toast({
        title: 'Presupuesto Generado',
        description: 'La descarga comenzará en breve.',
      });

    } catch (err: any) {
      console.error("Error generating quote:", err);
      toast({ title: "Error", description: `No se pudo generar el presupuesto: ${err.message}`, variant: "destructive" });
    } finally {
      setIsQuoteLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-6xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Factura</CardTitle>
          <ActivePointAlert />
        </CardHeader>
        <CardContent>
          <CustomerPicker
            ref={customerPickerRef}
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            autoLoad={true}              // trae de /api/customers
            // initialCustomers={[...]}   // opcional si querés inyectar una lista inicial
            className="mb-8"
          />

          <Separator className="my-6" />
          <Alert className="bg-red-100 border-red-200 mb-4">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 text-secondary-foreground">
              {/* Grupo 1: Tipo de Documento */}
              <div className="flex flex-col">
                <span className="flex items-center gap-2 whitespace-nowrap mb-2">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                  Tipo de Documento: <strong>{selectedDocumentType.name}</strong>
                </span>
                <Select
                  value={selectedDocumentType.id}
                  onValueChange={handleDocumentTypeChange}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-background">
                    <SelectValue placeholder="Cambiar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grupo 2: Fecha de Facturación */}
              <div className="flex flex-col">
                <Label htmlFor="invoice-date" className="flex items-center gap-2 whitespace-nowrap mb-2">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                  Fecha de Facturación
                </Label>

                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full sm:w-[200px]"
                  max={new Date().toISOString().split("T")[0]} // no permitir fecha futura
                />
              </div>
            </AlertDescription>
          </Alert>
          {isFacturaA && (
            <Alert variant="default" className="border-red-200 bg-red-50 my-3">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Si es Factura A, el monto debe ser bruto. Se calculará el IVA agregado al facturar.
              </AlertDescription>
            </Alert>
          )}
          {isCreditNote && (
            <div className="space-y-2 mb-4 p-4 border-l-4 border-yellow-400 bg-yellow-50 rounded-md">
              <Label htmlFor="associated-invoice" className="font-semibold text-yellow-800">
                N° de comprobante asociado (obligatorio)
              </Label>
              <Input
                id="associated-invoice"
                value={associatedInvoice}
                onChange={(e) => setAssociatedInvoice(e.target.value)}
                placeholder="Ej: 12345 (sólo el número)"
                className="bg-white"
              />
              {/* NUEVO: Feedback visual si el campo está vacío */}
              {!associatedInvoice.trim() && (
                <p className="text-xs text-red-600 font-medium">
                  Para una Nota de Crédito, debe ingresar el comprobante asociado.
                </p>
              )}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Items de la Factura</h3>
            <form
              onSubmit={itemForm.handleSubmit(handleAddItem)}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start mb-4"
            >
              <div className="flex flex-col md:col-span-3">
                <label className="text-sm font-medium mb-1">Nombre</label>
                <Input {...itemForm.register('name')} placeholder="Nombre del Item" />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium mb-1">Código</label>
                <Input {...itemForm.register('code')} placeholder="Código" />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium mb-1">Cant.</label>
                <Input {...itemForm.register('quantity')} type="number" min={1} placeholder="Cant." />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium mb-1">Precio</label>
                <Input {...itemForm.register('price')} type="number" step="0.01" placeholder="Precio" />
              </div>

              <div className="flex flex-col md:col-span-1">
                <label className="text-sm font-medium mb-1">Dto. %</label>
                <Input {...itemForm.register('discount')} type="number" placeholder="Dto. %" />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium mb-1 invisible">Acción</label>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 px-4">
                  Agregar <PlusCircle className="h-5 w-5" />
                </Button>
              </div>
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
          <Button
            variant="outline" // Estilo secundario
            disabled={isQuoteDisabled}
            onClick={handlePrintQuote}
          >
            {isQuoteLoading ? "Imprimiendo..." : "Imprimir Presupuesto"}
            <Printer className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="default"
            disabled={isSubmitDisabled}
            onClick={handleFormSubmit}
          >
            {isloading ? "Facturando" : "Facturar"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}


