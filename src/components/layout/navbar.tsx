"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    return '/';
  }

  return (
    <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="/">Invoice</TabsTrigger>
        <TabsTrigger value="/crm">CRM</TabsTrigger>
        <TabsTrigger value="/template-editor">Template Editor</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
