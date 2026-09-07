import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreatePurchase } from '@/hooks/usePurchases';
import { useSupplierList } from '@/hooks/useSuppliers';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, 'Item selection is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  })).min(1, 'Add at least one item')
});

export const PurchaseCreatePage = () => {
  const navigate = useNavigate();
  const createMutation = useCreatePurchase();
  const { data: suppliers } = useSupplierList();
  const { data: inventoryData, isLoading: isInventoryLoading } = useInventoryList({ limit: 100 });
  const inventoryItems = inventoryData?.data || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: '',
      invoiceNumber: '',
      invoiceDate: '',
      notes: '',
      items: [{ itemId: '', quantity: 1, unitPrice: 0 }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Sanitize payload: strip empty optional strings and format invoiceDate as ISO string if provided
    const payload = {
      supplierId: values.supplierId,
      invoiceNumber: values.invoiceNumber?.trim() ? values.invoiceNumber.trim() : undefined,
      invoiceDate: values.invoiceDate?.trim() ? new Date(values.invoiceDate).toISOString() : undefined,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      items: values.items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: () => navigate('/purchases')
    });
  };

  const calculateTotal = () => {
    const items = form.watch('items');
    return items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Purchase Order</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
  control={form.control}
  name="supplierId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Supplier *</FormLabel>
      <FormControl>
        <select
          {...field}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select Supplier</option>
          {suppliers?.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
            <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
              <FormItem><FormLabel>Invoice Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="invoiceDate" render={({ field }) => (
              <FormItem><FormLabel>Invoice Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="border rounded-md p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Line Items</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0 })}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Inventory Item *</TableHead>
                  <TableHead>Quantity *</TableHead>
                  <TableHead>Unit Price *</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const qty = form.watch(`items.${index}.quantity`) || 0;
                  const price = form.watch(`items.${index}.unitPrice`) || 0;
                  const total = (qty * price).toFixed(2);
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
                                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                  disabled={isInventoryLoading}
                                >
                                  <option value="">Select Inventory Item</option>
                                  {inventoryItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({item.sku}) - {item.unit}
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
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" min="1" step="1" {...field} />
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
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="font-medium">${total}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end text-lg font-bold">
              Grand Total: ${calculateTotal()}
            </div>
          </div>

          {createMutation.isError && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create purchase order. Please check all fields.'}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/purchases')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Purchase Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
