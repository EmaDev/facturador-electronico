"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { fetchLibroIvaVentas } from "@/services/wsfe";
import { exportLibroIvaToXLS } from "@/lib/exportUtils";
import { FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAccountStore } from "@/store/account";

export default function LibroIvaVentas() {
    const [cuit, setCuit] = useState("20219641215");
    const [year, setYear] = useState("2025");
    const [month, setMonth] = useState("10");
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const accountState = useAccountStore.getState();

    const handleFetch = async () => {
        try {
            setLoading(true);
            setData(null);
            const resp = await fetchLibroIvaVentas(accountState.auth!.cuitEmisor, Number(year), Number(month));
            setData(resp);
        } catch (e: any) {
            alert(e.message || "Error al obtener datos");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || !data.items || data.items.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        const fileName = `Libro-IVA-Ventas-${data.period.replace('/', '-')}`;
        exportLibroIvaToXLS(data, fileName);
    };

    return (
        <Card className="p-8">
            <h2 className="text-xl font-bold mb-4">📘 Libro IVA Ventas</h2>

            <div className="flex flex-wrap items-center gap-2">
                {/*<Input placeholder="CUIT" value={cuit} onChange={e => setCuit(e.target.value)} className="w-48" />*/}
                <Input placeholder="Año" value={year} onChange={e => setYear(e.target.value)} className="w-28" />
                <Input placeholder="Mes" value={month} onChange={e => setMonth(e.target.value)} className="w-20" />
                <Button onClick={handleFetch} disabled={loading}>
                    {loading ? "Cargando..." : "Consultar"}
                </Button>

                <Button
                    onClick={handleExport}
                    disabled={!data || loading}
                    variant="outline"
                >
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar a XLS
                </Button>
            </div>

            {data && (
                <>
                    <div className="mt-4">
                        <p><strong>Período:</strong> {data.period}</p>
                        <p><strong>Comprobantes:</strong> {data.totalDocs}</p>
                        <p><strong>Total Neto:</strong> ${data.totalNeto.toLocaleString("es-AR")}</p>
                        <p><strong>Total IVA:</strong> ${data.totalIVA.toLocaleString("es-AR")}</p>
                        <p><strong>Total General:</strong> ${data.totalGeneral.toLocaleString("es-AR")}</p>
                    </div>

                    <div className="rounded-md border mt-4 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-center">Pto. Venta</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>CUIT</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Neto</TableHead>
                                    <TableHead className="text-right">IVA</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((item: any) => (
                                    <TableRow key={item.cbteNumero}>
                                        <TableCell>{item.fechaEmisionIso}</TableCell>
                                        <TableCell className="text-center font-mono">{String(item.ptoVta).padStart(5, '0')}</TableCell>
                                        <TableCell>{item.customerSnapshot.name}</TableCell>
                                        <TableCell>{item.customerSnapshot.taxId}</TableCell>
                                        <TableCell>{item.cbteTipo}</TableCell>
                                        <TableCell className="text-right">${item.impNeto.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="text-right">${item.impIva.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="text-right font-medium">${item.impTotal.toLocaleString("es-AR")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </Card>
    );
}
