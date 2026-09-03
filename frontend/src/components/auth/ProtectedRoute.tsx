import { Navigate, Outlet } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Wraps any route that requires authentication.
 *
 * Behaviour:
 * - While session is being verified (isLoading) → full-screen spinner
 * - Not authenticated → redirect to /login (preserving the attempted URL)
 * - Authenticated → render child routes via <Outlet />
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25">
          <Layers className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg
            className="h-4 w-4 animate-spin text-primary"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading FlowFactory…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
