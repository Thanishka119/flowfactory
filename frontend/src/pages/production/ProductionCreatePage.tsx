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
        <Button variant="ghost" size="icon" onClick={() => navigate('/production')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Production Order</h1>
          <p className="text-sm text-slate-500">Define the target product and required bill of materials.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Production Target</CardTitle>
              <CardDescription>Select the item to produce and planned output quantity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="finishedGoodItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finished Product *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={isInventoryLoading}
                          className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        >
                          <option value="">Select Finished Good</option>
                          {finishedGoods.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.sku}) - Current Stock: {Number(item.currentStock)} {item.unit}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Planned Output Quantity {selectedFinishedGood ? `(${selectedFinishedGood.unit})` : ''} *
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="any" min="0.0001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Batch Details (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Production instructions or batch specifications..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bill of Materials (Required Materials)</CardTitle>
                <CardDescription>
                  Specify the raw materials and components needed for this production run.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: '', requiredQuantity: 1 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Material
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material / Component</TableHead>
                      <TableHead className="w-44">Required Quantity</TableHead>
                      <TableHead className="w-28">Available Stock</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const currentSelectedId = form.watch(`requiredItems.${index}.itemId`);
                      const selectedItem = allInventoryItems.find((i) => i.id === currentSelectedId);

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`requiredItems.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                                    >
                                      <option value="">Select Material / Component</option>
                                      {rawMaterialsAndComponents.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.name} ({item.sku}) [{item.type}]
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage />
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
                                      <Input type="number" step="any" min="0.0001" {...field} />
                                      {selectedItem && (
                                        <span className="text-xs text-slate-500 font-medium">
                                          {selectedItem.unit}
                                        </span>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {selectedItem ? (
                              <span
                                className={
                                  Number(selectedItem.currentStock) <= 0
                                    ? 'text-rose-600 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300'
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
                                className="text-rose-500 hover:text-rose-700"
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
                <div className="mt-4 p-3 rounded-md bg-rose-50 text-rose-700 text-sm">
                  {(createMutation.error as any)?.response?.data?.message ||
                    (createMutation.error as Error).message ||
                    'Failed to create production order'}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/production')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save as DRAFT'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
