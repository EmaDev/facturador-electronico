
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { getLogById } from '@/services/wsfe';

type LogEntry = {
    id: string;
    createdAt: string;
    level: 'INFO' | 'ERROR' | 'WARN';
    message: string;
    details?: string;
    source?: string;
    errorCode?: number;
    cuit?: string;
    raw?: object;
};

const getBadgeVariant = (level: LogEntry['level']) => {
    switch (level) {
        case 'INFO': return 'secondary';
        case 'ERROR': return 'destructive';
        case 'WARN': return 'default';
        default: return 'outline';
    }
}

export default function LogDetailPage({ params }: { params: { id: string } }) {
    const [log, setLog] = useState<LogEntry | null>(null);

    useEffect(() => {
        const getLog = async () => {
            const fetchedLog = await getLogById(params.id);
            if (fetchedLog) {
                setLog(fetchedLog);
            }
        }
        getLog();
    }, [params.id]);

    if (!log) {
        return (
            <div className="text-center">
                <p className="text-xl text-muted-foreground">Log no encontrado.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard/logs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a la lista de logs
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Detalle del Log</CardTitle>
                        <CardDescription>ID del Log: {log.id}</CardDescription>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/logs"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Logs</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1">
                        <p className="font-semibold">Fecha y Hora:</p>
                        <p className="text-muted-foreground font-mono">{new Date(log.createdAt).toLocaleString('es-AR')}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">Nivel:</p>
                        <p><Badge variant={getBadgeVariant("ERROR")}>{"ERROR"}</Badge></p>
                    </div>
                    {log.source && (
                        <div className="space-y-1">
                            <p className="font-semibold">Fuente:</p>
                            <p className="text-muted-foreground">{log.source}</p>
                        </div>
                    )}
                    {log.cuit && (
                        <div className="space-y-1">
                            <p className="font-semibold">CUIT:</p>
                            <p className="text-muted-foreground">{log.cuit}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="font-semibold">Mensaje:</p>
                    <p className="text-muted-foreground p-3 bg-muted rounded-md">{log.message}</p>
                </div>

                {log.errorCode && (
                    <div className="space-y-1">
                        <p className="font-semibold">Código de Error:</p>
                        <p className="text-muted-foreground">{log.errorCode}</p>
                    </div>
                )}

                <Separator />

                <div>
                    <h3 className="text-lg font-semibold mb-2 text-primary">Datos Crudos (Raw Data)</h3>
                    <div className="rounded-md border bg-secondary/30 p-4 max-h-96 overflow-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.raw, null, 2)}
                        </pre>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-end mt-4">
                <Button asChild variant="outline">
                    <Link href="/dashboard/logs"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Logs</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}