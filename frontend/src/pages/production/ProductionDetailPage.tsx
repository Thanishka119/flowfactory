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
        return <Badge className="bg-slate-500">DRAFT</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-600">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-emerald-600">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-600">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/production')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
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
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleStart}
                disabled={startMutation.isPending}
              >
                <Play className="mr-2 h-4 w-4" /> Start Production
              </Button>
            </>
          )}

          {order.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openCompleteModal}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Production
              </Button>
            </>
          )}
        </div>
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

      {/* Production Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Production Item & Progress</CardTitle>
            <CardDescription>Target finished good and manufactured output yield</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Target Product</div>
              <div className="font-medium text-slate-900 dark:text-white mt-1">
                {order.finishedGoodItem?.name}
              </div>
              <div className="text-xs text-slate-500">{order.finishedGoodItem?.sku}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Planned Quantity</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {Number(order.plannedQuantity)} {order.finishedGoodItem?.unit}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Actual Yield</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {Number(order.actualQuantity)} {order.finishedGoodItem?.unit}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Warehouse Stock</div>
              <div className="font-medium text-slate-900 dark:text-white mt-1">
                {Number(order.finishedGoodItem?.currentStock)} {order.finishedGoodItem?.unit}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Status</span>
              <span className="font-medium">{order.status}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Started Date</span>
              <span className="font-medium">
                {order.startDate ? new Date(order.startDate).toLocaleString() : 'Not started'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">Completed Date</span>
              <span className="font-medium">
                {order.completionDate ? new Date(order.completionDate).toLocaleString() : 'Not completed'}
              </span>
            </div>
            {order.notes && (
              <div>
                <span className="text-slate-500 block mb-1">Notes:</span>
                <span className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2 rounded block text-xs">
                  {order.notes}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bill of Materials / Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials (Required Materials)</CardTitle>
          <CardDescription>
            Materials and components required for this run. Material stock is consumed upon completion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material / Component</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Required Quantity</TableHead>
                  <TableHead>Current Warehouse Stock</TableHead>
                  <TableHead>Stock Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.requiredItems.map((req) => {
                  const reqQty = Number(req.requiredQuantity);
                  const currStock = Number(req.item?.currentStock ?? 0);
                  const isSufficient = currStock >= reqQty;

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.item?.name}</TableCell>
                      <TableCell className="text-slate-500">{req.item?.sku}</TableCell>
                      <TableCell className="font-semibold">
                        {reqQty} {req.item?.unit}
                      </TableCell>
                      <TableCell>
                        {currStock} {req.item?.unit}
                      </TableCell>
                      <TableCell>
                        {order.status === 'COMPLETED' ? (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                            Consumed
                          </Badge>
                        ) : isSufficient ? (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-700 bg-rose-50">
                            Shortage ({reqQty - currStock} {req.item?.unit})
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Complete Production Order
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Completing this production order will atomically:
            </p>
            <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li>
                Consume all required raw materials/components from inventory (Ledger:{' '}
                <span className="font-mono text-xs font-semibold">CONSUMPTION</span>).
              </li>
              <li>
                Increase finished good (<span className="font-semibold">{order.finishedGoodItem?.name}</span>) stock (Ledger:{' '}
                <span className="font-mono text-xs font-semibold">PRODUCTION</span>).
              </li>
              <li>Record audit consumption and yield entries.</li>
            </ul>

            <div className="space-y-2 pt-2">
              <Label htmlFor="actualYield">
                Actual Output Yield ({order.finishedGoodItem?.unit})
              </Label>
              <Input
                id="actualYield"
                type="number"
                step="any"
                min="0.0001"
                value={actualYield}
                onChange={(e) => setActualYield(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Planned: {Number(order.plannedQuantity)} {order.finishedGoodItem?.unit}
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded bg-rose-50 text-rose-700 text-sm">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                disabled={completeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCompleteSubmit}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? 'Processing...' : 'Confirm & Complete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
