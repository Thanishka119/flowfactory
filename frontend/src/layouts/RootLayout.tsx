import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

/**
 * Authenticated application shell.
 *
 * Layout:
 *   ┌──────────┬────────────────────┐
 *   │ Sidebar  │ Topbar             │
 *   │ (fixed)  ├────────────────────┤
 *   │          │ <Outlet />         │
 *   └──────────┴────────────────────┘
 *
 * On mobile the sidebar is hidden by default and slides in when the
 * hamburger button in the Topbar is pressed.
 */
export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
