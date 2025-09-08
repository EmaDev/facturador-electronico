
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Eye, Printer } from 'lucide-react';

export default function TemplateEditorPage() {
    // Vendedor States
    const [companyName, setCompanyName] = useState('Empresa de Ejemplo S.R.L.');
    const [companyAddress, setCompanyAddress] = useState('Avenida 44 Nro. 12345, (1900) La Plata - Buenos Aires');
    const [companyPhone, setCompanyPhone] = useState('(0123) 15-456-7890');
    const [vatCondition, setVatCondition] = useState('Responsable Inscripto');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [footerText, setFooterText] = useState('<p>Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación.</p><p>Comprobante generado con fácil virtual.</p>');

    const [rawHtmlMode, setRawHtmlMode] = useState(false);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = () => {
        // In a real application, you would save these settings to a backend or localStorage.
        console.log('Saving changes:', { companyName, companyAddress, companyPhone, vatCondition, logo: logoPreview, footerText });
        alert('Cambios guardados con éxito! (Revisa la consola para más detalles)');
    };
    
    const triggerPrint = () => {
        window.print();
    }

    const mockInvoice = {
        number: '0000-00000001',
        date: '01/01/2025',
        cuit: '20-12345678-3',
        ingresosBrutos: '20-12345678-3',
        inicioActividades: '01/01/2000',
        customer: {
            name: 'Empresa de Ejemplo 2',
            domicilio: 'Dirección Empresa 2',
            condIVA: 'Responsable Inscripto',
            condVenta: 'Contado',
            cuit: '20-98765432-3',
            localidad: 'Ciudad Empresa 2',
            provincia: 'Provincia Empresa 2',
            telefono: 'Teléfono Empresa 2',
        },
        items: [
            { codigo: '1001', descripcion: 'Producto Test 1', cantidad: 1, pUnitario: 1500.00, alicIVA: '21%', importe: 1500.00 },
            { codigo: '1002', descripcion: 'Producto Test 2', cantidad: 1, pUnitario: 3000.00, alicIVA: '21%', importe: 3000.00 },
            { codigo: '1003', descripcion: 'Producto Test 3', cantidad: 1, pUnitario: 4500.00, alicIVA: '21%', importe: 4500.00 },
        ]
    };

    const importeNeto = mockInvoice.items.reduce((acc, item) => acc + item.importe, 0);
    const iva21 = importeNeto * 0.21;
    const total = importeNeto + iva21;
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    return (
        <div className="grid lg:grid-cols-5 gap-8 w-full max-w-7xl mx-auto">
            {/* Editor Card */}
            <Card className="lg:col-span-2 no-print">
                <CardHeader>
                    <CardTitle>Editar Plantilla de Factura</CardTitle>
                    <CardDescription>Personalice los datos y el estilo de sus facturas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="company-name">Razón Social</Label>
                        <Input
                            id="company-name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Su Razón Social"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="company-address">Domicilio Comercial</Label>
                        <Input
                            id="company-address"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            placeholder="Su Domicilio"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="company-phone">Teléfono</Label>
                        <Input
                            id="company-phone"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="Su Teléfono"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vat-condition">Condición frente al IVA</Label>
                        <Select value={vatCondition} onValueChange={setVatCondition}>
                            <SelectTrigger id="vat-condition">
                                <SelectValue placeholder="Seleccione Condición" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                                <SelectItem value="Monotributista">Monotributista</SelectItem>
                                <SelectItem value="Exento">Exento</SelectItem>
                                <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="logo-upload">Logo de la Empresa</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted">
                               {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" data-ai-hint="logo" />
                               ) : (
                                    <span className="text-xs text-muted-foreground">Sin Logo</span>
                               )}
                            </div>
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Subir Logo
                                    <Input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="footer-text">Contenido del Pie de Página (personalizable)</Label>
                            <Button variant="ghost" size="sm" onClick={() => setRawHtmlMode(!rawHtmlMode)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {rawHtmlMode ? 'Vista Previa HTML' : 'Editar HTML'}
                            </Button>
                        </div>
                         {rawHtmlMode ? (
                            <Textarea
                                id="footer-text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="e.g., <p>Gracias por su compra!</p>"
                                rows={6}
                                className="font-mono text-xs"
                            />
                        ) : (
                            <div
                                className="p-4 border rounded-md min-h-[120px] bg-muted/50 text-xs"
                                dangerouslySetInnerHTML={{ __html: footerText }}
                            />
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
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
                           {/* Left Header */}
                           <div className="border border-black p-2">
                               <div className="flex items-center gap-4">
                                   {logoPreview && <img src={logoPreview} alt="Company Logo" className="max-w-[80px] max-h-[80px] object-contain" data-ai-hint="logo"/>}
                                   <h1 className="text-xl font-bold text-center flex-1">{companyName}</h1>
                               </div>
                               <div className="mt-2 text-center">
                                   <p>{companyAddress}</p>
                                   <p>{companyPhone}</p>
                                   <p className="font-bold">{vatCondition}</p>
                               </div>
                           </div>
                           {/* Right Header */}
                           <div className="border border-black p-2 flex flex-col justify-between">
                                <div className="flex items-start">
                                    <div className="border-r border-black pr-2 mr-2 text-center">
                                       <p className="text-4xl font-bold">A</p>
                                       <p className="text-[8px] leading-none">CÓD. 01</p>
                                       <p className="text-[8px] leading-none">ORIGINAL</p>
                                    </div>
                                    <div className="flex-1">
                                       <p className="text-2xl font-bold">FACTURA</p>
                                       <p>{mockInvoice.number}</p>
                                       <p className="font-bold mt-2">Fecha de Emisión: {mockInvoice.date}</p>
                                    </div>
                                </div>
                                <div>
                                    <p><span className="font-bold">CUIT:</span> {mockInvoice.cuit}</p>
                                    <p><span className="font-bold">Ingresos Brutos:</span> {mockInvoice.ingresosBrutos}</p>
                                    <p><span className="font-bold">Inicio de Actividades:</span> {mockInvoice.inicioActividades}</p>
                               </div>
                           </div>
                        </div>

                        {/* Customer Info */}
                        <div className="border border-black p-2 mb-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p><span className="font-bold">Razón Social:</span> {mockInvoice.customer.name}</p>
                                    <p><span className="font-bold">Domicilio:</span> {mockInvoice.customer.domicilio}</p>
                                    <p><span className="font-bold">Cond. IVA:</span> {mockInvoice.customer.condIVA}</p>
                                    <p><span className="font-bold">Cond. Venta:</span> {mockInvoice.customer.condVenta}</p>
                                </div>
                                <div>
                                    <p><span className="font-bold">CUIT:</span> {mockInvoice.customer.cuit}</p>
                                    <p><span className="font-bold">Localidad:</span> {mockInvoice.customer.localidad}</p>
                                    <p><span className="font-bold">Provincia:</span> {mockInvoice.customer.provincia}</p>
                                    <p><span className="font-bold">Teléfono:</span> {mockInvoice.customer.telefono}</p>
                                </div>
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
