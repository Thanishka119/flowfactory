import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaleList } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye } from 'lucide-react';
import type { SaleStatus } from '@/types/sale';

export const SaleListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');

  const { data: sales, isLoading } = useSaleList({
    search: search || undefined,
    status: status || undefined,
  });

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-500">PENDING</Badge>;
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
          <h1 className="text-2xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage customer sales orders and finished goods dispatch.
          </p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Sale Order
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by sale # or customer name..."
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
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Items Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Loading sales orders...
                </TableCell>
              </TableRow>
            ) : !sales || sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No sales orders found. Create your first sale order to dispatch finished goods.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-semibold">{sale.saleNumber}</TableCell>
                  <TableCell className="font-medium">{sale.customerName}</TableCell>
                  <TableCell>${Number(sale.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>{sale.items?.length || 0} line(s)</TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sales/${sale.id}`)}
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
