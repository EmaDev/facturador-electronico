"use client"

import { Chatbot } from '@/components/chatbot/chatbot';
import { Navbar } from '@/components/layout/navbar';
//import { Chatbot } from '@/components/chatbot/chatbot';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
            <div className='flex items-center gap-3 mb-6'>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-primary"
                >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" x2="8" y1="13" y2="13" />
                    <line x1="16" x2="8" y1="17" y2="17" />
                    <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
                <h1 className="text-3xl font-bold font-headline text-foreground">
                    AI Facturador Online
                </h1>
            </div>
        </div>
        <Navbar />
      </header>
      <main>{children}</main>
      <Chatbot/>
    </div>
  );
}
