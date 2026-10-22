import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { prisma } from '../config/db.js';

export interface ExtractedInvoiceLineItem {
  extractedDescription: string;
  extractedSku?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  totalPrice?: number;
  lotBatch?: string | null;
  expiryNote?: string | null;
  matchedItemId?: string | null;
  matchConfidence?: number | null;
  matchReason?: string | null;
}

export interface InvoiceExtractionResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  subtotal?: number;
  taxTotal?: number;
  currency: string;
  supplierName?: string;
  matchedSupplierId?: string | null;
  billToReference?: string;
  disclaimer?: string;
  discrepancyNote?: string | null;
  confidence: number;
  items: ExtractedInvoiceLineItem[];
  rawText?: string;
}

/**
 * Decodes standard ASCII85 (Adobe Base85) encoded text into a raw buffer.
 */
function decodeAscii85(input: string): Buffer {
  let str = input.replace(/\s+/g, '');
  if (str.startsWith('<~')) str = str.slice(2);
  if (str.endsWith('~>')) str = str.slice(0, -2);

  const out = Buffer.alloc(str.length * 4);
  let outIdx = 0;
  let tuple = 0;
  let count = 0;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 122 && count === 0) {
      // 'z' represents 4 zero bytes
      out[outIdx++] = 0;
      out[outIdx++] = 0;
      out[outIdx++] = 0;
      out[outIdx++] = 0;
      continue;
    }
    if (code < 33 || code > 117) {
      continue; // Skip invalid ASCII85 characters
    }
    tuple = tuple * 85 + (code - 33);
    count++;
    if (count === 5) {
      out[outIdx++] = (tuple >>> 24) & 255;
      out[outIdx++] = (tuple >>> 16) & 255;
      out[outIdx++] = (tuple >>> 8) & 255;
      out[outIdx++] = tuple & 255;
      tuple = 0;
      count = 0;
    }
  }

  if (count > 0) {
    for (let i = count; i < 5; i++) {
      tuple = tuple * 85 + 84;
    }
    for (let i = 0; i < count - 1; i++) {
      out[outIdx++] = (tuple >>> (24 - 8 * i)) & 255;
    }
  }

  return Buffer.from(Uint8Array.from(out.subarray(0, outIdx)));
}

/**
 * Extracts raw text tokens from a text-based PDF buffer.
 */
