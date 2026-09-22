import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useVerifyInvoice, useProcessInvoice } from '@/hooks/useInvoices';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: inventoryData } = useInventoryList({ limit: 100 });
  const inventoryItems = inventoryData?.data || [];
  const verifyMutation = useVerifyInvoice();
  const processMutation = useProcessInvoice();

  // Local state for matchedItemId per invoice item
  const [itemMatches, setItemMatches] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) return <div>Loading...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  const handleMatchChange = (itemId: string, selectedMatchedItemId: string) => {
    setItemMatches((prev) => ({ ...prev, [itemId]: selectedMatchedItemId }));
  };

  const handleVerify = () => {
    setErrorMessage(null);

    // Validate that all items will have a matchedItemId
    const itemsToVerify = invoice.items?.map((i) => {
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
      setErrorMessage('Please match all line items to an inventory item before verifying.');
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
              {processMutation.isPending ? 'Executing Textract OCR...' : 'Run OCR & Match Items'}
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
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Invoice Number</span><span className="font-mono text-navy font-bold">{invoice.invoiceNumber || 'Pending extraction'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Invoice Date</span><span className="font-mono text-navy font-semibold">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'Pending extraction'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Total Amount</span><span className="font-mono font-bold text-navy text-sm">{invoice.totalAmount ? `$${parseFloat(invoice.totalAmount).toFixed(2)}` : 'Pending extraction'}</span></div>
            <div className="flex justify-between"><span className="text-navy/60 font-medium">File Size</span><span className="font-mono text-navy/70">{(invoice.fileSize / 1024).toFixed(2)} KB</span></div>
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Associations & Traceability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Identified Supplier</span><span className="font-bold text-navy">{invoice.supplier?.name || 'Pending matching'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Linked PO #</span><span className="font-mono text-navy font-semibold">{invoice.purchase?.purchaseNumber || 'Not linked'}</span></div>
            {invoice.verifiedBy && (
              <div className="flex justify-between"><span className="text-navy/60 font-medium">Verified By</span><span className="font-semibold text-navy">{invoice.verifiedBy.firstName} {invoice.verifiedBy.lastName}</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
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
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">OCR Extracted Description</TableHead>
                  <TableHead className="w-[32%] text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inventory Item Match</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Confidence</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Qty</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Unit Price</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!invoice.items || invoice.items.length === 0) ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-navy/60 text-xs font-medium">No line items extracted yet.</TableCell></TableRow>
                ) : (
                  invoice.items.map((item) => {
                    const currentMatchedId = itemMatches[item.id] !== undefined ? itemMatches[item.id] : (item.matchedItemId || '');
                    return (
                      <TableRow key={item.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                        <TableCell className="font-mono text-xs text-navy font-medium">{item.extractedDescription}</TableCell>
                        <TableCell>
                          {invoice.status === 'EXTRACTED' || invoice.status === 'UPLOADED' ? (
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
                          ) : item.matchedItem ? (
                            <div className="text-xs font-bold text-navy">{item.matchedItem.name} <span className="font-mono text-[10px] text-bluegray-dark font-normal">({item.matchedItem.sku})</span></div>
                          ) : (
                            <div className="text-xs font-semibold text-amber-700">Unmatched</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.matchConfidence ? (
                            <Badge variant="outline" className={parseFloat(item.matchConfidence) > 0.8 ? 'text-emerald-800 bg-emerald-50 border-emerald-300 font-mono text-[10px]' : 'text-amber-800 bg-amber-50 border-amber-300 font-mono text-[10px]'}>
                              {(parseFloat(item.matchConfidence) * 100).toFixed(0)}%
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-navy">{item.quantity}</TableCell>
                        <TableCell className="font-mono text-xs text-navy">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-navy">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
