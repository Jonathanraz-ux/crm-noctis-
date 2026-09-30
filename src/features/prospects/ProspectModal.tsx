import { NoctisField } from '@/components/noctis-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label, Select, Textarea } from '@/components/ui/primitives';
import {
  PROSPECT_SOURCES,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
} from '@/config/product';
import type { Prospect } from '@/lib/types/database';
import { prospectSchema, type ProspectInput } from '@/lib/validation';
import { toErrorMessage } from '@/lib/errors';
import { useToast } from '@/providers/ToastProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateProspect, useUpdateProspect } from './prospects.hooks';

interface ProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  prospect?: Prospect | null;
}

export function ProspectModal({
  open,
  onOpenChange,
  organizationId,
  prospect,
}: ProspectModalProps) {
  const { success, error: toastError } = useToast();
  const createMutation = useCreateProspect();
  const updateMutation = useUpdateProspect();
  const isEditing = Boolean(prospect);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProspectInput>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      source: 'website',
      status: 'new',
      tags: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (prospect) {
      reset({
        name: prospect.name,
        company: prospect.company ?? '',
        email: prospect.email ?? '',
        phone: prospect.phone ?? '',
        source: prospect.source,
        status: prospect.status,
        tags: prospect.tags ?? [],
        notes: prospect.notes ?? '',
        owner_id: prospect.owner_id ?? undefined,
      });
    } else {
      reset({
        name: '',
        company: '',
        email: '',
        phone: '',
        source: 'website',
        status: 'new',
        tags: [],
        notes: '',
      });
    }
  }, [prospect, reset, open]);

  const onSubmit = async (data: ProspectInput) => {
    try {
      if (isEditing && prospect) {
        await updateMutation.mutateAsync({
          organizationId,
          id: prospect.id,
          input: data,
        });
        success('Prospect updated successfully');
      } else {
        await createMutation.mutateAsync({
          organizationId,
          input: data,
        });
        success('Prospect created successfully');
      }
      onOpenChange(false);
    } catch (caught) {
      toastError('Failed to save prospect', toErrorMessage(caught));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Prospect' : 'Add New Prospect'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update details for this lead or prospective account.'
              : 'Add a new sales prospect to your organization.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <NoctisField
                  label="Name"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <NoctisField
                  label="Company"
                  placeholder="e.g. AeroPulse Dynamics"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.company?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <NoctisField
                  type="email"
                  label="Email"
                  placeholder="contact@company.com"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.email?.message}
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <NoctisField
                  type="tel"
                  label="Phone Number"
                  placeholder="+1-555-0100"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.phone?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-select">Lead Source</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    id="source-select"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {PROSPECT_SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {PROSPECT_SOURCE_LABELS[src]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-select">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    id="status-select"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {PROSPECT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {PROSPECT_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes-textarea">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="notes-textarea"
                  placeholder="Key requirements, background info, or next steps..."
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Prospect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
