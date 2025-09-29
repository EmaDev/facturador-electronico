// src/services/InvoiceDocument.tsx
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

/** ======== Tipos de datos esperados ======== */
type Seller = {
  companyName: string;
  fantasyName: string;
  companyAddress: string;
  companyPhone?: string;
  vatCondition?: string;
  logoDataUrl?: string | null;
};

type Header = {
  number: string;              // "0001-00000001"
  date: string;                // "dd/mm/aaaa"
  cuit?: string;
  ingresosBrtos?: string;
  ingresosBrutos?: string;
  inicioActividades?: string;
  cae?: string;
  caeVto?: string;             // "dd/mm/aaaa"
  qrUrl?: string;              // URL del QR de AFIP
  cbteTipo: number;
};

type Customer = {
  name: string;
  domicilio: string;
  condIVA: string;
  condVenta: string;
  cuit: string;
  localidad: string;
  provincia: string;
  telefono: string;
};

/** ======== Item (estructura back) ======== */
type Item = {
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

type Payload = {
  seller: Seller;
  header: Header;
  customer: Customer;
  items: Item[];
  footerHtml?: string;
  /** NUEVO: otros tributos opcional para totales en B */
  otrosTributos?: number;
};

export type InvoicePdfOptions = {
  currency?: string;
  rowsPerFirstPage?: number;
  rowsPerPage?: number;
  showCustomerOnAllPages?: boolean;
};

type Props = {
  payload: Payload;
  opts: Required<InvoicePdfOptions>;
};

/** ===================== Estilos ===================== */
const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 100, // deja espacio al footer fijo
    fontSize: 9,
    fontFamily: "Helvetica",
    position: "relative",
  },
  section: { marginBottom: 8 },
  border: { borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  col: { flexDirection: "column" },

  headerLeft: { flex: 1, padding: 8 },
  headerRight: { width: 220, padding: 8 },

  hCompany: { fontSize: 12, fontWeight: 700, textAlign: "center", flexWrap: "wrap" },
  textCenter: { textAlign: "center" },
  bold: { fontWeight: 700 },

  tableHeader: {
    backgroundColor: "#ECECEC",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  cell: { paddingVertical: 4, paddingHorizontal: 4, borderRightWidth: 1, borderColor: "#000" },
  cellNoRight: { paddingVertical: 4, paddingHorizontal: 4 },
  textRight: { textAlign: "right" },

  totalsBox: {
    width: 260,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "#000",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  totalsRowEmph: { backgroundColor: "#ECECEC" },

  noteBox: {
    marginTop: 6,
    width: 260,
    alignSelf: "flex-end",
  },

  footerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderWidth: 1,
    borderColor: "#000",
    position: "absolute",
    bottom: 20,
    left: 18,
    right: 18,
  },
  qr: { width: 70, height: 70 },

  small: { fontSize: 8 },
});

/** ===================== Utilidades ===================== */
const fmtMoney = (n: number, currency = "ARS") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(n);

// Paginado
function paginate<T>(items: T[], first: number, perPage: number): T[][] {
  if (items.length <= first) return [items];
  const pages: T[][] = [];
  pages.push(items.slice(0, first));
  let i = first;
  while (i < items.length) {
    pages.push(items.slice(i, i + perPage));
    i += perPage;
  }
  return pages;
}

// Totales
function computeTotals(items: Item[]) {
  const neto = items.reduce((acc, it) => acc + (it.lineNet ?? 0), 0);
  const ivaTotal = items.reduce((acc, it) => acc + (it.lineIva ?? 0), 0);
  const total = items.reduce((acc, it) => acc + (it.lineFinal ?? 0), 0);

  const iva21 = items.filter(it => Number(it.taxRate) === 21)
    .reduce((acc, it) => acc + (it.lineIva ?? 0), 0);
  const iva105 = items.filter(it => Number(it.taxRate) === 10.5)
    .reduce((acc, it) => acc + (it.lineIva ?? 0), 0);

  return { neto, ivaTotal, total, iva21, iva105 };
}

