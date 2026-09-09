import { prisma } from '../config/db.js';

export interface ExtractedInvoiceLineItem {
  extractedDescription: string;
  extractedSku?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  matchedItemId?: string | null;
  matchConfidence?: number | null;
  matchReason?: string | null;
}

export interface InvoiceExtractionResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  supplierName?: string;
  matchedSupplierId?: string | null;
  confidence: number;
  items: ExtractedInvoiceLineItem[];
  rawText?: string;
}

/**
 * OCR / Invoice Intelligence Service
 *
 * Implements deterministic fallback/mock OCR processing to simulate Textract/AI extraction.
 * Safely maps extracted text lines and SKUs to existing InventoryItems.
 * CRITICAL RULE: This service NEVER updates inventory or marks invoices as VERIFIED.
 */
export class InvoiceOcrService {
  /**
   * Processes an uploaded invoice file and extracts metadata and matching line items.
   */
  async processInvoice(filename: string): Promise<InvoiceExtractionResult> {
    // Look up existing inventory items to perform fuzzy / SKU matching
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true },
    });

    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    // Deterministic mock extraction based on filename or system inventory
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${randomSuffix}`;
    const invoiceDate = new Date().toISOString();

    // Pick 1-2 items from inventory to populate extracted items
    const sampleItems: ExtractedInvoiceLineItem[] = [];
    let calculatedTotal = 0;

    if (items.length > 0) {
      const selectedItem = items[0];
      const qty = 25;
      const unitPrice = 12.5;
      const total = qty * unitPrice;
      calculatedTotal += total;

      sampleItems.push({
        extractedDescription: `Commercial supply of ${selectedItem.name}`,
        extractedSku: selectedItem.sku,
        quantity: qty,
        unitPrice,
        totalPrice: total,
        matchedItemId: selectedItem.id,
        matchConfidence: 0.95,
        matchReason: `Exact SKU match: ${selectedItem.sku}`,
      });
    }

    if (items.length > 1) {
      const secondItem = items[1];
      const qty = 10;
      const unitPrice = 45.0;
      const total = qty * unitPrice;
      calculatedTotal += total;

      sampleItems.push({
        extractedDescription: `${secondItem.name} Batch Order`,
        extractedSku: secondItem.sku,
        quantity: qty,
        unitPrice,
        totalPrice: total,
        matchedItemId: secondItem.id,
        matchConfidence: 0.88,
        matchReason: `High confidence name match: ${secondItem.name}`,
      });
    }

    const matchedSupplier = suppliers.length > 0 ? suppliers[0] : null;

    return {
      invoiceNumber,
      invoiceDate,
      totalAmount: calculatedTotal > 0 ? calculatedTotal : 312.5,
      supplierName: matchedSupplier ? matchedSupplier.name : 'Apex Industrial Supplies',
      matchedSupplierId: matchedSupplier ? matchedSupplier.id : null,
      confidence: 0.92,
      items: sampleItems,
      rawText: `INVOICE ${invoiceNumber} DATE: ${invoiceDate} FILE: ${filename}`,
    };
  }
}

export const invoiceOcrService = new InvoiceOcrService();
