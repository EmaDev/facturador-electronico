"use client";

import * as React from "react";
import { PlusCircle, UserSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Customer } from "@/lib/types";
import { listCustomersByEmitter } from "@/services/customers";
import NewCustomerDialog from "./new-customer-dialog";
import { useAccountStore } from "@/store/account";

type Props = {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  autoLoad?: boolean;
  initialCustomers?: Customer[];
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
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // solo para cerrar el popover al seleccionar; se resetea al tipear
  const [closedBySelect, setClosedBySelect] = React.useState(false);

  const cuit = useAccountStore((s) => s.auth?.cuitEmisor) ?? "";

  React.useEffect(() => {
    if (!autoLoad || !cuit) return;
    let alive = true;
    setLoading(true);
    listCustomersByEmitter(cuit)
      .then((rows) => alive && setCustomers(rows))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [autoLoad, cuit]);

  const q = search.trim().toLowerCase();
  const hasQuery = q.length >= 4;
  const open = hasQuery && !closedBySelect;

  const filtered = hasQuery
    ? customers
        .filter((c) =>
          [c.name, c.email, c.taxId]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(q))
        )
        .slice(0, 50)
    : [];

  const handleChangeInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setSearch(e.target.value);
    setClosedBySelect(false); // si vuelvo a tipear, reabre cuando haya 4+
  };

  const handleSelect = (c: Customer) => {
    onChange(c);
    setClosedBySelect(true); // cierra el popover
    setSearch(c.name || ""); // muestra el nombre elegido
  };

  const handleCreated = (c: Customer) => {
    setCustomers((prev) => [c, ...prev]);
    handleSelect(c);
  };

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-2 text-primary">Detalles del Cliente</h3>

      <div className="flex gap-2">
        <Popover open={open}>
          <PopoverTrigger asChild>
            <div className="relative flex-grow">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={loading ? "Cargando clientes..." : "Buscar un cliente..."}
                value={search}
                onChange={handleChangeInput}
                className="pl-10"
                autoComplete="off"
                disabled={loading || !cuit}
              />
            </div>
          </PopoverTrigger>

          <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-2 text-sm text-muted-foreground">Cargando…</div>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelect(c)}
                    className="p-2 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                    tabIndex={0}
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {c.taxId} · {c.email}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">Sin resultados</div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="md:col-span-1 bg-accent hover:bg-accent/90 px-4"
        >
          Nuevo cliente <PlusCircle className="h-5 w-5" />
        </Button>
      </div>

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
