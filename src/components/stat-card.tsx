import type { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, description, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground-muted tracking-wide uppercase">{title}</p>
          {icon ? <div className="text-primary size-5 shrink-0">{icon}</div> : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-foreground tabular">{value}</p>
          {trend ? (
            <span
              className={cn(
                'text-xs font-semibold',
                trend.isPositive ? 'text-success' : 'text-danger',
              )}
            >
              {trend.value}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-foreground-subtle">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
