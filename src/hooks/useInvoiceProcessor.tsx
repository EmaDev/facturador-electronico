import { useState } from "react";
import { useAccountStore } from "@/store/account";
import { useToast } from "@/hooks/use-toast";
import { processInvoiceCreation } from "@/services/invoiceOrchestrator";
import type { Customer, InvoiceItem } from "@/lib/types";

interface UseInvoiceProcessorArgs {
  onSuccess?: (invoiceNumber: string) => void;
  onError?: (error: Error) => void;
}

export function useInvoiceProcessor({ onSuccess, onError }: UseInvoiceProcessorArgs = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const accountState = useAccountStore.getState(); // Obtenemos el estado una vez
  const { toast } = useToast();

  const createInvoice = async (
    customer: Customer,
    items: InvoiceItem[],
    documentTypeId: string,
    invoiceDate: string,
    associatedInvoice?: string,
  ) => {
    if (!customer || items.length === 0) {
      toast({ title: 'Datos incompletos', description: 'Selecciona un cliente y agrega al menos un item.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { numberStr } = await processInvoiceCreation({
        customer,
        items,
        documentTypeId,
        invoiceDate,
        associatedInvoice,
        accountState,
      });

      toast({ title: "¡Éxito!", description: `Factura ${numberStr} creada correctamente.` });
      if (onSuccess) {
        onSuccess(numberStr);
      }
    } catch (error: any) {
      console.error("Error al procesar la factura:", error);
      toast({
        title: "Ocurrió un error",
        description: `Error al facturar: ${error.message ?? String(error)}`,
        variant: "destructive",
      });
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createInvoice,
    isLoading,
  };
}