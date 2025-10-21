"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Upload, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAccountStore } from '@/store/account';
import { PuntoVenta } from '@/store/types';

interface PointOfSale {
  id: string;          // solo para UI
  number: string;
  fantasyName: string;
  address: string;
}

type StoredPointOfSale = {
  number: string;
  fantasyName: string;
  address: string;
};

type StoredAccount = {
  id?: string;
  cuit: string;
  ivaCondition?: string;
  email?: string;
  mainAddress?: string;
  phone?: string;
  pointsOfSale?: StoredPointOfSale[];
  // otros campos posibles...
};

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3000";

export default function ConfiguracionPage() {

  const { account, auth, fetchAccount, updateAccount, loadFromSessionStorage, loading } = useAccountStore();
  const [cuit, setCuit] = useState('');
  const [mainAddress, setMainAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vatCondition, setVatCondition] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);

  useEffect(() => {
    loadFromSessionStorage();
    fetchAccount();
  }, [loadFromSessionStorage, fetchAccount]);


  useEffect(() => {
    // volcar datos del store a los inputs cuando account esté
    if (account) {
      setCuit(account.cuit ?? "");
      setMainAddress(account.domicilio ?? "");
      setPhone(account.telefono ?? "");
      setEmail(account.email ?? "");
      setVatCondition(account.ivaCondition ?? "");

      // map a tu shape de UI
      const pos = (account.puntosVenta ?? []).map(p => ({
        id: String(p.id),
        number: String(p.id ?? ""),
        fantasyName: p.fantasia ?? "",
        address: p.domicilio ?? "",
      }));
      setPointsOfSale(pos);
    }
  }, [account]);

  
  const handleFileChange =
    (setter: React.Dispatch<React.SetStateAction<File | null>>) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setter(file);
      };

  const handlePointOfSaleChange = (id: string, field: keyof PointOfSale, value: string) => {
    setPointsOfSale((prev) => prev.map((pos) => (pos.id === id ? { ...pos, [field]: value } : pos)));
  };

  const addPointOfSale = () => {
    setPointsOfSale((prev) => [
      ...prev,
      { id: crypto.randomUUID(), number: '', fantasyName: '', address: '' },
    ]);
  };

  const removePointOfSale = (id: string) => {
    setPointsOfSale((prev) => prev.filter((p) => p.id !== id));
  };

  // DTO para update (sin cuit ni password)
  const updateDto = useMemo(() => {
    return {
      email: email || undefined,
      ivaCondition: vatCondition || undefined,
      domicilio: mainAddress || undefined,
      telefono: phone || undefined,
      // mapeamos quitando "id" (solo UI)
      puntosVenta: pointsOfSale
        .filter((p) => p.number || p.fantasyName || p.address) // solo los que tengan algo
        .map<any>((p) => ({
          id: parseInt(p.number),
          fantasia: p.fantasyName,
          domicilio: p.address,
        })),
      // si más adelante agregas otros campos de cuenta, agrégalos aquí
    };
  }, [email, vatCondition, mainAddress, phone, pointsOfSale]);

  const handleSaveChanges = async () => {
    // convertir a shape del backend (PuntoVenta[])
    const puntosVenta: PuntoVenta[] = pointsOfSale
      .filter(p => p.number) // ignora vacíos
      .map(p => ({
        id: Number(p.number),
        fantasia: p.fantasyName ?? "",
        domicilio: p.address ?? "",
      }));

    const payload: any = {
      email,
      domicilio: mainAddress,
      telefono: phone,
      ivaCondition: vatCondition as any, // si permites cambiarla aquí
      puntosVenta,
    };

    const updated = await updateAccount(payload);
    if (updated) {
      alert("Guardado con éxito");
    } else {
      alert("Error al guardar (revisa consola)");
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Configuración de Facturación</CardTitle>
        <CardDescription>Configure los datos de su empresa y puntos de venta.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Global Company Data */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-primary">Datos Globales de la Empresa</h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="Ingrese su CUIT"
                readOnly  // 👈 no se actualiza por updateAccount
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
            <Label htmlFor="main-address">Domicilio Fiscal Principal</Label>
            <Input
              id="main-address"
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              placeholder="e.g., Av. Corrientes 1234, CABA"
            />
          </div>

          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de Contacto</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 11-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., contacto@empresa.com"
              />
            </div>
            
          </div>

          {/* Cert/Key se muestran pero NO se envían en updateAccount */}
          {/*<div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="certificate-file">Certificado Digital (.crt)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>El .crt se carga solo en el alta. No se actualiza desde esta pantalla.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-4">
                <Button asChild variant="outline" disabled>
                  <label htmlFor="certificate-file" className="cursor-not-allowed opacity-70">
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Archivo
                    <Input id="certificate-file" type="file" className="sr-only" accept=".crt" onChange={handleFileChange(setCertificateFile)} />
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
                      <p>La clave privada se carga solo en el alta. No se actualiza desde esta pantalla.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-4">
                <Button asChild variant="outline" disabled>
                  <label htmlFor="private-key-file" className="cursor-not-allowed opacity-70">
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Archivo
                    <Input id="private-key-file" type="file" className="sr-only" accept=".key" onChange={handleFileChange(setPrivateKeyFile)} />
                  </label>
                </Button>
                {privateKeyFile && <span className="text-sm text-muted-foreground">{privateKeyFile.name}</span>}
              </div>
            </div>
          </div>*/}
        </div>

        <Separator />

        {/* Points of Sale */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary">Puntos de Venta</h3>
            <Button variant="outline" size="sm" onClick={addPointOfSale}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Punto de Venta
            </Button>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-2">
            {pointsOfSale.map((pos, index) => (
              <AccordionItem value={`item-${index}`} key={pos.id} className="border rounded-md px-4 bg-secondary/30">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex justify-between w-full items-center pr-4">
                    <span>
                      Punto de Venta: <span className="font-mono">{pos.number || '[NUEVO]'}</span> - {pos.fantasyName || '[Sin Nombre]'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor={`pos-number-${pos.id}`}>Número de Punto de Venta</Label>
                      <Input
                        id={`pos-number-${pos.id}`}
                        value={pos.number}
                        onChange={(e) => handlePointOfSaleChange(pos.id, 'number', e.target.value)}
                        placeholder="e.g., 0002"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`pos-fantasyName-${pos.id}`}>Nombre de Fantasía</Label>
                      <Input
                        id={`pos-fantasyName-${pos.id}`}
                        value={pos.fantasyName}
                        onChange={(e) => handlePointOfSaleChange(pos.id, 'fantasyName', e.target.value)}
                        placeholder="e.g., Sucursal Palermo"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pos-address-${pos.id}`}>Dirección del Punto de Venta</Label>
                    <Input
                      id={`pos-address-${pos.id}`}
                      value={pos.address}
                      onChange={(e) => handlePointOfSaleChange(pos.id, 'address', e.target.value)}
                      placeholder="e.g., Av. Santa Fe 5678"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => removePointOfSale(pos.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Punto de Venta
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end mt-4">
        <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
      </CardFooter>
    </Card>
  );
}