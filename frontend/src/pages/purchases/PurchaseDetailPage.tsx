import { useParams, useNavigate } from 'react-router-dom';
import { usePurchase, useReceivePurchase, useCancelPurchase } from '@/hooks/usePurchases';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export const PurchaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading } = usePurchase(id);
  const receiveMutation = useReceivePurchase();
  const cancelMutation = useCancelPurchase();

  if (isLoading) return <div>Loading...</div>;
  if (!purchase) return <div>Purchase Order not found</div>;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-amber-500';
      case 'RECEIVED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleReceive = () => {
    if (confirm('Are you sure you want to mark this order as received? This will update inventory.')) {
      receiveMutation.mutate(purchase.id);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate(purchase.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">PO: {purchase.purchaseNumber}</h1>
          <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
        </div>
        <div className="flex gap-2">
          {purchase.status === 'PENDING' && (
            <>
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={handleCancel} disabled={cancelMutation.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel Order
              </Button>
              <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> Receive Goods
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Order Information</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Date:</span> {new Date(purchase.createdAt).toLocaleDateString()}</div>
            <div><span className="font-semibold">Invoice Number:</span> {purchase.invoiceNumber || 'N/A'}</div>
            <div><span className="font-semibold">Total Amount:</span> ${parseFloat(purchase.totalAmount).toFixed(2)}</div>
            {purchase.status === 'RECEIVED' && purchase.receivedBy && (
              <div><span className="font-semibold">Received By:</span> {purchase.receivedBy.firstName} {purchase.receivedBy.lastName}</div>
            )}
            {purchase.notes && <div><span className="font-semibold">Notes:</span> {purchase.notes}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Supplier Information</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><span className="font-semibold">Name:</span> {purchase.supplier.name}</div>
            <div><span className="font-semibold">Contact:</span> {purchase.supplier.contactPerson || 'N/A'}</div>
            <div><span className="font-semibold">Email:</span> {purchase.supplier.email || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item.sku}</TableCell>
                  <TableCell>{item.item.name}</TableCell>
                  <TableCell>{item.quantity} {item.item.unit}</TableCell>
                  <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
