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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UPLOADED':
        return <Badge variant="outline" className="bg-blue-50 text-navy border-blue-300 font-mono text-[10px]">UPLOADED</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 font-mono text-[10px] animate-pulse">OCR RUNNING</Badge>;
      case 'EXTRACTED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px] font-semibold">NEEDS VERIFICATION</Badge>;
      case 'VERIFIED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px] font-semibold">VERIFIED & POSTED</Badge>;
      case 'FAILED':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-mono text-[10px]">FAILED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Invoice OCR & Ingest</h1>
          <p className="text-xs text-navy/70 mt-0.5">Automated document parsing, Textract line matching, and purchase verification</p>
        </div>
        <Link to="/invoices/new">
          <Button className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm">
            <Upload className="mr-1.5 h-4 w-4" /> Upload Inbound Invoice
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bluegray-dark" />
          <Input
            placeholder="Search invoices by filename, # or vendor..."
            className="pl-9 bg-white border-bluegray/50 focus:border-navy text-xs"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-bluegray/40 rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-cream/40">
            <TableRow>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">File / Invoice #</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Supplier / Vendor</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Linked PO</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">OCR Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Total Value</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-navy/70">Upload Date</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-navy/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-navy/50 text-xs font-mono uppercase">Loading invoices...</TableCell></TableRow>
            ) : filteredInvoices?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-navy/60 text-xs font-medium">No invoices found.</TableCell></TableRow>
            ) : (
              filteredInvoices?.map((invoice) => (
                <TableRow key={invoice.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-xs text-navy">{invoice.invoiceNumber || 'Pending extraction'}</div>
                    <div className="text-[10px] text-bluegray-dark font-mono truncate max-w-[200px]">{invoice.originalFilename}</div>
                  </TableCell>
                  <TableCell className="font-medium text-xs text-navy">{invoice.supplier?.name || 'Unassigned'}</TableCell>
                  <TableCell className="font-mono text-xs text-navy/70">{invoice.purchase?.purchaseNumber || '—'}</TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-navy">{invoice.totalAmount ? `$${parseFloat(invoice.totalAmount).toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-xs text-navy/70 font-mono">{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/invoices/${invoice.id}`}>
                      <Button variant="ghost" size="sm" className="text-navy hover:bg-cream/40 text-xs font-semibold">
                        <Eye className="h-3.5 w-3.5 mr-1 text-navy" /> Inspect
                      </Button>
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
