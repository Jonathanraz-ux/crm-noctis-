import type { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
        {icon ? (
          <div className="bg-surface-muted text-foreground-subtle mb-4 flex size-12 items-center justify-center rounded-full">
            {icon}
          </div>
        ) : null}
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        <p className="text-foreground-muted mt-1 max-w-sm text-xs sm:text-sm">
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
