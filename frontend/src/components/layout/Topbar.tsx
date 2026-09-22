import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'Operator';

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const getPageTitle = (path: string) => {
    if (path.startsWith('/inventory')) return 'Inventory Management';
    if (path.startsWith('/suppliers')) return 'Supplier Directory';
    if (path.startsWith('/purchases')) return 'Purchase Orders';
    if (path.startsWith('/invoices')) return 'Invoice OCR & Verification';
    if (path.startsWith('/production')) return 'Production Workflow';
    if (path.startsWith('/sales')) return 'Sales & Fulfillment';
    if (path.startsWith('/simulator')) return 'What-If Simulator';
    if (path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/users')) return 'User Administration';
    return 'Operations Dashboard';
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-bluegray/40 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-navy hover:bg-cream transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page Context Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium text-navy/40 uppercase tracking-widest hidden sm:inline">
          Workspace /
        </span>
        <h2 className="text-sm sm:text-base font-bold text-navy tracking-tight">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System Status Pill */}
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-cream-light border border-bluegray/40 text-[11px] font-mono text-navy">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>FLOW SYSTEM ACTIVE</span>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all',
            'text-navy hover:bg-cream/60 border border-transparent hover:border-bluegray/40',
          )}
        >
          {/* Avatar */}
          <div className="h-8 w-8 rounded-md bg-navy text-beige flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="hidden sm:block text-left leading-tight">
            <div className="font-semibold text-navy text-xs truncate max-w-[130px]">
              {displayName}
            </div>
            {user?.role && (
              <div className="text-[10px] font-mono text-bluegray-dark uppercase truncate max-w-[130px]">
                {user.role}
              </div>
            )}
          </div>

          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-navy/50 transition-transform duration-150 hidden sm:block',
              userMenuOpen && 'rotate-180',
            )}
          />
        </button>

        {/* Dropdown */}
        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setUserMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-lg border border-bluegray/40 bg-white shadow-lg py-1.5 text-sm">
              <div className="px-3.5 py-2.5 border-b border-bluegray/20 mb-1">
                <p className="font-semibold text-navy text-xs truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-navy/60 truncate mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-bluegray/10 text-[10px] font-mono text-[#2F344F]">
                  <ShieldCheck className="h-3 w-3 text-navy shrink-0" />
                  <span className="truncate">{user?.role ?? 'OPERATOR'}</span>
                </div>
              </div>

              <div className="px-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-md text-xs font-medium"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
