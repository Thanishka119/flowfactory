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
    OUT_OF_STOCK: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    LOW_STOCK: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    NORMAL: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
  };
  const labels: Record<StockStatus, string> = {
    OUT_OF_STOCK: 'OUT OF STOCK', LOW_STOCK: 'LOW STOCK', NORMAL: 'NORMAL',
  };
  return <Badge variant="outline" className={cn('text-[10px] font-mono tracking-wider', styles[status])}>{labels[status]}</Badge>;
}

function txTypeBadge(type: TransactionType) {
  const colors: Record<TransactionType, string> = {
    PURCHASE: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    CONSUMPTION: 'bg-orange-50 text-orange-800 border-orange-300',
    PRODUCTION: 'bg-blue-50 text-navy border-blue-200',
    SALE: 'bg-purple-50 text-purple-800 border-purple-300',
    ADJUSTMENT: 'bg-cream text-navy border-bluegray/40',
  };
  return <Badge variant="outline" className={cn('text-[10px] font-mono uppercase tracking-wider', colors[type])}>{type}</Badge>;
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
    return <div className="flex items-center justify-center py-16 text-xs font-mono uppercase tracking-wider text-navy/60">Loading item specifications...</div>;
  }

  if (isError || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-bluegray/40 rounded-lg p-6">
        <p className="text-xs font-semibold text-rose-600">Failed to load inventory item</p>
        <Button variant="outline" className="border-bluegray/40 text-navy text-xs font-semibold" onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-navy">{item.name}</h1>
              {statusBadge(item.stockStatus)}
              {!item.isActive && <Badge variant="outline" className="bg-bluegray/10 text-navy/50 border-bluegray/40 text-[10px] font-mono">Inactive</Badge>}
            </div>
            <p className="text-xs text-bluegray-dark font-mono mt-0.5">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/inventory/${item.id}/edit`}>
            <Button variant="outline" size="sm" className="border-bluegray/50 hover:bg-cream/40 text-navy text-xs font-semibold">
              <Edit className="h-3.5 w-3.5 mr-1" />Edit Item
            </Button>
          </Link>
          {item.isActive && (
            <Button variant="outline" size="sm" onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold">
              <Ban className="h-3.5 w-3.5 mr-1" />Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70 flex items-center gap-2">
              <Package className="h-4 w-4 text-navy" />Item Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Type</span><span className="font-semibold text-navy">{item.type.replace('_', ' ')}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Category</span><span className="font-semibold text-navy">{item.category}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Measurement Unit</span><span className="font-mono font-semibold text-navy">{item.unit}</span></div>
            {item.description && <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Description</span><span className="text-right max-w-[60%] font-medium text-navy">{item.description}</span></div>}
            {item.expiryDate && <div className="flex justify-between"><span className="text-navy/60 font-medium">Expiration Date</span><span className="font-mono font-semibold text-navy">{new Date(item.expiryDate).toLocaleDateString()}</span></div>}
          </CardContent>
        </Card>

        {item.supplier && (
          <Card className="border border-bluegray/40 bg-white shadow-sm">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70 flex items-center gap-2">
                <Truck className="h-4 w-4 text-navy" />Primary Supplier Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Supplier Name</span><span className="font-semibold text-navy">{item.supplier.name}</span></div>
              {item.supplier.contactPerson && <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Key Contact</span><span className="font-medium text-navy">{item.supplier.contactPerson}</span></div>}
              {item.supplier.email && <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Email</span><span className="font-mono text-navy">{item.supplier.email}</span></div>}
              {item.supplier.phone && <div className="flex justify-between"><span className="text-navy/60 font-medium">Phone</span><span className="font-mono text-navy">{item.supplier.phone}</span></div>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stock Summary Card */}
      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Stock Level Metrics</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">Current Stock</p>
              <p className="text-2xl font-bold font-mono text-navy mt-1">{parseFloat(item.currentStock).toLocaleString()} <span className="text-xs text-navy/60 font-sans">{item.unit}</span></p>
            </div>
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">Min Stock Floor</p>
              <p className="text-lg font-bold font-mono text-navy mt-1">{parseFloat(item.minStock).toLocaleString()} <span className="text-xs text-navy/60 font-sans">{item.unit}</span></p>
            </div>
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">Reorder Threshold</p>
              <p className="text-lg font-bold font-mono text-navy mt-1">{parseFloat(item.reorderLevel).toLocaleString()} <span className="text-xs text-navy/60 font-sans">{item.unit}</span></p>
            </div>
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy/60">Inventory Status</p>
              <div className="mt-2">{statusBadge(item.stockStatus)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment */}
      {item.isActive && (
        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Manual Stock Ledger Adjustment</CardTitle>
            <CardDescription className="text-xs text-navy/60">Positive value to increment stock, negative value to write off/decrement</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onAdjust)} className="space-y-4">
              {adjustSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-md font-mono">
                  {adjustSuccess}
                </div>
              )}
              {adjustMutation.isError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3 rounded-md">
                  {adjustMutation.error?.message || 'Adjustment failed'}
                </div>
              )}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1.5 w-36">
                  <Label htmlFor="quantityDelta" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Quantity Delta</Label>
                  <Input id="quantityDelta" type="number" step="any" {...register('quantityDelta')} placeholder="e.g. +10 or -5" className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
                  {errors.quantityDelta && <p className="text-[10px] text-rose-600 font-semibold">{errors.quantityDelta.message}</p>}
                </div>
                <div className="space-y-1.5 flex-1 min-w-[220px]">
                  <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Reason / Audit Trail Note</Label>
                  <Input id="notes" {...register('notes')} placeholder="Mandatory audit justification" className="bg-white border-bluegray/50 focus:border-navy text-xs" />
                  {errors.notes && <p className="text-[10px] text-rose-600 font-semibold">{errors.notes.message}</p>}
                </div>
                <Button type="submit" disabled={adjustMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold">
                  {adjustMutation.isPending ? 'Committing...' : 'Commit Adjustment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Inventory Transaction Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-navy/50">No transaction logs recorded for this item</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bluegray/30 bg-cream/40">
                    <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Timestamp</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Event Type</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Delta</th>
                    <th className="text-right py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Balance After</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Reference</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Authorized By</th>
                    <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Audit Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-navy/70">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-4">{txTypeBadge(tx.type)}</td>
                      <td className={cn('py-2.5 px-4 text-right font-mono font-bold', parseFloat(tx.quantity) >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                        {parseFloat(tx.quantity) >= 0 ? '+' : ''}{parseFloat(tx.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-navy">{parseFloat(tx.balanceAfter).toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-[11px] font-mono text-navy/60">{tx.referenceType || '—'}</td>
                      <td className="py-2.5 px-4 text-navy/80 font-medium">
                        {tx.performedBy ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-navy/60 max-w-[180px] truncate">{tx.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {txMeta && txMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-bluegray/20 bg-cream/10">
              <span className="text-xs font-mono text-navy/60">Page {txMeta.page} of {txMeta.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-bluegray/40 text-navy text-xs" disabled={txMeta.page <= 1} onClick={() => setTxPage(txMeta.page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" className="border-bluegray/40 text-navy text-xs" disabled={txMeta.page >= txMeta.totalPages} onClick={() => setTxPage(txMeta.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
