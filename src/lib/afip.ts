export function toBase64BrowserSafe(s: string) {
  // Evita problemas con unicode
  return typeof window !== "undefined"
    ? btoa(unescape(encodeURIComponent(s)))
    : Buffer.from(s).toString("base64");
}

export function buildAfipQrURL(params: {
  ver?: number;
  fecha: string;     // ISO yyyy-mm-dd
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda?: string;
  ctz?: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCod?: "E";
}) {
  const payload = {
    ver: params.ver ?? 1,
    fecha: params.fecha,
    cuit: params.cuit,
    ptoVta: params.ptoVta,
    tipoCmp: params.tipoCmp,
    nroCmp: params.nroCmp,
    importe: Number(params.importe.toFixed(2)),
    moneda: params.moneda ?? "PES",
    ctz: params.ctz ?? 1,
    tipoDocRec: params.tipoDocRec,
    nroDocRec: params.nroDocRec,
    tipoCod: params.tipoCod ?? "E",
  };
  const b64 = toBase64BrowserSafe(JSON.stringify(payload));
  return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
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
    } catch {}
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