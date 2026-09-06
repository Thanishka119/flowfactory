import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
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
  supplierId: z.string().uuid().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
});

type EditForm = z.infer<typeof editSchema>;

export function InventoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: itemResponse, isLoading } = useInventoryItem(id!);
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
          ...data,
          description: data.description || undefined,
          supplierId: data.supplierId || null,
          expiryDate: data.expiryDate || null,
        },
      });
      navigate(`/inventory/${id}`);
    } catch {
      // Error handled by mutation state
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-slate-500">Loading...</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-sm text-red-500">Item not found</p>
        <Button variant="outline" onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit: {item.name}</h1>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Update Item Details</CardTitle>
          <p className="text-sm text-slate-500">SKU: <span className="font-mono">{item.sku}</span> — Type: {item.type.replace('_', ' ')} (immutable)</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {updateMutation.isError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-md">
                {updateMutation.error?.message || 'Failed to update item'}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Input id="category" {...register('category')} />
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" {...register('unit')} />
                {errors.unit && <p className="text-xs text-red-500">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input id="minStock" type="number" step="any" {...register('minStock')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input id="reorderLevel" type="number" step="any" {...register('reorderLevel')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplierId">Supplier ID</Label>
                <Input id="supplierId" {...register('supplierId')} placeholder="UUID (optional)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...register('expiryDate')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/inventory/${id}`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
