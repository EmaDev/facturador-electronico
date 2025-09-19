'use client';

import * as React from 'react';
import QRCode from "qrcode";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { useAccountStore } from '@/store/account';
import { downloadBlob, generateInvoicePdf } from '@/services/generateInvoicePdf';
// Ajusta estas utilidades a tu ruta real:

// Mantén en sync con el tipo del server
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

    customerSnapshot: {
        name: string;
        taxId: string;
        address?: string;
        email?: string;
        ivaCond?: string;
    }

    isFacturaA: boolean;

    createdAt?: string | Date;
};

function fmt(n: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

function fmtDateISOToDDMMYYYY(iso: string) {
    // iso: "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ssZ"
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function InvoiceListClient({
    invoices,
    customer,
}: {
    invoices: InvoiceRecord[];
    customer: Customer;
}) {

    const onPdf = async (inv: InvoiceRecord) => {
        const { account, invoiceTemplatesByPv } = useAccountStore.getState();
        // Tomar plantilla por ptoVta (si existe) para armar "seller"
        const tpl = invoiceTemplatesByPv?.[inv.ptoVta];

        // Fallbacks desde la cuenta en caso de no tener plantilla
        const pvData = account?.puntosVenta?.find((p) => p.id === inv.ptoVta);

        const seller = {
            companyName: account?.companyname || '—',
            fantasyName: tpl?.fantasia || pvData?.fantasia || account?.companyname || '—',
            companyAddress: tpl?.domicilio || pvData?.domicilio || account?.domicilio || '—',
            companyPhone: tpl?.telefono || account?.telefono || '',
            vatCondition: account?.ivaCondition || '',
            logoDataUrl: tpl?.logoUrl
        };

        const qrDataUrl = await QRCode.toDataURL(inv.qrUrl!, {
            errorCorrectionLevel: "M",
            margin: 0,
            scale: 6,          // nitidez en impresión
        });

        const header = {
            number: inv.numberStr,                              // "0004-00000012"
            date: fmtDateISOToDDMMYYYY(inv.fechaEmisionIso),    // dd/mm/yyyy
            cae: inv.cae,
            caeVto: fmtDateISOToDDMMYYYY(inv.caeVto),
            qrUrl: qrDataUrl,
            cuit: inv.emitterCuit.replace(/^(\d{2})(\d{8})(\d{1})$/, '$1-$2-$3'),
            ingresosBrutos: account?.iibb || '—',
            inicioActividades: account?.startactivity || '',
            cbteTipo: inv.cbteTipo,
        };

        const payload = {
            seller,
            header,
            customer: {
                name: inv.customerSnapshot.name || customer.name,
                domicilio: inv.customerSnapshot.address || customer.address || '—',
                condIVA: inv.customerSnapshot.ivaCond || '—',
                condVenta: 'Contado',
                cuit: inv.customerSnapshot.taxId || customer.taxId || '—',
                localidad: '-',
                provincia: '-',
                telefono: inv.customerSnapshot.email || '-',
            },
            // Adaptado a la estructura que consume InvoiceDocument
            items: inv.items.map((it) => ({
                id: it.id,
                description: it.description,
                code: it.code ?? '',
                qty: it.qty,
                unitPriceInput: it.unitPriceInput,
                discountPct: it.discountPct,
                taxRate: it.taxRate,
                afipRateId: it.afipRateId,
                unitNet: it.unitNet,
                unitIva: it.unitIva,
                unitFinal: it.unitFinal,
                lineNet: it.lineNet,
                lineIva: it.lineIva,
                lineFinal: it.lineFinal,
            })),
            footerHtml: (tpl?.footerHtml ?? '<p></p>'),
        };

        

        const blob = await generateInvoicePdf(payload, {
            currency: 'ARS',
            rowsPerFirstPage: 12,
            rowsPerPage: 22,
            showCustomerOnAllPages: false,
        });

        downloadBlob(blob, `Factura-${inv.numberStr}.pdf`);
    };

    if (!invoices?.length) {
        return (
            <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Historial de Compras</h3>
                <div className="rounded-md border min-h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay facturas registradas para este cliente.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Historial de Compras</h3>
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pto Vta</TableHead>
                            <TableHead>Número</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>CAE</TableHead>
                            <TableHead className="w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((inv) => (
                            <TableRow key={inv.id}>
                                <TableCell>{String(inv.ptoVta).padStart(4, '0')}</TableCell>
                                <TableCell className="font-mono">{inv.numberStr}</TableCell>
                                <TableCell>{inv.cbteTipo}</TableCell>
                                <TableCell>{fmtDateISOToDDMMYYYY(inv.fechaEmisionIso)}</TableCell>
                                <TableCell>{fmt(inv.impTotal)}</TableCell>
                                <TableCell className="font-mono">{inv.cae}</TableCell>
                                <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => onPdf(inv)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        PDF
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
