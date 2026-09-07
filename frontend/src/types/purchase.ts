export type PurchaseStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  itemId: string;
  item: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock?: string;
  };
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    email?: string | null;
    contactPerson?: string | null;
  };
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalAmount: string;
  status: PurchaseStatus;
  receivedById: string | null;
  receivedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  notes: string | null;
  items: PurchaseItem[];
  invoices?: {
    id: string;
    invoiceNumber: string | null;
    status: string;
    totalAmount: string | null;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface UpdatePurchaseRequest {
  supplierId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
}
