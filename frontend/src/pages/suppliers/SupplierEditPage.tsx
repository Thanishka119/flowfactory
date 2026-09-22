import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  leadTimeDays: z.coerce.number().min(0).optional(),
});

export const SupplierEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const updateMutation = useUpdateSupplier();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', contactPerson: '', email: '', phone: '', address: '', taxId: '', leadTimeDays: 0
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        taxId: supplier.taxId || '',
        leadTimeDays: supplier.leadTimeDays || 0,
      });
    }
  }, [supplier, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (id) {
      updateMutation.mutate({ id, data: values }, {
        onSuccess: () => navigate(`/suppliers/${id}`)
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/suppliers/${id}`)} className="text-navy hover:bg-cream/40">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-navy">Edit Supplier: {supplier?.name}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border border-bluegray/40 bg-white shadow-sm">
            <CardHeader className="border-b border-bluegray/20 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">Update Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Supplier / Vendor Legal Name *</FormLabel>
                  <FormControl><Input {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs" /></FormControl>
                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Key Contact Person</FormLabel>
                  <FormControl><Input {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs" /></FormControl>
                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Contact Email</FormLabel>
                    <FormControl><Input type="email" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Phone Number</FormLabel>
                    <FormControl><Input {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Physical Logistics Address</FormLabel>
                  <FormControl><Input {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs" /></FormControl>
                  <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="taxId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Tax Identifier</FormLabel>
                    <FormControl><Input {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="leadTimeDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-navy/70">Standard Lead Time (Days)</FormLabel>
                    <FormControl><Input type="number" {...field} className="bg-white border-bluegray/50 focus:border-navy text-xs font-mono" /></FormControl>
                    <FormMessage className="text-[10px] text-rose-600 font-semibold" />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(`/suppliers/${id}`)} className="border-bluegray/40 text-navy text-xs font-semibold hover:bg-cream/40">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
