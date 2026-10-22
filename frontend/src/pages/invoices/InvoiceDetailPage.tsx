import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useVerifyInvoice, useProcessInvoice, useCreateItemFromInvoice } from '@/hooks/useInvoices';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, AlertCircle, PlusCircle, X } from 'lucide-react';
import type { InvoiceItem } from '@/types/invoice';
import { formatINR } from '@/lib/utils';

export const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: inventoryData } = useInventoryList({ limit: 100 });
  const inventoryItems = inventoryData?.data || [];
  const verifyMutation = useVerifyInvoice();
  const processMutation = useProcessInvoice();
  const createItemMutation = useCreateItemFromInvoice();

  // Local state for matchedItemId per invoice item
  const [itemMatches, setItemMatches] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state for creating a new catalog item from an unmatched invoice line
  const [creatingForLine, setCreatingForLine] = useState<InvoiceItem | null>(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    sku: '',
    category: 'Components',
    type: 'COMPONENT' as 'RAW_MATERIAL' | 'COMPONENT' | 'FINISHED_GOOD' | 'OTHER',
    unit: 'pcs',
    minStock: 0,
    reorderLevel: 0,
  });

  if (isLoading) return <div className="p-8 text-center text-navy/70 text-sm">Loading invoice data...</div>;
  if (!invoice) return <div className="p-8 text-center text-navy/70 text-sm">Invoice not found</div>;

  const currency = invoice.ocrRawData?.currency || 'Rs';

  const formatMoney = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return 'Pending extraction';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return 'Pending extraction';
    if (currency === 'Rs' || currency === 'INR' || currency === '₹') {
      return formatINR(num);
    }
    return `${currency} ${num.toFixed(2)}`;
  };

  const handleMatchChange = (itemId: string, selectedMatchedItemId: string) => {
    setItemMatches((prev) => ({ ...prev, [itemId]: selectedMatchedItemId }));
  };

  const openCreateItemModal = (line: InvoiceItem) => {
    const rawLineData = invoice.ocrRawData?.lineItems?.find(
      (l: any) => l.description === line.extractedDescription || l.code === line.extractedSku
    );

    setCreatingForLine(line);
    setModalForm({
      name: line.extractedDescription,
      sku: line.extractedSku || rawLineData?.code || `SKU-${Date.now().toString().slice(-6)}`,
      category: 'Components',
      type: 'COMPONENT',
      unit: 'pcs',
      minStock: 0,
      reorderLevel: 0,
    });
    setErrorMessage(null);
  };

  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingForLine || !invoice) return;

    setErrorMessage(null);
    createItemMutation.mutate(
      {
        invoiceId: invoice.id,
        data: {
          invoiceItemId: creatingForLine.id,
          name: modalForm.name.trim(),
          sku: modalForm.sku.trim(),
          category: modalForm.category.trim(),
          type: modalForm.type,
          unit: modalForm.unit.trim(),
          minStock: Number(modalForm.minStock) || 0,
          reorderLevel: Number(modalForm.reorderLevel) || 0,
        },
      },
      {
        onSuccess: (data) => {
          const newItem = data?.data?.newItem;
          if (newItem) {
            setItemMatches((prev) => ({ ...prev, [creatingForLine.id]: newItem.id }));
          }
          setSuccessMessage(`New item "${modalForm.name}" created and linked. Initial stock is 0.00.`);
          setCreatingForLine(null);
        },
        onError: (err: any) => {
          setErrorMessage(err?.response?.data?.message || err.message || 'Failed to create item');
        },
      }
    );
  };

  const handleVerify = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const itemsToVerify =
      invoice.items?.map((i) => {
        const matchedId = itemMatches[i.id] !== undefined ? itemMatches[i.id] : i.matchedItemId;
        return {
          id: i.id,
          matchedItemId: matchedId || undefined,
          isUserVerified: true,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          totalPrice: parseFloat(i.totalPrice),
        };
      }) || [];

    const unmatched = itemsToVerify.find((it) => !it.matchedItemId);
    if (unmatched) {
      setErrorMessage('Please match all line items or create catalog items before confirming verification.');
      return;
    }

    verifyMutation.mutate(
      {
        id: invoice.id,
        data: {
          supplierId: invoice.supplierId ?? undefined,
          purchaseId: invoice.purchaseId ?? undefined,
          invoiceNumber: invoice.invoiceNumber ?? undefined,
          items: itemsToVerify,
        },
      },
      {
        onSuccess: () => {
          setSuccessMessage('Invoice successfully verified and reconciled. No unintended stock mutations occurred.');
        },
        onError: (err: any) => {
          setErrorMessage(err?.response?.data?.message || err.message || 'Failed to verify invoice');
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UPLOADED':
        return <Badge variant="outline" className="bg-blue-50 text-navy border-blue-300 font-mono text-[10px]">UPLOADED</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 font-mono text-[10px] animate-pulse">OCR RUNNING</Badge>;
      case 'EXTRACTED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">NEEDS VERIFICATION</Badge>;
      case 'VERIFIED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">VERIFIED & POSTED</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">FAILED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-navy truncate max-w-md">{invoice.originalFilename}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-xs text-navy/60 font-mono mt-0.5">
              Ingested on {new Date(invoice.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'UPLOADED' && (
            <Button
              onClick={() => {
                setErrorMessage(null);
                processMutation.mutate(invoice.id, {
                  onError: (err: any) => {
                    setErrorMessage(err?.response?.data?.message || err.message || 'Extraction failed');
                  },
                });
              }}
              disabled={processMutation.isPending}
              className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm"
            >
              {processMutation.isPending ? 'Executing OCR...' : 'Run OCR & Match Items'}
            </Button>
          )}
          {invoice.status === 'EXTRACTED' && (
            <Button onClick={handleVerify} disabled={verifyMutation.isPending} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Confirm & Verify Ingested Data
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Extracted Header Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Invoice Number</span>
              <span className="font-mono text-navy font-bold">{invoice.invoiceNumber || 'Pending extraction'}</span>
            </div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Invoice Date</span>
              <span className="font-mono text-navy font-semibold">
                {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'Pending extraction'}
              </span>
            </div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Currency</span>
              <span className="font-mono font-semibold text-navy">{currency}</span>
            </div>
            {invoice.ocrRawData?.subtotal !== undefined && (
              <div className="flex justify-between border-b border-bluegray/10 pb-2">
                <span className="text-navy/60 font-medium">Subtotal</span>
                <span className="font-mono text-navy font-semibold">{formatMoney(invoice.ocrRawData.subtotal)}</span>
              </div>
            )}
            {invoice.ocrRawData?.taxTotal !== undefined && (
              <div className="flex justify-between border-b border-bluegray/10 pb-2">
                <span className="text-navy/60 font-medium">Tax Total</span>
                <span className="font-mono text-navy font-semibold">{formatMoney(invoice.ocrRawData.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Total Amount</span>
              <span className="font-mono font-bold text-navy text-sm">{formatMoney(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy/60 font-medium">File Size</span>
              <span className="font-mono text-navy/70">{(invoice.fileSize / 1024).toFixed(2)} KB</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Associations & Traceability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Identified Supplier</span>
              <span className="font-bold text-navy">{invoice.supplier?.name || invoice.ocrRawData?.supplierName || 'Pending matching'}</span>
            </div>
            {invoice.ocrRawData?.billToReference && (
              <div className="flex justify-between border-b border-bluegray/10 pb-2">
                <span className="text-navy/60 font-medium">Bill To / Reference</span>
                <span className="font-mono text-navy">{invoice.ocrRawData.billToReference}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Linked PO #</span>
              <span className="font-mono text-navy font-semibold">{invoice.purchase?.purchaseNumber || 'Not linked'}</span>
            </div>
            {invoice.verifiedBy && (
              <div className="flex justify-between">
                <span className="text-navy/60 font-medium">Verified By</span>
                <span className="font-semibold text-navy">{invoice.verifiedBy.firstName} {invoice.verifiedBy.lastName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {invoice.ocrRawData?.discrepancyNote && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span><strong>Calculations Flag:</strong> {invoice.ocrRawData.discrepancyNote}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Extracted Line Items & Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">OCR Extracted Item</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Lot / Expiry</TableHead>
                  <TableHead className="w-[30%] text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inventory Item Match</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Confidence</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Qty</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Unit Price</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!invoice.items || invoice.items.length === 0) ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-navy/60 text-xs font-medium">No line items extracted yet.</TableCell></TableRow>
                ) : (
                  invoice.items.map((item) => {
                    const currentMatchedId = itemMatches[item.id] !== undefined ? itemMatches[item.id] : (item.matchedItemId || '');
                    const rawLine = invoice.ocrRawData?.lineItems?.find(
                      (l: any) => l.description === item.extractedDescription || l.code === item.extractedSku
                    );

                    return (
                      <TableRow key={item.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                        <TableCell className="font-mono text-xs text-navy font-medium">
                          <div>{item.extractedDescription}</div>
                          {item.extractedSku && (
                            <span className="text-[10px] text-bluegray-dark bg-bluegray/10 px-1.5 py-0.5 rounded font-mono">
                              {item.extractedSku}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-navy/80">
                          {rawLine?.lotBatch || '-'}
                          {rawLine?.expiryNote && (
                            <div className="text-[10px] text-navy/60">{rawLine.expiryNote}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'EXTRACTED' || invoice.status === 'UPLOADED' ? (
                            <div className="space-y-1.5">
                              <select
                                value={currentMatchedId}
                                onChange={(e) => handleMatchChange(item.id, e.target.value)}
                                className="flex h-8 w-full rounded-md border border-bluegray/50 bg-white px-2 py-1 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                              >
                                <option value="">-- Match Inventory Item --</option>
                                {inventoryItems.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({inv.sku})
                                  </option>
                                ))}
                              </select>

                              {!currentMatchedId && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 font-mono text-[10px]">
                                    Unmatched
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openCreateItemModal(item)}
                                    className="h-6 text-[11px] px-2 border-navy/40 text-navy hover:bg-cream/60 flex items-center gap-1"
                                  >
                                    <PlusCircle className="h-3 w-3" /> Create Catalog Item
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : item.matchedItem ? (
                            <div className="text-xs font-bold text-navy">
                              {item.matchedItem.name}{' '}
                              <span className="font-mono text-[10px] text-bluegray-dark font-normal">({item.matchedItem.sku})</span>
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-amber-700">Unmatched</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.matchConfidence ? (
                            <Badge variant="outline" className={parseFloat(item.matchConfidence) > 0.8 ? 'text-emerald-800 bg-emerald-50 border-emerald-300 font-mono text-[10px]' : 'text-amber-800 bg-amber-50 border-amber-300 font-mono text-[10px]'}>
                              {(parseFloat(item.matchConfidence) * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 font-mono text-[10px]">None</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-navy">{item.quantity}</TableCell>
                        <TableCell className="font-mono text-xs text-navy">{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-navy">{formatMoney(item.totalPrice)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal for creating a new catalog item */}
      {creatingForLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white border border-bluegray/50 shadow-xl rounded-lg">
            <CardHeader className="border-b border-bluegray/20 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-navy uppercase tracking-wider">
                  Create Catalog Item from Line
                </CardTitle>
                <p className="text-[11px] text-navy/60 font-mono mt-0.5">
                  Extracted Line: {creatingForLine.extractedDescription}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreatingForLine(null)}
                className="h-8 w-8 p-0 text-navy hover:bg-cream/40"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleCreateItemSubmit}>
              <CardContent className="space-y-3.5 pt-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-navy mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={modalForm.name}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded border border-bluegray/50 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-navy mb-1">SKU / Item Code *</label>
                    <input
                      type="text"
                      required
                      value={modalForm.sku}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, sku: e.target.value }))}
                      className="w-full h-8 px-2.5 rounded border border-bluegray/50 text-xs font-mono font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-navy mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      value={modalForm.category}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full h-8 px-2.5 rounded border border-bluegray/50 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-navy mb-1">Item Type *</label>
                    <select
                      value={modalForm.type}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, type: e.target.value as any }))}
                      className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="COMPONENT">COMPONENT</option>
                      <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                      <option value="FINISHED_GOOD">FINISHED_GOOD</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-navy mb-1">Unit of Measure *</label>
                    <input
                      type="text"
                      required
                      value={modalForm.unit}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full h-8 px-2.5 rounded border border-bluegray/50 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-cream/30 border border-bluegray/20 rounded text-[11px] text-navy/70 leading-relaxed">
                  <strong>Stock Integrity Rule:</strong> Creating a new catalog item creates only the master record. Initial on-hand stock remains <strong>0.00</strong> until an authorized goods receipt is confirmed.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-bluegray/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreatingForLine(null)}
                    className="border-bluegray/40 text-navy text-xs hover:bg-cream/40"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createItemMutation.isPending}
                    className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold"
                  >
                    {createItemMutation.isPending ? 'Saving...' : 'Create & Match Line Item'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
