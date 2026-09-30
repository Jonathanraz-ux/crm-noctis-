import { useState } from 'react';
import { Kanban, Plus } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DEAL_STAGES, type DealStage } from '@/config/product';
import { DealModal } from '@/features/pipeline/DealModal';
import { PipelineBoard } from '@/features/pipeline/PipelineBoard';
import { useDeals } from '@/features/pipeline/pipeline.hooks';
import { toErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/AuthProvider';
import type { Deal } from '@/lib/types/database';

export function PipelinePage() {
  const { activeOrganizationId, can } = useAuth();
  const orgId = activeOrganizationId ?? '';
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStage, setDefaultStage] = useState<DealStage>(DEAL_STAGES[0]);

  const { data, isLoading, error } = useDeals({
    organizationId: orgId,
    pageSize: 200,
  });
  const deals = data?.deals ?? [];

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) setEditingDeal(null);
  };

  const openCreate = (stage: DealStage) => {
    setEditingDeal(null);
    setDefaultStage(stage);
    setModalOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Pipeline"
        description="Visualize and manage your deal pipeline across stages."
      >
        {can('deals.create') && (
          <Button
            leftIcon={<Plus className="size-4" />}
            onClick={() => openCreate(DEAL_STAGES[0])}
          >
            New Deal
          </Button>
        )}
      </PageHeader>

      {error ? (
        <Card className="border-danger/40">
          <CardContent className="text-danger p-5 text-sm">
            {toErrorMessage(error)}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-foreground-muted text-sm">Loading pipeline…</p>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={<Kanban className="size-5" />}
          title="No deals yet"
          description="Add your first deal to start tracking it through the stages."
          action={
            can('deals.create') ? (
              <Button
                leftIcon={<Plus className="size-4" />}
                onClick={() => openCreate(DEAL_STAGES[0])}
              >
                New Deal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PipelineBoard
          deals={deals}
          organizationId={orgId}
          onEditDeal={(deal) => {
            setEditingDeal(deal);
            setModalOpen(true);
          }}
          onAddDealToStage={openCreate}
          canEdit={can('deals.update')}
        />
      )}

      <DealModal
        open={modalOpen}
        onOpenChange={handleOpenChange}
        organizationId={orgId}
        deal={editingDeal}
        defaultStage={defaultStage}
      />
    </div>
  );
}
