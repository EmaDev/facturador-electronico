import * as XLSX from 'xlsx';

const DOCUMENT_TYPE_MAP: { [key: number]: string } = {
  1: 'Factura A',
  2: 'Nota de Débito A',
  3: 'Nota de Crédito A',
  6: 'Factura B',
  7: 'Nota de Débito B',
  8: 'Nota de Crédito B',
  11: 'Factura C',
  12: 'Nota de Débito C',
  13: 'Nota de Crédito C',
};

interface LibroIVAResponse {
  items: any[];
  totalNeto: number;
  totalIVA: number;
  totalGeneral: number;
  period: string;
}

export function exportLibroIvaToXLS(apiData: LibroIVAResponse, fileName: string) {
  const dataForSheet = apiData.items.map(item => ({
    'Fecha': new Date(item.fechaEmisionIso).toLocaleDateString('es-AR', { timeZone: 'UTC' }),
    'Punto de Venta': item.ptoVta, // 👈 NUEVO
    'Comprobante': item.numberStr,
    'Tipo': DOCUMENT_TYPE_MAP[item.cbteTipo] || `Desconocido (${item.cbteTipo})`,
    'Cliente': item.customerSnapshot.name,
    'CUIT Cliente': item.customerSnapshot.taxId,
    'Neto Gravado': item.impNeto,
    'IVA': item.impIva,
    'Total': item.impTotal,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataForSheet);

  XLSX.utils.sheet_add_aoa(worksheet, [
    [
      'TOTALES', 
      '', // Columna extra para Punto de Venta 👈 NUEVO
      '', 
      '',
      '', 
      '', 
      apiData.totalNeto, 
      apiData.totalIVA, 
      apiData.totalGeneral
    ],
  ], { origin: -1 });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Ventas ${apiData.period.replace('/', '-')}`);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}