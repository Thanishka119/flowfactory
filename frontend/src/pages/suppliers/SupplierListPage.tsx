import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupplierList, useActivateSupplier, useDeactivateSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Edit, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const SupplierListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: suppliers, isLoading } = useSupplierList();
  const activateMutation = useActivateSupplier();
  const deactivateMutation = useDeactivateSupplier();

  const filteredSuppliers = suppliers?.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleStatus = (id: string, isActive: boolean) => {
    if (isActive) deactivateMutation.mutate(id);
    else activateMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Link to="/suppliers/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
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
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lead Time (Days)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : filteredSuppliers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No suppliers found.</TableCell></TableRow>
            ) : (
              filteredSuppliers?.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{supplier.contactPerson || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{supplier.email || supplier.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                      {supplier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{supplier.leadTimeDays || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/suppliers/${supplier.id}`}>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link to={`/suppliers/${supplier.id}/edit`}>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(supplier.id, supplier.isActive)}
                        title={supplier.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {supplier.isActive ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-green-500" />}
                      </Button>
                    </div>
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
