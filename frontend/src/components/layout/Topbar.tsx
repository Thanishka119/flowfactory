import { useState } from 'react';
import { Menu, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'User';

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 sm:px-6 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
            'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700',
          )}
        >
          {/* Avatar */}
          <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
          </div>

          <div className="hidden sm:block text-left leading-tight">
            <div className="font-medium text-neutral-900 dark:text-white truncate max-w-[140px]">
              {displayName}
            </div>
            {user?.role && (
              <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                {user.role}
              </div>
            )}
          </div>

          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform duration-150 hidden sm:block',
              userMenuOpen && 'rotate-180',
            )}
          />
        </button>

        {/* Dropdown */}
        {userMenuOpen && (
          <>
            {/* Click-away overlay */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setUserMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1.5 text-sm">
              {/* User info */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="font-medium text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 px-3 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-none"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
