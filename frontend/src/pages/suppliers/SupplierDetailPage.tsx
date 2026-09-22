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

  if (isLoading) return <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-navy/60">Loading supplier profile...</div>;
  if (!supplier) return <div className="py-16 text-center text-xs font-semibold text-rose-600">Supplier not found</div>;

  const toggleStatus = () => {
    if (supplier.isActive) deactivateMutation.mutate(supplier.id);
    else activateMutation.mutate(supplier.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')} className="text-navy hover:bg-cream/40">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-navy">{supplier.name}</h1>
              {supplier.isActive ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px]">ACTIVE</Badge>
              ) : (
                <Badge variant="outline" className="bg-bluegray/10 text-navy/50 border-bluegray/40 font-mono text-[10px]">INACTIVE</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/suppliers/${supplier.id}/edit`}>
            <Button variant="outline" size="sm" className="border-bluegray/50 hover:bg-cream/40 text-navy text-xs font-semibold">
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Vendor
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className={supplier.isActive ? "text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold" : "text-emerald-800 border-emerald-300 hover:bg-emerald-50 text-xs font-semibold"}
            onClick={toggleStatus}
            disabled={activateMutation.isPending || deactivateMutation.isPending}
          >
            {supplier.isActive ? <><PowerOff className="mr-1.5 h-3.5 w-3.5" /> Deactivate Vendor</> : <><Power className="mr-1.5 h-3.5 w-3.5" /> Activate Vendor</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Contact & Address Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Contact Person</span><span className="font-semibold text-navy">{supplier.contactPerson || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Email</span><span className="font-mono text-navy">{supplier.email || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Phone</span><span className="font-mono text-navy">{supplier.phone || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-navy/60 font-medium">Address</span><span className="text-right text-navy max-w-[60%]">{supplier.address || 'N/A'}</span></div>
          </CardContent>
        </Card>

        <Card className="border border-bluegray/40 bg-white shadow-sm">
          <CardHeader className="border-b border-bluegray/20 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy/70">Operational & Commercial Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Tax Identifier</span><span className="font-mono font-bold text-navy">{supplier.taxId || 'N/A'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Vendor Lead Time</span><span className="font-mono font-bold text-navy">{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : 'N/A'}</span></div>
            <div className="flex justify-between border-b border-bluegray/10 pb-2"><span className="text-navy/60 font-medium">Linked Catalog Items</span><span className="font-mono font-bold text-navy">{supplier._count?.inventoryItems || 0}</span></div>
            <div className="flex justify-between"><span className="text-navy/60 font-medium">Historical POs</span><span className="font-mono font-bold text-navy">{supplier._count?.purchases || 0}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
