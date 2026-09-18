import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useCreateInventoryItem } from '@/hooks/useInventory';
import { useSupplierList } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const createSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required').max(100),
  type: z.enum(['RAW_MATERIAL', 'COMPONENT', 'FINISHED_GOOD', 'OTHER']),
  unit: z.string().min(1, 'Unit is required').max(20),
  minStock: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  supplierId: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
});

type CreateForm = z.infer<typeof createSchema>;

export function InventoryCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateInventoryItem();
  const { data: suppliers = [], isLoading: isSuppliersLoading } = useSupplierList({ isActive: 'true' });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      type: 'RAW_MATERIAL',
      minStock: 0,
      reorderLevel: 0,
    },
  });

  async function onSubmit(data: CreateForm) {
    try {
      await createMutation.mutateAsync({
        sku: data.sku.trim(),
        name: data.name.trim(),
        category: data.category.trim(),
        type: data.type,
        unit: data.unit.trim(),
        minStock: Number(data.minStock) || 0,
        reorderLevel: Number(data.reorderLevel) || 0,
        description: data.description ? data.description.trim() : undefined,
        supplierId: data.supplierId && data.supplierId.trim() !== '' ? data.supplierId : undefined,
        expiryDate: data.expiryDate && data.expiryDate.trim() !== '' ? new Date(data.expiryDate).toISOString() : undefined,
      });
      navigate('/inventory');
    } catch {
      // Error is handled by mutation state
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Inventory Item</h1>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {createMutation.isError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-md">
                {createMutation.error?.message || 'Failed to create item'}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" {...register('sku')} placeholder="e.g. RM-STEEL-001" />
                {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name')} placeholder="Item name" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} placeholder="Optional description" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Input id="category" {...register('category')} placeholder="e.g. Raw Materials" />
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="COMPONENT">Component</option>
                  <option value="FINISHED_GOOD">Finished Good</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" {...register('unit')} placeholder="e.g. KG, UNIT" />
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
                <Label htmlFor="supplierId">Supplier</Label>
                <select
                  id="supplierId"
                  {...register('supplierId')}
                  className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-white"
                >
                  <option value="">None (No primary supplier)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {isSuppliersLoading && (
                  <p className="text-xs text-neutral-400">Loading suppliers...</p>
                )}
                {errors.supplierId && <p className="text-xs text-red-500">{errors.supplierId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...register('expiryDate')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Item'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
