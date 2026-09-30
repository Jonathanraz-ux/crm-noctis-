/**
 * Product configuration — Noctis CRM
 *
 * Single place to rebrand the kit and configure CRM domains.
 */

export const product = {
  name: 'Noctis CRM',
  shortName: 'Noctis CRM',
  tagline: 'A production-ready commercial CRM starter for Supabase',
  description:
    'Multi-tenant CRM with pipeline management, prospects, contacts, deals, tasks, activity notes, and audited CRUD — powered by React 19 and Supabase Row Level Security.',
  supportUrl: 'https://example.com/support',
  docsUrl: 'https://example.com/docs',
} as const;

/** Default locale + currency used by format helpers. */
export const defaults = {
  locale: 'en-US',
  currency: 'USD',
  timezone: 'UTC',
} as const;

/** localStorage keys. */
export const storageKeys = {
  theme: 'noctis-crm.theme',
  activeOrg: 'noctis-crm.active-org',
  sidebarCollapsed: 'noctis-crm.sidebar-collapsed',
} as const;

export const ROLE_KEYS = [
  'owner',
  'admin',
  'manager',
  'member',
  'viewer',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

/** Roles allowed to reach Members and Roles administration. */
export const ORG_ADMIN_ROLES: readonly RoleKey[] = ['owner', 'admin'];

export const PROSPECT_SOURCES = [
  'website',
  'referral',
  'outreach',
  'event',
  'inbound',
  'partner',
  'other',
] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  website: 'Website',
  referral: 'Referral',
  outreach: 'Outreach',
  event: 'Event / Conference',
  inbound: 'Inbound Inquiry',
  partner: 'Partner',
  other: 'Other',
};

export const PROSPECT_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  converted: 'Converted',
};

export const DEAL_STAGES = [
  'lead',
  'discovery',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead In',
  discovery: 'Discovery',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

export const TASK_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
