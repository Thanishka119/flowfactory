import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useProductionOrder,
  useStartProductionOrder,
  useCompleteProductionOrder,
  useCancelProductionOrder,
} from '@/hooks/useProduction';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ProductionStatus } from '@/types/production';

export const ProductionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useProductionOrder(id);

  const startMutation = useStartProductionOrder();
  const completeMutation = useCompleteProductionOrder();
  const cancelMutation = useCancelProductionOrder();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actualYield, setActualYield] = useState<number | string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="py-12 text-center text-slate-500">Loading production order...</div>;
  }

  if (!order) {
    return <div className="py-12 text-center text-slate-500">Production order not found</div>;
  }

  const getStatusBadge = (status: ProductionStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-[10px]">DRAFT</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-50 text-navy border-blue-300 font-mono text-[10px] font-semibold">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  const handleStart = () => {
    setActionError(null);
    if (confirm('Start production order? This will transition status to IN_PROGRESS.')) {
      startMutation.mutate(order.id, {
        onError: (err: any) => {
          setActionError(err?.response?.data?.message || err.message || 'Failed to start production');
        },
      });
    }
  };

  const openCompleteModal = () => {
    setActionError(null);
    setActualYield(order.plannedQuantity);
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = () => {
    setActionError(null);
    const yieldNum = Number(actualYield);
    if (!yieldNum || yieldNum <= 0) {
      setActionError('Actual yield quantity must be greater than 0');
      return;
    }

    completeMutation.mutate(
      {
        id: order.id,
        data: { actualQuantity: yieldNum },
      },
      {
        onSuccess: () => {
          setShowCompleteModal(false);
        },
        onError: (err: any) => {
          setActionError(err?.response?.data?.message || err.message || 'Failed to complete production');
        },
      }
    );
  };

  const handleCancel = () => {
    setActionError(null);
    if (confirm('Are you sure you want to cancel this production order? This action cannot be undone.')) {
      cancelMutation.mutate(order.id, {
        onError: (err: any) => {
          setActionError(err?.response?.data?.message || err.message || 'Failed to cancel production');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/production')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-navy">Order #{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-navy/60 font-mono mt-0.5">
              Created on {new Date(order.createdAt).toLocaleString()}
              {order.createdBy ? ` by ${order.createdBy.firstName} ${order.createdBy.lastName}` : ''}
            </p>
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center gap-2">
          {order.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
              </Button>
              <Button
                className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm"
                onClick={handleStart}
                disabled={startMutation.isPending}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" /> Start Production
              </Button>
            </>
          )}

          {order.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel Order
              </Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm"
                onClick={openCompleteModal}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete Run & Yield
              </Button>
            </>
          )}
        </div>
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

      {/* Production Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Production Target & Progress</CardTitle>
            <CardDescription className="text-xs text-navy/60">Target finished good specification and manufactured output yield</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Target Product</div>
              <div className="font-bold text-xs text-navy mt-1 truncate">
                {order.finishedGoodItem?.name}
              </div>
              <div className="text-[10px] text-bluegray-dark font-mono">{order.finishedGoodItem?.sku}</div>
            </div>

            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Planned Target</div>
              <div className="text-xl font-bold font-mono text-navy mt-1">
                {Number(order.plannedQuantity)} <span className="text-xs font-normal text-navy/60">{order.finishedGoodItem?.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Actual Yield</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {Number(order.actualQuantity)} <span className="text-xs font-normal text-navy/60">{order.finishedGoodItem?.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-cream/30 rounded border border-bluegray/20">
              <div className="text-[11px] text-navy/60 uppercase font-semibold">Current Stock</div>
              <div className="text-base font-bold font-mono text-navy mt-1">
                {Number(order.finishedGoodItem?.currentStock)} <span className="text-xs font-normal text-navy/60">{order.finishedGoodItem?.unit}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Run Lifecycle Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">State</span>
              <span className="font-mono font-bold text-navy">{order.status}</span>
            </div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Started At</span>
              <span className="font-mono text-navy font-semibold">
                {order.startDate ? new Date(order.startDate).toLocaleString() : 'Not started'}
              </span>
            </div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2">
              <span className="text-navy/60 font-medium">Completed At</span>
              <span className="font-mono text-navy font-semibold">
                {order.completionDate ? new Date(order.completionDate).toLocaleString() : 'Not completed'}
              </span>
            </div>
            {order.notes && (
              <div>
                <span className="text-navy/60 font-medium block mb-1">Batch Notes:</span>
                <span className="text-navy bg-cream/40 p-2.5 rounded block text-xs border border-bluegray/20">
                  {order.notes}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bill of Materials / Requirements */}
      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Bill of Materials (Required Raw Inputs)</CardTitle>
          <CardDescription className="text-xs text-navy/60">
            Mandatory recipe materials and components. Stock is deducted atomically upon run completion.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Material / Component</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">SKU</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Required Quantity</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Current Warehouse Stock</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Stock Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.requiredItems.map((req) => {
                  const reqQty = Number(req.requiredQuantity);
                  const currStock = Number(req.item?.currentStock ?? 0);
                  const isSufficient = currStock >= reqQty;

                  return (
                    <TableRow key={req.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                      <TableCell className="font-semibold text-xs text-navy">{req.item?.name}</TableCell>
                      <TableCell className="font-mono text-[11px] text-bluegray-dark">{req.item?.sku}</TableCell>
                      <TableCell className="font-mono text-xs font-bold text-navy">
                        {reqQty} {req.item?.unit}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-navy">
                        {currStock} {req.item?.unit}
                      </TableCell>
                      <TableCell>
                        {order.status === 'COMPLETED' ? (
                          <Badge variant="outline" className="text-emerald-800 bg-emerald-50 border-emerald-300 font-mono text-[10px]">
                            CONSUMED
                          </Badge>
                        ) : isSufficient ? (
                          <Badge variant="outline" className="text-emerald-800 bg-emerald-50 border-emerald-300 font-mono text-[10px]">
                            AVAILABLE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-300 font-mono text-[10px] font-semibold">
                            SHORTAGE ({reqQty - currStock} {req.item?.unit})
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Completion Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-bluegray/40 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="text-lg font-bold text-navy">
                Complete Production Order & Yield
              </h2>
            </div>
            <p className="text-xs text-navy/70">
              Completing this production order will atomically execute the following ledger operations:
            </p>
            <ul className="text-xs space-y-1.5 text-navy/80 list-disc list-inside bg-cream/40 p-3 rounded border border-bluegray/20 font-medium">
              <li>
                Deduct all required raw materials/components from inventory (Ledger:{' '}
                <span className="font-mono text-[11px] font-bold text-navy">CONSUMPTION</span>).
              </li>
              <li>
                Increase finished good (<span className="font-bold text-navy">{order.finishedGoodItem?.name}</span>) stock (Ledger:{' '}
                <span className="font-mono text-[11px] font-bold text-navy">PRODUCTION</span>).
              </li>
              <li>Record permanent transactional audit logs.</li>
            </ul>

            <div className="space-y-2 pt-2">
              <Label htmlFor="actualYield" className="text-xs font-semibold uppercase tracking-wider text-navy/70">
                Actual Output Yield ({order.finishedGoodItem?.unit}) *
              </Label>
              <Input
                id="actualYield"
                type="number"
                step="any"
                min="0.0001"
                value={actualYield}
                onChange={(e) => setActualYield(e.target.value)}
                className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono"
              />
              <p className="text-[11px] text-navy/60 font-mono">
                Planned Target: {Number(order.plannedQuantity)} {order.finishedGoodItem?.unit}
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-bluegray/20">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                disabled={completeMutation.isPending}
                className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40"
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                onClick={handleCompleteSubmit}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? 'Processing Ledger...' : 'Confirm & Complete Run'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
