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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatINR } from '@/lib/utils';

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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/purchases')} className="text-navy hover:bg-cream/40">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Create Purchase Order</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border border-bluegray/40 bg-white shadow-sm">
            <CardHeader className="border-b border-bluegray/20 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Order Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Supplier / Vendor *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-bluegray/50 bg-white px-3 py-2 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers?.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Vendor Invoice # (Optional)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. INV-2026-081" className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Invoice Date (Optional)</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Procurement Notes</FormLabel>
                    <FormControl><Input {...field} placeholder="Inbound receiving instructions or PO notes" className="bg-white border-bluegray/50 focus:border-navy text-xs" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-bluegray/20 pb-4 bg-cream/20">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy">Inbound PO Line Items</CardTitle>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, unitPrice: 0 })} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-cream/40">
                    <TableRow>
                      <TableHead className="w-[40%] text-[11px] font-semibold uppercase tracking-wider text-navy/70">Inventory Item *</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Quantity *</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Unit Price (₹) *</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Line Total</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const qty = form.watch(`items.${index}.quantity`) || 0;
                      const price = form.watch(`items.${index}.unitPrice`) || 0;
                      const total = (qty * price).toFixed(2);
                      return (
                        <TableRow key={field.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                      disabled={isInventoryLoading}
                                    >
                                      <option value="">Select Inventory Item</option>
                                      {inventoryItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.name} ({item.sku}) [{item.unit}]
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
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" min="1" step="1" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono h-9" />
                                  </FormControl>
                                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
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
                                    <Input type="number" step="0.01" min="0" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono h-9" />
                                  </FormControl>
                                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-navy">{formatINR(total)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end p-4 border-t border-bluegray/20 bg-cream/20 text-sm font-bold font-mono text-navy">
                Grand Total: {formatINR(calculateTotal())}
              </div>
            </CardContent>
          </Card>

          {createMutation.isError && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create purchase order. Please check all fields.'}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/purchases')} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
              {createMutation.isPending ? 'Saving...' : 'Save Purchase Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
