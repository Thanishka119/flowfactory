import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService, type ReportFilterParams } from '@/services/dashboard.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter } from 'lucide-react';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportFilterParams['type']>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['reports', reportType, startDate, endDate],
    queryFn: async () => {
      const res = await dashboardService.getReportData({
        type: reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res.data || [];
    },
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bluegray/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Reports & Analytics</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
              Audit & Ledger Export
            </span>
          </div>
          <p className="text-xs text-navy/60 font-medium mt-0.5">
            Exportable tabular summaries for inventory master, ledger transactions, procurement, manufacturing, and sales.
          </p>
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card className="border-bluegray/40 shadow-sm bg-white">
        <CardHeader className="border-b border-bluegray/20 pb-3">
          <CardTitle className="text-sm font-bold text-navy flex items-center gap-2">
            <Filter className="h-4 w-4 text-navy/70" /> Filter Criteria
          </CardTitle>
          <CardDescription className="text-xs text-navy/60">Select reporting domain and temporal boundaries</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy block mb-1.5 uppercase tracking-wider">Domain</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-bluegray/50 bg-white px-3 py-1 text-xs text-navy font-semibold focus:border-navy focus:outline-none"
              >
                <option value="inventory">Inventory Master</option>
                <option value="transactions">Ledger Transactions</option>
                <option value="purchases">Purchase Orders</option>
                <option value="production">Production Orders</option>
                <option value="sales">Sales Orders</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy block mb-1.5 uppercase tracking-wider">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs border-bluegray/50 bg-white text-navy font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy block mb-1.5 uppercase tracking-wider">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs border-bluegray/50 bg-white text-navy font-mono"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => refetch()}
                className="w-full h-9 bg-navy text-white hover:bg-navy-dark shadow-sm text-xs font-semibold"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table Card */}
      <Card className="border-bluegray/40 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-bluegray/20 pb-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-navy">
              {reportType} Records ({reportData?.length || 0})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-cream/50">
                <TableRow className="border-b border-bluegray/30">
                  {reportType === 'inventory' && (
                    <>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">SKU</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Name</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Current Stock</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Reorder Level</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Supplier</TableHead>
                    </>
                  )}
                  {reportType === 'transactions' && (
                    <>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Timestamp</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Item SKU</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Quantity Delta</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Balance After</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Operator</TableHead>
                    </>
                  )}
                  {reportType === 'purchases' && (
                    <>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">PO #</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Supplier</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Total Amount</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Date</TableHead>
                    </>
                  )}
                  {reportType === 'production' && (
                    <>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Order #</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Target Finished Good</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Planned Qty</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Actual Qty</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Status</TableHead>
                    </>
                  )}
                  {reportType === 'sales' && (
                    <>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Sale #</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Total Amount</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-navy font-bold text-xs uppercase tracking-wider">Date</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs font-semibold text-navy/60">
                      Loading report records...
                    </TableCell>
                  </TableRow>
                ) : !reportData || reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-navy/60">
                      No matching records found for this domain and date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row: any) => (
                    <TableRow key={row.id} className="border-b border-bluegray/20 hover:bg-cream/20">
                      {reportType === 'inventory' && (
                        <>
                          <TableCell className="font-mono text-xs font-semibold text-navy py-3">{row.sku}</TableCell>
                          <TableCell className="text-xs font-semibold text-navy py-3">{row.name}</TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-navy py-3">
                            {Number(row.currentStock)} {row.unit}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-navy/70 py-3">
                            {Number(row.reorderLevel)} {row.unit}
                          </TableCell>
                          <TableCell className="text-xs text-navy py-3">{row.supplier?.name || '—'}</TableCell>
                        </>
                      )}
                      {reportType === 'transactions' && (
                        <>
                          <TableCell className="font-mono text-xs text-navy/70 py-3">
                            {new Date(row.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cream border border-bluegray/40 text-navy">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-navy py-3">{row.item?.sku}</TableCell>
                          <TableCell className={`text-xs font-mono font-bold py-3 ${Number(row.quantity) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {Number(row.quantity) > 0 ? `+${Number(row.quantity)}` : Number(row.quantity)} {row.item?.unit}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-navy py-3">{Number(row.balanceAfter)} {row.item?.unit}</TableCell>
                          <TableCell className="text-xs text-navy py-3">
                            {row.performedBy ? `${row.performedBy.firstName} ${row.performedBy.lastName}` : 'System'}
                          </TableCell>
                        </>
                      )}
                      {reportType === 'purchases' && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-navy py-3">{row.purchaseNumber}</TableCell>
                          <TableCell className="text-xs font-semibold text-navy py-3">{row.supplier?.name}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-navy py-3">
                            ${Number(row.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-navy/70 py-3">
                            {new Date(row.createdAt).toLocaleDateString()}
                          </TableCell>
                        </>
                      )}
                      {reportType === 'production' && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-navy py-3">{row.orderNumber}</TableCell>
                          <TableCell className="text-xs font-semibold text-navy py-3">{row.finishedGoodItem?.name}</TableCell>
                          <TableCell className="text-xs font-mono text-navy py-3">
                            {Number(row.plannedQuantity)} {row.finishedGoodItem?.unit}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-navy py-3">
                            {Number(row.actualQuantity)} {row.finishedGoodItem?.unit}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
                              {row.status}
                            </span>
                          </TableCell>
                        </>
                      )}
                      {reportType === 'sales' && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-navy py-3">{row.saleNumber}</TableCell>
                          <TableCell className="text-xs font-semibold text-navy py-3">{row.customerName}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-navy py-3">
                            ${Number(row.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-bluegray/15 text-navy border border-bluegray/30">
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-navy/70 py-3">
                            {new Date(row.createdAt).toLocaleDateString()}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

