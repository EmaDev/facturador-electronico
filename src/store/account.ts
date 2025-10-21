'use client';

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import type { AuthSession, Account } from "./types";

type InvoiceTemplate = {
  id: string;
  cuit: string;
  ptoVta: number;
  logoUrl?: string | null;
  fantasia: string;
  telefono?: string | null;
  email?: string | null;
  domicilio: string;
  footerHtml?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type AccountState = {
  account: Account | null;
  auth: AuthSession | null;
  loading: boolean;
  error: string | null;

  /** punto de venta activo (número AFIP, ej: 4) */
  activePv: number | null;

  /** plantillas por punto de venta */
  invoiceTemplatesByPv: Record<number, InvoiceTemplate>;

  // actions
  setAuth: (auth: AuthSession | null) => void;
  setAccount: (acc: Account | null) => void;
  clear: () => void;

  // PV actions
  setActivePv: (pvNumber: number | null) => void;
  initActivePvFromStorage: () => void;

  // Templates actions
  setInvoiceTemplates: (arr: InvoiceTemplate[]) => void;
  fetchInvoiceTemplates: (cuit?: string) => Promise<void>;
  getActiveTemplate: () => InvoiceTemplate | null;

  // API actions
  fetchAccount: (cuit?: string) => Promise<void>;
  updateAccount: (partial: Partial<Account>) => Promise<Account | null>;

  // util
  loadFromSessionStorage: () => void;
  ensureAuthAndAccountLoaded: () => Promise<void>;
};

const STORAGE_KEY = "account-store-v1";
const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:3000";

const readSessionAuth = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("authToken") || "";
  const cuitEmisor = sessionStorage.getItem("user_cuit") || "";
  const wsaa_token = sessionStorage.getItem("wsaa_token") || "";
  const wsaa_sign = sessionStorage.getItem("wsaa_sign") || "";
  const wsaa_expires = sessionStorage.getItem("wsaa_expires") || "";
  if (!token || !cuitEmisor) return null;
  return { token, cuitEmisor, wsaa_token, wsaa_sign, wsaa_expires };
};

export const useAccountStore = create<AccountState>()(
  devtools(
    persist(
      (set, get) => ({
        account: null,
        auth: null,
        loading: false,
        error: null,

        activePv: null,
        invoiceTemplatesByPv: {},

        setAuth: (auth) => set({ auth }),
        setAccount: (account) => set({ account }),
        clear: () => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("active_pv");
          }
          set({
            account: null,
            auth: null,
            loading: false,
            error: null,
            activePv: null,
            invoiceTemplatesByPv: {},
          });
        },

        setActivePv: (pvNumber) => {
          set({ activePv: pvNumber });
          if (typeof window !== "undefined") {
            if (pvNumber == null) {
              sessionStorage.removeItem("active_pv");
            } else {
              sessionStorage.setItem("active_pv", String(pvNumber));
            }
            const state = get();
            const cuit =
              state.account?.cuit ??
              state.auth?.cuitEmisor ??
              sessionStorage.getItem("user_cuit") ??
              "";
            if (cuit) sessionStorage.setItem("user_cuit", cuit);
          }
        },

        initActivePvFromStorage: () => {
          if (typeof window === "undefined") return;
          const raw = sessionStorage.getItem("active_pv");
          if (raw && /^\d+$/.test(raw)) set({ activePv: Number(raw) });
        },

        setInvoiceTemplates: (arr) => {
          const map: Record<number, InvoiceTemplate> = {};
          for (const t of arr) map[t.ptoVta] = t;
          set({ invoiceTemplatesByPv: map });
        },

        fetchInvoiceTemplates: async (cuitOptional) => {
          const { auth } = get();
          const cuit = (cuitOptional || auth?.cuitEmisor || "").replace(/[^\d]/g, "");
          if (!cuit) return;

          try {
            const r = await fetch(`${NEST_API_URL}/invoice-templates?cuit=${cuit}`, { cache: "no-store" });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.message || "No se pudieron obtener las plantillas");
            const templates = (data?.templates ?? []) as InvoiceTemplate[];
            get().setInvoiceTemplates(templates);

            // si no hay pv activo, setear uno que exista en las plantillas o el primero de la cuenta
            if (get().activePv == null) {
              const pvFromTpl = templates[0]?.ptoVta;
              if (typeof pvFromTpl === "number") {
                get().setActivePv(pvFromTpl);
              } else {
                const first = get().account?.puntosVenta?.[0]?.id;
                if (typeof first === "number") get().setActivePv(first);
              }
            }
          } catch (e) {
            // opcional: set error
          }
        },

        getActiveTemplate: () => {
          const { activePv, invoiceTemplatesByPv } = get();
          if (activePv == null) return null;
          return invoiceTemplatesByPv[activePv] ?? null;
        },

        loadFromSessionStorage: () => {
          const auth = readSessionAuth();
          if (auth) set({ auth });

          // Leer PV activo desde sessionStorage
          if (typeof window !== "undefined") {
            const raw = sessionStorage.getItem("active_pv");
            if (raw && /^\d+$/.test(raw)) {
              set({ activePv: Number(raw) });
            } else {
              // si no hay en storage, setear primer punto de venta conocido
              const account = get().account;
              const first = account?.puntosVenta?.[0]?.id;
              if (typeof first === "number") {
                get().setActivePv(first);
              }
            }
          }
        },

        ensureAuthAndAccountLoaded: async () => {
          const { auth, account, fetchAccount, loadFromSessionStorage, clear } = get();
          if (!auth) loadFromSessionStorage();

          const expires = get().auth?.wsaa_expires;
          if (expires) {
            const expDate = new Date(expires).getTime();
            if (Date.now() >= expDate) {
              // Token vencido
              clear();
              return;
            }
          }

          const cuit = get().auth?.cuitEmisor ?? account?.cuit;
          if (cuit && !account) {
            await fetchAccount(cuit);
          }
          if (get().activePv == null) {
            get().initActivePvFromStorage();
          }
        },

        fetchAccount: async (cuitOptional) => {
          const { auth } = get();
          const cuit = (cuitOptional || auth?.cuitEmisor || "").replace(/[^\d]/g, "");
          if (!cuit) return;

          set({ loading: true, error: null });
          try {
            const r = await fetch(`${NEST_API_URL}/accounts/${cuit}`, { cache: "no-store" });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.message || "No se pudo obtener la cuenta");

            const account: Account = { cuit, ...data };
            set({ account, loading: false });

            if (get().activePv == null) {
              const first = account.puntosVenta?.[0]?.id;
              if (typeof first === "number") {
                get().setActivePv(first);
              }
            }
          } catch (e: any) {
            set({ error: e?.message ?? String(e), loading: false });
          }
        },

        updateAccount: async (partial) => {
          const { account } = get();
          const cuit = (partial as any).cuit ?? account?.cuit;
          if (!cuit) return null;

          set({ loading: true, error: null });
          try {
            const { cuit: _c, ...safePartial } = partial;
            const r = await fetch(`${NEST_API_URL}/accounts/${cuit}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(safePartial),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.message || "No se pudo actualizar la cuenta");

            const merged: Account = { ...(account ?? { cuit }), ...data };
            set({ account: merged, loading: false });
            return merged;
          } catch (e: any) {
            set({ error: e?.message ?? String(e), loading: false });
            return null;
          }
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          auth: state.auth,
          account: state.account,
          activePv: state.activePv,
          invoiceTemplatesByPv: state.invoiceTemplatesByPv,
        }),
      }
    )
  )
);