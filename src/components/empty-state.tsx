import type { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
        {icon ? (
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-foreground-subtle mb-4">
            {icon}
          </div>
        ) : null}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs sm:text-sm text-foreground-muted mt-1 max-w-sm">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
