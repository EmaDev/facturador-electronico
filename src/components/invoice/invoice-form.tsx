
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
import { PlusCircle, Trash2, Send, FileText, Info } from 'lucide-react';
import type { Customer, InvoiceItem } from '@/lib/types';
import { fecaesolicitar, feCompUltimoAutorizado } from '@/services/wsfe';
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

  const isCreditNote = ['3', '8', '13'].includes(selectedDocumentType.id);
  const isFacturaA = useMemo(() => selectedDocumentType.id === '1', [selectedDocumentType]);

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
    setSelectedDocumentType(documentTypes[0]);
  };

  const handleInvoice = async () => {

    const { auth, account, activePv, invoiceTemplatesByPv } = useAccountStore.getState();

    if (!auth?.wsaa_token || !auth?.wsaa_sign || !auth?.cuitEmisor) {
      alert('No hay credenciales WSAA o CUIT emisor. Inicie sesión.');
      return;
    }

    if (!activePv) {
      alert('Seleccioná un Punto de Venta activo antes de facturar.');
      return;
    }

    if (!selectedCustomer || invoiceItems.length === 0) return;

    setIsLoading(true);
    // Para servicios usar Concepto 2/3; acá dejamos 1 (Productos)
    const CONCEPTO = 1;
    const MONEDA = "PES";


    // 1) Credenciales WSAA
    const cuitEmisor = sessionStorage.getItem("user_cuit") || "";

    const emisorCond = account?.ivaCondition ?? 'Responsable Inscripto';
    const receptorCond = selectedCustomer?.ivaCondition;
    //const cbteTipo = resolveCbteTipo(emisorCond, receptorCond);
    const cbteTipo = Number(selectedDocumentType.id);

    const { lines, neto, iva, total, ivaItems, /*isFacturaA*/ } = computePerItemTax(invoiceItems, cbteTipo);

    // 2) Doc receptor
    const { DocTipo, DocNro } = resolveCustomerDocTipo(selectedCustomer.taxId)

    // 3) Fecha
    const { yyyymmdd, iso } = todayAfip();

    // 4) último autorizado
    let nextN = 0;
    try {
      const ul = await feCompUltimoAutorizado(activePv, cbteTipo, {
        wsaa_token: auth.wsaa_token,
        wsaa_sign: auth.wsaa_sign,
        cuit: auth.cuitEmisor,
      });
      const ult = deepGet<number>(ul, [
        "Envelope.Body.FECompUltimoAutorizadoResponse.FECompUltimoAutorizadoResult.CbteNro",
        "CbteNro"
      ]) ?? 0;
      nextN = Number(ult) + 1;
    } catch {
      nextN = 0; // dejá que el backend asigne
    }

    // 5) Detalle Arca

    const detalle: any = {
      Concepto: CONCEPTO,
      DocTipo,
      DocNro,
      CbteDesde: nextN || 0,
      CbteHasta: nextN || 0,
      CbteFch: yyyymmdd,
      ImpTotal: total,
      ImpTotConc: 0,
      ImpNeto: neto,
      ImpOpEx: 0,
      ImpIVA: iva,
      ImpTrib: 0,
      CondicionIVAReceptorId: mapCondIvaToId(receptorCond),
      MonId: MONEDA,
      MonCotiz: 1,
      Iva: ivaItems, // ← agrupado por tasa (AlicIva[])
    };

    if (isCreditNote && associatedInvoice) {
      //const [ptoStr, nroStr] = associatedInvoice.split("-");
      detalle.CbtesAsoc = [
        {
          Tipo: mapFacturaToCbteAsocTipo(cbteTipo === 3 ? 1 : cbteTipo === 8 ? 6 : 11), // factura a la que refiere
          PtoVta: activePv,
          Nro: Number(associatedInvoice),
        },
      ];
    }

    // 6) Llamada al microservicio
    const body = {
      auth: { wsaa_token: auth.wsaa_token, wsaa_sign: auth.wsaa_sign, cuit: auth.cuitEmisor },
      data: { PtoVta: activePv, CbteTipo: cbteTipo, detalle },
    };

    try {
      const resp = await fecaesolicitar(body);

      // 7) Extraer nro/CAE/CAE Vto de forma robusta
      const nroCmp =
        resp?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeCabResp?.CbteHasta ??
        resp?.FeCabResp?.CbteHasta ??
        resp?.CbteHasta ??
        nextN;

      // Tomar el primer detalle si viene array
      const det = pickFirstDet(resp);

      // CAE y Vto (pueden venir como number/string/objeto)
      const cae: string = String(det?.CAE ?? "");
      const caeVto: string = normalizeAfipDate(det?.CAEFchVto);

      // Formatear número final
      const numberStr = `${String(activePv).padStart(4, "0")}-${String(nroCmp).padStart(8, "0")}`;

      // 8) QR ARCA
      const qrUrl = buildAfipQrURL({
        fecha: iso,                 // "YYYY-MM-DD"
        cuit: Number(cuitEmisor),
        ptoVta: activePv,
        tipoCmp: cbteTipo,
        nroCmp,
        importe: total,
        moneda: MONEDA,             // "PES" => ctz=1
        ctz: 1,
        tipoDocRec: DocTipo,        // 80 (CUIT) o 99 (CF)
        nroDocRec: DocNro,          // 0 si DocTipo=99
        tipoCodAut: "E",            // CAE
        codAut: cae,                // "75381797088071" por ej.
      });

      // 9) Guardar factura en base de datos
      const cbtePtoVtaStr = String(activePv).padStart(4, "0");
      const cbteNumeroStr = String(nroCmp).padStart(8, "0");
      const isFacturaA = [1, 2, 3, 201, 203, 204].includes(cbteTipo); // ajustá si hace falta

      const savePayload: SaveInvoicePayload = {
        emitterCuit: auth.cuitEmisor,
        ptoVta: activePv,
        customerId: selectedCustomer.id,

        cbteTipo,
        cbteNumero: Number(nroCmp),
        cbtePtoVtaStr,
        cbteNumeroStr,
        cae,
        caeVto,
        fechaEmisionIso: iso,
        qrUrl,
        numberStr,

        impNeto: Number(neto.toFixed(2)),
        impIva: Number(iva.toFixed(2)),
        impTotal: Number(total.toFixed(2)),
        impTotConc: 0,
        impOpEx: 0,
        impTrib: 0,
        ivaItems,     // el mismo array que mandaste a AFIP

        items: lines, // tus ítems calculados por computePerItemTax

        customerName: selectedCustomer.name,
        customerTaxId: selectedCustomer.taxId,
        customerAddress: selectedCustomer.address,
        customerEmail: selectedCustomer.email ?? "",
        customerIvaCond: receptorCond ?? "",

        isFacturaA,
      };

      try {
        await saveInvoice(savePayload);
      } catch (e) {
        // No detengas el flujo de facturación si falla el guardado,
        // pero logueá/avisá para revisar.
        console.warn("Historial: no se pudo guardar la factura:", e);
      }
      // 10) Armar payload completo para el PDF
      const dataPtventa = account?.puntosVenta?.find(ptvta => ptvta.id === activePv);
      const tpl = invoiceTemplatesByPv?.[activePv];
      const seller = {
        companyName: account?.companyname || '-----',
        fantasyName: dataPtventa?.fantasia || account?.companyname || '-----',
        companyAddress: dataPtventa?.domicilio || account?.domicilio || '----',
        companyPhone: account?.telefono || '',
        vatCondition: account?.ivaCondition || '',
        logoDataUrl: tpl?.logoUrl || ""
      };

      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: "M",
        margin: 0,
        scale: 6,          // nitidez en impresión
      });

      const pdfPayload = {
        seller,
        header: {
          number: numberStr,
          date: iso.split('-').reverse().join('/'),
          cae,
          caeVto,
          qrUrl: qrDataUrl,
          cuit: auth.cuitEmisor.replace(/^(\d{2})(\d{8})(\d{1})$/, '$1-$2-$3'),
          ingresosBrutos: account?.iibb || "---",
          inicioActividades: account?.startactivity || "",//(account?.inicioActividades ?? '').split('-').reverse().join('/') || '—',
          cbteTipo,
        },
        customer: {
          name: selectedCustomer.name,
          domicilio: selectedCustomer.address,
          condIVA: receptorCond ?? '—',
          condVenta: 'Contado',
          cuit: selectedCustomer.taxId,
          localidad: '-',
          provincia: '-',
          telefono: selectedCustomer.email ?? '-',
        },
        items: lines, // ← usa lo calculado por-item
        footerHtml: '<p></p>',
      };

      // 11) Generar y descargar PDF (IMPERATIVO)
      const blob = await generateInvoicePdf(pdfPayload, {
        currency: "ARS",
        rowsPerFirstPage: 12,
        rowsPerPage: 22,
        showCustomerOnAllPages: false,
      });
      downloadBlob(blob, `Factura-${numberStr}.pdf`);
      setIsLoading(false);
      resetInvoiceState()
      toast({
        title: '¡Éxito!',
        description: 'Factura creada correctamente.',
      });
    } catch (e: any) {
      setIsLoading(false);
      console.error("FECAESolicitar error:", e);
      alert(`Error al facturar: ${String(e?.message ?? e)}`);
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
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-secondary-foreground">
              <span className="flex items-center gap-2">
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
            <div className="space-y-2 mb-4">
              <Label htmlFor="associated-invoice">Nro de comprobante asociado</Label>
              <Input
                id="associated-invoice"
                value={associatedInvoice}
                onChange={(e) => setAssociatedInvoice(e.target.value)}
                placeholder="Ej: 0001-00012345"
              />
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
            variant="default"
            disabled={!selectedCustomer || invoiceItems.length === 0 || isloading}
            onClick={handleInvoice}
          >
            {isloading ? "Facturando" : "Facturar"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}


