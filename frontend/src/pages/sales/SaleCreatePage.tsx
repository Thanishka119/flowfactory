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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-bluegray/30 pb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/sales')}
          className="border-bluegray/40 text-navy hover:bg-cream/40 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Create Sales Order</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
              Commercial Dispatch
            </span>
          </div>
          <p className="text-xs text-navy/60 font-medium mt-0.5">
            Create outbound sales dispatch draft and allocate finished goods stock.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="border-b border-bluegray/20 pb-4">
              <CardTitle className="text-base font-bold text-navy">Customer & Order Details</CardTitle>
              <CardDescription className="text-xs text-navy/60">
                Specify destination customer name and optional dispatch instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-navy">Customer Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Industries Ltd."
                          className="border-bluegray/50 bg-white text-navy focus:border-navy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-navy">Notes / Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Order notes, delivery dock, instructions..."
                          className="border-bluegray/50 bg-white text-navy focus:border-navy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-bluegray/40 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-bluegray/20 pb-4">
              <div>
                <CardTitle className="text-base font-bold text-navy">Order Line Items</CardTitle>
                <CardDescription className="text-xs text-navy/60">
                  Select finished goods or parts to dispatch. Finished goods are flagged.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0 })}
                className="border-bluegray/40 text-navy hover:bg-cream/40 bg-white text-xs font-semibold"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item Line
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="border border-bluegray/30 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-cream/50">
                    <TableRow className="border-b border-bluegray/30">
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Inventory Item</TableHead>
                      <TableHead className="w-28 text-navy font-bold text-xs uppercase tracking-wider">In Stock</TableHead>
                      <TableHead className="w-32 text-navy font-bold text-xs uppercase tracking-wider">Qty</TableHead>
                      <TableHead className="w-32 text-navy font-bold text-xs uppercase tracking-wider">Unit Price ($)</TableHead>
                      <TableHead className="w-28 text-right text-navy font-bold text-xs uppercase tracking-wider">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const selectedId = form.watch(`items.${index}.itemId`);
                      const selectedItem = allItems.find((i) => i.id === selectedId);
                      const qty = Number(form.watch(`items.${index}.quantity`)) || 0;
                      const price = Number(form.watch(`items.${index}.unitPrice`)) || 0;

                      return (
                        <TableRow key={field.id} className="border-b border-bluegray/20 hover:bg-cream/15">
                          <TableCell className="py-2.5">
                            <FormField
                              control={form.control}
                              name={`items.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <select
                                      {...field}
                                      disabled={isInventoryLoading}
                                      className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs text-navy font-medium focus:border-navy focus:outline-none"
                                    >
                                      <option value="">Select Item...</option>
                                      {sortedItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.type === 'FINISHED_GOOD' ? '★ ' : ''}
                                          {item.name} ({item.sku}) [{item.type}]
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold py-2.5">
                            {selectedItem ? (
                              <span
                                className={
                                  Number(selectedItem.currentStock) <= 0
                                    ? 'text-rose-600 font-bold'
                                    : 'text-navy'
                                }
                              >
                                {Number(selectedItem.currentStock)} {selectedItem.unit}
                              </span>
                            ) : (
                              <span className="text-navy/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0.0001"
                                      className="h-9 text-xs border-bluegray/50 bg-white text-navy font-mono"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-2.5">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      className="h-9 text-xs border-bluegray/50 bg-white text-navy font-mono"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-navy py-2.5">
                            ${(qty * price).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-2.5">
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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

              <div className="flex justify-end pt-2">
                <div className="text-right bg-cream/40 border border-bluegray/30 rounded-md px-4 py-2">
                  <span className="text-xs font-semibold text-navy/70 uppercase tracking-wider mr-3">Order Total:</span>
                  <span className="text-lg font-bold font-mono text-navy">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {createMutation.isError && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {(createMutation.error as any)?.response?.data?.message ||
                    (createMutation.error as Error).message ||
                    'Failed to create sale order'}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales')}
              className="border-bluegray/40 text-navy hover:bg-cream/40 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-navy text-white hover:bg-navy-dark shadow-sm font-semibold text-xs"
            >
              {createMutation.isPending ? 'Saving Order...' : 'Save as PENDING'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