/** ====== Meta por cbteTipo (A/B/C/...) ====== */
function cbteMeta(cbteTipo: number): { letter: string; code: string; title: string } {
  switch (cbteTipo) {
    case 1: return { letter: "A", code: "01", title: "FACTURA" };
    case 2: return { letter: "A", code: "02", title: "NOTA DE DÉBITO" };
    case 3: return { letter: "A", code: "03", title: "NOTA DE CRÉDITO" };
    case 6: return { letter: "B", code: "06", title: "FACTURA" };
    case 7: return { letter: "B", code: "07", title: "NOTA DE DÉBITO" };
    case 8: return { letter: "B", code: "08", title: "NOTA DE CRÉDITO" };
    case 11: return { letter: "C", code: "11", title: "FACTURA" };
    case 12: return { letter: "C", code: "12", title: "NOTA DE DÉBITO" };
    case 13: return { letter: "C", code: "13", title: "NOTA DE CRÉDITO" };
    case 19: return { letter: "E", code: "19", title: "FACTURA E" };
    case 201: return { letter: "A", code: "201", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };
    case 202: return { letter: "B", code: "202", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };
    case 206: return { letter: "C", code: "206", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };
    case 203: return { letter: "A", code: "203", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 204: return { letter: "A", code: "204", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
    case 207: return { letter: "B", code: "207", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 208: return { letter: "B", code: "208", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
    case 211: return { letter: "C", code: "211", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 212: return { letter: "C", code: "212", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
    default: return { letter: "A", code: String(cbteTipo).padStart(2, "0"), title: "FACTURA" };
  }
}

/** ===================== Componentes parciales ===================== */
function insertarSaltoLinea(texto:string, limite = 20) {
  if (texto.length <= limite) return texto; // No hace falta cortar

  // Buscar el primer espacio después del límite
  const indiceEspacio = texto.indexOf(' ', limite);

  if (indiceEspacio === -1) {
    // Si no hay espacio después del límite, no cortamos
    return texto;
  }

  // Insertar salto de línea en el primer espacio luego del límite
  return texto.slice(0, indiceEspacio) + '\n' + texto.slice(indiceEspacio + 1);
}

const SellerHeader: React.FC<{ seller: Seller }> = ({ seller }) => (
  <View style={[styles.border, styles.headerLeft, { alignItems: "center", justifyContent: "center" }]}>
    {/* Logo + nombre de fantasía centrados */}
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
      {seller.logoDataUrl ? (
        <Image src={seller.logoDataUrl} style={{ width: 80, maxHeight: 60, marginRight: 4 }} />
      ) : null}
      <Text style={[styles.hCompany]}>{insertarSaltoLinea(seller.fantasyName, 15) ?? insertarSaltoLinea(seller.companyName)}</Text>
    </View>

    {/* Datos adicionales de la empresa */}
    <View style={{ marginTop: 4 }}>
      <Text style={styles.textCenter}>Razón Social: {seller.companyName}</Text>
      <Text style={styles.textCenter}>Domicilio Comercial: {seller.companyAddress}</Text>
      {seller.companyPhone ? <Text style={styles.textCenter}>{seller.companyPhone}</Text> : null}
      {seller.vatCondition ? (
        <Text style={[styles.textCenter, styles.bold]}>
          Condición frente al IVA: {seller.vatCondition}
        </Text>
      ) : null}
    </View>
  </View>
);

const InvoiceHeaderRight: React.FC<{ header: Header }> = ({ header }) => {
  const meta = cbteMeta(header.cbteTipo);
  return (
    <View style={[styles.border, styles.headerRight, styles.col, { justifyContent: "space-between" }]}>
      <View style={[styles.row]}>
        <View style={{ width: 50, borderRightWidth: 1, borderColor: "#000", paddingRight: 6, marginRight: 6, alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: 700 }}>{meta.letter}</Text>
          <Text style={[styles.small, { lineHeight: 1.2 }]}>CÓD. {meta.code}</Text>
          <Text style={[styles.small, { lineHeight: 1.2 }]}>ORIGINAL</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{meta.title}</Text>
          <Text>{header.number}</Text>
          <Text style={[styles.bold, { marginTop: 4 }]}>Fecha de Emisión: {header.date}</Text>
        </View>
      </View>
      <View>
        {header.cuit ? <Text><Text style={styles.bold}>CUIT:</Text> {header.cuit}</Text> : null}
        {(header as any).ingresosBrutos ? <Text><Text style={styles.bold}>Ingresos Brutos:</Text> {(header as any).ingresosBrutos}</Text> : null}
        {header.inicioActividades ? <Text><Text style={styles.bold}>Inicio de Actividades:</Text> {header.inicioActividades}</Text> : null}
      </View>
    </View>
  );
};

const CustomerBox: React.FC<{ c: Customer }> = ({ c }) => (
  <View style={[styles.border, styles.section, { padding: 8 }]}>
    <View style={[styles.row]}>
      <View style={{ flex: 1, paddingRight: 6 }}>
        <Text><Text style={styles.bold}>Nombre/Razón Social: </Text>{c.name}</Text>
        <Text><Text style={styles.bold}>Domicilio: </Text>{c.domicilio}</Text>
        <Text><Text style={styles.bold}>Cond. IVA: </Text>{c.condIVA}</Text>
        <Text><Text style={styles.bold}>Cond. Venta: </Text>{c.condVenta}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text><Text style={styles.bold}>CUIT: </Text>{c.cuit}</Text>
      </View>
    </View>
  </View>
);

/** ========== Encabezado de tabla adaptable (A/B) ========== */
const ItemsTableHeader: React.FC<{ showIvaCol: boolean }> = ({ showIvaCol }) => (
  <View style={[styles.tableHeader, styles.row, styles.border]}>
    <Text style={[styles.cell, { width: 70 }]}>Código</Text>
    <Text style={[styles.cell, { flex: 1 }]}>Descripción</Text>
    <Text style={[styles.cell, styles.textRight, { width: 60 }]}>Cantidad</Text>
    <Text style={[styles.cell, styles.textRight, { width: showIvaCol ? 80 : 100 }]}>P. Unitario</Text>
    {showIvaCol && <Text style={[styles.cell, styles.textRight, { width: 55 }]}>Alic. IVA</Text>}
    <Text style={[styles.cellNoRight, styles.textRight, { width: showIvaCol ? 90 : 110 }]}>Importe</Text>
  </View>
);

/** ========== Fila de item adaptable (A/B) ========== */
/** Para imprimir en A: unitario con IVA (unitFinal) + columna Alic. IVA
 *  Para B: escondemos Alic. IVA, mantenemos unitFinal e importe lineFinal */
const ItemRow: React.FC<{ it: Item; currency: string; showIvaCol: boolean }> = ({ it, currency, showIvaCol }) => (
  <View style={[styles.row]}>
    <Text style={[styles.cell, { width: 70 }]}>{it.code ?? ""}</Text>
    <Text style={[styles.cell, { flex: 1 }]}>{it.description}</Text>
    <Text style={[styles.cell, styles.textRight, { width: 60 }]}>{it.qty}</Text>
    <Text style={[styles.cell, styles.textRight, { width: showIvaCol ? 80 : 100 }]}>{fmtMoney(it.unitFinal, currency)}</Text>
    {showIvaCol && (
      <Text style={[styles.cell, styles.textRight, { width: 55 }]}>
        {`${Number(it.taxRate).toString().replace('.', ',')}%`}
      </Text>
    )}
    <Text style={[styles.cellNoRight, styles.textRight, { width: showIvaCol ? 90 : 110 }]}>
      {fmtMoney(it.lineFinal, currency)}
    </Text>
  </View>
);

/** ========== Totales A (clásico) ========== */
const TotalsBoxA: React.FC<{ items: Item[]; currency: string }> = ({ items, currency }) => {
  const { neto, iva21, iva105, total } = computeTotals(items);
  return (
    <View style={[styles.totalsBox, { marginTop: 8 }]}>
      <View style={styles.totalsRow}>
        <Text style={styles.bold}>Importe Neto Gravado:</Text>
        <Text>{fmtMoney(neto, currency)}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={styles.bold}>IVA 21%:</Text>
        <Text>{fmtMoney(iva21, currency)}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={styles.bold}>IVA 10,5%:</Text>
        <Text>{fmtMoney(iva105, currency)}</Text>
      </View>
      <View style={[styles.totalsRow, styles.totalsRowEmph]}>
        <Text style={styles.bold}>Total:</Text>
        <Text style={styles.bold}>{fmtMoney(total, currency)}</Text>
      </View>
    </View>
  );
};

/** ========== Totales B (transparencia fiscal) ========== */
const TotalsBoxB: React.FC<{ items: Item[]; currency: string; otrosTributos?: number }> = ({
  items,
  currency,
  otrosTributos = 0,
}) => {
  const { ivaTotal, total } = computeTotals(items);
  const subtotal = items.reduce((acc, it) => acc + (it.lineFinal ?? 0), 0); // suma con IVA incluido
  const importeTotal = subtotal + (otrosTributos || 0);

  return (
    <>
      <View style={[styles.totalsBox, { marginTop: 8 }]}>
        <View style={styles.totalsRow}>
          <Text style={styles.bold}>Subtotal:</Text>
          <Text>{fmtMoney(subtotal, currency)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.bold}>Importe Otros Tributos:</Text>
          <Text>{fmtMoney(otrosTributos || 0, currency)}</Text>
        </View>
        <View style={[styles.totalsRow, styles.totalsRowEmph]}>
          <Text style={styles.bold}>Importe Total:</Text>
          <Text style={styles.bold}>{fmtMoney(importeTotal, currency)}</Text>
        </View>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.small}>Régimen de transparencia fiscal al consumidor ley 27.743</Text>
        <Text style={styles.small}>IVA contenido: {fmtMoney(ivaTotal, currency)}</Text>
      </View>
    </>
  );
};

const FooterBox: React.FC<{ header: Header; footerText?: string }> = ({ header, footerText }) => (
  <View style={styles.footerBox}>
    <View style={[styles.row, { alignItems: "center", gap: 8 }]}>
      
      {header.qrUrl ? <Image src={header.qrUrl} style={styles.qr} /> : null}
      <View>
        <Text style={styles.bold}>Comprobante Autorizado</Text>
        {footerText ? <Text style={styles.small}>{footerText.replace(/<[^>]*>/g, "")}</Text> : null}
      </View>
    </View>
    <View>
      <Text><Text style={styles.bold}>CAE N°: </Text>{header.cae ?? "-"}</Text>
      <Text><Text style={styles.bold}>Venc. CAE: </Text>{header.caeVto ?? "-"}</Text>
    </View>
  </View>
);

/** ===================== Documento principal ===================== */
const InvoiceDocument: React.FC<Props> = ({ payload, opts }) => {
  const currency = opts.currency ?? "ARS";
  const first = opts.rowsPerFirstPage ?? 12;
  const perPage = opts.rowsPerPage ?? 22;

  const pages = paginate(payload.items, first, perPage);

  const meta = cbteMeta(payload.header.cbteTipo);
  const isFacturaB = meta.letter === "B";
  const showIvaCol = !isFacturaB; // ocultamos para B

  return (
    <Document>
      {pages.map((items, idx) => (
        <Page size="A4" style={styles.page} key={idx}>
          {/* Encabezado */}
          <View style={[styles.section, styles.row, { gap: 8 }]}>
            <SellerHeader seller={payload.seller} />
            <InvoiceHeaderRight header={payload.header} />
          </View>

          {/* Cliente */}
          {(idx === 0 || opts.showCustomerOnAllPages) && (
            <CustomerBox c={payload.customer} />
          )}

          {/* Tabla de items */}
          <View style={[styles.section]}>
            <ItemsTableHeader showIvaCol={showIvaCol} />
            {items.map((it) => (
              <ItemRow it={it} currency={currency} showIvaCol={showIvaCol} key={it.id} />
            ))}

            {/* Relleno visual (adaptado al ancho de columnas) */}
            {(() => {
              const target = idx === 0 ? first : perPage;
              const blanks = Math.max(0, target - items.length);
              return Array.from({ length: blanks }).map((_, i) => (
                <View key={`blank-${i}`} style={[styles.row]}>
                  <Text style={[styles.cell, { width: 70 }]}>{""}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{""}</Text>
                  <Text style={[styles.cell, { width: 60, textAlign: "right" }]}>{""}</Text>
                  <Text style={[styles.cell, { width: showIvaCol ? 80 : 100, textAlign: "right" }]}>{""}</Text>
                  {showIvaCol && <Text style={[styles.cell, { width: 55, textAlign: "right" }]}>{""}</Text>}
                  <Text style={[styles.cellNoRight, { width: showIvaCol ? 90 : 110, textAlign: "right" }]}>{""}</Text>
                </View>
              ));
            })()}
          </View>

          {/* Totales (última página) */}
          {idx === pages.length - 1 && (
            isFacturaB
              ? <TotalsBoxB items={payload.items} currency={currency} otrosTributos={payload.otrosTributos} />
              : <TotalsBoxA items={payload.items} currency={currency} />
          )}

          {/* Footer fijo en cada página */}
          <FooterBox header={payload.header} footerText={payload.footerHtml} />
        </Page>
      ))}
    </Document>
  );
};

export default InvoiceDocument;