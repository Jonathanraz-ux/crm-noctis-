import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Kanban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { supabase } from '@/lib/supabase';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation';
import { useToast } from '@/providers/ToastProvider';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) {
      toastError('Reset failed', error.message);
      return;
    }
    success('Password updated', 'You can now sign in with your new password.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-surface-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-surface border-line animate-fade-in w-full max-w-md space-y-6 rounded-lg border p-8 shadow-md">
        <div className="space-y-2 text-center">
          <span className="bg-primary text-on-primary mx-auto grid size-10 place-items-center rounded-lg">
            <Kanban className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">Set new password</h1>
          <p className="text-foreground-muted text-sm">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <NoctisField
                type="password"
                label="New password"
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
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
