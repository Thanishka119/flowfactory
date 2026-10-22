import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-navy/60 font-mono">
        Verifying administrative authorization...
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-rose-200 rounded-lg shadow-sm text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-700 mx-auto flex items-center justify-center">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-navy">Access Denied</h2>
        <p className="text-xs text-navy/70 leading-relaxed">
          This operational module is strictly restricted to System Administrators. Non-admin roles lack execution and planning permissions.
        </p>
        <div className="pt-2">
          <Button
            size="sm"
            onClick={() => window.location.assign('/dashboard')}
            className="bg-navy hover:bg-navy-dark text-white text-xs"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
