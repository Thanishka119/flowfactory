import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle, AlertTriangle, Box } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export const RecoveryResalePage = () => {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Return ingestion form
  const [selectedItemId, setSelectedItemId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState<'NEW_LIKE' | 'OPEN_BOX' | 'DAMAGED' | 'DEFECTIVE' | 'INCOMPLETE'>('OPEN_BOX');
  const [returnBatchRef, setReturnBatchRef] = useState('');
  const [basePrice] = useState(100);

  // Inspection modal
  const [inspectingReturn, setInspectingReturn] = useState<any | null>(null);
  const [inspectionStatus, setInspectionStatus] = useState<'INSPECTED_PASSED' | 'INSPECTED_REPAIR_NEEDED' | 'INSPECTED_FAILED'>('INSPECTED_PASSED');
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Component recovery approval modal
  const [salvagingReturn, setSalvagingReturn] = useState<any | null>(null);
  const [salvagedComponentId, setSalvagedComponentId] = useState('');
  const [salvagedQty, setSalvagedQty] = useState(1);

  const { data: returnsData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'recovery-returns'],
    queryFn: () => adminService.getReturns(),
  });
  const returns = returnsData?.data || [];

  const { data: inventoryData } = useInventoryList({ limit: 100 });
  const inventoryItems = inventoryData?.data || [];

  const createReturnMutation = useMutation({
    mutationFn: (data: any) => adminService.createReturn(data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Product return logged in returns holding state. Sellable stock unchanged.');
      setErrorMessage(null);
      setSelectedItemId('');
      setReturnReason('');
      setReturnBatchRef('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'recovery-returns'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to log return');
    },
  });

  const inspectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminService.inspectReturn(id, data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Technical inspection logged.');
      setInspectingReturn(null);
      setInspectionNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'recovery-returns'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Inspection recording failed');
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminService.approveRecoveryRoute(id, data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Disposition approved and executed.');
      setSalvagingReturn(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'recovery-returns'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Disposition execution failed');
    },
  });

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    createReturnMutation.mutate({
      itemId: selectedItemId,
      quantity: Number(returnQty),
      reason: returnReason.trim(),
      condition: returnCondition,
      estimatedBasePrice: Number(basePrice),
      batchReference: returnBatchRef.trim() || undefined,
    });
  };

  const handleInspectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingReturn) return;
    inspectMutation.mutate({
      id: inspectingReturn.id,
      data: {
        inspectionStatus,
        inspectionNotes: inspectionNotes.trim() || 'Visual and operational inspection completed.',
      },
    });
  };

  const handleApproveClick = (ret: any) => {
    if (ret.recommendedRoute === 'COMPONENT_RECOVERY') {
      setSalvagingReturn(ret);
      setSalvagedComponentId('');
      setSalvagedQty(Number(ret.quantity));
      return;
    }

    let action: 'APPROVE_OPEN_BOX' | 'APPROVE_COMPONENT_RECOVERY' | 'SCRAP_RECYCLE' | 'ROUTE_REPAIR' = 'APPROVE_OPEN_BOX';
    if (ret.recommendedRoute === 'QUARANTINE' || ret.recommendedRoute === 'RECYCLE_SCRAP') action = 'SCRAP_RECYCLE';
    else if (ret.recommendedRoute === 'REPAIR' || ret.recommendedRoute === 'REFURBISH') action = 'ROUTE_REPAIR';

    approveMutation.mutate({
      id: ret.id,
      data: {
        action,
        notes: `Disposition ${action} executed under Admin authorization.`,
      },
    });
  };

  const handleSalvageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salvagingReturn || !salvagedComponentId) return;
    approveMutation.mutate({
      id: salvagingReturn.id,
      data: {
        action: 'APPROVE_COMPONENT_RECOVERY',
        targetComponentId: salvagedComponentId,
        salvagedQuantity: Number(salvagedQty),
        notes: `Component recovery executed for return ${salvagingReturn.returnNumber}. Recredited to ledger.`,
      },
    });
  };

  const getInventoryStatusBadge = (ret: any) => {
    const inv = ret.inventoryStatus;
    if (inv === 'PRESERVED_OPEN_BOX_LEDGER') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-300 text-[10px] font-mono">
          Open-Box Ledger
        </Badge>
      );
    }
    if (inv === 'COMPONENTS_RECOVERED') {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-mono">
          Components Recredited
        </Badge>
      );
    }
    if (inv === 'QUARANTINED' || inv === 'QUARANTINE_HOLD') {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-mono">
          Quarantined (Non-sellable)
        </Badge>
      );
    }
    if (inv === 'IN_MAINTENANCE_HOLD') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-300 text-[10px] font-mono">
          Repair Facility Hold
        </Badge>
      );
    }
    if (ret.inspectionStatus === 'INSPECTED_PASSED' && ret.status !== 'COMPLETED') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-mono">
          Awaiting Disposition
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono">
        Held in Returns (Stock: 0)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Returned Product Recovery & Resale Engine</h1>
            <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 font-mono text-[10px] font-semibold">
              ADMIN ONLY
            </Badge>
          </div>
          <p className="text-xs text-navy/60 mt-1">
            Assesses returned customer goods and routes them safely to Open-Box resale, repair, component recovery, or quarantine. Returns enter a non-sellable holding state and are never labeled as New.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-bluegray/40 text-navy hover:bg-cream/40 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Inbound Return Assessment Form */}
      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">
            Log Inbound Customer Return for Disposition Evaluation
          </CardTitle>
          <p className="text-[11px] text-navy/60 mt-0.5">
            Logging a return holds units in a non-sellable returns quarantine state. Sellable stock is unaffected until inspection and authorized disposition.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleCreateReturn} className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end">
            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Returned Product *</label>
              <select
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="">-- Select Product --</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Observed Condition *</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as any)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="NEW_LIKE">NEW_LIKE (Unsealed / Untouched)</option>
                <option value="OPEN_BOX">OPEN_BOX (Complete / Minor Handling)</option>
                <option value="DAMAGED">DAMAGED (Cosmetic / Physical)</option>
                <option value="DEFECTIVE">DEFECTIVE (Non-functional)</option>
                <option value="INCOMPLETE">INCOMPLETE (Missing parts)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Batch / Serial Ref</label>
              <input
                type="text"
                placeholder="e.g. LOT-2026-CHAIR"
                value={returnBatchRef}
                onChange={(e) => setReturnBatchRef(e.target.value)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Return Reason *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ordered incorrect model"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={!selectedItemId || createReturnMutation.isPending}
                className="w-full h-8 bg-navy hover:bg-navy-dark text-white text-xs font-semibold"
              >
                Evaluate Disposition
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Returns List */}
      <Card className="border border-bluegray/40 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">
            Returned Inventory Disposition & Resale Ledger
          </CardTitle>
          <p className="text-[11px] text-navy/60 mt-0.5">
            Traceable disposition ledger. Returned units remain outside prime sellable stock to prevent misclassifying handled or open-box goods.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Return ID & Item</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Qty / Reason</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Condition</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inspection</TableHead>
                  <TableHead className="w-[28%] text-[11px] font-semibold uppercase tracking-wider text-navy/70">Recommended Disposition & Pricing</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inventory State</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-navy/60 text-xs">Loading returns...</TableCell></TableRow>
                ) : returns.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-navy/60 text-xs">No product returns registered yet.</TableCell></TableRow>
                ) : (
                  returns.map((ret: any) => (
                    <TableRow key={ret.id} className="border-b border-bluegray/15 hover:bg-cream/10 transition-colors">
                      <TableCell className="font-mono text-xs text-navy">
                        <div className="font-bold">{ret.returnNumber}</div>
                        <div className="text-[11px] text-navy/80">{ret.itemName} ({ret.itemSku})</div>
                        {ret.batchReference && (
                          <div className="text-[10px] text-navy/50 font-mono mt-0.5">Batch: {ret.batchReference}</div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-navy">
                        <span className="font-mono font-bold">{ret.quantity} units</span>
                        <div className="text-[10px] text-navy/60">{ret.reason}</div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono bg-cream/40 text-navy border-bluegray/40">
                          {ret.condition}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ret.inspectionStatus === 'INSPECTED_PASSED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]'
                              : ret.inspectionStatus === 'INSPECTED_FAILED'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 text-[10px]'
                              : 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                          }
                        >
                          {ret.inspectionStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-semibold text-navy flex items-center gap-1.5">
                          <span className="font-mono text-xs">{ret.recommendedRoute}</span>
                          {ret.resalePrice && (
                            <Badge variant="outline" className="bg-blue-50 text-navy border-blue-200 text-[10px]">
                              Open-Box Resale: {formatINR(ret.resalePrice)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-navy/70 mt-1 leading-snug">
                          {ret.routeExplanation}
                        </p>
                      </TableCell>

                      <TableCell>
                        {getInventoryStatusBadge(ret)}
                      </TableCell>

                      <TableCell className="text-right space-x-1.5">
                        {ret.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInspectingReturn(ret);
                              setInspectionStatus('INSPECTED_PASSED');
                              setInspectionNotes('');
                            }}
                            className="text-[11px] h-7 border-bluegray/40 text-navy hover:bg-cream/40"
                          >
                            Inspect
                          </Button>
                        )}
                        {ret.status === 'INSPECTED' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveClick(ret)}
                            disabled={approveMutation.isPending}
                            className="text-[11px] h-7 bg-navy hover:bg-navy-dark text-white font-semibold"
                          >
                            Approve Disposition
                          </Button>
                        )}
                        {ret.status === 'COMPLETED' && (
                          <span className="text-[10px] font-mono text-navy/50 font-semibold px-2 py-1 bg-cream/40 rounded border border-bluegray/20">
                            Finalized
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Formal Inspection Modal */}
      {inspectingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white border border-bluegray/50 shadow-xl rounded-lg">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy uppercase tracking-wider">
                Log Formal Technical Inspection
              </CardTitle>
              <p className="text-[11px] text-navy/60 font-mono mt-0.5">
                Return Ref: {inspectingReturn.returnNumber} — {inspectingReturn.itemName}
              </p>
            </CardHeader>
            <form onSubmit={handleInspectSubmit}>
              <CardContent className="space-y-3.5 pt-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-navy mb-1">Inspection Outcome *</label>
                  <select
                    value={inspectionStatus}
                    onChange={(e) => setInspectionStatus(e.target.value as any)}
                    className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  >
                    <option value="INSPECTED_PASSED">PASSED — Safe for Resale / Recovery</option>
                    <option value="INSPECTED_REPAIR_NEEDED">REPAIR NEEDED — Maintenance Required</option>
                    <option value="INSPECTED_FAILED">FAILED — Safety / Structural Defect (Quarantine)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-navy mb-1">Inspection Notes *</label>
                  <textarea
                    rows={3}
                    required
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Document cosmetic condition, diagnostic test results, electrical safety..."
                    className="w-full p-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-bluegray/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInspectingReturn(null)}
                    className="text-xs border-bluegray/40 text-navy"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inspectMutation.isPending}
                    className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold"
                  >
                    Save Inspection Result
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Component Recovery Salvage Modal */}
      {salvagingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white border border-bluegray/50 shadow-xl rounded-lg">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-2">
                <Box className="h-4 w-4 text-emerald-600" />
                Component Recovery & Recrediting
              </CardTitle>
              <p className="text-[11px] text-navy/60 font-mono mt-0.5">
                Return Ref: {salvagingReturn.returnNumber} ({salvagingReturn.quantity} units of {salvagingReturn.itemName})
              </p>
            </CardHeader>
            <form onSubmit={handleSalvageSubmit}>
              <CardContent className="space-y-3.5 pt-4 text-xs">
                <p className="text-navy/70 leading-relaxed text-[11px]">
                  Salvaged components are recredited directly into the centralized inventory ledger via an audited stock adjustment transaction.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-navy mb-1">Target Component To Recredit *</label>
                  <select
                    required
                    value={salvagedComponentId}
                    onChange={(e) => setSalvagedComponentId(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  >
                    <option value="">-- Select Inventory Component --</option>
                    {inventoryItems.map((it) => (
                      <option key={it.id} value={it.id}>{it.name} ({it.sku}) [Current: {Number(it.currentStock)}]</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-navy mb-1">Salvaged Quantity (Max: {salvagingReturn.quantity}) *</label>
                  <input
                    type="number"
                    min="1"
                    max={Number(salvagingReturn.quantity)}
                    required
                    value={salvagedQty}
                    onChange={(e) => setSalvagedQty(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-bluegray/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSalvagingReturn(null)}
                    className="text-xs border-bluegray/40 text-navy"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!salvagedComponentId || approveMutation.isPending}
                    className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold"
                  >
                    Recredit To Ledger
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
