import QRCode from "qrcode";
import {
  createLog,
  fecaesolicitar,
  feCompUltimoAutorizado,
} from "@/services/wsfe";
import { generateInvoicePdf, downloadBlob } from "@/services/generateInvoicePdf";
import {
  buildAfipQrURL,
  deepGet,
  mapCondIvaToId,
  mapFacturaToCbteAsocTipo,
  normalizeAfipDate,
  pickFirstDet,
  resolveCustomerDocTipo,
  todayAfip,
} from "@/lib/afip";
import { computePerItemTax } from "@/lib/tax";
import { saveInvoice, SaveInvoicePayload } from "@/lib/invoices";
import type { Customer, InvoiceItem } from "@/lib/types";
import type { AccountState } from "@/store/account";

// Argumentos necesarios para el proceso completo
interface CreateInvoiceArgs {
  customer: Customer;
  items: InvoiceItem[];
  documentTypeId: string;
  invoiceDate: string; // YYYY-MM-DD
  associatedInvoice?: string;
  accountState: AccountState;
}

/**
 * Orquesta el proceso completo de facturación:
 * 1. Obtiene el último comprobante.
 * 2. Construye el payload para AFIP.
 * 3. Solicita el CAE.
 * 4. Loguea la operación.
 * 5. Guarda en la base de datos local.
 * 6. Genera y descarga el PDF.
 */
