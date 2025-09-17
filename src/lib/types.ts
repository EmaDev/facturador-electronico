
export interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  taxId: string;
  ivaCondition?: IvaCondition;
  pointsOfSale: number
}

export interface InvoiceItem {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  price: number;
  discount: number;
}

export type IvaCondition =
  | "Responsable Inscripto"
  | "Monotributista"
  | "Exento"
  | "Consumidor Final";