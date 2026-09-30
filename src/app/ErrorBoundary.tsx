import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { product } from '@/config/product';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a bad row of data cannot leave the customer staring
 * at a white page with a console full of stack traces.
 *
 * A class component because there is still no hook equivalent of
 * `componentDidCatch`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Left as a console report on purpose: the kit does not ship a telemetry
    // vendor, and a buyer will want to plug in their own.
    console.error('[noctis-crm] unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="bg-surface-subtle grid min-h-full place-items-center p-6">
        <div className="border-line bg-surface w-full max-w-lg space-y-4 rounded-lg border p-6 text-center shadow-sm">
          <span className="bg-danger-soft text-danger mx-auto grid size-11 place-items-center rounded-full">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-foreground-muted text-sm">
              {product.name} hit an unexpected error and stopped rendering this screen. The details
              are in the browser console.
            </p>
          </div>
          <pre className="scrollbar-slim bg-surface-muted text-foreground-muted max-h-32 overflow-auto rounded-md p-3 text-left text-xs">
            {error.message}
          </pre>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} leftIcon={<RefreshCw />}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
