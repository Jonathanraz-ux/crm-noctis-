import { AlertTriangle, ExternalLink } from 'lucide-react';

import { product } from '@/config/product';

/**
 * Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 *
 * The app renders instead of white-screening, because the most common first
 * run is "I cloned it and nothing happens" — this turns that into a sentence
 * that says what to do.
 */
export function NotConfiguredNotice() {
  return (
    <div
      role="alert"
      className="border-warning/40 bg-warning-soft mb-6 flex flex-wrap items-start gap-3 rounded-lg border p-4"
    >
      <AlertTriangle
        className="text-warning mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="text-foreground font-medium">
          Supabase is not configured yet
        </p>
        <p className="text-foreground-muted">
          Copy{' '}
          <code className="bg-surface rounded px-1 py-0.5 text-xs">
            .env.example
          </code>{' '}
          to{' '}
          <code className="bg-surface rounded px-1 py-0.5 text-xs">
            .env.local
          </code>{' '}
          and fill in your project URL and anon key. Then apply the migrations
          in{' '}
          <code className="bg-surface rounded px-1 py-0.5 text-xs">
            supabase/migrations
          </code>{' '}
          and restart the dev server.
        </p>
        <p className="text-foreground-muted text-xs">
          {product.name} will not start without them — there is no offline mode,
          because a starter that fakes a backend teaches the wrong lesson.
        </p>
      </div>
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
      >
        Open Supabase
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}
