import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Kanban, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { supabase } from '@/lib/supabase';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validation';
import { useToast } from '@/providers/ToastProvider';

export function ForgotPasswordPage() {
  const { success, error: toastError } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toastError('Reset request failed', error.message);
      return;
    }
    success(
      'Check your inbox',
      'A password reset link has been sent to your email address.',
    );
  };

  return (
    <div className="bg-surface-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-surface border-line animate-fade-in w-full max-w-md space-y-6 rounded-lg border p-8 shadow-md">
        <div className="space-y-2 text-center">
          <span className="bg-primary text-on-primary mx-auto grid size-10 place-items-center rounded-lg">
            <Kanban className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">Forgot password?</h1>
          <p className="text-foreground-muted text-sm">
            Enter the email address on your account and we'll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <NoctisField
                type="email"
                label="Email"
                placeholder="you@company.com"
                autoComplete="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.email?.message}
              />
            )}
          />

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <Link
          to="/login"
          className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
