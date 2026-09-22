import { useQuery } from '@tanstack/react-query';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  Factory,
  AlertTriangle,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardService } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'User';

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await dashboardService.getSummary();
      return res.data;
    },
  });

  const metrics = dashboardData?.metrics;

  const kpis = [
    {
      title: 'Total Items',
      value: metrics ? metrics.totalItems : '—',
      description: `${metrics ? metrics.rawMaterialsCount : 0} raw, ${metrics ? metrics.finishedGoodsCount : 0} finished`,
      icon: Package,
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Low Stock Alerts',
      value: metrics ? metrics.lowStockCount : '—',
      description: `${metrics ? metrics.outOfStockCount : 0} items out of stock`,
      icon: AlertTriangle,
      onClick: () => navigate('/simulator'),
    },
    {
      title: 'Active Production',
      value: metrics ? metrics.activeProductionCount : '—',
      description: 'Orders currently running',
      icon: Factory,
      onClick: () => navigate('/production'),
    },
    {
      title: 'Pending Purchases',
      value: metrics ? metrics.pendingPurchasesCount : '—',
      description: 'Awaiting goods receipt',
      icon: ShoppingCart,
      onClick: () => navigate('/purchases'),
    },
    {
      title: 'Pending Invoices',
      value: metrics ? metrics.pendingInvoicesCount : '—',
      description: 'Require verification',
      icon: FileText,
      onClick: () => navigate('/invoices'),
    },
    {
      title: 'Completed Sales',
      value: metrics ? metrics.completedSalesCount : '—',
      description: 'Customer orders fulfilled',
      icon: TrendingUp,
      onClick: () => navigate('/sales'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-bluegray-dark font-semibold">Live System Status: Nominal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            Welcome back, {displayName.split(' ')[0]}
          </h1>
          <p className="text-xs text-navy/70 mt-0.5">
            Real-time operations command across procurement, inventory ledger, production lines, and dispatch.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 font-mono text-xs bg-cream/40 border-bluegray text-navy">
            Role: {user?.role ?? 'User'}
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              onClick={kpi.onClick}
              className="border border-bluegray/40 bg-white hover:border-navy/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-navy/70 group-hover:text-navy transition-colors">
                  {kpi.title}
                </CardTitle>
                <div className="p-2 rounded-md bg-cream/80 text-navy group-hover:bg-navy group-hover:text-cream transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-navy">
                  {isLoading ? '...' : kpi.value}
                </div>
                <p className="text-[11px] text-navy/60 mt-1 font-medium">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Operational Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items Table */}
        <Card className="border-bluegray/40 bg-white">
          <CardHeader className="border-b border-bluegray/20 pb-4">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-100 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
              Low & Out-of-Stock Items
            </CardTitle>
            <CardDescription className="text-xs text-navy/60">Inventory items at or below reorder threshold</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="border border-bluegray/30 rounded-md overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-cream/40">
                  <TableRow>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Item</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Current</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Reorder</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!dashboardData?.lowStockItems || dashboardData.lowStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-navy/50 text-xs font-medium">
                        All inventory stocks are healthy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboardData.lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id} className="hover:bg-cream/20">
                        <TableCell>
                          <div className="font-semibold text-xs text-navy">{item.name}</div>
                          <div className="text-[10px] text-bluegray-dark font-mono">{item.sku}</div>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-navy">
                          {Number(item.currentStock)} {item.unit}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-navy/60">
                          {Number(item.reorderLevel)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={item.isOut ? 'bg-rose-600 hover:bg-rose-700 text-[10px] font-mono font-semibold' : 'bg-amber-500 hover:bg-amber-600 text-[10px] font-mono font-semibold'}>
                            {item.isOut ? 'OUT' : 'LOW'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Ledger Transactions */}
        <Card className="border-bluegray/40 bg-white">
          <CardHeader className="border-b border-bluegray/20 pb-4">
            <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-100 text-navy">
                <Clock className="h-4 w-4" />
              </div>
              Recent Inventory Ledger Movements
            </CardTitle>
            <CardDescription className="text-xs text-navy/60">Real-time audit trail of stock adjustments</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="border border-bluegray/30 rounded-md overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-cream/40">
                  <TableRow>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Type</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Item</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Delta</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70 text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!dashboardData?.recentTransactions || dashboardData.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-navy/50 text-xs font-medium">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboardData.recentTransactions.slice(0, 5).map((tx) => {
                      const delta = Number(tx.quantity);
                      return (
                        <TableRow key={tx.id} className="hover:bg-cream/20">
                          <TableCell className="text-xs font-mono font-semibold text-navy">{tx.type}</TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-navy">{tx.item?.name}</div>
                            <div className="text-[10px] text-bluegray-dark font-mono">{tx.item?.sku}</div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold font-mono">
                            <span className={delta < 0 ? 'text-rose-600 flex items-center' : 'text-emerald-700 flex items-center'}>
                              {delta < 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                              {Math.abs(delta)} {tx.item?.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold text-navy">
                            {Number(tx.balanceAfter)} {tx.item?.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
