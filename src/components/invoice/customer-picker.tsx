"use client";

import * as React from "react";
import { PlusCircle, UserSearch, Pencil, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"; // NEW
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

  // --- NEW: estado para editar domicilio de facturación
  const [editAddrOpen, setEditAddrOpen] = React.useState(false);
  const [tempBillingAddr, setTempBillingAddr] = React.useState("");
  const originalAddrRef = React.useRef<string | null>(null);
  const hasOverride =
    originalAddrRef.current !== null && value?.address === tempBillingAddr;

  const openEditAddress = () => {
    if (!value) return;
    // guardo el original la primera vez que abro
    if (originalAddrRef.current === null) originalAddrRef.current = value.address ?? "";
    setTempBillingAddr(value.address ?? "");
    setEditAddrOpen(true);
  };

  const applyBillingAddress = () => {
    if (!value) return;
    onChange({ ...value, address: tempBillingAddr } as Customer);
    setEditAddrOpen(false);
  };

  const resetBillingAddress = () => {
    if (!value) return;
    const original = originalAddrRef.current ?? value.address ?? "";
    onChange({ ...value, address: original } as Customer);
    originalAddrRef.current = null;
    setTempBillingAddr("");
  };
  // --- NEW end

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
    // al elegir un cliente nuevo, borro cualquier override previo
    originalAddrRef.current = null;          // NEW
    setTempBillingAddr("");                  // NEW
    setClosedBySelect(true);
    setSearch(c.name || "");
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
          className="bg-accent hover:bg-accent/90 px-4"
        >
          Nuevo cliente <PlusCircle className="h-5 w-5" />
        </Button>
      </div>

      {value && (
        <div className="bg-secondary p-4 rounded-lg text-sm mt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{value.name}</p>
              <p className="text-muted-foreground">{value.email}</p>
              <p className="text-muted-foreground">
                <span className="font-medium">Domicilio (facturación):</span>{" "}
                {value.address}
                {hasOverride && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                    modificado
                  </span>
                )}
              </p>
              <p className="text-muted-foreground">CUIT/CUIL: {value.taxId}</p>
              <p className="text-muted-foreground">Cond. IVA: {value.ivaCondition ?? "-"}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openEditAddress}
                className="whitespace-nowrap"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar domicilio facturación
              </Button>

              {hasOverride && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetBillingAddress}
                  className="whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurar domicilio
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog para editar domicilio de facturación */}
      <Dialog open={editAddrOpen} onOpenChange={setEditAddrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar domicilio de facturación</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Domicilio</label>
            <Input
              value={tempBillingAddr}
              onChange={(e) => setTempBillingAddr(e.target.value)}
              placeholder="Calle, número, piso, localidad"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditAddrOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyBillingAddress}>
              Usar en esta factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        presetName={search}
        onCreated={handleCreated}
      />
    </div>
  );
}