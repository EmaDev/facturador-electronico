"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, UserPlus, Upload, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const registerSchema = z.object({
  cuit: z.string().min(1, 'El CUIT es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  vatCondition: z.enum(["Responsable Inscripto", "Monotributista", "Exento", "Consumidor Final"], {
    required_error: "La condición de IVA es requerida",
  }),
  companyname: z.string().min(1, 'La razon social es requerida'),
  iibb: z.string().min(1, 'El numero de ingresos brutos es requerido'),
  startactivity: z.string().min(1, 'La fecha de inicio de actividad es requerida'),
  certificate: z.instanceof(File).optional(), // validamos presencia manualmente
  privateKey: z.instanceof(File).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const NEST_API_URL = 'http://localhost:3000';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      cuit: '',
      password: '',
      companyname: "",
      vatCondition: undefined as any,
    },
  });

  const handleRegister: SubmitHandler<RegisterFormData> = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validaciones mínimas de archivos
      if (!certificateFile) throw new Error('Debe adjuntar el certificado (.crt).');
      if (!privateKeyFile) throw new Error('Debe adjuntar la clave privada (.key).');
      if (!/\.crt$/i.test(certificateFile.name)) throw new Error('El certificado debe tener extensión .crt');
      if (!/\.key$/i.test(privateKeyFile.name)) throw new Error('La clave privada debe tener extensión .key');

      const cuitNormalized = data.cuit.replace(/[^\d]/g, '');
      if (!cuitNormalized) throw new Error('CUIT inválido');

      // Armamos multipart/form-data esperado por POST /accounts
      const fd = new FormData();
      fd.append('cuit', cuitNormalized);
      fd.append('password', data.password);
      fd.append('companyname', data.companyname);
      fd.append('ivaCondition', data.vatCondition);
      fd.append('startactivity', data.startactivity);
      fd.append('iibb', data.iibb);
      fd.append('cert', certificateFile); // name: cert
      fd.append('key', privateKeyFile);   // name: key

      const resp = await fetch(`${NEST_API_URL}/accounts`, {
        method: 'POST',
        body: fd, // NO seteamos Content-Type manualmente
      });

      let json: any = null;
      try { json = await resp.json(); } catch { }

      if (!resp.ok) {
        const msg = json?.message || json?.error || resp.statusText || 'Error en el registro';
        throw new Error(msg);
      }

      // registro ok → redirigir a login con flag
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message ?? 'Error en el registro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setter(file);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Crear Cuenta</CardTitle>
          <CardDescription>Complete el formulario para registrar su empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cuit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CUIT</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese su CUIT"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Cree una contraseña"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="companyname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón social</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingrese su razón social"
                        inputMode="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iibb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ingresos Brutos</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese numero de IIBB"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startactivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio de Actividad</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Ingrese fecha de inicio de actividad"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="vatCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condición frente al IVA</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione su condición" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                        <SelectItem value="Monotributista">Monotributista</SelectItem>
                        <SelectItem value="Exento">Exento</SelectItem>
                        <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>Certificado Digital (.crt)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Suba el .crt emitido por ARCA/AFIP.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="sm">
                      <label htmlFor="certificate-file" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Archivo
                        <Input
                          id="certificate-file"
                          type="file"
                          className="sr-only"
                          accept=".crt"
                          onChange={handleFileChange(setCertificateFile)}
                        />
                      </label>
                    </Button>
                    {certificateFile && <span className="text-xs text-muted-foreground">{certificateFile.name}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>Clave Privada (.key)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clave privada RSA 2048 asociada al CSR.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="sm">
                      <label htmlFor="private-key-file" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Archivo
                        <Input
                          id="private-key-file"
                          type="file"
                          className="sr-only"
                          accept=".key"
                          onChange={handleFileChange(setPrivateKeyFile)}
                        />
                      </label>
                    </Button>
                    {privateKeyFile && <span className="text-xs text-muted-foreground">{privateKeyFile.name}</span>}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (<><UserPlus className="mr-2" /> Registrarse</>)}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-xs text-center text-muted-foreground justify-center">
          <p>
            ¿Ya tienes una cuenta?{' '}
            <Button asChild variant="link" className="text-xs p-0 h-auto">
              <Link href="/login">Inicia Sesión</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}