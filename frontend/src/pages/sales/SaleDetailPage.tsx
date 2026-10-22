import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSale, useCompleteSale, useCancelSale } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { SaleStatus } from '@/types/sale';
import { formatINR } from '@/lib/utils';

export const SaleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSale(id);

  const completeMutation = useCompleteSale();
  const cancelMutation = useCancelSale();
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="py-12 text-center text-slate-500">Loading sales order...</div>;
  }

  if (!sale) {
    return <div className="py-12 text-center text-slate-500">Sale order not found</div>;
  }

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">PENDING DISPATCH</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">FULFILLED & DISPATCHED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  const handleComplete = () => {
    setActionError(null);
    if (
      confirm(
        'Complete this sale order? This will atomically decrease finished goods inventory stock (SALE transaction) and mark the order COMPLETED.'
      )
    ) {
      completeMutation.mutate(sale.id, {
        onError: (err: any) => {
          setActionError(err?.response?.data?.message || err.message || 'Failed to complete sale');
        },
      });
    }
  };

  const handleCancel = () => {
    setActionError(null);
    if (confirm('Cancel this sales order? No stock will be altered.')) {
      cancelMutation.mutate(sale.id, {
        onError: (err: any) => {
          setActionError(err?.response?.data?.message || err.message || 'Failed to cancel sale');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-navy">Order #{sale.saleNumber}</h1>
              {getStatusBadge(sale.status)}
            </div>
            <p className="text-xs text-navy/60 font-mono mt-0.5">
              Created on {new Date(sale.createdAt).toLocaleString()}
              {sale.createdBy ? ` by ${sale.createdBy.firstName} ${sale.createdBy.lastName}` : ''}
            </p>
          </div>
        </div>

        {sale.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Sale
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete & Dispatch Stock
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Action Failed: </span>
            {actionError}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Customer & Commercial Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Customer</div>
              <div className="font-bold text-xs text-navy mt-1">
                {sale.customerName}
              </div>
            </div>
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Order Value</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {formatINR(Number(sale.totalAmount))}
              </div>
            </div>
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Order Status</div>
              <div className="mt-1">{getStatusBadge(sale.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Dispatch Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-navy/80">
            {sale.notes ? (
              <div className="p-2.5 bg-cream/40 rounded border border-bluegray/20 font-medium">
                {sale.notes}
              </div>
            ) : (
              <span className="text-navy/50">No special dispatch instructions provided.</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Dispatched Inventory Items</CardTitle>
          <CardDescription className="text-xs text-navy/60">Finished goods line items allocated to this customer delivery.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">SKU Code</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Product Name</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Quantity</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Unit Price</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-navy">{item.item.sku}</TableCell>
                    <TableCell className="font-semibold text-xs text-navy">{item.item.name}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-navy">
                      {Number(item.quantity)} {item.item.unit}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-navy">{formatINR(Number(item.unitPrice))}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-navy">
                      {formatINR(Number(item.totalPrice))}
                    </TableCell>
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
