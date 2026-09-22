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
    OUT_OF_STOCK: { label: 'OUT OF STOCK', className: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' },
    LOW_STOCK: { label: 'LOW STOCK', className: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold' },
    NORMAL: { label: 'NORMAL', className: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' },
  };
  const c = config[status];
  return <Badge variant="outline" className={cn('text-[10px] font-mono tracking-wider', c.className)}>{c.label}</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-bluegray/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Inventory Master Ledger</h1>
          <p className="text-xs text-navy/70 mt-0.5">Real-time stock levels, catalog SKUs, and reorder alerts</p>
        </div>
        <Link to="/inventory/new">
          <Button className="bg-navy hover:bg-navy-dark text-white font-medium shadow-sm">
            <Plus className="h-4 w-4 mr-2" />Add Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border border-bluegray/40 bg-white">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bluegray-dark" />
                <Input
                  placeholder="Search SKU or item name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 bg-white border-bluegray/50 focus:border-navy text-xs"
                />
              </div>
              <Button type="submit" variant="outline" size="default" className="border-bluegray/50 hover:bg-cream/40 text-navy text-xs font-semibold">
                Filter
              </Button>
            </form>

            <select
              className="h-10 rounded-md border border-bluegray/50 bg-white px-3 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              value={searchParams.get('type') || ''}
              onChange={(e) => updateParam('type', e.target.value)}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-bluegray/50 bg-white px-3 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
      <Card className="border border-bluegray/40 bg-white overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-xs font-mono uppercase tracking-wider text-navy/60">Loading inventory catalog...</div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-xs font-semibold text-rose-600">Failed to load inventory</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Package className="h-10 w-10 text-bluegray" />
              <p className="text-xs font-medium text-navy/60">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bluegray/30 bg-cream/40">
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">SKU</th>
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Item Name</th>
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Type</th>
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Category</th>
                    <th className="text-right py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Stock Level</th>
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Unit</th>
                    <th className="text-right py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Reorder Level</th>
                    <th className="text-left py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Status</th>
                    <th className="text-center py-3.5 px-4 font-semibold uppercase tracking-wider text-navy/70 text-[11px]">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-bluegray/15 hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-4">
                        <Link to={`/inventory/${item.id}`} className="font-mono text-xs font-semibold text-navy hover:underline">
                          {item.sku}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-semibold text-navy">
                        <Link to={`/inventory/${item.id}`} className="hover:underline">{item.name}</Link>
                      </td>
                      <td className="py-3 px-4 text-navy/70 font-medium">{typeLabel(item.type)}</td>
                      <td className="py-3 px-4 text-navy/70">{item.category}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-navy">{parseFloat(item.currentStock).toLocaleString()}</td>
                      <td className="py-3 px-4 text-navy/60 font-mono">{item.unit}</td>
                      <td className="py-3 px-4 text-right font-mono text-navy/60">{parseFloat(item.reorderLevel).toLocaleString()}</td>
                      <td className="py-3 px-4">{stockStatusBadge(item.stockStatus)}</td>
                      <td className="py-3 px-4 text-center">
                        {item.isActive ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-mono">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-mono">Inactive</Badge>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-bluegray/20 bg-cream/10">
            <span className="text-xs font-mono text-navy/60">
              Page {meta.page} of {meta.totalPages} ({meta.total} items)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-bluegray/40 text-navy text-xs"
                disabled={meta.page <= 1}
                onClick={() => updateParam('page', String(meta.page - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-bluegray/40 text-navy text-xs"
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
