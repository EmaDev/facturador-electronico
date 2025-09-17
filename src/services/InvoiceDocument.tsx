// src/services/InvoiceDocument.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

/** ======== Tipos de datos esperados (alineados a tu hook) ======== */
type Seller = {
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  vatCondition?: string;
  logoDataUrl?: string | null;
};

type Header = {
  number: string;              // "0001-00000001"
  date: string;                // "dd/mm/aaaa"
  cuit?: string;
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

type Item = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  pUnitario: number;
  alicIVA: string; // "21%", etc.
  importe: number; // total línea (con descuento aplicado si corresponde)
};

type Payload = {
  seller: Seller;
  header: Header;
  customer: Customer;
  items: Item[];
  footerHtml?: string; // no se renderiza como HTML; se usa texto plano
};

export type InvoicePdfOptions = {
  currency?: string;        // "ARS"
  rowsPerFirstPage?: number; // default 12
  rowsPerPage?: number;      // default 22
  showCustomerOnAllPages?: boolean; // default false
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
    paddingBottom: 20,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  section: { marginBottom: 8 },
  border: { borderWidth: 1, borderColor: "#000" },
  row: { flexDirection: "row" },
  col: { flexDirection: "column" },

  headerLeft: { flex: 1, padding: 8 },
  headerRight: { width: 220, padding: 8 },

  hCompany: { fontSize: 14, fontWeight: 700, textAlign: "center" },
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

  itemsRow: { borderBottomWidth: 1, borderColor: "#000" },

  totalsBox: {
    width: 220,
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

  footerBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, borderWidth: 1, borderColor: "#000" },
  qr: { width: 70, height: 70 },

  small: { fontSize: 8 },
});

/** ===================== Utilidades ===================== */
const fmtMoney = (n: number, currency = "ARS") =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(n);

// Divide array en páginas
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

// Totales (asumiendo un único IVA ya aplicado en importe)
function computeTotals(items: Item[]) {
  const neto = items.reduce((acc, it) => acc + it.importe, 0);
  // Si necesitás distintos IVAs, agrupar por tasa; aquí asumimos 21% como referencia
  const iva21 = neto * 0.21;
  const total = neto + iva21;
  return { neto, iva21, total };
}

