// src/components/customers/CustomerPicker.tsx
"use client";

import * as React from "react";
import { UserSearch, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Customer } from "@/lib/types";
import { listCustomers } from "@/services/customers";
import NewCustomerDialog from "./new-customer-dialog";

type Props = {
  value: Customer | null;                     // cliente seleccionado
  onChange: (customer: Customer | null) => void;
  autoLoad?: boolean;                         // si true, hace fetch al montar
  initialCustomers?: Customer[];              // opcional si ya tenés una lista
  className?: string;
};

export default function CustomerPicker({
  value,
  onChange,
  autoLoad = true,
  initialCustomers = [],
  className,
}: Props) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [search, setSearch] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Cargar clientes del backend
  React.useEffect(() => {
    if (!autoLoad) return;
    setLoading(true);
    listCustomers()
      .then(setCustomers)
      .catch(() => {}) // podés mostrar toast si querés
      .finally(() => setLoading(false));
  }, [autoLoad]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.address, c.taxId].some((f) => f?.toLowerCase().includes(q))
    );
  }, [search, customers]);

  const handleSelect = (c: Customer) => {
    onChange(c);
    setOpen(false);
    setSearch(c.name); // muestra el nombre en el input
  };

  const handleCreated = (c: Customer) => {
    setCustomers((prev) => [c, ...prev]);
    handleSelect(c);
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-2 text-primary">Detalles del Cliente</h3>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-grow">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar un cliente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!open) setOpen(true);
                  if (value) onChange(null);
                }}
                className="pl-10"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
            <div className="max-h-60 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelect(c)}
                    className="p-2 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                    tabIndex={0}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted-foreground text-xs">{c.taxId} · {c.email}</div>
                  </div>
                ))
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                  className="w-full text-left p-2 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none flex items-center"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear nuevo cliente “{search || "…" }”
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Ficha resumida del seleccionado */}
      {value && (
        <div className="bg-secondary p-4 rounded-lg text-sm mt-4">
          <p className="font-bold">{value.name}</p>
          <p className="text-muted-foreground">{value.email}</p>
          <p className="text-muted-foreground">{value.address}</p>
          <p className="text-muted-foreground">CUIT/CUIL: {value.taxId}</p>
          <p className="text-muted-foreground">Cond. IVA: {value.ivaCondition ?? "-"}</p>
        </div>
      )}

      <NewCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        presetName={search}
        onCreated={handleCreated}
      />
    </div>
  );
}