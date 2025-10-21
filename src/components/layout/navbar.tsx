
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(value);
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    router.push('/login');
  };

  return (
    <div className="flex justify-between items-center">
        <Tabs onValueChange={handleTabChange}>
            <TabsList>
                <TabsTrigger value="/dashboard/factura">Factura</TabsTrigger>
                <TabsTrigger value="/dashboard/crm">CRM</TabsTrigger>
                <TabsTrigger value="/dashboard/template-editor">Editar Plantilla</TabsTrigger>
                <TabsTrigger value="/dashboard/configuracion">Configuración</TabsTrigger>
                 <TabsTrigger value="/dashboard/logs">Logs</TabsTrigger>
            </TabsList>
        </Tabs>
        <Button variant="secondary" onClick={handleLogout} className='bg-[#e77d7d] text-white'>
            <LogOut className="mr-2"/>
            Cerrar Sesión
        </Button>
    </div>
  );
}
