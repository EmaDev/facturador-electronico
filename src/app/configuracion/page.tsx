
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Upload } from 'lucide-react';

export default function ConfiguracionPage() {
    const [cuit, setCuit] = useState('');
    const [pointOfSale, setPointOfSale] = useState('');
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);

    const handleCertificateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCertificateFile(file);
        }
    };
    
    const handlePrivateKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPrivateKeyFile(file);
        }
    };

    const handleSaveChanges = () => {
        // In a real application, you would save these settings to a backend.
        console.log('Saving configuration:', { cuit, pointOfSale, certificate: certificateFile?.name, privateKey: privateKeyFile?.name });
        alert('Configuration saved successfully! (Check console for details)');
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Configuración de Facturación</CardTitle>
                <CardDescription>Configure los datos necesarios para la facturación electrónica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="cuit">CUIT</Label>
                    <Input
                        id="cuit"
                        value={cuit}
                        onChange={(e) => setCuit(e.target.value)}
                        placeholder="Ingrese su CUIT"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="point-of-sale">Punto de Venta</Label>
                    <Input
                        id="point-of-sale"
                        value={pointOfSale}
                        onChange={(e) => setPointOfSale(e.target.value)}
                        placeholder="e.g., 0001"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                         <Label htmlFor="certificate-file">Certificado Digital (.crt)</Label>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Obtenga su certificado desde el sitio web de ARCA.</p>
                                </TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline">
                            <label htmlFor="certificate-file" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Archivo
                                <Input id="certificate-file" type="file" className="sr-only" accept=".crt" onChange={handleCertificateChange} />
                            </label>
                        </Button>
                        {certificateFile && <span className="text-sm text-muted-foreground">{certificateFile.name}</span>}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="private-key-file">Clave Privada (.key)</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                <p>Clave privada (clave.key) de tipo 2048, construida a partir del CUIT.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                     <div className="flex items-center gap-4">
                        <Button asChild variant="outline">
                            <label htmlFor="private-key-file" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Subir Archivo
                                <Input id="private-key-file" type="file" className="sr-only" accept=".key" onChange={handlePrivateKeyChange} />
                            </label>
                        </Button>
                         {privateKeyFile && <span className="text-sm text-muted-foreground">{privateKeyFile.name}</span>}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
            </CardFooter>
        </Card>
    );
}
