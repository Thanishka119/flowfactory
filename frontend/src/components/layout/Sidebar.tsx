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
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
  group: 'OVERVIEW' | 'OPERATIONS' | 'INTELLIGENCE' | 'ADMINISTRATION';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, group: 'OVERVIEW' },
  {
    label: 'Inventory',
    to: '/inventory',
    icon: Package,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER', 'PRODUCTION_MANAGER', 'WAREHOUSE_STAFF', 'SALES_TEAM'],
    group: 'OPERATIONS',
  },
  {
    label: 'Suppliers',
    to: '/suppliers',
    icon: Truck,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
    group: 'OPERATIONS',
  },
  {
    label: 'Purchases',
    to: '/purchases',
    icon: ShoppingCart,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
    group: 'OPERATIONS',
  },
  {
    label: 'Invoices',
    to: '/invoices',
    icon: FileText,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER'],
    group: 'OPERATIONS',
  },
  {
    label: 'Production',
    to: '/production',
    icon: Factory,
    allowedRoles: ['ADMIN', 'PRODUCTION_MANAGER', 'WAREHOUSE_STAFF'],
    group: 'OPERATIONS',
  },
  {
    label: 'Sales',
    to: '/sales',
    icon: TrendingUp,
    allowedRoles: ['ADMIN', 'SALES_TEAM'],
    group: 'OPERATIONS',
  },
  {
    label: 'Simulator',
    to: '/simulator',
    icon: Sparkles,
    allowedRoles: ['ADMIN', 'PRODUCTION_MANAGER', 'PURCHASE_MANAGER', 'SALES_TEAM'],
    group: 'INTELLIGENCE',
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'PURCHASE_MANAGER', 'PRODUCTION_MANAGER'],
    group: 'INTELLIGENCE',
  },
  {
    label: 'Users',
    to: '/users',
    icon: Users,
    allowedRoles: ['ADMIN'],
    group: 'ADMINISTRATION',
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
    if (!item.allowedRoles) return true;
    if (userRole === 'ADMIN') return true;
    return Boolean(userRole && item.allowedRoles.includes(userRole));
  });

  const groups = ['OVERVIEW', 'OPERATIONS', 'INTELLIGENCE', 'ADMINISTRATION'] as const;

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'Operator';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#252A40]/70 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-[#2F344F] border-r border-[#252A40] text-[#ACBAC4] transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#252A40] shrink-0 bg-[#252A40]/40">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#E5DCC0] flex items-center justify-center text-[#2F344F] shadow-sm font-bold">
              <Layers className="h-5 w-5 text-[#2F344F]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white flex items-center">
                FLOW<span className="text-[#E5DCC0]">FACTORY</span>
              </span>
              <span className="block text-[8.5px] font-mono font-semibold uppercase tracking-widest text-[#ACBAC4]/80">
                Operations Ledger
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-[#ACBAC4] hover:text-white hover:bg-[#252A40] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5" aria-label="Main navigation">
          {groups.map((grp) => {
            const itemsInGroup = visibleNavItems.filter((item) => item.group === grp);
            if (itemsInGroup.length === 0) return null;

            return (
              <div key={grp} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-[#ACBAC4]/60 uppercase">
                  {grp}
                </div>

                {itemsInGroup.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => { if (isOpen) onClose(); }}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150',
                          isActive
                            ? 'bg-[#E5DCC0] text-[#2F344F] font-semibold shadow-xs'
                            : 'text-[#ACBAC4] hover:bg-[#252A40] hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User / Profile Footer */}
        <div className="shrink-0 p-3.5 border-t border-[#252A40] bg-[#252A40]/30">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[#252A40]/60 border border-[#ACBAC4]/10">
            <div className="h-8 w-8 rounded-md bg-[#ACBAC4]/20 border border-[#ACBAC4]/30 flex items-center justify-center text-[#E5DCC0] font-mono font-semibold text-xs shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="h-3 w-3 text-[#E5DCC0] shrink-0" />
                <span className="text-[10px] font-mono uppercase text-[#ACBAC4] truncate">
                  {user?.role ?? 'Operator'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
