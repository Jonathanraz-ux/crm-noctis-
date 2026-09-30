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
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '@/config/product';
import { useContacts } from '@/features/contacts/contacts.hooks';
import { useProspects } from '@/features/prospects/prospects.hooks';
import type { Deal } from '@/lib/types/database';
import { dealSchema, type DealInput } from '@/lib/validation';
import { toErrorMessage } from '@/lib/errors';
import { useToast } from '@/providers/ToastProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useCreateDeal, useUpdateDeal } from './pipeline.hooks';

interface DealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  deal?: Deal | null;
  defaultProspectId?: string;
  defaultStage?: Deal['stage'];
}

export function DealModal({
  open,
  onOpenChange,
  organizationId,
  deal,
  defaultProspectId,
  defaultStage = 'lead',
}: DealModalProps) {
  const { success, error: toastError } = useToast();
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const isEditing = Boolean(deal);

  const { data: prospectsData } = useProspects({
    organizationId,
    pageSize: 100,
  });

  const { data: contactsData } = useContacts({
    organizationId,
    pageSize: 100,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DealInput>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      value: 0,
      stage: defaultStage,
      expected_close_date: '',
      prospect_id: defaultProspectId ?? undefined,
      contact_id: undefined,
      tags: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (deal) {
      reset({
        title: deal.title,
        value: Number(deal.value) || 0,
        stage: deal.stage,
        expected_close_date: deal.expected_close_date ?? '',
        prospect_id: deal.prospect_id ?? undefined,
        contact_id: deal.contact_id ?? undefined,
        tags: deal.tags ?? [],
        notes: deal.notes ?? '',
      });
    } else {
      reset({
        title: '',
        value: 0,
        stage: defaultStage,
        expected_close_date: '',
        prospect_id: defaultProspectId ?? undefined,
        contact_id: undefined,
        tags: [],
        notes: '',
      });
    }
  }, [deal, defaultProspectId, defaultStage, reset, open]);

  const onSubmit = async (data: DealInput) => {
    try {
      if (isEditing && deal) {
        await updateMutation.mutateAsync({
          organizationId,
          id: deal.id,
          input: data,
        });
        success('Deal updated successfully');
      } else {
        await createMutation.mutateAsync({
          organizationId,
          input: data,
        });
        success('Deal added to pipeline');
      }
      onOpenChange(false);
    } catch (caught) {
      toastError('Failed to save deal', toErrorMessage(caught));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Opportunity' : 'New Pipeline Deal'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update deal value, stage, and target close date.'
              : 'Add a new revenue opportunity to the pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <NoctisField
                label="Opportunity / Deal Title"
                required
                placeholder="e.g. AeroPulse Global License"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.title?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <NoctisField
                  type="number"
                  label="Deal Value ($)"
                  placeholder="0.00"
                  value={field.value}
                  onChange={(val) =>
                    field.onChange(val === '' ? 0 : Number(val))
                  }
                  onBlur={field.onBlur}
                  errorMessage={errors.value?.message}
                />
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="deal-stage-select">Pipeline Stage</Label>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <Select
                    id="deal-stage-select"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {DEAL_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {DEAL_STAGE_LABELS[st]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deal-prospect-select">
                Linked Prospect / Account
              </Label>
              <Controller
                name="prospect_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="deal-prospect-select"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">None (Independent deal)</option>
                    {prospectsData?.prospects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.company ? `(${p.company})` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-contact-select">
                Key Stakeholder Contact
              </Label>
              <Controller
                name="contact_id"
                control={control}
                render={({ field }) => (
                  <Select
                    id="deal-contact-select"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">None</option>
                    {contactsData?.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.job_title ? `— ${c.job_title}` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          <Controller
            name="expected_close_date"
            control={control}
            render={({ field }) => (
              <NoctisField
                type="text"
                label="Target Close Date (YYYY-MM-DD)"
                placeholder="2026-12-31"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.expected_close_date?.message}
              />
            )}
          />

          <div className="space-y-1.5">
            <Label htmlFor="deal-notes-textarea">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="deal-notes-textarea"
                  placeholder="Deal background, terms, risk factors..."
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
              {isEditing ? 'Save Changes' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
