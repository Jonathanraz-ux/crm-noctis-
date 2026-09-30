import { Badge } from './ui/primitives';
import {
  DEAL_STAGE_LABELS,
  type DealStage,
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STATUS_LABELS,
  type ProspectSource,
  type ProspectStatus,
  ROLE_LABELS,
  type RoleKey,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/config/product';

export function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
  const variants: Record<
    ProspectStatus,
    'default' | 'secondary' | 'success' | 'warning' | 'danger'
  > = {
    new: 'default',
    contacted: 'secondary',
    qualified: 'success',
    unqualified: 'danger',
    converted: 'warning',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {PROSPECT_STATUS_LABELS[status] || status}
    </Badge>
  );
}

export function ProspectSourceBadge({ source }: { source: ProspectSource }) {
  return (
    <Badge variant="secondary">
      {PROSPECT_SOURCE_LABELS[source] || source}
    </Badge>
  );
}

export function DealStageBadge({ stage }: { stage: DealStage }) {
  const variants: Record<
    DealStage,
    'default' | 'secondary' | 'success' | 'warning' | 'danger'
  > = {
    lead: 'secondary',
    discovery: 'default',
    proposal: 'warning',
    negotiation: 'default',
    won: 'success',
    lost: 'danger',
  };

  return (
    <Badge variant={variants[stage] || 'secondary'}>
      {DEAL_STAGE_LABELS[stage] || stage}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const variants: Record<
    TaskStatus,
    'default' | 'secondary' | 'success' | 'danger'
  > = {
    pending: 'secondary',
    in_progress: 'default',
    completed: 'success',
    cancelled: 'danger',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {TASK_STATUS_LABELS[status] || status}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const variants: Record<
    TaskPriority,
    'default' | 'secondary' | 'warning' | 'danger'
  > = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    urgent: 'danger',
  };

  return (
    <Badge variant={variants[priority] || 'secondary'}>
      {TASK_PRIORITY_LABELS[priority] || priority}
    </Badge>
  );
}

export function RoleBadge({ roleKey }: { roleKey: RoleKey }) {
  const variants: Record<
    RoleKey,
    'default' | 'secondary' | 'success' | 'warning'
  > = {
    owner: 'default',
    admin: 'warning',
    manager: 'success',
    member: 'secondary',
    viewer: 'secondary',
  };

  return (
    <Badge variant={variants[roleKey] || 'secondary'}>
      {ROLE_LABELS[roleKey] || roleKey}
    </Badge>
  );
}
