import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { simulatorService, type ProductionSimulationResult, type SaleSimulationResult } from '@/services/simulator.service';
import { useInventoryList } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, Factory, TrendingUp, Lightbulb } from 'lucide-react';

export const SimulatorPage = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();

  // Roles with production:read permission
  const canSimulateProduction = userRole === 'ADMIN' || userRole === 'PRODUCTION_MANAGER' || userRole === 'WAREHOUSE_STAFF';

  // Roles with sales:read permission
  const canSimulateSale = userRole === 'ADMIN' || userRole === 'SALES_TEAM';

  const [activeTab, setActiveTab] = useState<'production' | 'sale' | 'intelligence'>('production');

  const { data: inventoryData } = useInventoryList({ limit: 100 });
  const allItems = inventoryData?.data || [];
  const finishedGoods = allItems.filter((i) => i.type === 'FINISHED_GOOD');
  const materials = allItems.filter((i) => i.type !== 'FINISHED_GOOD');

  // Production simulation state
  const [selectedFgId, setSelectedFgId] = useState('');
  const [plannedQty, setPlannedQty] = useState(10);
  const [reqItems, setReqItems] = useState<Array<{ itemId: string; requiredQuantity: number }>>([
    { itemId: '', requiredQuantity: 5 },
  ]);
  const [prodResult, setProdResult] = useState<ProductionSimulationResult | null>(null);
  const [prodLoading, setProdLoading] = useState(false);

  // Sale simulation state
  const [saleItems, setSaleItems] = useState<Array<{ itemId: string; quantity: number }>>([
    { itemId: '', quantity: 5 },
  ]);
  const [saleResult, setSaleResult] = useState<SaleSimulationResult | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);

  // Intelligence queries
  const { data: intelligenceData } = useQuery({
    queryKey: ['inventory', 'intelligence'],
    queryFn: async () => {
      const res = await simulatorService.getIntelligence();
      return res.data;
    },
  });

  const handleSimulateProduction = async () => {
    if (!canSimulateProduction || !selectedFgId) return;
    const validMaterials = reqItems.filter((m) => m.itemId && m.requiredQuantity > 0);
    if (validMaterials.length === 0) return;

    setProdLoading(true);
    try {
      const res = await simulatorService.simulateProduction({
        finishedGoodItemId: selectedFgId,
        plannedQuantity: plannedQty,
        requiredItems: validMaterials,
      });
      setProdResult(res.data ?? null);
    } finally {
      setProdLoading(false);
    }
  };

  const handleSimulateSale = async () => {
    if (!canSimulateSale) return;
    const validItems = saleItems.filter((i) => i.itemId && i.quantity > 0);
    if (validItems.length === 0) return;

    setSaleLoading(true);
    try {
      const res = await simulatorService.simulateSale({ items: validItems });
      setSaleResult(res.data ?? null);
    } finally {
      setSaleLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-bluegray/30 pb-4">
        <div className="h-10 w-10 rounded-lg bg-navy text-white flex items-center justify-center shadow-sm">
          <Sparkles className="h-5 w-5 text-beige" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">What-If Simulator & Intelligence</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
              Predictive Operations
            </span>
          </div>
          <p className="text-xs text-navy/60 font-medium mt-0.5">
            Model production runs, simulate demand dispatches, and review predictive stock recommendations without committing ledger changes.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-bluegray/30 pb-px">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('production')}
          className={`rounded-b-none border-b-2 text-xs font-semibold px-4 py-2 transition-all ${
            activeTab === 'production'
              ? 'border-navy text-navy bg-white shadow-sm'
              : 'border-transparent text-navy/60 hover:text-navy hover:bg-cream/40'
          }`}
        >
          <Factory className="mr-2 h-4 w-4" /> Production Run Simulator
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('sale')}
          className={`rounded-b-none border-b-2 text-xs font-semibold px-4 py-2 transition-all ${
            activeTab === 'sale'
              ? 'border-navy text-navy bg-white shadow-sm'
              : 'border-transparent text-navy/60 hover:text-navy hover:bg-cream/40'
          }`}
        >
          <TrendingUp className="mr-2 h-4 w-4" /> Demand & Sales Simulator
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('intelligence')}
          className={`rounded-b-none border-b-2 text-xs font-semibold px-4 py-2 transition-all ${
            activeTab === 'intelligence'
              ? 'border-navy text-navy bg-white shadow-sm'
              : 'border-transparent text-navy/60 hover:text-navy hover:bg-cream/40'
          }`}
        >
          <Lightbulb className="mr-2 h-4 w-4" /> Operational Intelligence
        </Button>
      </div>

      {activeTab === 'production' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy">Scenario Parameters</CardTitle>
              <CardDescription className="text-xs text-navy/60">Target output quantity and BOM component demands</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5 uppercase tracking-wider">Target Finished Good</label>
                <select
                  value={selectedFgId}
                  onChange={(e) => setSelectedFgId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs text-navy font-semibold focus:border-navy focus:outline-none"
                >
                  <option value="">Select Finished Product...</option>
                  {finishedGoods.map((fg) => (
                    <option key={fg.id} value={fg.id}>
                      {fg.name} ({fg.sku}) — In Stock: {Number(fg.currentStock)} {fg.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy block mb-1.5 uppercase tracking-wider">Planned Output Units</label>
                <Input
                  type="number"
                  min="1"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(Number(e.target.value))}
                  className="h-9 text-xs border-bluegray/50 bg-white text-navy font-mono"
                />
              </div>

              <div className="pt-2 border-t border-bluegray/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wider">Required Materials</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReqItems([...reqItems, { itemId: '', requiredQuantity: 1 }])}
                    className="h-7 text-xs border-bluegray/40 text-navy hover:bg-cream/40"
                  >
                    + Add Material
                  </Button>
                </div>
                {reqItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      value={item.itemId}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].itemId = e.target.value;
                        setReqItems(copy);
                      }}
                      className="flex h-8 flex-1 rounded border border-bluegray/50 bg-white px-2 text-xs text-navy font-medium focus:border-navy"
                    >
                      <option value="">Select Material...</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.sku})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      value={item.requiredQuantity}
                      onChange={(e) => {
                        const copy = [...reqItems];
                        copy[idx].requiredQuantity = Number(e.target.value);
                        setReqItems(copy);
                      }}
                      className="h-8 w-20 text-xs border-bluegray/50 font-mono"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold text-xs shadow-sm mt-4"
                onClick={handleSimulateProduction}
                disabled={prodLoading || !selectedFgId || !canSimulateProduction}
              >
                {prodLoading
                  ? 'Calculating Scenario...'
                  : !canSimulateProduction
                  ? 'Production Simulation Unauthorized'
                  : 'Run Production Simulation'}
              </Button>
              {!canSimulateProduction && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mt-2">
                  Requires Production Manager or Warehouse Staff role (production:read permission).
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy">Simulation Forecast Outcome</CardTitle>
              <CardDescription className="text-xs text-navy/60">Projected inventory balances, material shortages, and procurement alerts</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!prodResult ? (
                <div className="py-16 text-center text-navy/50 text-xs font-semibold">
                  Configure simulation parameters on the left and click 'Run Production Simulation'.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-cream/40 border border-bluegray/30">
                    <div>
                      <div className="text-[10px] text-navy/70 uppercase font-bold tracking-wider">Target Finished Good</div>
                      <div className="text-sm font-bold text-navy mt-1">{prodResult.finishedGood.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-navy/70 uppercase font-bold tracking-wider">Current Stock</div>
                      <div className="text-base font-bold font-mono text-navy mt-1">{prodResult.finishedGood.currentStock} {prodResult.finishedGood.unit}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-navy/70 uppercase font-bold tracking-wider">Projected Output Stock</div>
                      <div className="text-base font-bold font-mono text-emerald-700 mt-1">
                        {prodResult.finishedGood.projectedStock} {prodResult.finishedGood.unit}
                      </div>
                    </div>
                  </div>

                  {prodResult.hasShortage && (
                    <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span>Warning: One or more required components will experience shortages. Immediate PO creation advised.</span>
                    </div>
                  )}

                  <div className="border border-bluegray/30 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-cream/50">
                        <TableRow className="border-b border-bluegray/30">
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Material</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Current Stock</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Required</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Projected Balance</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Shortage Status</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Lead Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodResult.materials.map((m) => (
                          <TableRow key={m.itemId} className="border-b border-bluegray/20 hover:bg-cream/20">
                            <TableCell className="font-semibold text-xs text-navy py-2.5">{m.name} ({m.sku})</TableCell>
                            <TableCell className="font-mono text-xs text-navy py-2.5">{m.currentStock} {m.unit}</TableCell>
                            <TableCell className="font-mono text-xs text-navy py-2.5">{m.requiredQuantity} {m.unit}</TableCell>
                            <TableCell className={`font-mono text-xs font-bold py-2.5 ${m.isShortage ? 'text-rose-600' : 'text-navy'}`}>
                              {m.projectedBalance} {m.unit}
                            </TableCell>
                            <TableCell className="py-2.5">
                              {m.isShortage ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-[10px]">
                                  Short {m.shortageQuantity} {m.unit}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                                  Sufficient
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-navy/80 py-2.5">
                              {m.supplier ? `${m.supplier.leadTimeDays}d (${m.supplier.name})` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy">Demand Scenario</CardTitle>
              <CardDescription className="text-xs text-navy/60">Simulate customer orders and test stock fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wider">Dispatched Items</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSaleItems([...saleItems, { itemId: '', quantity: 1 }])}
                    className="h-7 text-xs border-bluegray/40 text-navy hover:bg-cream/40"
                  >
                    + Add Item
                  </Button>
                </div>
                {saleItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      value={item.itemId}
                      onChange={(e) => {
                        const copy = [...saleItems];
                        copy[idx].itemId = e.target.value;
                        setSaleItems(copy);
                      }}
                      className="flex h-8 flex-1 rounded border border-bluegray/50 bg-white px-2 text-xs text-navy font-medium focus:border-navy"
                    >
                      <option value="">Select Item...</option>
                      {allItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...saleItems];
                        copy[idx].quantity = Number(e.target.value);
                        setSaleItems(copy);
                      }}
                      className="h-8 w-20 text-xs border-bluegray/50 font-mono"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-navy hover:bg-navy-dark text-white font-semibold text-xs shadow-sm mt-4"
                onClick={handleSimulateSale}
                disabled={saleLoading || !canSimulateSale}
              >
                {saleLoading
                  ? 'Simulating Demand...'
                  : !canSimulateSale
                  ? 'Demand Simulation Unauthorized'
                  : 'Run Demand Simulation'}
              </Button>
              {!canSimulateSale && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mt-2">
                  Requires Sales Team role (sales:read permission).
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="border-b border-bluegray/20 pb-3">
              <CardTitle className="text-sm font-bold text-navy">Projected Demand Fulfillment</CardTitle>
              <CardDescription className="text-xs text-navy/60">Calculated inventory deltas and stockouts</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!saleResult ? (
                <div className="py-16 text-center text-navy/50 text-xs font-semibold">
                  Add items on the left to project dispatch availability.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-bluegray/30 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-cream/50">
                        <TableRow className="border-b border-bluegray/30">
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Item</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Current Stock</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Requested Demand</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Projected Balance</TableHead>
                          <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Fulfillable Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleResult.items.map((it) => (
                          <TableRow key={it.itemId} className="border-b border-bluegray/20 hover:bg-cream/20">
                            <TableCell className="font-semibold text-xs text-navy py-2.5">{it.name} ({it.sku})</TableCell>
                            <TableCell className="font-mono text-xs text-navy py-2.5">{it.currentStock} {it.unit}</TableCell>
                            <TableCell className="font-mono text-xs text-navy py-2.5">{it.requestedQuantity} {it.unit}</TableCell>
                            <TableCell className={`font-mono text-xs font-bold py-2.5 ${it.isShortage ? 'text-rose-600' : 'text-navy'}`}>
                              {it.projectedBalance} {it.unit}
                            </TableCell>
                            <TableCell className="py-2.5">
                              {it.isShortage ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 text-[10px]">
                                  Shortage ({it.shortageQuantity} {it.unit})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                                  Fulfillable
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-bluegray/40 shadow-sm bg-white">
              <CardHeader className="border-b border-bluegray/20 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Low Stock & Shortage Alerts
                </CardTitle>
                <CardDescription className="text-xs text-navy/60">Inventory items critically below safety thresholds</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!intelligenceData?.lowStockAlerts || intelligenceData.lowStockAlerts.length === 0 ? (
                  <div className="text-xs text-navy/60 py-8 text-center font-medium">All items are currently at healthy buffer levels.</div>
                ) : (
                  <div className="space-y-2">
                    {intelligenceData.lowStockAlerts.map((a) => (
                      <div key={a.id} className="p-3 border border-bluegray/30 rounded-lg flex justify-between items-center bg-cream/20">
                        <div>
                          <div className="font-semibold text-xs text-navy">{a.name} ({a.sku})</div>
                          <div className="text-[11px] font-mono text-navy/70 mt-0.5">
                            Current: <span className="font-bold text-rose-600">{a.currentStock} {a.unit}</span> | Reorder Level: {a.reorderLevel} {a.unit}
                          </div>
                        </div>
                        <Badge className={a.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px]' : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'}>
                          {a.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-bluegray/40 shadow-sm bg-white">
              <CardHeader className="border-b border-bluegray/20 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-navy">
                  <Lightbulb className="h-4 w-4 text-amber-600" /> Recommended Purchase Reorders
                </CardTitle>
                <CardDescription className="text-xs text-navy/60">Algorithmic replenishment recommendations based on lead times</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {!intelligenceData?.recommendations || intelligenceData.recommendations.length === 0 ? (
                  <div className="text-xs text-navy/60 py-8 text-center font-medium">No procurement replenishment recommended at this time.</div>
                ) : (
                  <div className="space-y-2">
                    {intelligenceData.recommendations.map((r, i) => (
                      <div key={i} className="p-3 border border-bluegray/30 rounded-lg bg-cream/20 space-y-1">
                        <div className="flex justify-between font-semibold text-xs text-navy">
                          <span>{r.name}</span>
                          <span className="text-navy font-bold font-mono">Order ~{r.recommendedOrderQuantity} {r.unit}</span>
                        </div>
                        <div className="text-[11px] text-navy/70">{r.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
