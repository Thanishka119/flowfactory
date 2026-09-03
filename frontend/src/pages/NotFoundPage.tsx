import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <SearchX className="h-8 w-8 text-slate-400" />
      </div>
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">404</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm max-w-xs">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
    </div>
  );
}
