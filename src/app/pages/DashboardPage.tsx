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

  const { data: prospectsData } = useProspects({
    organizationId: orgId,
    page: 1,
    pageSize: 1,
  });
  const { data: contactsData } = useContacts({
    organizationId: orgId,
    page: 1,
    pageSize: 1,
  });
  const { data: dealsData } = useDeals({
    organizationId: orgId,
    page: 1,
    pageSize: 200,
  });

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
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your CRM workspace."
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<UserSearch className="text-primary size-5" />}
          title="Prospects"
          value={totalProspects}
        />
        <StatCard
          icon={<Contact2 className="text-info size-5" />}
          title="Contacts"
          value={totalContacts}
        />
        <StatCard
          icon={<Kanban className="text-warning size-5" />}
          title="Active deals"
          value={totalDeals}
        />
        <StatCard
          icon={<DollarSign className="text-success size-5" />}
          title="Pipeline value"
          value={formatCurrency(totalPipelineValue)}
        />
      </div>

      {/* Pipeline summary */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="text-foreground-muted size-4" />
          <h2 className="text-sm font-semibold">Pipeline Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className="bg-surface-subtle border-line rounded-lg border p-3 text-center"
            >
              <p className="tabular text-2xl font-bold">
                {stageMap.get(stage) ?? 0}
              </p>
              <p className="text-foreground-muted mt-1 text-xs">
                {DEAL_STAGE_LABELS[stage]}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Won deals highlight */}
      <Card className="bg-success-soft/30 border-success/20 p-5">
        <div className="flex items-center gap-3">
          <div className="bg-success text-on-primary grid size-10 place-items-center rounded-lg">
            <DollarSign className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Closed Won</p>
            <p className="tabular text-2xl font-bold">
              {formatCurrency(wonValue)}
            </p>
          </div>
          <div className="text-foreground-muted ml-auto flex items-center gap-1 text-xs">
            <ListChecks className="size-3.5" />
            {deals.filter((d) => d.stage === 'won').length} deal(s)
          </div>
        </div>
      </Card>
    </div>
  );
}
