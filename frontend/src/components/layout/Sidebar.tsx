import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }, // Accessible to all roles
  {
    label: 'Inventory',
    to: '/inventory',
    icon: Package,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER', 'PRODUCTION_MANAGER', 'WAREHOUSE_STAFF', 'SALES_TEAM'],
  },
  {
    label: 'Suppliers',
    to: '/suppliers',
    icon: Truck,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
  },
  {
    label: 'Purchases',
    to: '/purchases',
    icon: ShoppingCart,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
  },
  {
    label: 'Invoices',
    to: '/invoices',
    icon: FileText,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
  },
  {
    label: 'Production',
    to: '/production',
    icon: Factory,
    allowedRoles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_STAFF'],
  },
  {
    label: 'Sales',
    to: '/sales',
    icon: TrendingUp,
    allowedRoles: ['ADMIN', 'SALES_TEAM'],
  },
  {
    label: 'Simulator',
    to: '/simulator',
    icon: Sparkles,
    allowedRoles: ['ADMIN', 'PRODUCTION_MANAGER', 'PURCHASE_MANAGER', 'SALES_TEAM'],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER', 'PRODUCTION_MANAGER'],
  },
  {
    label: 'Users',
    to: '/users',
    icon: Users,
    allowedRoles: ['ADMIN'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // If no allowedRoles specified, visible to all authenticated users
    if (!item.allowedRoles) return true;
    // Admins have access to everything
    if (userRole === 'ADMIN') return true;
    // Otherwise check if the user's role is in the allowed list
    return Boolean(userRole && item.allowedRoles.includes(userRole));
  });

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
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-200 ease-in-out',
          // Desktop: always visible
          'lg:translate-x-0 lg:static lg:z-auto',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 shadow-sm">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                Flow<span className="text-neutral-500">Factory</span>
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                Operations & Inventory
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            if (item.comingSoon) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 dark:text-neutral-600 cursor-not-allowed select-none text-sm"
                  title="Coming soon"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded px-1.5 py-0.5">
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
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white',
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
        <div className="shrink-0 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400 font-mono">
          FlowFactory v1.0.0
        </div>
      </aside>
    </>
  );
}
