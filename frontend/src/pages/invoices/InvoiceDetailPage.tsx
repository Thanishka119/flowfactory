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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'UPLOADED': return 'bg-blue-500';
      case 'PROCESSING': return 'bg-purple-500';
      case 'EXTRACTED': return 'bg-amber-500';
      case 'VERIFIED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Invoice: {invoice.originalFilename}</h1>
          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {processMutation.isPending ? 'Extracting Data...' : 'Run OCR & Match Items'}
            </Button>
          )}
          {invoice.status === 'EXTRACTED' && (
            <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" /> Verify Extracted Data
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Invoice Number:</span> {invoice.invoiceNumber || 'Pending extraction'}</div>
            <div><span className="font-semibold">Date:</span> {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'Pending extraction'}</div>
            <div><span className="font-semibold">Total Amount:</span> {invoice.totalAmount ? `$${parseFloat(invoice.totalAmount).toFixed(2)}` : 'Pending extraction'}</div>
            <div><span className="font-semibold">File Size:</span> {(invoice.fileSize / 1024).toFixed(2)} KB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Associations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Supplier:</span> {invoice.supplier?.name || 'Pending matching'}</div>
            <div><span className="font-semibold">Linked PO:</span> {invoice.purchase?.purchaseNumber || 'Not linked'}</div>
            {invoice.verifiedBy && (
              <div><span className="font-semibold">Verified By:</span> {invoice.verifiedBy.firstName} {invoice.verifiedBy.lastName}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Extracted Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Extracted Description</TableHead>
                <TableHead className="w-[30%]">Matched Item</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!invoice.items || invoice.items.length === 0) ? (
                <TableRow><TableCell colSpan={6} className="text-center">No line items extracted yet.</TableCell></TableRow>
              ) : (
                invoice.items.map((item) => {
                  const currentMatchedId = itemMatches[item.id] !== undefined ? itemMatches[item.id] : (item.matchedItemId || '');
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.extractedDescription}</TableCell>
                      <TableCell>
                        {invoice.status === 'EXTRACTED' || invoice.status === 'UPLOADED' ? (
                          <select
                            value={currentMatchedId}
                            onChange={(e) => handleMatchChange(item.id, e.target.value)}
                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                          >
                            <option value="">-- Match Inventory Item --</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.sku})
                              </option>
                            ))}
                          </select>
                        ) : item.matchedItem ? (
                          <div className="text-sm font-medium">{item.matchedItem.name} ({item.matchedItem.sku})</div>
                        ) : (
                          <div className="text-sm text-amber-600">Unmatched</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.matchConfidence ? (
                          <Badge variant="outline" className={parseFloat(item.matchConfidence) > 0.8 ? 'text-green-600' : 'text-amber-600'}>
                            {(parseFloat(item.matchConfidence) * 100).toFixed(0)}%
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
