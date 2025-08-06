export interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  taxId: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  code: string;
  quantity: number;
  price: number;
  discount: number;
}
