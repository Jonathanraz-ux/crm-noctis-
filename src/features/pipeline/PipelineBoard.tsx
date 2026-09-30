import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DEAL_STAGES,
  DEAL_STAGE_LABELS,
  type DealStage,
} from '@/config/product';
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
    <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-3 lg:grid-cols-6">
      {DEAL_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageTotal = stageDeals.reduce(
          (sum, d) => sum + (Number(d.value) || 0),
          0,
        );

        return (
          <div
            key={stage}
            className="bg-surface-subtle border-line flex min-w-[260px] flex-col rounded-xl border p-3"
          >
            {/* Stage Column Header */}
            <div className="border-line mb-3 flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-foreground text-xs font-semibold tracking-wider uppercase">
                    {DEAL_STAGE_LABELS[stage]}
                  </h3>
                  <span className="bg-surface-muted text-foreground-muted flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-foreground-muted tabular mt-0.5 text-xs font-semibold">
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
            <div className="flex min-h-[150px] flex-1 flex-col gap-2.5">
              {stageDeals.length === 0 ? (
                <div className="border-line flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <p className="text-foreground-subtle text-[11px]">
                    No deals in this stage
                  </p>
                </div>
              ) : (
                stageDeals.map((deal) => {
                  const isMoving = movingDealId === deal.id;

                  return (
                    <Card
                      key={deal.id}
                      className="hover:border-primary group bg-surface relative cursor-pointer transition-all hover:shadow-xs"
                      onClick={() => onEditDeal(deal)}
                    >
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-3 pb-2">
                        <CardTitle className="text-foreground line-clamp-2 text-xs leading-snug font-semibold">
                          {deal.title}
                        </CardTitle>
                        {canEdit ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-foreground-subtle hover:text-foreground size-6"
                                >
                                  <MoreHorizontal size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                  Move to Stage
                                </DropdownMenuLabel>
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
                                <DropdownMenuItem
                                  onClick={() => onEditDeal(deal)}
                                >
                                  Edit Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </CardHeader>

                      <CardContent className="p-3 pt-0 text-xs">
                        <div className="text-foreground tabular mb-2 text-sm font-bold">
                          {formatCurrency(deal.value)}
                        </div>

                        {deal.prospects ? (
                          <div className="text-foreground-muted mb-1 flex items-center gap-1.5 truncate text-[11px]">
                            <Building2
                              size={12}
                              className="text-foreground-subtle shrink-0"
                            />
                            <span className="truncate">
                              {deal.prospects.name}{' '}
                              {deal.prospects.company
                                ? `(${deal.prospects.company})`
                                : ''}
                            </span>
                          </div>
                        ) : null}

                        {deal.expected_close_date ? (
                          <div className="text-foreground-subtle flex items-center gap-1.5 text-[11px]">
                            <Calendar size={12} className="shrink-0" />
                            <span>
                              Target: {formatDate(deal.expected_close_date)}
                            </span>
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
