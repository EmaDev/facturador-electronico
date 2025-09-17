"use client";
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import InvoiceDocument from "./InvoiceDocument";

export type InvoicePdfOptions = {
  currency?: string;
  rowsPerFirstPage?: number;
  rowsPerPage?: number;
  showCustomerOnAllPages?: boolean;
};
export type UseInvoicePdfResult = {
  url?: string;
  blob: Blob | null;
  loading: boolean;
  error: Error | null;
  download: (filename?: string) => void;
};

export default function useInvoicePDF(payload: any, options?: InvoicePdfOptions): UseInvoicePdfResult {
  const opts: Required<InvoicePdfOptions> = {
    currency: options?.currency ?? "ARS",
    rowsPerFirstPage: options?.rowsPerFirstPage ?? 12,
    rowsPerPage: options?.rowsPerPage ?? 22,
    showCustomerOnAllPages: options?.showCustomerOnAllPages ?? false,
  };

  const doc = useMemo(() => <InvoiceDocument payload={payload} opts={opts} />, [payload, opts]);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let revoke: string | null = null;
    async function build() {
      if (typeof window === "undefined") return;
      setLoading(true); setError(null);
      try {
        const b = await pdf(doc).toBlob();
        if (cancelled) return;
        setBlob(b);
        const u = URL.createObjectURL(b);
        setUrl(u);
        revoke = u;
      } catch (e: any) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    build();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [doc]);

  const download = useCallback((filename = "factura.pdf") => {
    if (!blob && !url) return;
    const href = url ?? URL.createObjectURL(blob!);
    const a = document.createElement("a");
    a.href = href; a.download = filename; a.click();
    if (!url) setTimeout(() => URL.revokeObjectURL(href), 0);
  }, [blob, url]);

  return { url, blob, loading, error, download };
}