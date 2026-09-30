import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from '@/config/product';
import { formatCurrency, formatDate } from '@/lib/format';
import { toErrorMessage } from '@/lib/errors';
import type { Deal } from '@/lib/types/database';
import { useToast } from '@/providers/ToastProvider';
import { Building2, Calendar, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { useUpdateDealStage } from './pipeline.hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PipelineBoardProps {
  deals: (Deal & {
    prospects?: { name: string; company: string | null } | null;
    contacts?: { name: string; email: string | null } | null;
  })[];
  organizationId: string;
  onEditDeal: (deal: Deal) => void;
  onAddDealToStage?: (stage: DealStage) => void;
  canEdit?: boolean;
}

export function PipelineBoard({
  deals,
  organizationId,
  onEditDeal,
  onAddDealToStage,
  canEdit = true,
}: PipelineBoardProps) {
  const { success, error: toastError } = useToast();
  const updateStageMutation = useUpdateDealStage();
  const [movingDealId, setMovingDealId] = useState<string | null>(null);

  const handleMoveStage = async (dealId: string, newStage: DealStage) => {
    try {
      setMovingDealId(dealId);
      await updateStageMutation.mutateAsync({
        organizationId,
        id: dealId,
        stage: newStage,
      });
      success(`Moved deal to ${DEAL_STAGE_LABELS[newStage]}`);
    } catch (caught) {
      toastError('Failed to update stage', toErrorMessage(caught));
    } finally {
      setMovingDealId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

        return (
          <div
            key={stage}
            className="flex flex-col rounded-xl bg-surface-subtle border border-line p-3 min-w-[260px]"
          >
            {/* Stage Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                    {DEAL_STAGE_LABELS[stage]}
                  </h3>
                  <span className="size-5 rounded-full bg-surface-muted text-[11px] font-bold text-foreground-muted flex items-center justify-center">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground-muted tabular mt-0.5">
                  {formatCurrency(stageTotal)}
                </p>
              </div>

              {canEdit && onAddDealToStage ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onAddDealToStage(stage)}
                  title={`Add deal to ${DEAL_STAGE_LABELS[stage]}`}
                >
                  <Plus size={14} />
                </Button>
              ) : null}
            </div>

            {/* Stage Cards */}
            <div className="flex flex-col gap-2.5 flex-1 min-h-[150px]">
              {stageDeals.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-line rounded-lg p-4 text-center">
                  <p className="text-[11px] text-foreground-subtle">No deals in this stage</p>
                </div>
              ) : (
                stageDeals.map((deal) => {
                  const isMoving = movingDealId === deal.id;

                  return (
                    <Card
                      key={deal.id}
                      className="cursor-pointer transition-all hover:border-primary hover:shadow-xs group relative bg-surface"
                      onClick={() => onEditDeal(deal)}
                    >
                      <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                          {deal.title}
                        </CardTitle>
                        {canEdit ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-6 text-foreground-subtle hover:text-foreground"
                                >
                                  <MoreHorizontal size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
                                {DEAL_STAGES.map((st) => (
                                  <DropdownMenuItem
                                    key={st}
                                    disabled={st === deal.stage || isMoving}
                                    onClick={() => handleMoveStage(deal.id, st)}
                                  >
                                    {DEAL_STAGE_LABELS[st]}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onEditDeal(deal)}>
                                  Edit Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </CardHeader>

                      <CardContent className="p-3 pt-0 text-xs">
                        <div className="font-bold text-sm text-foreground tabular mb-2">
                          {formatCurrency(deal.value)}
                        </div>

                        {deal.prospects ? (
                          <div className="flex items-center gap-1.5 text-foreground-muted text-[11px] mb-1 truncate">
                            <Building2 size={12} className="shrink-0 text-foreground-subtle" />
                            <span className="truncate">
                              {deal.prospects.name}{' '}
                              {deal.prospects.company ? `(${deal.prospects.company})` : ''}
                            </span>
                          </div>
                        ) : null}

                        {deal.expected_close_date ? (
                          <div className="flex items-center gap-1.5 text-foreground-subtle text-[11px]">
                            <Calendar size={12} className="shrink-0" />
                            <span>Target: {formatDate(deal.expected_close_date)}</span>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
