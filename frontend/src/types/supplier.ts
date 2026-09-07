export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventoryItems?: {
    id: string;
    sku: string;
    name: string;
    currentStock: string;
    unit: string;
    isActive: boolean;
  }[];
  purchases?: {
    id: string;
    purchaseNumber: string;
    totalAmount: string;
    status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
    createdAt: string;
  }[];
  _count?: {
    inventoryItems: number;
    purchases: number;
    invoices: number;
  };
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  leadTimeDays?: number;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  leadTimeDays?: number;
}
