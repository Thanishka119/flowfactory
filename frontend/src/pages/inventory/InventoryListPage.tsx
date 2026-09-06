import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInventoryList } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StockStatus, InventoryItemType } from '@/types/inventory';

const ITEM_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'COMPONENT', label: 'Component' },
  { value: 'FINISHED_GOOD', label: 'Finished Good' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function stockStatusBadge(status: StockStatus) {
  const config: Record<StockStatus, { label: string; className: string }> = {
    OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    LOW_STOCK: { label: 'Low Stock', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    NORMAL: { label: 'Normal', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function typeLabel(type: InventoryItemType): string {
  const labels: Record<InventoryItemType, string> = {
    RAW_MATERIAL: 'Raw Material',
    COMPONENT: 'Component',
    FINISHED_GOOD: 'Finished Good',
    OTHER: 'Other',
  };
  return labels[type] || type;
}

export function InventoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const page = Number(searchParams.get('page')) || 1;
  const params = {
    page,
    limit: 20,
    search: searchParams.get('search') || undefined,
    type: searchParams.get('type') || undefined,
    category: searchParams.get('category') || undefined,
    isActive: searchParams.get('isActive') || undefined,
  };

  const { data, isLoading, isError } = useInventoryList(params);

  const items = data?.data || [];
  const meta = data?.meta;

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page'); // reset page on filter change
    setSearchParams(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam('search', searchInput);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your inventory items and stock levels</p>
        </div>
        <Link to="/inventory/new">
          <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search SKU or name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline" size="default">Search</Button>
            </form>

            <select
              className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              value={searchParams.get('type') || ''}
              onChange={(e) => updateParam('type', e.target.value)}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              value={searchParams.get('isActive') || ''}
              onChange={(e) => updateParam('isActive', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-slate-500">Loading inventory...</div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-red-500">Failed to load inventory</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Package className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Category</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Stock</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Unit</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Reorder Level</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link to={`/inventory/${item.id}`} className="font-mono text-xs text-primary hover:underline">
                          {item.sku}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        <Link to={`/inventory/${item.id}`} className="hover:underline">{item.name}</Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{typeLabel(item.type)}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.category}</td>
                      <td className="py-3 px-4 text-right font-mono">{parseFloat(item.currentStock).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{parseFloat(item.reorderLevel).toLocaleString()}</td>
                      <td className="py-3 px-4">{stockStatusBadge(item.stockStatus)}</td>
                      <td className="py-3 px-4 text-center">
                        {item.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 text-xs">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} items)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => updateParam('page', String(meta.page - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateParam('page', String(meta.page + 1))}
              >
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
