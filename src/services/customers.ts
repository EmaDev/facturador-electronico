// src/services/customers.ts
import type { Customer, IvaCondition } from "@/lib/types";

export type CreateCustomerPayload = {
  name: string;
  email: string;
  address: string;
  taxId: string;
  emitterCuit: string;
  ivaCondition: IvaCondition;
  pointsOfSale: number
};


const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3000";

// Trae clientes desde tu backend (Nest o Next proxy)
export async function listCustomers(): Promise<Customer[]> {
  const res = await fetch("/api/customers", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron obtener clientes");
  return res.json();
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