import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-line mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div> : null}
    </div>
  );
}
