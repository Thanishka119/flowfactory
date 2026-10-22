import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseList } from '@/hooks/usePurchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatINR } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PurchaseListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: purchases, isLoading } = usePurchaseList();

  const filteredPurchases = purchases?.filter(p =>
    p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">PENDING</Badge>;
      case 'RECEIVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">RECEIVED</Badge>;
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
          <h1 className="text-2xl font-bold tracking-tight text-navy">Purchase Orders</h1>
          <p className="text-xs text-navy/70 mt-0.5">Manage raw material procurement, vendor POs, and inbound deliveries</p>
        </div>
        <Link to="/purchases/new">
          <Button className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
            <Plus className="mr-1.5 h-4 w-4" /> Add Purchase Order
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bluegray-dark" />
          <Input
            placeholder="Search PO number or vendor..."
            className="pl-9 bg-white border-bluegray/50 focus:border-navy text-xs"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-bluegray/40 rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-cream/40">
            <TableRow>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">PO Number</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Supplier / Vendor</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Total Value</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">PO Date</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-navy/50 text-xs font-mono uppercase">Loading purchase orders...</TableCell></TableRow>
            ) : filteredPurchases?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-navy/60 text-xs font-medium">No purchase orders found.</TableCell></TableRow>
            ) : (
              filteredPurchases?.map((purchase) => (
                <TableRow key={purchase.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-navy">
                    <Link to={`/purchases/${purchase.id}`} className="hover:underline">
                      {purchase.purchaseNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-xs text-navy">{purchase.supplier.name}</TableCell>
                  <TableCell>
                    {getStatusBadge(purchase.status)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-navy">{formatINR(parseFloat(purchase.totalAmount))}</TableCell>
                  <TableCell className="text-xs text-navy/70 font-mono">{new Date(purchase.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/purchases/${purchase.id}`}>
                      <Button variant="ghost" size="sm" className="text-navy hover:bg-cream/40 text-xs font-semibold">
                        <Eye className="h-3.5 w-3.5 mr-1 text-navy" /> Inspect
                      </Button>
                    </Link>
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
