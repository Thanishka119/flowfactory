export type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface SaleItem {
  id: string;
  saleId: string;
  itemId: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number | string;
  createdAt: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    type?: string;
    currentStock?: number | string;
  };
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  totalAmount: number | string;
  status: SaleStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  items: SaleItem[];
}

export interface CreateSaleItemRequest {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleRequest {
  customerName: string;
  notes?: string;
  items: CreateSaleItemRequest[];
}
