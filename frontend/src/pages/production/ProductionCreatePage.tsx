import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateProductionOrder } from '@/hooks/useProduction';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  finishedGoodItemId: z.string().min(1, 'Please select a finished product'),
  plannedQuantity: z.coerce.number().positive('Planned quantity must be greater than 0'),
  notes: z.string().optional(),
  requiredItems: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Material selection is required'),
        requiredQuantity: z.coerce.number().positive('Required quantity must be greater than 0'),
      })
    )
    .min(1, 'Add at least one required material/component'),
});

export const ProductionCreatePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateProductionOrder();

  // Load inventory items
  const { data: inventoryData, isLoading: isInventoryLoading } = useInventoryList({ limit: 100 });
  const allInventoryItems = inventoryData?.data || [];

  // Filter finished goods for the target product
  const finishedGoods = allInventoryItems.filter((i) => i.type === 'FINISHED_GOOD');
  // Materials and components for the BOM
  const rawMaterialsAndComponents = allInventoryItems.filter(
    (i) => i.type === 'RAW_MATERIAL' || i.type === 'COMPONENT' || i.type === 'OTHER'
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      finishedGoodItemId: '',
      plannedQuantity: 1,
      notes: '',
      requiredItems: [{ itemId: '', requiredQuantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'requiredItems',
  });

  const selectedFinishedGoodId = form.watch('finishedGoodItemId');
  const selectedFinishedGood = finishedGoods.find((fg) => fg.id === selectedFinishedGoodId);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(
      {
        finishedGoodItemId: values.finishedGoodItemId,
        plannedQuantity: values.plannedQuantity,
        notes: values.notes?.trim() || undefined,
        requiredItems: values.requiredItems.map((item) => ({
          itemId: item.itemId,
          requiredQuantity: item.requiredQuantity,
        })),
      },
      {
        onSuccess: (res) => {
          navigate(`/production/${res.data?.id ?? ''}`);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/production')} className="text-navy hover:bg-cream/40">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Create Production Work Order</h1>
          <p className="text-xs text-navy/70">Define the target finished product and required bill of materials formula.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border border-bluegray/40 bg-white shadow-sm">
            <CardHeader className="border-b border-bluegray/20 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Production Target Output</CardTitle>
              <CardDescription className="text-xs text-navy/60">Select target SKU and specify batch quantity to manufacture.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="finishedGoodItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Finished Good SKU *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={isInventoryLoading}
                          className="flex h-10 w-full rounded-md border border-bluegray/50 bg-white px-3 py-2 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        >
                          <option value="">Select Finished Good</option>
                          {finishedGoods.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.sku}) - Current Stock: {Number(item.currentStock)} {item.unit}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">
                        Planned Target Quantity {selectedFinishedGood ? `(${selectedFinishedGood.unit})` : ''} *
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="any" min="0.0001" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" />
                      </FormControl>
                      <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Production Instructions / Batch Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Batch formulation, line machine #, or engineering instructions..." {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs" />
                    </FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-bluegray/20 pb-4 bg-cream/20">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy">Bill of Materials (Required Raw Inputs)</CardTitle>
                <CardDescription className="text-xs text-navy/60">
                  Specify raw materials and components consumed during production.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: '', requiredQuantity: 1 })}
                className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Material
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-cream/40">
                    <TableRow>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Material / Component</TableHead>
                      <TableHead className="w-44 text-[11px] font-semibold uppercase tracking-wider text-navy/70">Required Quantity</TableHead>
                      <TableHead className="w-32 text-[11px] font-semibold uppercase tracking-wider text-navy/70">Available Stock</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const currentSelectedId = form.watch(`requiredItems.${index}.itemId`);
                      const selectedItem = allInventoryItems.find((i) => i.id === currentSelectedId);

                      return (
                        <TableRow key={field.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`requiredItems.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                    >
                                      <option value="">Select Material / Component</option>
                                      {rawMaterialsAndComponents.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.name} ({item.sku}) [{item.type}]
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`requiredItems.${index}.requiredQuantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="flex items-center gap-2">
                                      <Input type="number" step="any" min="0.0001" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono h-9" />
                                      {selectedItem && (
                                        <span className="text-xs text-navy/60 font-mono font-medium">
                                          {selectedItem.unit}
                                        </span>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold">
                            {selectedItem ? (
                              <span
                                className={
                                  Number(selectedItem.currentStock) <= 0
                                    ? 'text-rose-600'
                                    : 'text-navy'
                                }
                              >
                                {Number(selectedItem.currentStock)} {selectedItem.unit}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {createMutation.isError && (
                <div className="m-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {(createMutation.error as any)?.response?.data?.message ||
                    (createMutation.error as Error).message ||
                    'Failed to create production order'}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/production')} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
              {createMutation.isPending ? 'Saving...' : 'Save as DRAFT'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
