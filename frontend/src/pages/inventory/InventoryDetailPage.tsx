import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Edit, Ban, Package, Truck } from 'lucide-react';
import { useInventoryItem, useInventoryTransactions, useAdjustStock, useDeactivateInventoryItem } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StockStatus, TransactionType } from '@/types/inventory';

const adjustSchema = z.object({
  quantityDelta: z.coerce.number().refine((v) => v !== 0, 'Delta cannot be zero'),
  notes: z.string().min(1, 'Notes are required').max(500),
});

type AdjustForm = z.infer<typeof adjustSchema>;

function statusBadge(status: StockStatus) {
  const styles: Record<StockStatus, string> = {
    OUT_OF_STOCK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    LOW_STOCK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    NORMAL: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  const labels: Record<StockStatus, string> = {
    OUT_OF_STOCK: 'Out of Stock', LOW_STOCK: 'Low Stock', NORMAL: 'Normal',
  };
  return <Badge variant="outline" className={cn('text-xs', styles[status])}>{labels[status]}</Badge>;
}

function txTypeBadge(type: TransactionType) {
  const colors: Record<TransactionType, string> = {
    PURCHASE: 'bg-emerald-100 text-emerald-800',
    CONSUMPTION: 'bg-orange-100 text-orange-800',
    PRODUCTION: 'bg-blue-100 text-blue-800',
    SALE: 'bg-purple-100 text-purple-800',
    ADJUSTMENT: 'bg-slate-100 text-slate-800',
  };
  return <Badge variant="outline" className={cn('text-xs', colors[type])}>{type}</Badge>;
}

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [txPage, setTxPage] = useState(1);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const { data: itemResponse, isLoading, isError } = useInventoryItem(id!);
  const { data: txResponse } = useInventoryTransactions(id!, { page: txPage, limit: 10 });
  const adjustMutation = useAdjustStock();
  const deactivateMutation = useDeactivateInventoryItem();

  const item = itemResponse?.data;
  const transactions = txResponse?.data || [];
  const txMeta = txResponse?.meta;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
  });

  async function onAdjust(data: AdjustForm) {
    setAdjustSuccess(null);
    try {
      const result = await adjustMutation.mutateAsync({ id: id!, data });
      const res = result.data;
      setAdjustSuccess(
        `Stock adjusted: ${res?.previousStock} → ${res?.newStock} (delta: ${res?.delta})`
      );
      reset();
    } catch {
      // Error handled by mutation state
    }
  }

  async function handleDeactivate() {
    if (!confirm('Are you sure you want to deactivate this item?')) return;
    try {
      await deactivateMutation.mutateAsync(id!);
      navigate('/inventory');
    } catch {
      // Error handled by mutation state
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-slate-500">Loading...</div>;
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-sm text-red-500">Failed to load inventory item</p>
        <Button variant="outline" onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{item.name}</h1>
              {statusBadge(item.stockStatus)}
              {!item.isActive && <Badge variant="outline" className="bg-slate-100 text-slate-500 text-xs">Inactive</Badge>}
            </div>
            <p className="text-sm text-slate-500 font-mono">{item.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/inventory/${item.id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1" />Edit</Button>
          </Link>
          {item.isActive && (
            <Button variant="outline" size="sm" onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              className="text-red-600 hover:text-red-700">
              <Ban className="h-4 w-4 mr-1" />Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Package className="h-4 w-4" />Item Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span>{item.type.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Category</span><span>{item.category}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Unit</span><span>{item.unit}</span></div>
            {item.description && <div className="flex justify-between"><span className="text-slate-500">Description</span><span className="text-right max-w-[60%]">{item.description}</span></div>}
            {item.expiryDate && <div className="flex justify-between"><span className="text-slate-500">Expiry</span><span>{new Date(item.expiryDate).toLocaleDateString()}</span></div>}
          </CardContent>
        </Card>

        {item.supplier && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Truck className="h-4 w-4" />Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{item.supplier.name}</span></div>
              {item.supplier.contactPerson && <div className="flex justify-between"><span className="text-slate-500">Contact</span><span>{item.supplier.contactPerson}</span></div>}
              {item.supplier.email && <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{item.supplier.email}</span></div>}
              {item.supplier.phone && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{item.supplier.phone}</span></div>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stock Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-500">Stock Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Current Stock</p>
              <p className="text-2xl font-bold font-mono">{parseFloat(item.currentStock).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Min Stock</p>
              <p className="text-lg font-mono">{parseFloat(item.minStock).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reorder Level</p>
              <p className="text-lg font-mono">{parseFloat(item.reorderLevel).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1">{statusBadge(item.stockStatus)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment */}
      {item.isActive && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Manual Stock Adjustment</CardTitle>
            <CardDescription>Positive value to increase, negative to decrease stock</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onAdjust)} className="space-y-3">
              {adjustSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm p-3 rounded-md">
                  {adjustSuccess}
                </div>
              )}
              {adjustMutation.isError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-md">
                  {adjustMutation.error?.message || 'Adjustment failed'}
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 w-32">
                  <Label htmlFor="quantityDelta">Delta</Label>
                  <Input id="quantityDelta" type="number" step="any" {...register('quantityDelta')} placeholder="e.g. 10 or -5" />
                  {errors.quantityDelta && <p className="text-xs text-red-500">{errors.quantityDelta.message}</p>}
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label htmlFor="notes">Reason / Notes</Label>
                  <Input id="notes" {...register('notes')} placeholder="Reason for adjustment" />
                  {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
                </div>
                <Button type="submit" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-500">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No transactions recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Date</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-500">Qty</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-500">Balance After</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Reference</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">By</th>
                    <th className="text-left py-2 px-4 font-medium text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-4 text-xs text-slate-600">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-4">{txTypeBadge(tx.type)}</td>
                      <td className={cn('py-2 px-4 text-right font-mono', parseFloat(tx.quantity) >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {parseFloat(tx.quantity) >= 0 ? '+' : ''}{parseFloat(tx.quantity).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">{parseFloat(tx.balanceAfter).toLocaleString()}</td>
                      <td className="py-2 px-4 text-xs text-slate-500">{tx.referenceType || '—'}</td>
                      <td className="py-2 px-4 text-xs text-slate-600">
                        {tx.performedBy ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}` : '—'}
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-500 max-w-[150px] truncate">{tx.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {txMeta && txMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500">Page {txMeta.page} of {txMeta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={txMeta.page <= 1} onClick={() => setTxPage(txMeta.page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={txMeta.page >= txMeta.totalPages} onClick={() => setTxPage(txMeta.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
