
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchLogs } from '@/services/wsfe';
import { useAccountStore } from '@/store/account';

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
        case 'INFO':
            return 'secondary';
        case 'ERROR':
            return 'destructive';
        case 'WARN':
            return 'default';
        default:
            return 'destructive';
    }
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const router = useRouter();

    const handleRowClick = (logId: string) => {
        router.push(`/dashboard/logs/${logId}`);
    };


    useEffect(() => {
        const getLogs = async () => {
            const { auth, activePv } = useAccountStore.getState();
            const logs = await fetchLogs(auth!.cuitEmisor, activePv!)
            setLogs(logs)
        }
        getLogs();
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Visor de Logs de Transacciones</CardTitle>
                <CardDescription>Revise los eventos importantes y errores del sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Fecha y Hora</TableHead>
                                <TableHead className="w-[100px]">Nivel</TableHead>
                                <TableHead>Mensaje</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length > 0 ? logs.map(log => (
                                <TableRow key={log.id} onClick={() => handleRowClick(log.id)} className="cursor-pointer">
                                    <TableCell className="font-mono text-xs">{new Date(log.createdAt).toLocaleString('es-AR')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getBadgeVariant(log.level)}>{"ERROR"}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{log.message}</p>
                                        <p className="text-sm text-muted-foreground">{log.details || `Source: ${log.source} - CUIT: ${log.cuit}`}</p>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No hay logs para mostrar.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}