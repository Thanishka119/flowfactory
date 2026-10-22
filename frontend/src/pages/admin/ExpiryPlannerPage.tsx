import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle, RefreshCw, Ban } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export const ExpiryPlannerPage = () => {
  const queryClient = useQueryClient();
  const [thresholdDays, setThresholdDays] = useState(60);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: analysisData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'expiry-analysis', thresholdDays],
    queryFn: () => adminService.getExpiryAnalysis(thresholdDays),
  });

  const summary = analysisData?.data?.summary || {
    totalAtRiskCount: 0,
    expiredCount: 0,
    nearExpiryCount: 0,
    potentialWasteValue: 0,
  };
  const items = analysisData?.data?.items || [];

  const approveMutation = useMutation({
    mutationFn: (data: any) => adminService.approveBurnDownAction(data),
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'Action executed and logged.');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expiry-analysis'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err.message || 'Action failed');
    },
  });

  const handleAction = (itemId: string, action: 'EXPEDITE_CONSUMPTION' | 'QUARANTINE_EXPIRED', targetOrderId?: string) => {
    approveMutation.mutate({
      itemId,
      action,
      targetOrderId,
      notes: `Admin approved action: ${action}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Expiry Burn-down Planner</h1>
            <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 font-mono text-[10px] font-semibold">
              ADMIN ONLY
            </Badge>
          </div>
          <p className="text-xs text-navy/60 mt-1">
            Recommends feasible production burn-down opportunities for at-risk lots before expiry. Expired items are strictly prohibited from use.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-navy font-medium">
            <span>Horizon:</span>
            <select
              value={thresholdDays}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              className="h-8 rounded border border-bluegray/50 px-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value={30}>Next 30 Days</option>
              <option value={60}>Next 60 Days</option>
              <option value={90}>Next 90 Days</option>
            </select>
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
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">Total At-Risk Lots</div>
          <div className="text-2xl font-bold text-navy mt-1 font-mono">{summary.totalAtRiskCount}</div>
          <div className="text-[11px] text-navy/50 mt-1">Lots requiring attention</div>
        </Card>

        <Card className="border border-rose-200 bg-rose-50/30 shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Expired Stock (Blocked)</div>
          <div className="text-2xl font-bold text-rose-900 mt-1 font-mono">{summary.expiredCount}</div>
          <div className="text-[11px] text-rose-700 mt-1">Prohibited from production</div>
        </Card>

        <Card className="border border-amber-200 bg-amber-50/30 shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Near-Expiry Usable</div>
          <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">{summary.nearExpiryCount}</div>
          <div className="text-[11px] text-amber-700 mt-1">Feasible for expedited burn-down</div>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-navy/60">Potential Waste Value</div>
          <div className="text-2xl font-bold text-navy mt-1 font-mono">{formatINR(summary.potentialWasteValue)}</div>
          <div className="text-[11px] text-navy/50 mt-1">Estimated loss if unconsumed</div>
        </Card>
      </div>

      {/* Analysis Table */}
      <Card className="border border-bluegray/40 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-bluegray/20 pb-3 bg-cream/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">
            Batch Expiry Timeline & Consumption Feasibility Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/40">
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Item & SKU</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Current Stock</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Expiry Date</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Timeline Status</TableHead>
                  <TableHead className="w-[40%] text-[11px] font-semibold uppercase tracking-wider text-navy/70">Feasible Burn-Down Runs & Constraints</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Administrative Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-navy/60 text-xs">Loading batch analysis...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-navy/60 text-xs">No lots nearing expiry within selected horizon.</TableCell></TableRow>
                ) : (
                  items.map((it: any) => (
                    <TableRow key={it.id} className="border-b border-bluegray/15 hover:bg-cream/10 transition-colors">
                      <TableCell className="font-mono text-xs text-navy">
                        <div className="font-bold">{it.name}</div>
                        <div className="text-[10px] text-bluegray-dark">{it.sku} ({it.unit})</div>
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-navy">
                        {it.currentStock}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-navy">
                        {new Date(it.expiryDate).toLocaleDateString()}
                        <div className="text-[10px] text-navy/60">
                          {it.daysUntilExpiry < 0 ? `${Math.abs(it.daysUntilExpiry)} days overdue` : `${it.daysUntilExpiry} days remaining`}
                        </div>
                      </TableCell>

                      <TableCell>
                        {it.status === 'EXPIRED' ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-mono text-[10px] font-bold">
                            EXPIRED — BLOCKED
                          </Badge>
                        ) : it.status === 'CRITICAL_EXPIRY' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-bold">
                            CRITICAL (≤14 DAYS)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-navy border-blue-300 font-mono text-[10px]">
                            NEAR EXPIRY
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        {!it.isUsable ? (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 text-[11px] leading-relaxed flex items-start gap-1.5">
                            <Ban className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                            <span>{it.blockReason}</span>
                          </div>
                        ) : it.feasibleBurnDownRuns.length > 0 ? (
                          <div className="space-y-1.5">
                            {it.feasibleBurnDownRuns.map((run: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2 rounded border text-[11px] ${
                                  run.isFeasible ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="font-semibold flex justify-between">
                                  <span>{run.finishedGoodName}</span>
                                  {run.isFeasible && (
                                    <span className="font-mono font-bold text-emerald-800">
                                      Feasible: {run.maxFeasibleUnits} units
                                    </span>
                                  )}
                                </div>
                                {run.infeasibilityReason && (
                                  <div className="text-[10px] text-rose-700 font-mono mt-0.5">
                                    {run.infeasibilityReason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-navy/50 italic">No consumption recipes registered</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {it.status === 'EXPIRED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(it.id, 'QUARANTINE_EXPIRED')}
                            disabled={approveMutation.isPending}
                            className="text-[11px] h-7 border-rose-300 text-rose-800 hover:bg-rose-50"
                          >
                            Quarantine Stock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAction(it.id, 'EXPEDITE_CONSUMPTION')}
                            disabled={approveMutation.isPending}
                            className="text-[11px] h-7 bg-navy hover:bg-navy-dark text-white font-semibold"
                          >
                            Prioritize Consumption
                          </Button>
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
    </div>
  );
};
