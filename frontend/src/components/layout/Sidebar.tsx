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
  ShieldAlert,
  Clock,
  RotateCcw,
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
  {
    label: 'Shortage Rescue',
    to: '/shortage-rescue',
    icon: ShieldAlert,
    allowedRoles: ['ADMIN'],
    group: 'ADMINISTRATION',
  },
  {
    label: 'Expiry Planner',
    to: '/expiry-planner',
    icon: Clock,
    allowedRoles: ['ADMIN'],
    group: 'ADMINISTRATION',
  },
  {
    label: 'Recovery & Resale',
    to: '/recovery-resale',
    icon: RotateCcw,
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
    return userRole && item.allowedRoles.includes(userRole);
  });

  const overviewItems = visibleNavItems.filter((i) => i.group === 'OVERVIEW');
  const operationsItems = visibleNavItems.filter((i) => i.group === 'OPERATIONS');
  const intelligenceItems = visibleNavItems.filter((i) => i.group === 'INTELLIGENCE');
  const adminItems = visibleNavItems.filter((i) => i.group === 'ADMINISTRATION');

  const renderGroup = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#ACBAC4]/60 font-mono">
          {title}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors',
                    isActive
                      ? 'bg-[#E5DCC0] text-[#2F344F] shadow-sm'
                      : 'text-[#ACBAC4] hover:bg-[#252A40] hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#252A40]/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#2F344F] border-r border-[#252A40] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#252A40] bg-[#252A40]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5DCC0] text-[#2F344F] shadow-sm">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-sm leading-none block">
                FlowFactory
              </span>
              <span className="text-[10px] text-[#ACBAC4]/80 font-mono tracking-wider uppercase block mt-0.5">
                SIMS Platform
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#ACBAC4] hover:text-white hover:bg-[#252A40] rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
          {renderGroup('Overview', overviewItems)}
          {renderGroup('Operations', operationsItems)}
          {renderGroup('Intelligence', intelligenceItems)}
          {renderGroup('Administration', adminItems)}
        </nav>

        {/* User profile snippet at footer */}
        {user && (
          <div className="p-3 border-t border-[#252A40] bg-[#252A40]/30 shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-[#252A40]/60 border border-[#ACBAC4]/10">
              <div className="h-7 w-7 rounded-full bg-[#ACBAC4]/20 border border-[#ACBAC4]/30 text-[#E5DCC0] font-bold text-xs flex items-center justify-center shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-[#ACBAC4] font-mono truncate">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
