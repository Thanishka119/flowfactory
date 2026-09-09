import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateSale } from '@/hooks/useSales';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, 'Item selection is required'),
        quantity: z.coerce.number().positive('Quantity must be greater than 0'),
        unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
      })
    )
    .min(1, 'Add at least one sale item'),
});

export const SaleCreatePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateSale();

  const { data: inventoryData, isLoading: isInventoryLoading } = useInventoryList({ limit: 100 });
  const allItems = inventoryData?.data || [];

  // Sort with FINISHED_GOOD items first
  const sortedItems = [...allItems].sort((a, b) => {
    if (a.type === 'FINISHED_GOOD' && b.type !== 'FINISHED_GOOD') return -1;
    if (b.type === 'FINISHED_GOOD' && a.type !== 'FINISHED_GOOD') return 1;
    return a.name.localeCompare(b.name);
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      notes: '',
      items: [{ itemId: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(
      {
        customerName: values.customerName,
        notes: values.notes?.trim() || undefined,
        items: values.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
      {
        onSuccess: (res) => {
          navigate(`/sales/${res.data?.id ?? ''}`);
        },
      }
    );
  };

  const calculateTotal = () => {
    const items = form.watch('items') || [];
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0), 0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Sales Order</h1>
          <p className="text-sm text-slate-500">Dispatch finished goods to customers.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Industries Ltd." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes / Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Order notes, shipping details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sale Items</CardTitle>
                <CardDescription>Select inventory items to dispatch. Finished goods are prioritized.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventory Item</TableHead>
                      <TableHead className="w-32">Available</TableHead>
                      <TableHead className="w-36">Quantity</TableHead>
                      <TableHead className="w-36">Unit Price ($)</TableHead>
                      <TableHead className="w-28 text-right">Line Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const selectedId = form.watch(`items.${index}.itemId`);
                      const selectedItem = allItems.find((i) => i.id === selectedId);
                      const qty = Number(form.watch(`items.${index}.quantity`)) || 0;
                      const price = Number(form.watch(`items.${index}.unitPrice`)) || 0;

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <select
                                      {...field}
                                      disabled={isInventoryLoading}
                                      className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                                    >
                                      <option value="">Select Item</option>
                                      {sortedItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.type === 'FINISHED_GOOD' ? '★ ' : ''}
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
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" step="any" min="0.0001" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" step="any" min="0" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(qty * price).toFixed(2)}
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

              <div className="flex justify-end pt-4">
                <div className="text-right">
                  <span className="text-sm text-slate-500">Order Total: </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {createMutation.isError && (
                <div className="mt-4 p-3 rounded-md bg-rose-50 text-rose-700 text-sm">
                  {(createMutation.error as any)?.response?.data?.message ||
                    (createMutation.error as Error).message ||
                    'Failed to create sale order'}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save as PENDING'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
