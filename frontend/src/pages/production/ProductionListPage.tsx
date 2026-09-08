import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductionList } from '@/hooks/useProduction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye } from 'lucide-react';
import type { ProductionStatus } from '@/types/production';

export const ProductionListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');

  const { data: orders, isLoading } = useProductionList({
    search: search || undefined,
    status: status || undefined,
  });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage manufacturing workflows, material consumption, and finished goods yield.
          </p>
        </div>
        <Button onClick={() => navigate('/production/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Production Order
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by order # or finished good..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-10 w-full sm:w-48 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Finished Good</TableHead>
              <TableHead>Planned Qty</TableHead>
              <TableHead>Actual Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Loading production orders...
                </TableCell>
              </TableRow>
            ) : !orders || orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No production orders found. Create your first production order to get started.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.finishedGoodItem?.name}</div>
                      <div className="text-xs text-slate-500">{order.finishedGoodItem?.sku}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {Number(order.plannedQuantity)} {order.finishedGoodItem?.unit}
                  </TableCell>
                  <TableCell>
                    {Number(order.actualQuantity)} {order.finishedGoodItem?.unit}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/production/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
