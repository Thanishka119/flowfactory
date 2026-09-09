import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSale, useCompleteSale, useCancelSale } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { SaleStatus } from '@/types/sale';

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
        return <Badge className="bg-amber-500">PENDING</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-600">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-600">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order #{sale.saleNumber}</h1>
              {getStatusBadge(sale.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {new Date(sale.createdAt).toLocaleString()}
              {sale.createdBy ? ` by ${sale.createdBy.firstName} ${sale.createdBy.lastName}` : ''}
            </p>
          </div>
        </div>

        {sale.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Sale
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Complete & Dispatch
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Action Failed: </span>
            {actionError}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer & Order Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Customer</div>
              <div className="font-medium text-slate-900 dark:text-white mt-1">
                {sale.customerName}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Amount</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                ${Number(sale.totalAmount).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Status</div>
              <div className="mt-1">{getStatusBadge(sale.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            {sale.notes || 'No special notes provided.'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatched Items</CardTitle>
          <CardDescription>Line items sold to the customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.item.sku}</TableCell>
                    <TableCell className="font-medium">{item.item.name}</TableCell>
                    <TableCell>
                      {Number(item.quantity)} {item.item.unit}
                    </TableCell>
                    <TableCell>${Number(item.unitPrice).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(item.totalPrice).toFixed(2)}
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
