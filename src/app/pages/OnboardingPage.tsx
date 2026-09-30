import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Kanban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NoctisField } from '@/components/noctis-field';
import { organizationCreateSchema, type OrganizationCreateInput } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { product } from '@/config/product';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { createOrganization, signOut } = useAuth();
  const { success, error: toastError } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationCreateInput>({
    resolver: zodResolver(organizationCreateSchema),
    defaultValues: {
      name: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const onSubmit = async (data: OrganizationCreateInput) => {
    try {
      await createOrganization(data.name, data.timezone);
      success('Workspace created', `"${data.name}" is ready to go.`);
      navigate('/', { replace: true });
    } catch (err) {
      toastError('Failed to create workspace', (err as Error).message);
    }
  };

  return (
    <div className="bg-surface-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-surface border-line w-full max-w-md space-y-6 rounded-lg border p-8 shadow-md animate-fade-in">
        <div className="text-center space-y-2">
          <span className="bg-primary text-on-primary mx-auto grid size-10 place-items-center rounded-lg">
            <Kanban className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">Create your workspace</h1>
          <p className="text-foreground-muted text-sm">
            A workspace is your team's shared CRM environment in {product.shortName}.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <NoctisField
                label="Workspace name"
                placeholder="Acme Inc."
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.name?.message}
              />
            )}
          />

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create workspace
          </Button>
        </form>

        <button
          type="button"
          onClick={signOut}
          className="text-foreground-muted hover:text-foreground text-xs font-medium cursor-pointer"
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
