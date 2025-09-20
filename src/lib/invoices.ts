const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:3000";

/** ===== Tipos (alineados al backend) ===== */
export type SaveInvoiceItem = {
  id: string;
  description: string;
  code?: string | null;
  qty: number;
  unitPriceInput: number;
  discountPct: number;
  taxRate: number;
  afipRateId: number;
  unitNet: number;
  unitIva: number;
  unitFinal: number;
  lineNet: number;
  lineIva: number;
  lineFinal: number;
};

export type SaveInvoicePayload = {
  emitterCuit: string;
  ptoVta: number;
  customerId: string;

  cbteTipo: number;
  cbteNumero: number;
  cbtePtoVtaStr: string;
  cbteNumeroStr: string;
  cae: string;
  caeVto: string;
  fechaEmisionIso: string;
  qrUrl: string;
  numberStr: string;

  impNeto: number;
  impIva: number;
  impTotal: number;
  impTotConc: number;
  impOpEx: number;
  impTrib: number;
  ivaItems: Array<{ Id: number; BaseImp: number; Importe: number }>;

  items: SaveInvoiceItem[];

  customerName: string;
  customerTaxId: string;
  customerAddress?: string;
  customerEmail?: string;
  customerIvaCond?: string;

  isFacturaA: boolean;
};

export type InvoiceEntity = SaveInvoicePayload & {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

/** ===== Crear factura (persistir en historial) ===== */
export async function saveInvoice(payload: SaveInvoicePayload): Promise<InvoiceEntity> {
  // limpiamos undefined para Firestore
  const body = JSON.parse(JSON.stringify(payload));
  const res = await fetch(`${NEST_API_URL}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || "No se pudo guardar la factura");
  }
  return json.invoice as InvoiceEntity;
}

/** ===== (Opcional) Listar facturas ===== */
export async function getInvoices(query: {
  emitterCuit?: string;
  customerId?: string;
  ptoVta?: number;
}) {
  const params = new URLSearchParams();
  if (query.emitterCuit) params.set("emitterCuit", query.emitterCuit);
  if (query.customerId) params.set("customerId", query.customerId);
  if (typeof query.ptoVta === "number") params.set("ptoVta", String(query.ptoVta));

  const res = await fetch(`${NEST_API_URL}/invoices?${params.toString()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "No se pudo obtener el historial de facturas");
  return (json.invoices ?? []) as InvoiceEntity[];
}

/** ===== (Opcional) Obtener una factura por ID ===== */
export async function getInvoiceById(id: string) {
  const res = await fetch(`${NEST_API_URL}/invoices/${id}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "No se pudo obtener la factura");
  return (json.invoice ?? null) as InvoiceEntity | null;
}