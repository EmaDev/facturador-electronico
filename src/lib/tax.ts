import type { InvoiceItem } from "@/lib/types";

/** Mapeo de tasa → Id AFIP para AlicIva */
export const AFIP_VAT_ID: Record<number, number> = {
  0: 3,      // 0%
  2.5: 9,    // 2,5%
  5: 8,      // 5%
  10.5: 4,   // 10,5%
  21: 5,     // 21%
  27: 6,     // 27%
};

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Interpreta precios por ítem según el tipo de comprobante:
 *  - A (1): price es NETO → IVA explícito
 *  - B/C (6/11): price es FINAL → IVA implícito (se respalda neto/iva para AFIP)
 *
 * Cada ítem puede traer taxRate (porcentaje) distinto. Default: 21.
 * Aplica descuento por ítem ANTES de calcular IVA.
 */
export function computePerItemTax(
  items: InvoiceItem[],
  cbteTipo: number
) {
  const isFacturaA = cbteTipo === 1;

  type Line = {
    id: string;
    description: string;
    code?: string;
    qty: number;
    unitPriceInput: number;     // lo que vino en item.price
    discountPct: number;
    taxRate: number;            // 0 | 10.5 | 21 | 27 | etc
    afipRateId: number;         // AFIP id para AlicIva

    // Calculados
    unitNet: number;
    unitIva: number;
    unitFinal: number;

    lineNet: number;
    lineIva: number;
    lineFinal: number;
  };

  const lines: Line[] = items.map((it) => {
    const qty = it.quantity;
    const discount = (it.discount ?? 0) / 100;
    const taxRate = (it as any).taxRate ?? 21;     // default 21
    const rate = Number(taxRate);
    const rateId = AFIP_VAT_ID[rate] ?? 5;         // default 21→Id 5

    // Precio base al que se aplica el descuento:
    const priceAfterDiscount = round2(it.price * (1 - discount));

    let unitNet: number, unitIva: number, unitFinal: number;

    if (isFacturaA) {
      // price = NETO (explícito)
      unitNet = priceAfterDiscount;
      unitIva = round2(unitNet * (rate / 100));
      unitFinal = round2(unitNet + unitIva);
    } else {
      // B/C → price = FINAL (implícito)
      unitFinal = priceAfterDiscount;
      const denom = 1 + rate / 100;
      unitNet = round2(unitFinal / denom);
      unitIva = round2(unitFinal - unitNet);
    }

    const lineNet = round2(unitNet * qty);
    const lineIva = round2(unitIva * qty);
    const lineFinal = round2(unitFinal * qty);

    return {
      id: it.id,
      description: it.name,
      code: it.code,
      qty,
      unitPriceInput: it.price,
      discountPct: (it.discount ?? 0),
      taxRate: rate,
      afipRateId: rateId,
      unitNet,
      unitIva,
      unitFinal,
      lineNet,
      lineIva,
      lineFinal,
    };
  });

  // Totales y armado de Iva[] agrupando por tasa
  const neto = round2(lines.reduce((a, l) => a + l.lineNet, 0));
  const iva = round2(lines.reduce((a, l) => a + l.lineIva, 0));
  const total = round2(lines.reduce((a, l) => a + l.lineFinal, 0));

  // Agrupar por afipRateId
  const ivaMap = new Map<number, { BaseImp: number; Importe: number }>();
  for (const l of lines) {
    const acc = ivaMap.get(l.afipRateId) ?? { BaseImp: 0, Importe: 0 };
    acc.BaseImp = round2(acc.BaseImp + l.lineNet);
    acc.Importe = round2(acc.Importe + l.lineIva);
    ivaMap.set(l.afipRateId, acc);
  }

  const ivaItems = Array.from(ivaMap.entries()).map(([Id, v]) => ({
    Id,
    BaseImp: v.BaseImp,
    Importe: v.Importe,
  }));

  return {
    lines,                // detalle por ítem ya calculado
    neto, iva, total,     // totales
    ivaItems,             // para enviar a AFIP
    isFacturaA,           // por si querés rotular PDF o UI
  };
}