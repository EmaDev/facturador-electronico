"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useAccountStore } from "@/store/account";


const loginSchema = z.object({
  cuit: z.string().min(1, 'El CUIT es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { cuit: '', password: '' },
  });

  const handleLogin: SubmitHandler<LoginFormData> = async (data) => {
    setIsLoading(true);
    setError(null);

    // Normalizá CUIT (sacá guiones/espacios)
    const payload = {
      ...data,
      cuit: data.cuit.replace(/[^\d]/g, ''),
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json /* : LoginResponse */ = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || 'Error de autenticación');
      }

      const store = useAccountStore.getState();
      store.setAuth({
        token: json.token,
        cuitEmisor: payload.cuit,
        wsaa_token: json.wsaa_token,
        wsaa_sign: json.wsaa_sign,
        wsaa_expires: json.expires,
      });

      await store.fetchAccount(payload.cuit);
      await store.fetchInvoiceTemplates(payload.cuit);

      router.push('/');
      router.refresh();
      
    } catch (err: any) {
      setError(err.message ?? 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        {/* … tu header … */}
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>Ingrese sus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                        autoComplete="username"
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
                        placeholder="Ingrese su contraseña"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (<><LogIn className="mr-2" /> Ingresar</>)}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex-col gap-4 text-xs text-center text-muted-foreground justify-center">
          <p>Este es un sistema seguro. No comparta sus credenciales.</p>
          <p>
            ¿No tienes una cuenta?{' '}
            <Button asChild variant="link" className="text-xs p-0 h-auto">
              <Link href="/registro">Regístrate</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}