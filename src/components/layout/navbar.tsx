
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(value);
  };
  
  const getCurrentTab = () => {
    if (pathname.startsWith('/crm')) {
      return '/crm';
    }
    if (pathname.startsWith('/template-editor')) {
      return '/template-editor';
    }
    if (pathname.startsWith('/configuracion')) {
        return '/configuracion';
    }
    return '/factura';
  }

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    router.push('/login');
  };

  return (
    <div className="flex justify-between items-center">
        <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
            <TabsList>
                <TabsTrigger value="/factura">Factura</TabsTrigger>
                <TabsTrigger value="/crm">CRM</TabsTrigger>
                <TabsTrigger value="/template-editor">Editar Plantilla</TabsTrigger>
                <TabsTrigger value="/configuracion">Configuración</TabsTrigger>
            </TabsList>
        </Tabs>
        <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2"/>
            Cerrar Sesión
        </Button>
    </div>
  );
}
