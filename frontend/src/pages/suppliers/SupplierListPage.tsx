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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Supplier Directory</h1>
          <p className="text-xs text-navy/70 mt-0.5">Approved vendor network, catalog links, lead-time SLAs, and contact details</p>
        </div>
        <Link to="/suppliers/new">
          <Button className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
            <Plus className="mr-1.5 h-4 w-4" /> Add Supplier
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bluegray-dark" />
          <Input
            placeholder="Search suppliers by name or email..."
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
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Supplier Name</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Contact Info</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Lead Time</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-navy/50 text-xs font-mono uppercase">Loading supplier directory...</TableCell></TableRow>
            ) : filteredSuppliers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-navy/60 text-xs font-medium">No suppliers found.</TableCell></TableRow>
            ) : (
              filteredSuppliers?.map((supplier) => (
                <TableRow key={supplier.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                  <TableCell className="font-semibold text-xs text-navy">
                    <Link to={`/suppliers/${supplier.id}`} className="hover:underline">{supplier.name}</Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-navy">{supplier.contactPerson || 'N/A'}</div>
                    <div className="text-[10px] text-bluegray-dark font-mono">{supplier.email || supplier.phone}</div>
                  </TableCell>
                  <TableCell>
                    {supplier.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px]">ACTIVE</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-mono text-[10px]">INACTIVE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-navy">{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/suppliers/${supplier.id}`}>
                        <Button variant="ghost" size="sm" className="text-navy hover:bg-cream/40 h-8 px-2 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/suppliers/${supplier.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-navy hover:bg-cream/40 h-8 px-2 text-xs">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(supplier.id, supplier.isActive)}
                        title={supplier.isActive ? 'Deactivate' : 'Activate'}
                        className="h-8 px-2 text-xs"
                      >
                        {supplier.isActive ? <PowerOff className="h-3.5 w-3.5 text-rose-600" /> : <Power className="h-3.5 w-3.5 text-emerald-700" />}
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
