import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  Factory,
  BarChart3,
  Layers,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Set true for routes not yet implemented — renders as disabled */
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', to: '/inventory', icon: Package },
  { label: 'Suppliers', to: '/suppliers', icon: Truck },
  { label: 'Purchases', to: '/purchases', icon: ShoppingCart },
  { label: 'Invoices', to: '/invoices', icon: FileText },
  { label: 'Production', to: '/production', icon: Factory },
  { label: 'Sales', to: '/sales', icon: BarChart3, comingSoon: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out',
          // Desktop: always visible
          'lg:translate-x-0 lg:static lg:z-auto',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/20">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Flow<span className="text-primary">Factory</span>
              </span>
              <span className="block text-[9px] font-medium uppercase tracking-wider text-slate-400">
                Inventory
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.comingSoon) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 dark:text-slate-600 cursor-not-allowed select-none text-sm"
                  title="Coming soon"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => { if (isOpen) onClose(); }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
          FlowFactory v0.5.0
        </div>
      </aside>
    </>
  );
}
