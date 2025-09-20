"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Eye, Printer, Info, Store } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAccountStore } from "@/store/account";

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:3000";

export default function TemplateEditorPage() {

    const account = useAccountStore((s) => s.account);
    const auth = useAccountStore((s) => s.auth);
    const activePv = useAccountStore((s) => s.activePv);
    const setActivePv = useAccountStore((s) => s.setActivePv);
    const getActiveTemplate = useAccountStore((s) => s.getActiveTemplate);
    const fetchInvoiceTemplates = useAccountStore((s) => s.fetchInvoiceTemplates);
    const ensureAuthAndAccountLoaded = useAccountStore((s) => s.ensureAuthAndAccountLoaded);

    // lista de puntos de venta desde la cuenta (Zustand)
    const pointsOfSale = useMemo(
        () => account?.puntosVenta?.map((p) => ({ id: String(p.id), number: String(p.id), name: p.fantasia ?? `PV ${p.id}` })) ?? [],
        [account?.puntosVenta]
    );

    // estados del formulario (se rellenan según PV activo/plantilla)
    const [companyName, setCompanyName] = useState("");
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
    const [companyEmail, setCompanyEmail] = useState("");
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [footerText, setFooterText] = useState<string>("");
    const [rawHtmlMode, setRawHtmlMode] = useState(false);

    // mock solo para vista previa del PDF
    const vatCondition = account?.ivaCondition ?? "Responsable Inscripto";

    // cargar auth+account y plantillas si hace falta
    useEffect(() => {
        (async () => {
            await ensureAuthAndAccountLoaded();
            const cuit = (auth?.cuitEmisor ?? account?.cuit ?? "").replace(/[^\d]/g, "");
            if (cuit) {
                await fetchInvoiceTemplates(cuit);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // cuando cambia el PV activo o cambian las plantillas, rellenar el form
    useEffect(() => {
        const tpl = getActiveTemplate();
        if (tpl) {
            setCompanyName(tpl.fantasia ?? "");
            setCompanyAddress(tpl.domicilio ?? "");
            setCompanyPhone(tpl.telefono ?? "");
            setCompanyEmail(tpl.email ?? "");
            setLogoPreview(tpl.logoUrl ?? null);
            setFooterText(tpl.footerHtml ?? "");
        } else {
            // sin plantilla previa -> limpiar
            setCompanyName("");
            setCompanyAddress("");
            setCompanyPhone("");
            setCompanyEmail("");
            setLogoPreview(null);
            setFooterText("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePv, getActiveTemplate]);

    // si no hay PV activo, inicializa al primero de la lista (cuando esté)
    useEffect(() => {
        if (activePv == null && pointsOfSale.length > 0) {
            const first = Number(pointsOfSale[0].number);
            setActivePv(first);
        }
    }, [activePv, pointsOfSale, setActivePv]);

    const selectedPointOfSaleId = useMemo(
        () => (activePv != null ? String(activePv) : (pointsOfSale[0]?.id ?? "")),
        [activePv, pointsOfSale]
    );

    const handlePosChange = (posId: string) => {
        const found = pointsOfSale.find((p) => p.id === posId);
        if (found) setActivePv(Number(found.number));
    };

    // manejo de logo: dataURL (podés reemplazar por upload real y almacenar URL)
    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const triggerPrint = () => window.print();

    const handleSaveChanges = async () => {
        try {
            const cuit = (auth?.cuitEmisor ?? account?.cuit ?? "").replace(/[^\d]/g, "");
            const pv = activePv;
            if (!cuit || pv == null) {
                alert("Falta CUIT o Punto de Venta activo.");
                return;
            }
            // upsert plantilla
            const body = {
                fantasia: companyName,
                domicilio: companyAddress,
                telefono: companyPhone || null,
                email: companyEmail || null,
                logoUrl: logoPreview || null,      // si usas un uploader real, poné la URL final aquí
                footerHtml: footerText || null,
            };

            const resp = await fetch(`${NEST_API_URL}/invoice-templates/${cuit}/${pv}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.message || "No se pudo guardar la plantilla");

            // refrescar plantillas del store para reflejar cambios
            await fetchInvoiceTemplates(cuit);

            alert("Plantilla guardada con éxito.");
        } catch (e: any) {
            alert(String(e?.message ?? e));
        }
    };

    // ——— datos de demo para la vista previa ———
    const mockInvoice = {
        number: "0000-00000001",
        date: "01/01/2025",
        cuit: (auth?.cuitEmisor ?? account?.cuit ?? "20-12345678-3").replace(/[^\d]/g, ""),
        ingresosBrutos: "Sin informar",
        inicioActividades: account?.inicioActividades ?? "—",
        customer: {
            name: "Cliente Demo",
            domicilio: "Dirección Cliente",
            condIVA: "Responsable Inscripto",
            condVenta: "Contado",
            cuit: "20-98765432-3",
            localidad: "CABA",
            provincia: "Buenos Aires",
            telefono: "—",
        },
        items: [
            { codigo: "1001", descripcion: "Producto Test 1", cantidad: 1, pUnitario: 1500.0, alicIVA: "21%", importe: 1500.0 },
            { codigo: "1002", descripcion: "Producto Test 2", cantidad: 1, pUnitario: 3000.0, alicIVA: "21%", importe: 3000.0 },
            { codigo: "1003", descripcion: "Producto Test 3", cantidad: 1, pUnitario: 4500.0, alicIVA: "21%", importe: 4500.0 },
        ],
    };

    const importeNeto = mockInvoice.items.reduce((acc, item) => acc + item.importe, 0);
    const iva21 = importeNeto * 0.21;
    const total = importeNeto + iva21;
    const formatCurrency = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

    return (
        <div className="grid lg:grid-cols-5 gap-8 w-full max-w-7xl mx-auto">
            {/* Editor */}
            <Card className="lg:col-span-2 no-print">
                <CardHeader>
                    <CardTitle>Editar Plantilla de Factura</CardTitle>
                    <CardDescription>Personalice los datos y el estilo de sus facturas por Punto de Venta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* PV */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="pos-select">Punto de Venta</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Seleccione el punto de venta cuya plantilla desea editar.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Select value={selectedPointOfSaleId} onValueChange={handlePosChange}>
                            <SelectTrigger id="pos-select" className="w-full">
                                <SelectValue placeholder="Seleccionar Punto de Venta" />
                            </SelectTrigger>
                            <SelectContent>
                                {pointsOfSale.map((pos) => (
                                    <SelectItem key={pos.id} value={pos.id}>
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {pos.name} (N° {pos.number})
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Campos plantilla */}
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Nombre de fantasía</Label>
                        <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Su Nombre de fantasía" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company-address">Domicilio Comercial</Label>
                        <Input id="company-address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Su Domicilio" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company-phone">Teléfono (Opcional)</Label>
                        <Input id="company-phone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="Su Teléfono" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company-email">Email (Opcional)</Label>
                        <Input id="company-email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contacto@empresa.com" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo-upload">Logo (URL o subir imagen)</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-muted-foreground">Sin Logo</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline">
                                    <label htmlFor="logo-upload" className="cursor-pointer">
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Imagen
                                        <Input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoChange} />
                                    </label>
                                </Button>
                                <Input
                                    placeholder="https://mi-cdn/logo.png (opcional)"
                                    value={logoPreview ?? ""}
                                    onChange={(e) => setLogoPreview(e.target.value || null)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="footer-text">Pie de Página (HTML corto)</Label>
                            <Button variant="ghost" size="sm" onClick={() => setRawHtmlMode((v) => !v)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {rawHtmlMode ? "Vista Previa HTML" : "Editar HTML"}
                            </Button>
                        </div>
                        {rawHtmlMode ? (
                            <Textarea
                                id="footer-text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="<p>Gracias por su compra</p>"
                                rows={6}
                                className="font-mono text-xs"
                            />
                        ) : (
                            <div className="p-4 border rounded-md min-h-[120px] bg-muted/50 text-xs" dangerouslySetInnerHTML={{ __html: footerText }} />
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => window.location.reload()}>Descartar</Button>
                    <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
                </CardFooter>
            </Card>

            {/* Preview Card */}
            <div className="lg:col-span-3 printable-area">
                <div className="flex justify-between items-center mb-4 no-print">
                    <h3 className="text-lg font-semibold text-center">Vista Previa de Factura</h3>
                    <Button variant="outline" size="sm" onClick={triggerPrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
                <Card className="shadow-lg w-full text-[10px] leading-tight">
                    <CardContent className="p-4 font-sans">
                        {/* Header */}
                        <div className="grid grid-cols-2 gap-4 mb-2">
                           {/* Left Header - Company Data */}
                           <div className="border border-black p-2">
                               <div className="flex items-center justify-center gap-4 mb-2">
                                   {logoPreview && <img src={logoPreview} alt="Company Logo" className="max-w-[80px] max-h-[80px] object-contain" data-ai-hint="logo"/>}
                                   <h2 className="text-xl font-bold text-center flex-1">{companyName}</h2>
                               </div>
                               <div className="text-center space-y-1">
                                   <p className="font-semibold"><span className="font-bold">Razon Social:</span>{account?.companyname}</p>
                                   <p><span className="font-bold">Domicilio Comercial:</span>{companyAddress || account?.domicilio}</p>
                                   <p><span className="font-bold">Condicion frente al IVA:</span> {account?.ivaCondition}</p>
                               </div>
                           </div>
                           {/* Right Header - Invoice Data */}
                           <div className="border border-black p-2 flex flex-col justify-between">
                                <div className="flex items-start">
                                    <div className="border-r border-black pr-2 mr-2 text-center">
                                       <p className="text-4xl font-bold">A</p>
                                       <p className="text-[8px] leading-none">CÓD. 01</p>
                                    </div>
                                    <div className="flex-1">
                                       <p className="text-2xl font-bold">FACTURA</p>
                                       <p>Punto de Venta: {mockInvoice.number.split('-')[0]} N° {mockInvoice.number.split('-')[1]}</p>
                                       <p className="font-bold mt-2">Fecha de Emisión: {mockInvoice.date}</p>
                                    </div>
                                </div>
                                <div>
                                    <p><span className="font-bold">CUIT:</span> {mockInvoice.cuit}</p>
                                    <p><span className="font-bold">Ingresos Brutos:</span> {mockInvoice.ingresosBrutos}</p>
                                    <p><span className="font-bold">Inicio de Actividades:</span> {account?.inicioActividades}</p>
                               </div>
                           </div>
                        </div>

                        {/* Customer Info */}
                        <div className="border border-black p-2 mb-2">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><p><span className="font-bold">Apellido y Nombre / Razón Social:</span> {mockInvoice.customer.name}</p></div>
                                <div><p><span className="font-bold">CUIT:</span> {mockInvoice.customer.cuit}</p></div>
                                <div><p><span className="font-bold">Domicilio:</span> {mockInvoice.customer.domicilio}</p></div>
                                <div><p><span className="font-bold">Condición frente al IVA:</span> {mockInvoice.customer.condIVA}</p></div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-2">
                            <thead>
                                <tr className="border border-black bg-gray-100">
                                    <th className="p-1 text-left border-r border-black">Código</th>
                                    <th className="p-1 text-left border-r border-black">Descripción</th>
                                    <th className="p-1 text-right border-r border-black">Cantidad</th>
                                    <th className="p-1 text-right border-r border-black">P. Unitario</th>
                                    <th className="p-1 text-right border-r border-black">Alic. IVA</th>
                                    <th className="p-1 text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockInvoice.items.map((item, index) => (
                                    <tr key={index} className="border-x border-black">
                                        <td className="p-1 border-r border-black">{item.codigo}</td>
                                        <td className="p-1 border-r border-black">{item.descripcion}</td>
                                        <td className="p-1 text-right border-r border-black">{item.cantidad}</td>
                                        <td className="p-1 text-right border-r border-black">{formatCurrency(item.pUnitario)}</td>
                                        <td className="p-1 text-right border-r border-black">{item.alicIVA}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.importe)}</td>
                                    </tr>
                                ))}
                                {/* Add empty rows to fill the space */}
                                {Array.from({ length: Math.max(0, 10 - mockInvoice.items.length) }).map((_, index) => (
                                     <tr key={`empty-${index}`} className="border-x border-black h-6">
                                        <td className="border-r border-black"></td>
                                        <td className="border-r border-black"></td>
                                        <td className="border-r border-black"></td>
                                        <td className="border-r border-black"></td>
                                        <td className="border-r border-black"></td>
                                        <td></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Totals */}
                        <div className="flex justify-end mb-2">
                            <div className="w-64">
                                <div className="flex justify-between border-b border-black p-1">
                                    <span className="font-bold">Importe Neto Gravado:</span>
                                    <span>{formatCurrency(importeNeto)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black p-1">
                                    <span className="font-bold">IVA 21%:</span>
                                    <span>{formatCurrency(iva21)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black p-1">
                                    <span className="font-bold">IVA 10,5%:</span>
                                    <span>{formatCurrency(0)}</span>
                                </div>
                                <div className="flex justify-between border-b border-black p-1">
                                    <span className="font-bold">Importe Otros Tributos:</span>
                                    <span>{formatCurrency(0)}</span>
                                </div>
                                <div className="flex justify-between font-bold p-1 bg-gray-100">
                                    <span>Total:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                         <div className="grid grid-cols-2 items-end border border-black p-2">
                            <div className="flex items-end gap-2">
                                <img data-ai-hint="qr code" src="https://placehold.co/80x80.png" alt="QR Code" className="w-20 h-20" />
                                <div className="text-center">
                                    <p className="font-bold">Comprobante Autorizado</p>
                                    <div className="text-[8px]" dangerouslySetInnerHTML={{ __html: footerText }} />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">CAE N°: <span className="font-normal">123456789012345</span></p>
                                <p className="font-bold">Fecha de Vto. de CAE: <span className="font-normal">11/01/2025</span></p>
                            </div>
                         </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}