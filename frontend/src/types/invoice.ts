export type InvoiceStatus = 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'VERIFIED' | 'FAILED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  extractedDescription: string;
  extractedSku: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  matchedItemId: string | null;
  matchedItem: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    currentStock?: string;
  } | null;
  matchConfidence: string | null;
  matchReason: string | null;
  isUserVerified: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  originalFilename: string;
  storageKey: string;
  fileUrl: string | null;
  fileSize: number;
  mimeType: string;
  status: InvoiceStatus;
  ocrRawData: any | null;
  ocrConfidence: string | null;
  supplierId: string | null;
  supplier: {
    id: string;
    name: string;
  } | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  totalAmount: string | null;
  uploadedById: string | null;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  verifiedById: string | null;
  verifiedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  purchaseId: string | null;
  purchase: {
    id: string;
    purchaseNumber: string;
    totalAmount?: string;
    status?: string;
  } | null;
  items?: InvoiceItem[];
  _count?: {
    items: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  originalFilename: string;
  fileData?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  supplierId?: string;
  purchaseId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  items?: {
    extractedDescription: string;
    extractedSku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
    matchedItemId?: string;
  }[];
}

export interface VerifyInvoiceRequest {
  supplierId?: string;
  purchaseId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  items?: {
    id?: string;
    matchedItemId?: string;
    isUserVerified: boolean;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  }[];
}

export interface CreateItemFromInvoiceRequest {
  invoiceItemId: string;
  name: string;
  sku: string;
  category: string;
  type: 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD' | 'OTHER';
  unit: string;
  description?: string;
  minStock?: number;
  reorderLevel?: number;
}
