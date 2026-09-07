import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoiceList } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const InvoiceListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: invoices, isLoading } = useInvoiceList();

  const filteredInvoices = invoices?.filter(inv =>
    inv.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (inv.supplier && inv.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'UPLOADED': return 'bg-blue-500';
      case 'PROCESSING': return 'bg-purple-500';
      case 'EXTRACTED': return 'bg-amber-500';
      case 'VERIFIED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link to="/invoices/new">
          <Button><Upload className="mr-2 h-4 w-4" /> Upload Invoice</Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File / Inv #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>PO Linked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : filteredInvoices?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center">No invoices found.</TableCell></TableRow>
            ) : (
              filteredInvoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-medium">{invoice.invoiceNumber || 'No number'}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{invoice.originalFilename}</div>
                  </TableCell>
                  <TableCell>{invoice.supplier?.name || 'Unassigned'}</TableCell>
                  <TableCell>{invoice.purchase?.purchaseNumber || 'None'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{invoice.totalAmount ? `$${parseFloat(invoice.totalAmount).toFixed(2)}` : '---'}</TableCell>
                  <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/invoices/${invoice.id}`}>
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
