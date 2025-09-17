"use client";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import InvoiceDocument from "@/services/InvoiceDocument";

export type InvoicePdfOptions = {
  currency?: string;
  rowsPerFirstPage?: number;
  rowsPerPage?: number;
  showCustomerOnAllPages?: boolean;
};

export async function generateInvoicePdf(
  payload: any,
  opts?: InvoicePdfOptions
): Promise<Blob> {
  const options = {
    currency: "ARS",
    rowsPerFirstPage: 12,
    rowsPerPage: 22,
    showCustomerOnAllPages: false,
    ...(opts ?? {}),
  };

  // ⚠️ Solo creamos el elemento y renderizamos acá (no en render del componente)
  const element:any = React.createElement(InvoiceDocument, {
    payload,
    opts: options,
  });

  const blob = await pdf(element).toBlob();
  return blob;
}

export function downloadBlob(blob: Blob, filename = "factura.pdf") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}