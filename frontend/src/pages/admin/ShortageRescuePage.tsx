import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

export const ShortageRescuePage = () => {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Alternate registration form
  const [origId, setOrigId] = useState('');
  const [altId, setAltId] = useState('');
  const [altNotes, setAltNotes] = useState('');

  const { data: plansData, isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['admin', 'shortage-rescue'],
    queryFn: () => adminService.getShortagePlans(),
  });
  const plans = plansData?.data || [];

  const { data: salesShortagesData, isLoading: salesLoading, isError: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['admin', 'sales-shortages'],
    queryFn: () => adminService.getSalesOrderShortages(),
  });
  const salesShortages = salesShortagesData?.data || [];

  const { data: alternatesData } = useQuery({
    queryKey: ['admin', 'shortage-alternates'],
    queryFn: () => adminService.getApprovedAlternates(),
  });
  const alternates = alternatesData?.data || [];

  const { data: inventoryData } = useInventoryList({ limit: 100 });
  const inventoryItems = inventoryData?.data || [];

  const handleRefresh = () => {
    refetchPlans();
    refetchSales();
  };

  const approveMutation = useMutation({
    mutationFn: (data: any) => adminService.approveRescuePlan(data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Rescue plan approved and order updated.');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'shortage-rescue'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to approve rescue plan');
    },
  });

  const addAltMutation = useMutation({
    mutationFn: (data: any) => adminService.addApprovedAlternate(data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Approved alternate registered successfully.');
      setOrigId('');
      setAltId('');
      setAltNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'shortage-alternates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'shortage-rescue'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to register alternate');
    },
  });

  const handleApprove = (orderId: string, rec: any) => {
    approveMutation.mutate({
      orderId,
      action: rec.type,
      alternateItemId: rec.alternateItemId,
      substituteQty: rec.recommendedQuantity,
      partialQty: rec.recommendedQuantity,
    });
  };

  const handleAddAlternate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origId || !altId) return;
    addAltMutation.mutate({
      originalItemId: origId,
      alternateItemId: altId,
      notes: altNotes.trim() || undefined,
    });
  };

  const isAnyLoading = plansLoading || salesLoading;
  const isAnyError = plansError || salesError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Shortage Rescue Planner</h1>
            <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 font-mono text-[10px] font-semibold">
              ADMIN ONLY
            </Badge>
          </div>
          <p className="text-xs text-navy/60 mt-1">
            Detects two kinds of shortage: <strong>Finished-goods shortages</strong> (pending sales orders that cannot be fulfilled from current stock) and <strong>BOM component shortages</strong> (active production orders where raw material stock is insufficient). Analysis is read-only — no inventory is changed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isAnyLoading}
          className="border-bluegray/40 text-navy hover:bg-cream/40 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isAnyLoading ? 'animate-spin' : ''}`} /> Refresh Analysis
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">Finished-Goods Shortages</div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
            {salesError ? '—' : salesShortages.length}
          </div>
          <div className="text-[11px] text-navy/50 mt-1">Pending sales orders blocked by finished stock</div>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">BOM Component Shortages</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
            {plansError ? '—' : plans.length}
          </div>
          <div className="text-[11px] text-navy/50 mt-1">Active production orders with missing components</div>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">Total Blocked Orders</div>
          <div className="text-2xl font-bold text-navy mt-1 font-mono">
            {isAnyError ? '—' : salesShortages.length + plans.length}
          </div>
          <div className="text-[11px] text-navy/50 mt-1">Combined sales and production deficit count</div>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">Registered Approved Alternates</div>
          <div className="text-2xl font-bold text-navy mt-1 font-mono">{alternates.length}</div>
          <div className="text-[11px] text-navy/50 mt-1">Verified compatible component pairs</div>
        </Card>
      </div>

      {/* Section 1: Finished-goods / sales-order shortages */}
      <Card className="border border-bluegray/40 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-rose-50/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Section 1 — Finished-Goods Shortages (Pending Sales Orders)
          </CardTitle>
          <p className="text-[11px] text-navy/60 mt-0.5">Sales orders where available finished-goods stock is less than the required quantity. These are not BOM component issues.</p>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isAnyError && salesError ? (
            <div className="py-6 text-center text-xs text-rose-700 flex flex-col items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
              Analysis failed to load. Click Refresh Analysis to retry. Do not interpret a missing result as zero shortages.
            </div>
          ) : salesLoading ? (
            <div className="py-6 text-center text-xs text-navy/60">Loading finished-goods shortage analysis...</div>
          ) : salesShortages.length === 0 ? (
            <div className="py-6 text-center text-xs text-navy/60">
              <CheckCircle className="h-7 w-7 text-emerald-600 mx-auto mb-2 opacity-80" />
              No finished-goods shortages detected. All pending sales orders can be fulfilled from available stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bluegray/20 bg-cream/30">
                    <th className="text-left py-2 px-3 font-semibold text-navy/70 uppercase tracking-wider text-[11px]">Order</th>
                    <th className="text-left py-2 px-3 font-semibold text-navy/70 uppercase tracking-wider text-[11px]">Customer</th>
                    <th className="text-left py-2 px-3 font-semibold text-navy/70 uppercase tracking-wider text-[11px]">Item</th>
                    <th className="text-center py-2 px-3 font-semibold text-navy/70 uppercase tracking-wider text-[11px]">Required</th>
                    <th className="text-center py-2 px-3 font-semibold text-navy/70 uppercase tracking-wider text-[11px]">In Stock</th>
                    <th className="text-center py-2 px-3 font-semibold text-rose-700 uppercase tracking-wider text-[11px]">Shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {salesShortages.map((s: any, i: number) => (
                    <tr key={`${s.orderId}-${s.itemId}`} className={`border-b border-bluegray/10 ${i % 2 === 0 ? 'bg-white' : 'bg-cream/10'}`}>
                      <td className="py-2 px-3 font-mono font-bold text-navy">{s.orderNumber}</td>
                      <td className="py-2 px-3 text-navy">{s.customerName}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-navy">{s.itemName}</span>
                        <span className="text-navy/50 font-mono ml-1.5">({s.itemSku})</span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-navy">{s.requiredQuantity}</td>
                      <td className="py-2 px-3 text-center font-mono text-navy">{s.availableStock}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">{s.shortageQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: BOM Component Shortages */}
      <Card className="border border-bluegray/40 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-amber-50/40">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Section 2 — BOM Component Shortages (Active Production Orders)
          </CardTitle>
          <p className="text-[11px] text-navy/60 mt-0.5">Production orders in DRAFT or IN_PROGRESS status where raw material stock falls below BOM requirements.</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {plansError ? (
            <div className="py-6 text-center text-xs text-rose-700 flex flex-col items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
              BOM analysis failed to load. Click Refresh Analysis to retry.
            </div>
          ) : plansLoading ? (
            <div className="py-6 text-center text-xs text-navy/60">Evaluating BOM stock levels...</div>
          ) : plans.length === 0 ? (
            <div className="py-6 text-center text-xs text-navy/60">
              <CheckCircle className="h-7 w-7 text-emerald-600 mx-auto mb-2 opacity-80" />
              No BOM component shortages detected across active production orders. All required component stock is satisfied.
            </div>
          ) : (
            plans.map((plan: any) => (
              <div
                key={plan.orderId}
                className="border border-bluegray/30 rounded-lg p-4 space-y-3 bg-white hover:border-bluegray/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bluegray/15 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-navy">{plan.orderNumber}</span>
                      <span className="text-xs text-navy/70">— {plan.finishedGoodName}</span>
                      <Badge
                        variant="outline"
                        className={
                          plan.urgency === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 font-mono text-[10px]'
                            : plan.urgency === 'HIGH'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px]'
                            : 'bg-blue-50 text-navy border-blue-300 font-mono text-[10px]'
                        }
                      >
                        {plan.urgency} URGENCY
                      </Badge>
                    </div>
                    <div className="text-[11px] text-navy/50 font-mono mt-0.5">
                      Planned Target: {plan.plannedQuantity} units | Status: {plan.status}
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-navy/70">
                    Max Partial Batch Feasible: <strong>{plan.feasiblePartialQuantity} units</strong>
                  </div>
                </div>

                {/* Shortage Components List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-navy/70 uppercase">Identified Component Shortages:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {plan.shortageItems.map((si: any) => (
                      <div key={si.itemId} className="p-2.5 bg-rose-50/50 border border-rose-200 rounded text-xs">
                        <div className="font-semibold text-rose-900 flex justify-between">
                          <span>{si.itemName}</span>
                          <span className="font-mono text-[10px]">Shortage: {si.shortageQuantity} units</span>
                        </div>
                        <div className="text-[11px] text-navy/60 font-mono mt-1">
                          Required: {si.totalRequired} | Available In Stock: {si.currentStock}
                        </div>

                        {si.approvedAlternates.length > 0 ? (
                          <div className="mt-2 pt-2 border-t border-rose-200/60">
                            <span className="text-[10px] font-semibold text-navy/70">Approved Alternates:</span>
                            {si.approvedAlternates.map((alt: any) => (
                              <div key={alt.alternateItemId} className="text-[11px] text-navy/80 flex justify-between items-center mt-0.5">
                                <span>{alt.alternateItemName} ({alt.alternateItemSku})</span>
                                <Badge
                                  variant="outline"
                                  className={alt.isStockSufficient ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[9px]' : 'bg-slate-50 text-slate-600 border-slate-300 text-[9px]'}
                                >
                                  {alt.availableStock} in stock
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-rose-700/80 mt-1 italic">
                            No approved alternate component registered for this item.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="pt-2 border-t border-bluegray/15">
                  <div className="text-[11px] font-semibold text-navy/70 uppercase mb-2">Available Rescue Options (require manual Admin approval):</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {plan.recommendations.map((rec: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border text-xs flex flex-col justify-between ${
                          rec.isFeasible ? 'bg-cream/30 border-bluegray/40' : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-navy flex items-center gap-1.5">
                            {rec.title}
                          </div>
                          <p className="text-[11px] text-navy/70 mt-1 leading-relaxed">
                            {rec.explanation}
                          </p>
                        </div>
                        <div className="pt-3">
                          <Button
                            size="sm"
                            disabled={!rec.isFeasible || approveMutation.isPending}
                            onClick={() => handleApprove(plan.orderId, rec)}
                            className="w-full text-[11px] h-7 bg-navy hover:bg-navy-dark text-white font-semibold"
                          >
                            Approve {rec.type}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Approved Alternates Manager */}
      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">
            Approved BOM Component Substitutions Registry
          </CardTitle>
          <p className="text-[11px] text-navy/60 mt-0.5">
            Register a pre-vetted alternate component. Registering does not substitute components automatically — it only makes the Substitute rescue option available for Admin approval when a BOM shortage arises.
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleAddAlternate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Original Component *</label>
              <select
                required
                value={origId}
                onChange={(e) => setOrigId(e.target.value)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="">-- Select Item --</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Approved Alternate *</label>
              <select
                required
                value={altId}
                onChange={(e) => setAltId(e.target.value)}
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="">-- Select Alternate --</option>
                {inventoryItems.map((it) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-navy mb-1">Engineering Approval Notes</label>
              <input
                type="text"
                value={altNotes}
                onChange={(e) => setAltNotes(e.target.value)}
                placeholder="e.g. Pin-compatible drop-in"
                className="w-full h-8 px-2 rounded border border-bluegray/50 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={!origId || !altId || addAltMutation.isPending}
                className="w-full h-8 bg-navy hover:bg-navy-dark text-white text-xs font-semibold"
              >
                Register Alternate
              </Button>
            </div>
          </form>

          {alternates.length > 0 && (
            <div className="pt-2 border-t border-bluegray/20">
              <div className="text-[11px] font-semibold text-navy/70 uppercase mb-2">Existing Registered Alternates:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {alternates.map((alt: any) => (
                  <div key={alt.id} className="p-2 border border-bluegray/30 rounded flex justify-between items-center bg-cream/10">
                    <div>
                      <span className="font-semibold text-navy">{alt.originalName}</span>
                      <ArrowRight className="inline h-3 w-3 mx-1.5 text-navy/50" />
                      <span className="font-semibold text-emerald-800">{alt.alternateName}</span>
                      {alt.notes && <div className="text-[10px] text-navy/50 italic mt-0.5">{alt.notes}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Stock: {alt.alternateStock}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
