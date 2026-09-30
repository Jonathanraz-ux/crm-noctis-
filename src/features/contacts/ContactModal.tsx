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
import { useProspects } from '@/features/prospects/prospects.hooks';
import type { Contact } from '@/lib/types/database';
import { contactSchema, type ContactInput } from '@/lib/validation';
import { toErrorMessage } from '@/lib/errors';
import { useToast } from '@/providers/ToastProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateContact, useUpdateContact } from './contacts.hooks';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contact?: Contact | null;
  defaultProspectId?: string;
}

export function ContactModal({
  open,
  onOpenChange,
  organizationId,
  contact,
  defaultProspectId,
}: ContactModalProps) {
  const { success, error: toastError } = useToast();
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const isEditing = Boolean(contact);

  const { data: prospectsData } = useProspects({
    organizationId,
    pageSize: 100,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      job_title: '',
      company: '',
      prospect_id: defaultProspectId ?? undefined,
      tags: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        job_title: contact.job_title ?? '',
        company: contact.company ?? '',
        prospect_id: contact.prospect_id ?? undefined,
        tags: contact.tags ?? [],
        notes: contact.notes ?? '',
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        job_title: '',
        company: '',
        prospect_id: defaultProspectId ?? undefined,
        tags: [],
        notes: '',
      });
    }
  }, [contact, defaultProspectId, reset, open]);

  const onSubmit = async (data: ContactInput) => {
    try {
      if (isEditing && contact) {
        await updateMutation.mutateAsync({
          organizationId,
          id: contact.id,
          input: data,
        });
        success('Contact updated successfully');
      } else {
        await createMutation.mutateAsync({
          organizationId,
          input: data,
        });
        success('Contact created successfully');
      }
      onOpenChange(false);
    } catch (caught) {
      toastError('Failed to save contact', toErrorMessage(caught));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update contact details and account associations.'
              : 'Add an individual stakeholder or contact to your directory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <NoctisField
                  label="Full Name"
                  required
                  placeholder="e.g. Vikram Patel"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              name="job_title"
              control={control}
              render={({ field }) => (
                <NoctisField
                  label="Job Title"
                  placeholder="e.g. Lead Architect"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.job_title?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <NoctisField
                  type="email"
                  label="Email Address"
                  placeholder="vikram@company.com"
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
                  placeholder="+1-555-0122"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.phone?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <NoctisField
                  label="Company"
                  placeholder="Company name"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errorMessage={errors.company?.message}
                />
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="prospect-link-select">Linked Prospect / Account</Label>
              <Controller
                name="prospect_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="prospect-link-select"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">None (Independent contact)</option>
                    {prospectsData?.prospects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.company ? `(${p.company})` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-notes-textarea">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="contact-notes-textarea"
                  placeholder="Meeting notes, role in decision process..."
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
              {isEditing ? 'Save Changes' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
