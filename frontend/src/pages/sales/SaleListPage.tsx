import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaleList } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye } from 'lucide-react';
import type { SaleStatus } from '@/types/sale';
import { formatINR } from '@/lib/utils';

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
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">PENDING DISPATCH</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">FULFILLED & DISPATCHED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Sales & Dispatch Orders</h1>
          <p className="text-xs text-navy/70 mt-0.5">
            Customer order fulfillment, stock depletion, and dispatch logistics
          </p>
        </div>
        <Button onClick={() => navigate('/sales/new')} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> New Sales Order
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bluegray-dark" />
          <Input
            placeholder="Search by sale # or customer name..."
            className="pl-9 bg-white border-bluegray/50 focus:border-navy text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-10 w-full sm:w-48 rounded-md border border-bluegray/50 bg-white px-3 py-2 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="border border-bluegray/40 rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-cream/40">
            <TableRow>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Sale #</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Customer Name</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Total Value</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Items</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Order Date</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-navy/50 text-xs font-mono uppercase">
                  Loading sales orders...
                </TableCell>
              </TableRow>
            ) : !sales || sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-navy/60 text-xs font-medium">
                  No sales orders found. Create your first sale order to dispatch finished goods.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-navy">
                    <span onClick={() => navigate(`/sales/${sale.id}`)} className="cursor-pointer hover:underline">
                      {sale.saleNumber}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-navy">{sale.customerName}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-navy">{formatINR(Number(sale.totalAmount))}</TableCell>
                  <TableCell className="text-xs text-navy/70 font-mono">{sale.items?.length || 0} line(s)</TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell className="text-xs text-navy/70 font-mono">{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className="text-navy hover:bg-cream/40 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-navy" /> Inspect
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
