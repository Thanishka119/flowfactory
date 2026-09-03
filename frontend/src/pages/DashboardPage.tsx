import {
  Package,
  TrendingUp,
  ShoppingCart,
  Factory,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Placeholder KPI cards — real data comes in M18
const KPI_STUBS = [
  {
    title: 'Total Items',
    value: '—',
    description: 'Inventory items tracked',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    title: 'Low Stock',
    value: '—',
    description: 'Items below reorder level',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    title: 'Purchases',
    value: '—',
    description: 'This month',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    title: 'Production Orders',
    value: '—',
    description: 'Active orders',
    icon: Factory,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    title: 'Sales',
    value: '—',
    description: 'This month',
    icon: TrendingUp,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
  },
  {
    title: 'Reports',
    value: '—',
    description: 'Available reports',
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'User';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's what's happening with your inventory today.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto gap-1.5 py-1 px-3 font-mono text-xs">
          {user?.role ?? 'User'}
        </Badge>
      </div>

      {/* KPI grid — stubs until M18 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_STUBS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {kpi.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {kpi.value}
                </div>
                <CardDescription className="text-xs mt-1">
                  {kpi.description}
                </CardDescription>
                <p className="text-[11px] text-slate-400 mt-2 italic">
                  Available from M18 — Dashboard &amp; Alerts
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Milestone notice */}
      <Card className="border-slate-200 dark:border-slate-800 bg-primary/5 border-primary/20 shadow-none">
        <CardContent className="flex items-start gap-3 pt-5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Factory className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              M5 — Frontend Foundation complete
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Authentication, protected routing, and the application shell are ready.
              The next step is M6 — Frontend/Backend Integration, which will wire
              real API data into the UI modules.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
