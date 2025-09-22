import type { Customer, IvaCondition } from "@/lib/types";

export type CreateCustomerPayload = {
  name: string;
  email: string|undefined;
  address: string;
  taxId: string;
  emitterCuit: string;
  ivaCondition: IvaCondition;
  pointsOfSale: number
};


const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3000";

export async function listCustomersByEmitter(emitterCuit: string): Promise<Customer[]> {
  const url = `${NEST_API_URL}/customers?emitterCuit=${encodeURIComponent(emitterCuit)}`;
  const r = await fetch(url, { cache: "no-store" });
  const json = await r.json().catch(() => ({}));
  if (!r.ok || !json?.ok) throw new Error(json?.message || "No se pudo obtener clientes");
  return Array.isArray(json.customers) ? json.customers : [];
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const res = await fetch(NEST_API_URL + "/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "No se pudo crear el cliente");
  }
  return res.json();
}