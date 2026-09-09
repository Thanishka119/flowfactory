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
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Low Stock Alerts',
      value: metrics ? metrics.lowStockCount : '—',
      description: `${metrics ? metrics.outOfStockCount : 0} items out of stock`,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      onClick: () => navigate('/simulator'),
    },
    {
      title: 'Active Production',
      value: metrics ? metrics.activeProductionCount : '—',
      description: 'Orders currently running',
      icon: Factory,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      onClick: () => navigate('/production'),
    },
    {
      title: 'Pending Purchases',
      value: metrics ? metrics.pendingPurchasesCount : '—',
      description: 'Awaiting goods receipt',
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      onClick: () => navigate('/purchases'),
    },
    {
      title: 'Pending Invoices',
      value: metrics ? metrics.pendingInvoicesCount : '—',
      description: 'Require verification',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      onClick: () => navigate('/invoices'),
    },
    {
      title: 'Completed Sales',
      value: metrics ? metrics.completedSalesCount : '—',
      description: 'Customer orders fulfilled',
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      onClick: () => navigate('/sales'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational overview across procurement, production, inventory ledger, and sales.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto gap-1.5 py-1 px-3 font-mono text-xs">
          {user?.role ?? 'User'}
        </Badge>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              onClick={kpi.onClick}
              className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? '...' : kpi.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Operational Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Low & Out-of-Stock Items
            </CardTitle>
            <CardDescription>Items at or below configured reorder levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Reorder</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!dashboardData?.lowStockItems || dashboardData.lowStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-slate-500 text-xs">
                        All inventory stocks are healthy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboardData.lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-xs">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {Number(item.currentStock)} {item.unit}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {Number(item.reorderLevel)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={item.isOut ? 'bg-rose-600 text-[10px]' : 'bg-amber-500 text-[10px]'}>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Recent Inventory Ledger Movements
            </CardTitle>
            <CardDescription>Real-time audit trail of stock adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!dashboardData?.recentTransactions || dashboardData.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-slate-500 text-xs">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboardData.recentTransactions.slice(0, 5).map((tx) => {
                      const delta = Number(tx.quantity);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-semibold">{tx.type}</TableCell>
                          <TableCell>
                            <div className="text-xs font-medium">{tx.item?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{tx.item?.sku}</div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            <span className={delta < 0 ? 'text-rose-600 flex items-center' : 'text-emerald-600 flex items-center'}>
                              {delta < 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                              {Math.abs(delta)} {tx.item?.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
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
