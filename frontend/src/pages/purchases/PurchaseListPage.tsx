import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseList } from '@/hooks/usePurchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-amber-500 hover:bg-amber-600';
      case 'RECEIVED': return 'bg-green-500 hover:bg-green-600';
      case 'CANCELLED': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Link to="/purchases/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Add PO</Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search POs..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : filteredPurchases?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center">No purchases found.</TableCell></TableRow>
            ) : (
              filteredPurchases?.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                  <TableCell>{purchase.supplier.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(purchase.status)}>
                      {purchase.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${parseFloat(purchase.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(purchase.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/purchases/${purchase.id}`}>
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
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
