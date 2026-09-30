import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="animate-fade-in flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="bg-surface-muted grid size-16 place-items-center rounded-full">
        <Search className="text-foreground-muted size-7" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-foreground-muted max-w-sm text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link to="/">
          <Home className="size-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
