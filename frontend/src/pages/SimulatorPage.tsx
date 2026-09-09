import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { simulatorService, type ProductionSimulationResult, type SaleSimulationResult } from '@/services/simulator.service';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, Factory, TrendingUp, Lightbulb } from 'lucide-react';

export const SimulatorPage = () => {
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
    if (!selectedFgId) return;
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What-If Simulator & Operational Intelligence</h1>
          <p className="text-sm text-slate-500">
            Model production runs, demand dispatch scenarios, and review predictive stock recommendations safely without altering database inventory.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'production' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('production')}
          className="rounded-b-none"
        >
          <Factory className="mr-2 h-4 w-4" /> Production Run Simulator
        </Button>
        <Button
          variant={activeTab === 'sale' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('sale')}
          className="rounded-b-none"
        >
          <TrendingUp className="mr-2 h-4 w-4" /> Demand & Sales Simulator
        </Button>
        <Button
          variant={activeTab === 'intelligence' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('intelligence')}
          className="rounded-b-none"
        >
          <Lightbulb className="mr-2 h-4 w-4" /> Operational Intelligence
        </Button>
      </div>

      {activeTab === 'production' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Scenario Inputs</CardTitle>
              <CardDescription>Target product output and material assumptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Target Finished Good</label>
                <select
                  value={selectedFgId}
                  onChange={(e) => setSelectedFgId(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select Finished Product</option>
                  {finishedGoods.map((fg) => (
                    <option key={fg.id} value={fg.id}>
                      {fg.name} ({fg.sku}) — Stock: {Number(fg.currentStock)} {fg.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Planned Production Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600">Required Materials</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReqItems([...reqItems, { itemId: '', requiredQuantity: 1 }])}
                  >
                    + Add
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
                      className="flex h-9 flex-1 rounded border px-2 text-xs"
                    >
                      <option value="">Select Material</option>
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
                      className="h-9 w-20 text-xs"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
                onClick={handleSimulateProduction}
                disabled={prodLoading || !selectedFgId}
              >
                {prodLoading ? 'Calculating...' : 'Run Production Simulation'}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Simulation Outcome</CardTitle>
              <CardDescription>Projected stock balances, shortages, and lead-time alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {!prodResult ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Configure the scenario on the left and click 'Run Production Simulation'.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Target Product</div>
                      <div className="font-semibold text-slate-900 mt-1">{prodResult.finishedGood.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Current Stock</div>
                      <div className="text-lg font-bold mt-1">{prodResult.finishedGood.currentStock} {prodResult.finishedGood.unit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Projected Output Stock</div>
                      <div className="text-lg font-bold text-emerald-600 mt-1">
                        {prodResult.finishedGood.projectedStock} {prodResult.finishedGood.unit}
                      </div>
                    </div>
                  </div>

                  {prodResult.hasShortage && (
                    <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Warning: One or more required materials will result in a shortage! Purchase orders required.</span>
                    </div>
                  )}

                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead>Projected Balance</TableHead>
                          <TableHead>Shortage / Order Req</TableHead>
                          <TableHead>Supplier Lead Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodResult.materials.map((m) => (
                          <TableRow key={m.itemId}>
                            <TableCell className="font-medium">{m.name} ({m.sku})</TableCell>
                            <TableCell>{m.currentStock} {m.unit}</TableCell>
                            <TableCell>{m.requiredQuantity} {m.unit}</TableCell>
                            <TableCell className={m.isShortage ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                              {m.projectedBalance} {m.unit}
                            </TableCell>
                            <TableCell>
                              {m.isShortage ? (
                                <Badge className="bg-rose-600">Short {m.shortageQuantity} {m.unit}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-600">Sufficient</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {m.supplier ? `${m.supplier.leadTimeDays} days (${m.supplier.name})` : 'No supplier'}
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
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Demand Scenario</CardTitle>
              <CardDescription>Test bulk or custom customer demand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600">Dispatched Items</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSaleItems([...saleItems, { itemId: '', quantity: 1 }])}
                  >
                    + Add
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
                      className="flex h-9 flex-1 rounded border px-2 text-xs"
                    >
                      <option value="">Select Item</option>
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
                      className="h-9 w-20 text-xs"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
                onClick={handleSimulateSale}
                disabled={saleLoading}
              >
                {saleLoading ? 'Calculating...' : 'Run Demand Simulation'}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Projected Inventory Impact</CardTitle>
            </CardHeader>
            <CardContent>
              {!saleResult ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Add items on the left to project dispatch impact.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Requested Demand</TableHead>
                          <TableHead>Projected Balance</TableHead>
                          <TableHead>Fulfillable Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleResult.items.map((it) => (
                          <TableRow key={it.itemId}>
                            <TableCell className="font-medium">{it.name} ({it.sku})</TableCell>
                            <TableCell>{it.currentStock} {it.unit}</TableCell>
                            <TableCell>{it.requestedQuantity} {it.unit}</TableCell>
                            <TableCell className={it.isShortage ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                              {it.projectedBalance} {it.unit}
                            </TableCell>
                            <TableCell>
                              {it.isShortage ? (
                                <Badge className="bg-rose-600">Shortage ({it.shortageQuantity} {it.unit})</Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-600">Fulfillable</Badge>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> Low Stock & Shortage Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!intelligenceData?.lowStockAlerts || intelligenceData.lowStockAlerts.length === 0 ? (
                  <div className="text-sm text-slate-500">No items currently below reorder levels.</div>
                ) : (
                  <div className="space-y-2">
                    {intelligenceData.lowStockAlerts.map((a) => (
                      <div key={a.id} className="p-3 border rounded-lg flex justify-between items-center text-sm">
                        <div>
                          <div className="font-medium">{a.name} ({a.sku})</div>
                          <div className="text-xs text-slate-500">
                            Current: {a.currentStock} {a.unit} | Reorder Level: {a.reorderLevel} {a.unit}
                          </div>
                        </div>
                        <Badge className={a.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-500'}>
                          {a.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-indigo-600">
                  <Lightbulb className="h-4 w-4" /> Recommended Purchase Reorders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!intelligenceData?.recommendations || intelligenceData.recommendations.length === 0 ? (
                  <div className="text-sm text-slate-500">No purchase recommendations at this time.</div>
                ) : (
                  <div className="space-y-2">
                    {intelligenceData.recommendations.map((r, i) => (
                      <div key={i} className="p-3 border rounded-lg text-sm space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{r.name}</span>
                          <span className="text-indigo-600 font-semibold">Order ~{r.recommendedOrderQuantity} {r.unit}</span>
                        </div>
                        <div className="text-xs text-slate-500">{r.reason}</div>
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
