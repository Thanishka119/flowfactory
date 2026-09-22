import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
import { useSupplierList } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';

const editSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20),
  minStock: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().min(0),
  supplierId: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
});

type EditForm = z.infer<typeof editSchema>;

export function InventoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: itemResponse, isLoading } = useInventoryItem(id!);
  const { data: suppliers = [], isLoading: isSuppliersLoading } = useSupplierList({ isActive: 'true' });
  const updateMutation = useUpdateInventoryItem();

  const item = itemResponse?.data;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description || '',
        category: item.category,
        unit: item.unit,
        minStock: parseFloat(item.minStock),
        reorderLevel: parseFloat(item.reorderLevel),
        supplierId: item.supplierId || '',
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      });
    }
  }, [item, reset]);

  async function onSubmit(data: EditForm) {
    try {
      await updateMutation.mutateAsync({
        id: id!,
        data: {
          name: data.name.trim(),
          category: data.category.trim(),
          unit: data.unit.trim(),
          minStock: Number(data.minStock),
          reorderLevel: Number(data.reorderLevel),
          description: data.description ? data.description.trim() : undefined,
          supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : null,
          expiryDate: data.expiryDate && data.expiryDate.trim() !== '' ? new Date(data.expiryDate).toISOString() : null,
        },
      });
      navigate(`/inventory/${id}`);
    } catch {
      // Error handled by mutation state
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-xs font-mono uppercase tracking-wider text-navy/60">Loading item specifications...</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-bluegray/40 rounded-lg p-6">
        <p className="text-xs font-semibold text-rose-600">Item not found</p>
        <Button variant="outline" className="border-bluegray/40 text-navy text-xs font-semibold" onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${id}`)} className="text-navy hover:bg-cream/40">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Edit Item: {item.name}</h1>
      </div>

      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Update Specifications</CardTitle>
          <p className="text-xs text-navy/60 font-medium">SKU: <span className="font-mono text-navy font-bold">{item.sku}</span> — Type: <span className="text-navy font-bold">{item.type.replace('_', ' ')}</span> (immutable)</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {updateMutation.isError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3 rounded-md">
                {updateMutation.error?.message || 'Failed to update item'}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Item Name *</Label>
              <Input id="name" {...register('name')} className="bg-white border-bluegray/50 focus:border-navy text-xs" />
              {errors.name && <p className="text-[10px] text-rose-600 font-semibold">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Description</Label>
              <Input id="description" {...register('description')} className="bg-white border-bluegray/50 focus:border-navy text-xs" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Category *</Label>
                <Input id="category" {...register('category')} className="bg-white border-bluegray/50 focus:border-navy text-xs" />
                {errors.category && <p className="text-[10px] text-rose-600 font-semibold">{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Unit *</Label>
                <Input id="unit" {...register('unit')} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono uppercase" />
                {errors.unit && <p className="text-[10px] text-rose-600 font-semibold">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minStock" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Minimum Stock Floor</Label>
                <Input id="minStock" type="number" step="any" {...register('minStock')} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorderLevel" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Reorder Threshold</Label>
                <Input id="reorderLevel" type="number" step="any" {...register('reorderLevel')} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplierId" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Primary Supplier</Label>
                <select
                  id="supplierId"
                  {...register('supplierId')}
                  className="w-full h-10 rounded-md border border-bluegray/50 bg-white px-3 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  <option value="">None (No primary supplier)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {isSuppliersLoading && (
                  <p className="text-[10px] text-navy/50 font-mono">Loading suppliers...</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...register('expiryDate')} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-bluegray/20">
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold">
                {updateMutation.isPending ? 'Updating...' : 'Commit Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/inventory/${id}`)} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
