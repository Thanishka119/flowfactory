import { Outlet } from 'react-router-dom';
import { Layers, Activity, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Flow<span className="text-primary">Factory</span>
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Smart Inventory Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              Milestone M1: Project Foundation
            </Badge>
            <Badge variant="success" className="gap-1 py-1 px-2.5 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Architecture Initialized
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} FlowFactory Inc. All rights reserved.</p>
          <p className="font-mono">React 19 • Vite • TypeScript • Tailwind CSS • Express REST API</p>
        </div>
      </footer>
    </div>
  );
}
