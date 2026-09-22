import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-cream border border-bluegray/30 flex items-center justify-center shadow-sm">
        <SearchX className="h-8 w-8 text-navy" />
      </div>
      <div>
        <h1 className="text-4xl font-extrabold text-navy font-mono">404</h1>
        <p className="text-navy/70 mt-2 text-xs max-w-xs font-medium">
          The requested operational resource or view is not found or has been moved.
        </p>
      </div>
      <Button
        onClick={() => navigate('/dashboard')}
        className="bg-navy text-white hover:bg-navy-dark shadow-sm text-xs font-semibold"
      >
        Return to Dashboard
      </Button>
    </div>
  );
}

