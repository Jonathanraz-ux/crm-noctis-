import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Kanban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { supabase } from '@/lib/supabase';
import { signInSchema, type SignInInput } from '@/lib/validation';
import { product } from '@/config/product';
import { useToast } from '@/providers/ToastProvider';

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { error: toastError } = useToast();
  const from = (location.state as { from?: string })?.from ?? '/';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (data: SignInInput) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toastError('Sign in failed', error.message);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="bg-surface-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-surface border-line animate-fade-in w-full max-w-md space-y-6 rounded-lg border p-8 shadow-md">
        <div className="space-y-2 text-center">
          <span className="bg-primary text-on-primary mx-auto grid size-10 place-items-center rounded-lg">
            <Kanban className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">{product.shortName}</h1>
          <p className="text-foreground-muted text-sm">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <NoctisField
                id="email"
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

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <NoctisField
                id="password"
                type="password"
                label="Password"
                placeholder="••••••"
                autoComplete="current-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.password?.message}
              />
            )}
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-primary text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="text-foreground-muted text-center text-xs">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
