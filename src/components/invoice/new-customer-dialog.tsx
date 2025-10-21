"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer, IvaCondition } from "@/lib/types";
import { createCustomer } from "@/services/customers";
import { useAccountStore } from "@/store/account";

const schema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  email: z.union([
    z.string().trim().length(0),
    z.string().trim().email("Email inválido"),
  ]),
  address: z.string().min(5, "La dirección es requerida"),
  taxId: z.string().min(1, "CUIT/CUIL requerido"),
  ivaCondition: z.enum([
    "Responsable Inscripto",
    "Responsable Monotributo",
    "Monotributista",
    "Monotributista Social",
    "Monotributo Trabajador Independiente Promovido",
    "Exento",
    "Consumidor Final"
  ], {
    required_error: "La condición de IVA es requerida"
  }),
});
export type NewCustomerFormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetName?: string;
  onCreated: (customer: Customer) => void;
};

export default function NewCustomerDialog({ open, onOpenChange, presetName, onCreated }: Props) {
  const { activePv, account } = useAccountStore();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<NewCustomerFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: presetName ?? "", email: "", address: "", taxId: "", ivaCondition: undefined as any },
  });

  React.useEffect(() => {
    if (open && presetName) form.setValue("name", presetName);
  }, [open, presetName, form]);

  const onSubmit: SubmitHandler<NewCustomerFormData> = async (data) => {
    setLoading(true);
    try {
      await createCustomer({
        name: data.name,
        email: data.email?.trim() === "" ? undefined : data.email,
        address: data.address,
        taxId: data.taxId,
        emitterCuit: account!.cuit,
        pointsOfSale: activePv!,
        ivaCondition: data.ivaCondition as IvaCondition,
      });
      onCreated(data as Customer);
      onOpenChange(false);
      form.reset({ name: "", email: "", address: "", taxId: "", ivaCondition: undefined as any });
    } catch (e: any) {
      form.setError("root", { message: e?.message ?? "Error al crear el cliente" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          <DialogDescription>Complete los datos del cliente.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="name" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="email" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Email (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="address" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="ivaCondition" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Condición IVA</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccione condición" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                    <SelectItem value="Monotributista">Monotributista</SelectItem>
                    <SelectItem value="Exento">Exento</SelectItem>
                    <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                    <SelectItem value="Responsable Monotributo">Responsable Monotributo</SelectItem>
                    <SelectItem value="Monotributista Social">Monotributista Social</SelectItem>
                    <SelectItem value="Monotributo Trabajador Independiente Promovido">
                      Monotributo Trabajador Independiente Promovido
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="taxId" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>CUIT/CUIL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Cliente"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}