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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Exportable tabular summaries for inventory, ledger transactions, procurement, manufacturing, and sales.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Report Filters
          </CardTitle>
          <CardDescription>Select report domain and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Domain</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white px-3 py-2 text-sm"
              >
                <option value="inventory">Inventory Master</option>
                <option value="transactions">Ledger Transactions</option>
                <option value="purchases">Purchase Orders</option>
                <option value="production">Production Orders</option>
                <option value="sales">Sales Orders</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg uppercase font-semibold text-slate-700">
              {reportType} Data Records ({reportData?.length || 0})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {reportType === 'inventory' && (
                    <>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Supplier</TableHead>
                    </>
                  )}
                  {reportType === 'transactions' && (
                    <>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Item SKU</TableHead>
                      <TableHead>Quantity Delta</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>User</TableHead>
                    </>
                  )}
                  {reportType === 'purchases' && (
                    <>
                      <TableHead>PO #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </>
                  )}
                  {reportType === 'production' && (
                    <>
                      <TableHead>Order #</TableHead>
                      <TableHead>Target Finished Good</TableHead>
                      <TableHead>Planned Qty</TableHead>
                      <TableHead>Actual Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  )}
                  {reportType === 'sales' && (
                    <>
                      <TableHead>Sale #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Loading report records...
                    </TableCell>
                  </TableRow>
                ) : !reportData || reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row: any) => (
                    <TableRow key={row.id}>
                      {reportType === 'inventory' && (
                        <>
                          <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>{Number(row.currentStock)} {row.unit}</TableCell>
                          <TableCell>{Number(row.reorderLevel)} {row.unit}</TableCell>
                          <TableCell>{row.supplier?.name || '—'}</TableCell>
                        </>
                      )}
                      {reportType === 'transactions' && (
                        <>
                          <TableCell className="text-xs">{new Date(row.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-xs">{row.type}</TableCell>
                          <TableCell className="font-mono text-xs">{row.item?.sku}</TableCell>
                          <TableCell className={Number(row.quantity) < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                            {Number(row.quantity)} {row.item?.unit}
                          </TableCell>
                          <TableCell>{Number(row.balanceAfter)} {row.item?.unit}</TableCell>
                          <TableCell>{row.performedBy ? `${row.performedBy.firstName} ${row.performedBy.lastName}` : 'System'}</TableCell>
                        </>
                      )}
                      {reportType === 'purchases' && (
                        <>
                          <TableCell className="font-semibold">{row.purchaseNumber}</TableCell>
                          <TableCell>{row.supplier?.name}</TableCell>
                          <TableCell>${Number(row.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        </>
                      )}
                      {reportType === 'production' && (
                        <>
                          <TableCell className="font-semibold">{row.orderNumber}</TableCell>
                          <TableCell>{row.finishedGoodItem?.name}</TableCell>
                          <TableCell>{Number(row.plannedQuantity)} {row.finishedGoodItem?.unit}</TableCell>
                          <TableCell>{Number(row.actualQuantity)} {row.finishedGoodItem?.unit}</TableCell>
                          <TableCell>{row.status}</TableCell>
                        </>
                      )}
                      {reportType === 'sales' && (
                        <>
                          <TableCell className="font-semibold">{row.saleNumber}</TableCell>
                          <TableCell>{row.customerName}</TableCell>
                          <TableCell>${Number(row.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
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
