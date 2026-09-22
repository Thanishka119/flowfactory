import { useParams, useNavigate } from 'react-router-dom';
import { usePurchase, useReceivePurchase, useCancelPurchase } from '@/hooks/usePurchases';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export const PurchaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading } = usePurchase(id);
  const receiveMutation = useReceivePurchase();
  const cancelMutation = useCancelPurchase();

  if (isLoading) return <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-navy/60">Loading purchase order...</div>;
  if (!purchase) return <div className="py-16 text-center text-xs font-semibold text-rose-600">Purchase Order not found</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">PENDING RECEIPT</Badge>;
      case 'RECEIVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">RECEIVED & STOCKED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  const handleReceive = () => {
    if (confirm('Are you sure you want to mark this order as received? This will automatically increment inventory ledger balance.')) {
      receiveMutation.mutate(purchase.id);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate(purchase.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-navy">PO: {purchase.purchaseNumber}</h1>
              {getStatusBadge(purchase.status)}
            </div>
            <p className="text-xs text-navy/60 font-mono mt-0.5">
              Issued {new Date(purchase.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {purchase.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel PO
              </Button>
              <Button
                onClick={handleReceive}
                disabled={receiveMutation.isPending}
                className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm"
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Receive Inbound Goods
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Order Date</span><span className="font-mono text-navy font-semibold">{new Date(purchase.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Invoice Number</span><span className="font-mono text-navy font-bold">{purchase.invoiceNumber || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Total Invoiced Amount</span><span className="font-mono font-bold text-navy text-sm">${parseFloat(purchase.totalAmount).toFixed(2)}</span></div>
            {purchase.status === 'RECEIVED' && purchase.receivedBy && (
              <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Received By</span><span className="font-semibold text-navy">{purchase.receivedBy.firstName} {purchase.receivedBy.lastName}</span></div>
            )}
            {purchase.notes && <div className="pt-1"><span className="text-navy/60 font-medium block mb-1">Notes:</span><span className="text-navy bg-cream/40 p-2 rounded block text-xs border border-bluegray/20">{purchase.notes}</span></div>}
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Vendor Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Vendor Name</span><span className="font-bold text-navy">{purchase.supplier.name}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Key Contact</span><span className="font-medium text-navy">{purchase.supplier.contactPerson || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-navy/60 font-medium">Email</span><span className="font-mono text-navy">{purchase.supplier.email || 'N/A'}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Inbound PO Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">SKU Code</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Item Name</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inbound Qty</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Unit Cost</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item) => (
                  <TableRow key={item.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-navy">{item.item.sku}</TableCell>
                    <TableCell className="font-semibold text-xs text-navy">{item.item.name}</TableCell>
                    <TableCell className="font-mono text-xs text-navy font-bold">{item.quantity} {item.item.unit}</TableCell>
                    <TableCell className="font-mono text-xs text-navy">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-navy">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