export async function processInvoiceCreation({
  customer,
  items,
  documentTypeId,
  invoiceDate,
  associatedInvoice,
  accountState,
}: CreateInvoiceArgs) {
  const { auth, account, activePv, invoiceTemplatesByPv } = accountState;

  // Validaciones iniciales
  if (!auth?.wsaa_token || !auth?.wsaa_sign || !auth?.cuitEmisor) {
    throw new Error("Credenciales WSAA o CUIT emisor no disponibles.");
  }
  if (!activePv) {
    throw new Error("No hay un Punto de Venta activo seleccionado.");
  }

  // --- 1. Preparación de Datos ---
  const cbteTipo = Number(documentTypeId);
  const isCreditNote = ["3", "8", "13"].includes(documentTypeId);
  const { lines, neto, iva, total, ivaItems } = computePerItemTax(
    items,
    cbteTipo
  );
  const { DocTipo, DocNro } = resolveCustomerDocTipo(customer.taxId);
  const { yyyymmdd, iso } = todayAfip(invoiceDate);

  // --- 2. Obtener Último Comprobante Autorizado ---
  const ult = await feCompUltimoAutorizado(activePv, cbteTipo, {
    wsaa_token: auth.wsaa_token,
    wsaa_sign: auth.wsaa_sign,
    cuit: auth.cuitEmisor,
  });
  const ultNro = deepGet<number>(ult, [
      "Envelope.Body.FECompUltimoAutorizadoResponse.FECompUltimoAutorizadoResult.CbteNro",
      "CbteNro"
    ]) ?? 0;
  const nextN = Number(ultNro) + 1;

  // --- 3. Construir Payload para fecaesolicitar ---
  const detalle: any = {
    Concepto: 1, // Productos
    DocTipo,
    DocNro,
    CbteDesde: nextN,
    CbteHasta: nextN,
    CbteFch: yyyymmdd,
    ImpTotal: total,
    ImpTotConc: 0,
    ImpNeto: neto,
    ImpOpEx: 0,
    ImpIVA: iva,
    ImpTrib: 0,
    CondicionIVAReceptorId: mapCondIvaToId(customer.ivaCondition),
    MonId: "PES",
    MonCotiz: 1,
    Iva: ivaItems,
  };
  
  if ([11, 12, 13].includes(cbteTipo)) {
    detalle.ImpIVA = 0;
    detalle.ImpNeto = detalle.ImpTotal;
    detalle.Iva = undefined; // Se omite en lugar de array vacío
  }

  if (isCreditNote && associatedInvoice) {
    detalle.CbtesAsoc = [{
        Tipo: mapFacturaToCbteAsocTipo(cbteTipo === 3 ? 1 : cbteTipo === 8 ? 6 : 11),
        PtoVta: activePv,
        Nro: Number(associatedInvoice),
    }];
  }
  
  const afipRequestBody = {
    auth: { wsaa_token: auth.wsaa_token, wsaa_sign: auth.wsaa_sign, cuit: auth.cuitEmisor },
    data: { PtoVta: activePv, CbteTipo: cbteTipo, detalle },
  };

  // --- 4. Solicitar CAE a AFIP ---
  const afipResponse = await fecaesolicitar(afipRequestBody);
  await createLog(afipResponse, afipRequestBody);

  // --- 5. Parsear Respuesta de AFIP ---
  const det = pickFirstDet(afipResponse);
  const cae: string = String(det?.CAE ?? "");
  const caeVto: string = normalizeAfipDate(det?.CAEFchVto);
  const nroCmp = afipResponse?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeCabResp?.CbteHasta ?? nextN;

  if (!cae || !caeVto) {
      throw new Error("La respuesta de ARCA no contiene CAE o fecha de vencimiento.");
  }

  // --- 6. Guardar en Base de Datos ---
  const qrUrl = buildAfipQrURL({ fecha: iso, cuit: Number(auth.cuitEmisor), ptoVta: activePv, tipoCmp: cbteTipo, nroCmp, importe: total, moneda: "PES", ctz: 1, tipoDocRec: DocTipo, nroDocRec: DocNro, tipoCodAut: "E", codAut: cae });
  const numberStr = `${String(activePv).padStart(5, "0")}-${String(nroCmp).padStart(8, "0")}`;

  const savePayload: SaveInvoicePayload = {
      // ... (construir el savePayload como en el original)
      emitterCuit: auth.cuitEmisor, ptoVta: activePv, customerId: customer.id, cbteTipo, cbteNumero: Number(nroCmp), cbtePtoVtaStr: String(activePv).padStart(5, "0"), cbteNumeroStr: String(nroCmp).padStart(8, "0"), cae, caeVto, fechaEmisionIso: iso, qrUrl, numberStr, impNeto: Number(neto.toFixed(2)), impIva: Number(iva.toFixed(2)), impTotal: Number(total.toFixed(2)), impTotConc: 0, impOpEx: 0, impTrib: 0, ivaItems, items: lines, customerName: customer.name, customerTaxId: customer.taxId, customerAddress: customer.address, customerEmail: customer.email ?? "", customerIvaCond: customer.ivaCondition ?? "", isFacturaA: [1, 2, 3].includes(cbteTipo),
  };
  await saveInvoice(savePayload).catch(e => console.warn("Historial: no se pudo guardar la factura:", e));

  // --- 7. Generar y Descargar PDF ---
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: "M", margin: 0, scale: 6 });
  
  const dataPtventa = account?.puntosVenta?.find(ptvta => ptvta.id === activePv);
  const tpl = invoiceTemplatesByPv?.[activePv];
  
  const pdfPayload = {
      // ... (construir el pdfPayload como en el original)
      seller: { companyName: account?.companyname || '', fantasyName: dataPtventa?.fantasia || account?.companyname || '', companyAddress: dataPtventa?.domicilio || account?.domicilio || '', companyPhone: account?.telefono || '', vatCondition: account?.ivaCondition || '', logoDataUrl: tpl?.logoUrl || "" },
      header: { number: numberStr, date: iso.split('-').reverse().join('/'), cae, caeVto, qrUrl: qrDataUrl, cuit: auth.cuitEmisor.replace(/^(\d{2})(\d{8})(\d{1})$/, '$1-$2-$3'), ingresosBrutos: account?.iibb || "", inicioActividades: account?.startactivity || "" , cbteTipo },
      customer: { name: customer.name, domicilio: customer.address, condIVA: customer.ivaCondition ?? '', condVenta: 'Contado', cuit: customer.taxId, localidad: '-', provincia: '-', telefono: customer.email ?? '-' },
      items: lines, footerHtml: '<p></p>',
  };

  const blob = await generateInvoicePdf(pdfPayload, { currency: "ARS", rowsPerFirstPage: 12, rowsPerPage: 22, showCustomerOnAllPages: false });
  downloadBlob(blob, `Factura-${numberStr}.pdf`);
  
  return { success: true, numberStr };
}