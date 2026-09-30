import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Kanban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { supabase } from '@/lib/supabase';
import { signUpSchema, type SignUpInput } from '@/lib/validation';
import { product } from '@/config/product';
import { useToast } from '@/providers/ToastProvider';

export function SignUpPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = async (data: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (error) {
      toastError('Sign up failed', error.message);
      return;
    }
    success('Account created', 'Check your email to confirm, then sign in.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-surface-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-surface border-line animate-fade-in w-full max-w-md space-y-6 rounded-lg border p-8 shadow-md">
        <div className="space-y-2 text-center">
          <span className="bg-primary text-on-primary mx-auto grid size-10 place-items-center rounded-lg">
            <Kanban className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-foreground-muted text-sm">
            Get started with {product.shortName}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <NoctisField
                label="Full name"
                placeholder="Jane Doe"
                autoComplete="name"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.fullName?.message}
              />
            )}
          />

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

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <NoctisField
                type="password"
                label="Password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.password?.message}
              />
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <NoctisField
                type="password"
                label="Confirm password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.confirmPassword?.message}
              />
            )}
          />

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="text-foreground-muted text-center text-xs">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
