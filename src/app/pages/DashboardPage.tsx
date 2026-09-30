import {
  Contact2,
  DollarSign,
  Kanban,
  ListChecks,
  TrendingUp,
  UserSearch,
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { useProspects } from '@/features/prospects/prospects.hooks';
import { useContacts } from '@/features/contacts/contacts.hooks';
import { useDeals } from '@/features/pipeline/pipeline.hooks';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
} from '@/config/product';
import { formatCurrency } from '@/lib/format';

export function DashboardPage() {
  const { activeOrganizationId } = useAuth();
  const orgId = activeOrganizationId ?? '';

  const { data: prospectsData } = useProspects({ organizationId: orgId, page: 1, pageSize: 1 });
  const { data: contactsData } = useContacts({ organizationId: orgId, page: 1, pageSize: 1 });
  const { data: dealsData } = useDeals({ organizationId: orgId, page: 1, pageSize: 200 });

  const totalProspects = prospectsData?.totalCount ?? 0;
  const totalContacts = contactsData?.totalCount ?? 0;
  const deals = dealsData?.deals ?? [];
  const totalDeals = deals.length;
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const wonValue = deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  // Deals by stage for a mini pipeline summary
  const stageMap = new Map<DealStage, number>();
  for (const stage of DEAL_STAGES) stageMap.set(stage, 0);
  for (const d of deals) {
    const st = d.stage as DealStage;
    stageMap.set(st, (stageMap.get(st) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" description="Overview of your CRM workspace." />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<UserSearch className="size-5 text-primary" />}
          title="Prospects"
          value={totalProspects}
        />
        <StatCard
          icon={<Contact2 className="size-5 text-info" />}
          title="Contacts"
          value={totalContacts}
        />
        <StatCard
          icon={<Kanban className="size-5 text-warning" />}
          title="Active deals"
          value={totalDeals}
        />
        <StatCard
          icon={<DollarSign className="size-5 text-success" />}
          title="Pipeline value"
          value={formatCurrency(totalPipelineValue)}
        />
      </div>

      {/* Pipeline summary */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-foreground-muted" />
          <h2 className="text-sm font-semibold">Pipeline Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className="bg-surface-subtle rounded-lg p-3 text-center border border-line"
            >
              <p className="text-2xl font-bold tabular">{stageMap.get(stage) ?? 0}</p>
              <p className="text-xs text-foreground-muted mt-1">
                {DEAL_STAGE_LABELS[stage]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Won deals highlight */}
      <Card className="p-5 bg-success-soft/30 border-success/20">
        <div className="flex items-center gap-3">
          <div className="bg-success text-on-primary grid size-10 place-items-center rounded-lg">
            <DollarSign className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Closed Won</p>
            <p className="text-2xl font-bold tabular">{formatCurrency(wonValue)}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-foreground-muted">
            <ListChecks className="size-3.5" />
            {deals.filter((d) => d.stage === 'won').length} deal(s)
          </div>
        </div>
      </Card>
    </div>
  );
}
