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

/**
 * Convierte una fecha al formato requerido por AFIP:
 * - yyyymmdd: "20251004"
 * - iso: "2025-10-04"
 *
 * Si no se pasa una fecha, usa la actual.
 */
export function todayAfip(dateInput?: string | Date) {
  const d = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();

  // Aseguramos que sea una fecha válida
  if (isNaN(d.getTime())) {
    throw new Error("Fecha inválida en todayAfip()");
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return {
    yyyymmdd: `${y}${m}${dd}`,
    iso: `${y}-${m}-${dd}`,
  };
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

type IvaCondition = "Responsable Inscripto" | "Monotributista" | "Exento" | "Consumidor Final" | "Responsable Monotributo";
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
/*export function mapCondIvaToId(cond?: IvaCondition): number {
  switch (cond) {
    case "Responsable Inscripto": return 1;
    case "Exento": return 4;
    case "Consumidor Final": return 5;
    case "Monotributista": return 6;
    case "Responsable Monotributo": return 6;
    default: return 5; // CF por defecto
  }
}*/

export const CONDICIONES_IVA = [
  {
    id: 1,
    desc: "Responsable Inscripto",
    clases: ["A", "M", "C"],
  },
  {
    id: 6,
    desc: "Monotributista",
    clases: ["A", "M", "C"],
  },
  {
    id: 6,
    desc: "Responsable Monotributo",
    clases: ["A", "M", "C"],
  },
  {
    id: 13,
    desc: "Monotributista Social",
    clases: ["A", "M", "C"],
  },
  {
    id: 16,
    desc: "Monotributo Trabajador Independiente Promovido",
    clases: ["A", "M", "C"],
  },
  {
    id: 4,
    desc: "IVA Sujeto Exento",
    clases: ["B", "C"],
  },
  {
    id: 7,
    desc: "Sujeto No Categorizado",
    clases: ["B", "C"],
  },
  {
    id: 8,
    desc: "Proveedor del Exterior",
    clases: ["B", "C"],
  },
  {
    id: 9,
    desc: "Cliente del Exterior",
    clases: ["B", "C"],
  },
  {
    id: 10,
    desc: "IVA Liberado - Ley N° 19.640",
    clases: ["B", "C"],
  },
  {
    id: 15,
    desc: "IVA No Alcanzado",
    clases: ["B", "C"],
  },
  {
    id: 5,
    desc: "Consumidor Final",
    clases: ["C", "49"], // 49 = tique
  },
];

export function mapCondIvaToId(cond?: string): number {
  if (!cond) return 5; // Consumidor Final por defecto
  const found = CONDICIONES_IVA.find(c =>
    c.desc.toLowerCase() === cond.toLowerCase()
  );
  return found?.id ?? 5;
}


/**
 * Determina el tipo de documento AFIP (DocTipo) y su número
 * a partir del identificador fiscal o documento del cliente.
 *
 * Referencia oficial ARCA/AFIP:
 *  - 80 = CUIT
 *  - 86 = CUIL
 *  - 87 = CDI
 *  - 96 = DNI
 *  - 94 = Pasaporte
 *  - 91 = CI Extranjera
 *  - 99 = Otro / No informado
 */
export function resolveCustomerDocTipo(customerTaxId?: string): {
  DocTipo: number;
  DocNro: number;
} {
  const onlyDigits = (s: string) => (s || "").replace(/[^\d]/g, "");
  const taxId = onlyDigits(customerTaxId ?? "");

  let DocTipo = 99; // Default: "Doc. (otro)"
  let DocNro = 0;

  if (!taxId) {
    // Sin identificación → Consumidor Final
    return { DocTipo, DocNro };
  }

  // === CASOS ESPECIALES ===
  // CUIT / CUIL / CDI → 11 dígitos
  if (taxId.length === 11) {
    const prefix = taxId.slice(0, 2);
    switch (prefix) {
      case "20":
      case "23":
      case "24":
      case "27":
        //DocTipo = 86; // CUIL
        //break;
      case "30":
      case "33":
      case "34":
        DocTipo = 80; // CUIT
        break;
      default:
        DocTipo = 87; // CDI u otro identificador de 11 dígitos
        break;
    }
    DocNro = Number(taxId);
  }

  // DNI → 8 dígitos
  else if (taxId.length === 8) {
    DocTipo = 96; // DNI
    DocNro = Number(taxId);
  }

  // Pasaporte → empieza con "P" o mezcla de letras y números
  else if (/^P/i.test(customerTaxId || "")) {
    DocTipo = 94; // Pasaporte
    DocNro = 0;   // AFIP no exige número válido para pasaporte
  }

  // CI Extranjera → puede venir con prefijo tipo "E" o "EX"
  else if (/^E[X]?[0-9]*/i.test(customerTaxId || "")) {
    DocTipo = 91; // Cédula extranjera
    DocNro = 0;
  }

  // Si llega otro valor (por ejemplo "S/N" o no numérico)
  else {
    DocTipo = 99; // Otro documento
    DocNro = 0;
  }

  return { DocTipo, DocNro };
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