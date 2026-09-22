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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="text-navy hover:bg-cream/40">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Create Inventory Item</h1>
      </div>

      <Card className="border border-bluegray/40 bg-white shadow-sm">
        <CardHeader className="border-b border-bluegray/20 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Item Specifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {createMutation.isError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3 rounded-md">
                {createMutation.error?.message || 'Failed to create item'}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs font-semibold uppercase tracking-wider text-navy/70">SKU Code *</Label>
                <Input id="sku" {...register('sku')} placeholder="e.g. RM-STEEL-001" className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
                {errors.sku && <p className="text-[10px] text-rose-600 font-semibold">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Item Name *</Label>
                <Input id="name" {...register('name')} placeholder="Item name" className="bg-white border-bluegray/50 focus:border-navy text-xs" />
                {errors.name && <p className="text-[10px] text-rose-600 font-semibold">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Description</Label>
              <Input id="description" {...register('description')} placeholder="Optional engineering notes or item description" className="bg-white border-bluegray/50 focus:border-navy text-xs" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Category *</Label>
                <Input id="category" {...register('category')} placeholder="e.g. Raw Materials" className="bg-white border-bluegray/50 focus:border-navy text-xs" />
                {errors.category && <p className="text-[10px] text-rose-600 font-semibold">{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Item Type *</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="w-full h-10 rounded-md border border-bluegray/50 bg-white px-3 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="COMPONENT">Component</option>
                  <option value="FINISHED_GOOD">Finished Good</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Unit *</Label>
                <Input id="unit" {...register('unit')} placeholder="e.g. KG, PCS, LTR" className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono uppercase" />
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
                {errors.supplierId && <p className="text-[10px] text-rose-600 font-semibold">{errors.supplierId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate" className="text-xs font-semibold uppercase tracking-wider text-navy/70">Expiry Date (Optional)</Label>
                <Input id="expiryDate" type="date" {...register('expiryDate')} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-bluegray/20">
              <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold">
                {createMutation.isPending ? 'Registering...' : 'Register Item'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory')} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