/** ====== NUEVO: meta según cbteTipo ====== */
function cbteMeta(cbteTipo: number): { letter: string; code: string; title: string } {
  // Mapa más común
  debugger
  switch (cbteTipo) {
    case 1:   return { letter: "A", code: "01", title: "FACTURA" };
    case 2:   return { letter: "A", code: "02", title: "NOTA DE DÉBITO" };
    case 3:   return { letter: "A", code: "03", title: "NOTA DE CRÉDITO" };

    case 6:   return { letter: "B", code: "06", title: "FACTURA" };
    case 7:   return { letter: "B", code: "07", title: "NOTA DE DÉBITO" };
    case 8:   return { letter: "B", code: "08", title: "NOTA DE CRÉDITO" };

    case 11:  return { letter: "C", code: "11", title: "FACTURA" };
    case 12:  return { letter: "C", code: "12", title: "NOTA DE DÉBITO" };
    case 13:  return { letter: "C", code: "13", title: "NOTA DE CRÉDITO" };

    case 19:  return { letter: "E", code: "19", title: "FACTURA E" };

    // FCE
    case 201: return { letter: "A", code: "201", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };
    case 202: return { letter: "B", code: "202", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };
    case 206: return { letter: "C", code: "206", title: "FACTURA DE CRÉDITO ELECTRÓNICA" };

    case 203: return { letter: "A", code: "203", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 204: return { letter: "A", code: "204", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
    case 207: return { letter: "B", code: "207", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 208: return { letter: "B", code: "208", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
    case 211: return { letter: "C", code: "211", title: "NOTA DE DÉBITO DE CRÉDITO ELECTRÓNICA" };
    case 212: return { letter: "C", code: "212", title: "NOTA DE CRÉDITO DE CRÉDITO ELECTRÓNICA" };
  }
  // Default (por si llega otro)
  return { letter: "A", code: String(cbteTipo).padStart(2, "0"), title: "FACTURA" };
}

/** ===================== Componentes parciales ===================== */

const SellerHeader: React.FC<{ seller: Seller }> = ({ seller }) => (
  <View style={[styles.border, styles.headerLeft]}>
    <View style={[styles.row, { alignItems: "center", gap: 8 }]}>
      {seller.logoDataUrl ? (
        <Image src={seller.logoDataUrl} style={{ width: 60, height: 60, objectFit: "contain" }} />
      ) : null}
      <Text style={[styles.hCompany, { flex: 1 }]}>{seller.companyName}</Text>
    </View>
    <View style={{ marginTop: 6 }}>
      <Text style={styles.textCenter}>{seller.companyAddress}</Text>
      {seller.companyPhone ? <Text style={styles.textCenter}>{seller.companyPhone}</Text> : null}
      {seller.vatCondition ? <Text style={[styles.textCenter, styles.bold]}>{seller.vatCondition}</Text> : null}
    </View>
  </View>
);

const InvoiceHeaderRight: React.FC<{ header: Header }> = ({ header }) => (
  <View style={[styles.border, styles.headerRight, styles.col, { justifyContent: "space-between" }]}>
    <View style={[styles.row]}>
      <View style={{ width: 50, borderRightWidth: 1, borderColor: "#000", paddingRight: 6, marginRight: 6, alignItems: "center" }}>
        <Text style={{ fontSize: 26, fontWeight: 700 }}>{cbteMeta(header.cbteTipo).letter}</Text>
        <Text style={[styles.small, { lineHeight: 1.2 }]}>CÓD. 01</Text>
        <Text style={[styles.small, { lineHeight: 1.2 }]}>ORIGINAL</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 700 }}>FACTURA</Text>
        <Text>{header.number}</Text>
        <Text style={[styles.bold, { marginTop: 4 }]}>Fecha de Emisión: {header.date}</Text>
      </View>
    </View>
    <View>
      {header.cuit ? <Text><Text style={styles.bold}>CUIT:</Text> {header.cuit}</Text> : null}
      {header.ingresosBrutos ? <Text><Text style={styles.bold}>Ingresos Brutos:</Text> {header.ingresosBrutos}</Text> : null}
      {header.inicioActividades ? <Text><Text style={styles.bold}>Inicio de Actividades:</Text> {header.inicioActividades}</Text> : null}
    </View>
  </View>
);

const CustomerBox: React.FC<{ c: Customer }> = ({ c }) => (
  <View style={[styles.border, styles.section, { padding: 8 }]}>
    <View style={[styles.row]}>
      <View style={{ flex: 1, paddingRight: 6 }}>
        <Text><Text style={styles.bold}>Razón Social: </Text>{c.name}</Text>
        <Text><Text style={styles.bold}>Domicilio: </Text>{c.domicilio}</Text>
        <Text><Text style={styles.bold}>Cond. IVA: </Text>{c.condIVA}</Text>
        <Text><Text style={styles.bold}>Cond. Venta: </Text>{c.condVenta}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text><Text style={styles.bold}>CUIT: </Text>{c.cuit}</Text>
        <Text><Text style={styles.bold}>Localidad: </Text>{c.localidad}</Text>
        <Text><Text style={styles.bold}>Provincia: </Text>{c.provincia}</Text>
        <Text><Text style={styles.bold}>Teléfono: </Text>{c.telefono}</Text>
      </View>
    </View>
  </View>
);

const ItemsTableHeader: React.FC = () => (
  <View style={[styles.tableHeader, styles.row, styles.border]}>
    <Text style={[styles.cell, { width: 70 }]}>Código</Text>
    <Text style={[styles.cell, { flex: 1 }]}>Descripción</Text>
    <Text style={[styles.cell, styles.textRight, { width: 60 }]}>Cantidad</Text>
    <Text style={[styles.cell, styles.textRight, { width: 80 }]}>P. Unitario</Text>
    <Text style={[styles.cell, styles.textRight, { width: 55 }]}>Alic. IVA</Text>
    <Text style={[styles.cellNoRight, styles.textRight, { width: 90 }]}>Importe</Text>
  </View>
);

const ItemRow: React.FC<{ it: Item; currency: string }> = ({ it, currency }) => (
  <View style={[styles.row, styles.itemsRow]}>
    <Text style={[styles.cell, { width: 70 }]}>{it.codigo}</Text>
    <Text style={[styles.cell, { flex: 1 }]}>{it.descripcion}</Text>
    <Text style={[styles.cell, styles.textRight, { width: 60 }]}>{it.cantidad}</Text>
    <Text style={[styles.cell, styles.textRight, { width: 80 }]}>{fmtMoney(it.pUnitario, currency)}</Text>
    <Text style={[styles.cell, styles.textRight, { width: 55 }]}>{it.alicIVA}</Text>
    <Text style={[styles.cellNoRight, styles.textRight, { width: 90 }]}>{fmtMoney(it.importe, currency)}</Text>
  </View>
);

const TotalsBox: React.FC<{ items: Item[]; currency: string }> = ({ items, currency }) => {
  const { neto, iva21, total } = computeTotals(items);
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
        <Text>{fmtMoney(0, currency)}</Text>
      </View>
      <View style={[styles.totalsRow, styles.totalsRowEmph]}>
        <Text style={[styles.bold]}>Total:</Text>
        <Text style={[styles.bold]}>{fmtMoney(total, currency)}</Text>
      </View>
    </View>
  );
};

const FooterBox: React.FC<{ header: Header; footerText?: string }> = ({ header, footerText }) => (
  <View style={[styles.footerBox, { marginTop: 8 }]}>
    <View style={[styles.row, { alignItems: "center", gap: 8 }]}>
      {header.qrUrl ? <Image source={header.qrUrl} style={styles.qr} /> : null}
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

  return (
    <Document>
      {pages.map((items, idx) => (
        <Page size="A4" style={styles.page} key={idx}>
          {/* Encabezado */}
          <View style={[styles.section, styles.row, { gap: 8 }]}>
            <SellerHeader seller={payload.seller} />
            <InvoiceHeaderRight header={payload.header} />
          </View>

          {/* Cliente (opcional repetir en todas las páginas) */}
          {(idx === 0 || opts.showCustomerOnAllPages) && (
            <CustomerBox c={payload.customer} />
          )}

          {/* Tabla de items */}
          <View style={[styles.section]}>
            <ItemsTableHeader />
            {items.map((it, i) => (
              <ItemRow it={it} currency={currency} key={i} />
            ))}

            {/* Relleno visual para mantener altura pareja (opcional) */}
            {(() => {
              const target = idx === 0 ? first : perPage;
              const blanks = Math.max(0, target - items.length);
              return Array.from({ length: blanks }).map((_, i) => (
                <View key={`blank-${i}`} style={[styles.row, styles.itemsRow]}>
                  <Text style={[styles.cell, { width: 70 }]}>{""}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{""}</Text>
                  <Text style={[styles.cell, { width: 60 }]}>{""}</Text>
                  <Text style={[styles.cell, { width: 80 }]}>{""}</Text>
                  <Text style={[styles.cell, { width: 55 }]}>{""}</Text>
                  <Text style={[styles.cellNoRight, { width: 90 }]}>{""}</Text>
                </View>
              ));
            })()}
          </View>

          {/* Totales solo en última página */}
          {idx === pages.length - 1 && (
            <TotalsBox items={payload.items} currency={currency} />
          )}

          {/* Pie con CAE/QR sólo en última página (o replicá si querés) */}
          {idx === pages.length - 1 && (
            <FooterBox header={payload.header} footerText={payload.footerHtml} />
          )}
        </Page>
      ))}
    </Document>
  );
};

export default InvoiceDocument;