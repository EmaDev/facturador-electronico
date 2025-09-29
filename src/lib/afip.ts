function toBase64(json: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64");
  }
  // Browser
  return btoa(unescape(encodeURIComponent(json)));
}

export function buildAfipQrURL(params: {
  ver?: number;
  fecha: string;      // "YYYY-MM-DD"
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;    // total del comprobante
  moneda?: string;    // "PES"
  ctz?: number;       // 1 si moneda="PES"
  tipoDocRec: number; // 80 (CUIT) | 99 (CF)
  nroDocRec: number;  // 0 si tipoDocRec = 99
  tipoCodAut?: "E" | "A"; // "E"=CAE (default) | "A"=CAEA
  codAut?: number | string; // CAE/CAEA (numérico)
}) {
  const payload = {
    ver: params.ver ?? 1,
    fecha: params.fecha,                       // "YYYY-MM-DD"
    cuit: Number(params.cuit),
    ptoVta: Number(params.ptoVta),
    tipoCmp: Number(params.tipoCmp),
    nroCmp: Number(params.nroCmp),
    // AFIP permite decimales. Forzamos 2 para coherencia visual.
    importe: Number(Number(params.importe).toFixed(2)),
    moneda: params.moneda ?? "PES",
    ctz: params.ctz ?? 1,
    tipoDocRec: Number(params.tipoDocRec),
    nroDocRec: params.tipoDocRec === 99 ? 0 : Number(params.nroDocRec),
    tipoCodAut: params.tipoCodAut ?? "E",
    // Acepta string o número; aseguramos numérico puro
    codAut: params.codAut != null ? Number(String(params.codAut).replace(/\D/g, "")) : undefined,
  };

  const p = toBase64(JSON.stringify(payload));
  return `https://www.afip.gob.ar/fe/qr/?p=${p}`;
}

export function todayAfip() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { yyyymmdd: `${y}${m}${dd}`, iso: `${y}-${m}-${dd}` };
}

// Acceso tolerante en respuestas SOAP->JSON
export function deepGet<T = any>(obj: any, paths: string[]): T | undefined {
  for (const p of paths) {
    try {
      const v = p.split(".").reduce((o: any, k) => (o?.[k]), obj);
      if (v !== undefined && v !== null) return v as T;
    } catch { }
  }
  return undefined;
}

// Devuelve el primer FECAEDetResponse (si es array toma [0])
export function pickFirstDet(resp: any): any {
  const det = (
    resp?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse ??
    resp?.FeDetResp?.FECAEDetResponse ??
    resp?.FECAEDetResponse ??
    resp
  );
  return Array.isArray(det) ? det[0] : det;
}

// Normaliza fecha AFIP "AAAAMMDD" a "DD/MM/AAAA". Soporta number, string, Date.
export function normalizeAfipDate(input: unknown): string {
  if (input == null) return "";
  let s: string;
  if (typeof input === "string") s = input;
  else if (typeof input === "number") s = String(input);
  else if (input instanceof Date) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  } else {
    // por si viene { _: '20250131' } u otro objeto
    s = String((input as any)?._ ?? input);
  }

  // Si viene "2025-01-31" o similar
  const digits = s.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}/${m}/${y}`;
  }

  return "";
}

type IvaCondition = "Responsable Inscripto" | "Monotributista" | "Exento" | "Consumidor Final";
export function resolveCbteTipo(emitter: IvaCondition, receiver?: IvaCondition): number {
  if (emitter === "Monotributista") return 11; // Factura C
  if (emitter === "Responsable Inscripto") {
    if (receiver === "Responsable Inscripto") return 1; // A
    return 6; // B
  }
  // Si el emisor es Exento (raro como emisor) o no configurado, por defecto B
  return 6;
}

// (Opcional) mapear Condición IVA a Id AFIP para tu campo CondicionIVAReceptorId
export function mapCondIvaToId(cond?: IvaCondition): number {
  switch (cond) {
    case "Responsable Inscripto": return 1;
    case "Exento": return 4;
    case "Consumidor Final": return 5;
    case "Monotributista": return 6;
    default: return 5; // CF por defecto
  }
}


export function resolveCustomerDocTipo(customerTaxId: string): {
  DocTipo: number;
  DocNro: number;
} {
  const onlyDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
  const taxId = onlyDigits(customerTaxId);

  let DocTipo = 99; // Consumidor Final por defecto
  let DocNro = 0;

  if (taxId) {
    if (taxId.length === 11) {
      // Puede ser CUIT o CUIL
      const prefix = taxId.slice(0, 2);
      if (["20", "23", "24", "27"].includes(prefix)) {
        DocTipo = 86; // CUIL
      } else {
        DocTipo = 80; // CUIT
      }
      DocNro = Number(taxId);
    } else if (taxId.length === 8) {
      DocTipo = 96; // DNI
      DocNro = Number(taxId);
    }
  }
  return {
    DocTipo,
    DocNro
  };
}

export function mapFacturaToCbteAsocTipo(facturaTipo: number): number {
  switch (facturaTipo) {
    case 1: return 91;   // Factura A → Asociar con 91
    case 6: return 88;   // Factura B → Asociar con 88
    case 11: return 995; // Factura C → Asociar con 995 (usualmente, validar en tablas AFIP)
    default:
      throw new Error(`CbteTipo ${facturaTipo} no soportado para asociación`);
  }
}