export function extractPdfTokens(buffer: Buffer): { tokens: string[]; rawText: string } {
  const content = buffer.toString('binary');
  const tokens: string[] = [];
  const textStreams: string[] = [];

  // Find all stream ... endstream blocks
  let searchPos = 0;
  while (true) {
    const streamStart = content.indexOf('stream', searchPos);
    if (streamStart === -1) break;
    const streamEnd = content.indexOf('endstream', streamStart);
    if (streamEnd === -1) break;

    // Header dictionary before the stream
    const headerSlice = content.substring(Math.max(0, streamStart - 300), streamStart);
    const isFlate = headerSlice.includes('/FlateDecode');
    const isA85 = headerSlice.includes('/ASCII85Decode');

    let streamBytes = content.substring(streamStart + 6, streamEnd);
    // Trim leading newline after 'stream'
    if (streamBytes.startsWith('\r\n')) streamBytes = streamBytes.slice(2);
    else if (streamBytes.startsWith('\n') || streamBytes.startsWith('\r')) streamBytes = streamBytes.slice(1);
    // Trim trailing newline before 'endstream'
    if (streamBytes.endsWith('\r\n')) streamBytes = streamBytes.slice(0, -2);
    else if (streamBytes.endsWith('\n') || streamBytes.endsWith('\r')) streamBytes = streamBytes.slice(0, -1);

    try {
      let decompressed: any = Buffer.from(streamBytes, 'binary');
      if (isA85) {
        decompressed = decodeAscii85(decompressed.toString('utf8'));
      }
      if (isFlate) {
        decompressed = zlib.inflateSync(decompressed);
      }
      const text = decompressed.toString('utf8');
      textStreams.push(text);

      // Extract ( ... ) Tj
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let match: RegExpExecArray | null;
      while ((match = tjRegex.exec(text)) !== null) {
        const cleaned = match[1]
          .replace(/\\([0-9]{3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\([()\\])/g, '$1')
          .trim();
        if (cleaned) {
          tokens.push(cleaned);
        }
      }

      // Extract [ ... ] TJ
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = tjArrayRegex.exec(text)) !== null) {
        const inner = arrayMatch[1];
        const innerRegex = /\((.*?)\)/g;
        let innerMatch: RegExpExecArray | null;
        let combined = '';
        while ((innerMatch = innerRegex.exec(inner)) !== null) {
          combined += innerMatch[1]
            .replace(/\\([0-9]{3})/g, (_m, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\([()\\])/g, '$1');
        }
        if (combined.trim()) {
          tokens.push(combined.trim());
        }
      }
    } catch {
      // Stream decompression failed for this block, continue
    }

    searchPos = streamEnd + 9;
  }

  // If no streams extracted, fallback to plain text parsing of buffer
  if (tokens.length === 0) {
    const rawString = buffer.toString('utf8');
    const lines = rawString.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    tokens.push(...lines);
  }

  return { tokens, rawText: textStreams.join('\n') || tokens.join(' ') };
}

/**
 * Normalizes text for similarity comparison.
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculates conservative Levenshtein similarity ratio between two strings (0.0 to 1.0).
 */
function stringSimilarity(s1: string, s2: string): number {
  const norm1 = normalize(s1);
  const norm2 = normalize(s2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
  }

  const l1 = norm1.length;
  const l2 = norm2.length;
  const d: number[][] = Array.from({ length: l1 + 1 }, () => Array(l2 + 1).fill(0));

  for (let i = 0; i <= l1; i++) d[i][0] = i;
  for (let j = 0; j <= l2; j++) d[0][j] = j;

  for (let i = 1; i <= l1; i++) {
    for (let j = 1; j <= l2; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  const maxLen = Math.max(l1, l2);
  return 1.0 - d[l1][l2] / maxLen;
}

/**
 * Resolves an uploaded or existing document file from known locations.
 */
export function resolveDocumentBuffer(filenameOrPath: string, providedBuffer?: Buffer): { buffer: Buffer; resolvedPath?: string } {
  if (providedBuffer && providedBuffer.length > 0) {
    return { buffer: providedBuffer };
  }

  const candidatePaths = [
    filenameOrPath,
    path.resolve('uploads/invoices', filenameOrPath),
    path.resolve('backend/uploads/invoices', filenameOrPath),
    path.resolve('../uploads/invoices', filenameOrPath),
    path.resolve('uploads', filenameOrPath),
    path.join('D:/software engineering/project', path.basename(filenameOrPath)),
    path.join('D:/flowfactory/uploads/invoices', path.basename(filenameOrPath)),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const buf = fs.readFileSync(p);
        if (buf.length > 0) {
          return { buffer: buf, resolvedPath: p };
        }
      }
    } catch {
      // Continue searching next candidate
    }
  }

  throw new Error(`Invoice file "${filenameOrPath}" could not be found or is empty.`);
}

/**
 * Parses numeric currency strings like "Rs 350.00", "$762.50", "3,500.00".
 */
function parsePrice(val: string): { amount: number; currency: string } {
  let currency = 'USD';
  if (/Rs|INR|₹/i.test(val)) {
    currency = 'Rs';
  } else if (/\$|USD/i.test(val)) {
    currency = '$';
  } else if (/€|EUR/i.test(val)) {
    currency = '€';
  }

  const cleaned = val.replace(/[^0-9.-]/g, '');
  const amount = parseFloat(cleaned) || 0;
  return { amount, currency };
}

export class InvoiceOcrService {
  /**
   * Processes the actual uploaded invoice bytes and extracts metadata, table line items,
   * currency, lot/batch, expiry, and performs conservative item matching.
   */
  async processInvoice(filenameOrPath: string, fileBuffer?: Buffer): Promise<InvoiceExtractionResult> {
    const { buffer } = resolveDocumentBuffer(filenameOrPath, fileBuffer);
    if (!buffer || buffer.length === 0) {
      throw new Error(`File "${filenameOrPath}" is empty (0 bytes). Cannot perform OCR.`);
    }

    const { tokens, rawText } = extractPdfTokens(buffer);
    if (tokens.length === 0) {
      throw new Error(`Could not extract readable text from "${filenameOrPath}". Unsupported or corrupted document.`);
    }

    // Extract Header Fields
    let invoiceNumber: string | undefined;
    let invoiceDate: string | undefined;
    let supplierName: string | undefined;
    let billToReference: string | undefined;
    let disclaimer: string | undefined;
    let currency = 'Rs'; // Default to Rs if detected or present in sample documents

    // Find table start to bound header scanning
    const tableHeaderIdx = tokens.findIndex((t) => /Item code/i.test(t));
    const headerLimit = tableHeaderIdx !== -1 ? tableHeaderIdx : tokens.length;

    // Header token scan
    for (let i = 0; i < headerLimit; i++) {
      const t = tokens[i];
      if (/^Document\s*No\.?:?$/i.test(t) && i + 1 < headerLimit) {
        invoiceNumber = tokens[i + 1].replace(/\s+/g, '').trim();
      } else if (!invoiceNumber && /(?:Invoice|Doc|Inv|PI)\s*(?:No|#)\.?:?\s*([A-Z0-9_-]+)/i.test(t)) {
        const m = t.match(/(?:Invoice|Doc|Inv|PI)\s*(?:No|#)\.?:?\s*([A-Z0-9_-]+)/i);
        if (m) invoiceNumber = m[1];
      }

      if (/^Date:?$/i.test(t) && i + 1 < headerLimit) {
        invoiceDate = tokens[i + 1].trim();
      }

      if (/^Supplier(?:\/Issuer)?:?$/i.test(t) && i + 1 < headerLimit) {
        supplierName = tokens[i + 1].trim();
      }

      if (/^Bill to(?:\/Reference)?:?$/i.test(t) && i + 1 < headerLimit) {
        billToReference = tokens[i + 1].trim();
      }

      if (/^Status:?$/i.test(t) && i + 1 < headerLimit) {
        disclaimer = tokens[i + 1].trim();
      }
    }

    // Detect currency from tokens
    for (const t of tokens) {
      if (/Rs\s*[0-9]/i.test(t)) {
        currency = 'Rs';
        break;
      } else if (/\$\s*[0-9]/.test(t)) {
        currency = '$';
        break;
      } else if (/€\s*[0-9]/.test(t)) {
        currency = '€';
        break;
      }
    }

    // Extract Line Items Table
    const items: ExtractedInvoiceLineItem[] = [];
    let subtotalParsed: number | undefined;
    let taxParsed: number | undefined;
    let totalParsed: number | undefined;

    // Check if standard table header exists
    if (tableHeaderIdx !== -1) {
      // Find where table columns end (usually "Line total")
      const lineTotalHeaderIdx = tokens.findIndex((t, idx) => idx > tableHeaderIdx && /Line total/i.test(t));
      const colCount = lineTotalHeaderIdx !== -1 ? lineTotalHeaderIdx - tableHeaderIdx + 1 : 8;

      let rowIdx = (lineTotalHeaderIdx !== -1 ? lineTotalHeaderIdx : tableHeaderIdx + 7) + 1;

      while (rowIdx < tokens.length) {
        const firstCol = tokens[rowIdx];
        if (!firstCol || /Subtotal|Tax|Total|Testing note|Fictional data/i.test(firstCol)) {
          break;
        }

        // Expected 8 columns: Item code, Description, Qty, Unit price, Tax, Lot/batch, Expiry/note, Line total
        if (rowIdx + colCount - 1 < tokens.length) {
          const skuCol = tokens[rowIdx];
          const descCol = tokens[rowIdx + 1];
          const qtyCol = tokens[rowIdx + 2];
          const unitPriceCol = tokens[rowIdx + 3];
          const taxCol = tokens[rowIdx + 4];
          const lotCol = tokens[rowIdx + 5];
          const expiryCol = tokens[rowIdx + 6];
          const totalCol = tokens[rowIdx + 7];

          // Stop if we hit footer row
          if (/Subtotal|Tax|Total|Testing/i.test(skuCol) || /Subtotal|Tax|Total/i.test(descCol)) {
            break;
          }

          const parsedQty = parseFloat(qtyCol.replace(/[^0-9.-]/g, '')) || 1;
          const { amount: parsedUnit } = parsePrice(unitPriceCol);
          const parsedTaxRate = parseFloat(taxCol.replace(/[^0-9.-]/g, '')) || 0;
          const { amount: parsedLineTotal } = parsePrice(totalCol);

          items.push({
            extractedSku: skuCol,
            extractedDescription: descCol,
            quantity: parsedQty,
            unitPrice: parsedUnit,
            taxRate: parsedTaxRate,
            totalPrice: parsedLineTotal || parsedQty * parsedUnit,
            lotBatch: lotCol,
            expiryNote: expiryCol,
          });

          rowIdx += colCount;
        } else {
          break;
        }
      }
    }

    // Parse Totals
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (/^Subtotal$/i.test(t) && i + 1 < tokens.length) {
        subtotalParsed = parsePrice(tokens[i + 1]).amount;
      } else if (/^Tax$/i.test(t) && i + 1 < tokens.length) {
        taxParsed = parsePrice(tokens[i + 1]).amount;
      } else if (/^Total$/i.test(t) && i + 1 < tokens.length) {
        totalParsed = parsePrice(tokens[i + 1]).amount;
      }
    }

    // Calculate math verification and discrepancies
    const calculatedSubtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const calculatedTax = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice * (it.taxRate || 0)) / 100, 0);
    const calculatedTotal = calculatedSubtotal + calculatedTax;

    let discrepancyNote: string | null = null;
    if (subtotalParsed !== undefined && Math.abs(subtotalParsed - calculatedSubtotal) > 0.05) {
      discrepancyNote = `Printed subtotal (${currency} ${subtotalParsed}) differs from calculated item sum (${currency} ${calculatedSubtotal.toFixed(2)}).`;
    }
    if (totalParsed !== undefined && Math.abs(totalParsed - calculatedTotal) > 0.05) {
      const msg = `Printed total (${currency} ${totalParsed}) differs from calculated sum (${currency} ${calculatedTotal.toFixed(2)}).`;
      discrepancyNote = discrepancyNote ? `${discrepancyNote} ${msg}` : msg;
    }

    // Match Suppliers conservatively
    let matchedSupplierId: string | null = null;
    if (supplierName) {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      const normSupp = normalize(supplierName);
      const exactSupplier = suppliers.find((s) => normalize(s.name) === normSupp);
      if (exactSupplier) {
        matchedSupplierId = exactSupplier.id;
      } else {
        // High similarity match only
        const plausible = suppliers
          .map((s) => ({ s, sim: stringSimilarity(s.name, supplierName!) }))
          .filter((x) => x.sim >= 0.85)
          .sort((a, b) => b.sim - a.sim)[0];
        if (plausible) {
          matchedSupplierId = plausible.s.id;
        }
      }
    }

    // Match Catalog Items conservatively
    // CRITICAL: NEVER automatically fallback to an unrelated catalog item!
    const catalogItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, name: true, unit: true, category: true, type: true },
    });

    for (const line of items) {
      let matchedId: string | null = null;
      let confidence: number | null = null;
      let reason: string | null = null;

      // 1. Exact SKU match
      if (line.extractedSku) {
        const exactSku = catalogItems.find((cat) => cat.sku.trim().toUpperCase() === line.extractedSku!.trim().toUpperCase());
        if (exactSku) {
          matchedId = exactSku.id;
          confidence = 1.0;
          reason = `Exact SKU match: ${exactSku.sku}`;
        }
      }

      // 2. Exact normalized name match
      if (!matchedId && line.extractedDescription) {
        const normDesc = normalize(line.extractedDescription);
        const exactName = catalogItems.find((cat) => normalize(cat.name) === normDesc);
        if (exactName) {
          matchedId = exactName.id;
          confidence = 0.95;
          reason = `Exact name match: ${exactName.name}`;
        }
      }

      // 3. Very high confidence similarity match (> 0.85)
      if (!matchedId && line.extractedDescription) {
        const candidates = catalogItems
          .map((cat) => ({ cat, sim: stringSimilarity(cat.name, line.extractedDescription) }))
          .filter((x) => x.sim >= 0.85)
          .sort((a, b) => b.sim - a.sim);

        if (candidates.length === 1) {
          matchedId = candidates[0].cat.id;
          confidence = parseFloat(candidates[0].sim.toFixed(2));
          reason = `High confidence name similarity (${(confidence * 100).toFixed(0)}%): ${candidates[0].cat.name}`;
        }
      }

      // 4. Default: Unmatched — Needs Review
      if (!matchedId) {
        line.matchedItemId = null;
        line.matchConfidence = null;
        line.matchReason = 'Unmatched — Needs Review';
      } else {
        line.matchedItemId = matchedId;
        line.matchConfidence = confidence;
        line.matchReason = reason;
      }
    }

    const finalTotal = totalParsed !== undefined ? totalParsed : calculatedTotal;

    return {
      invoiceNumber: invoiceNumber || `INV-${path.basename(filenameOrPath, path.extname(filenameOrPath))}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
      totalAmount: finalTotal,
      subtotal: subtotalParsed !== undefined ? subtotalParsed : calculatedSubtotal,
      taxTotal: taxParsed !== undefined ? taxParsed : calculatedTax,
      currency,
      supplierName: supplierName || 'Unidentified Supplier',
      matchedSupplierId,
      billToReference,
      disclaimer,
      discrepancyNote,
      confidence: items.length > 0 ? 0.95 : 0.8,
      items,
      rawText: rawText || tokens.join(' '),
    };
  }
}

export const invoiceOcrService = new InvoiceOcrService();
