"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabChange = (value: string) => {
    router.push(value);
  };

  const currentTab = pathname === '/crm' ? '/crm' : '/';

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="/">Invoice</TabsTrigger>
        <TabsTrigger value="/crm">CRM</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
