import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupplier, useDeactivateSupplier, useActivateSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, ArrowLeft, PowerOff, Power } from 'lucide-react';

export const SupplierDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const activateMutation = useActivateSupplier();
  const deactivateMutation = useDeactivateSupplier();

  if (isLoading) return <div>Loading...</div>;
  if (!supplier) return <div>Supplier not found</div>;

  const toggleStatus = () => {
    if (supplier.isActive) deactivateMutation.mutate(supplier.id);
    else activateMutation.mutate(supplier.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
            {supplier.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link to={`/suppliers/${supplier.id}/edit`}>
            <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
          </Link>
          <Button
            variant={supplier.isActive ? 'destructive' : 'default'}
            onClick={toggleStatus}
            disabled={activateMutation.isPending || deactivateMutation.isPending}
          >
            {supplier.isActive ? <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</> : <><Power className="mr-2 h-4 w-4" /> Activate</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Contact Person:</span> {supplier.contactPerson || 'N/A'}</div>
            <div><span className="font-semibold">Email:</span> {supplier.email || 'N/A'}</div>
            <div><span className="font-semibold">Phone:</span> {supplier.phone || 'N/A'}</div>
            <div><span className="font-semibold">Address:</span> {supplier.address || 'N/A'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Tax ID:</span> {supplier.taxId || 'N/A'}</div>
            <div><span className="font-semibold">Lead Time:</span> {supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : 'N/A'}</div>
            <div><span className="font-semibold">Inventory Items:</span> {supplier._count?.inventoryItems || 0}</div>
            <div><span className="font-semibold">Purchases:</span> {supplier._count?.purchases || 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
