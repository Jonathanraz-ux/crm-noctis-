/**
 * Hand-written TypeScript description of the Noctis CRM Supabase schema.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };

      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          timezone?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          timezone?: string;
        };
        Relationships: [];
      };

      permissions: {
        Row: { code: string; label: string; category: string; description: string | null };
        Insert: { code: string; label: string; category: string; description?: string | null };
        Update: never;
        Relationships: [];
      };

      roles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          rank: number;
          is_system: boolean;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          rank?: number;
          is_system?: boolean;
        };
        Update: never;
        Relationships: [];
      };

      role_permissions: {
        Row: { role_id: string; permission_code: string };
        Insert: { role_id: string; permission_code: string };
        Update: never;
        Relationships: [];
      };

      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          email: string;
          role_key: string;
          status: 'invited' | 'active' | 'suspended';
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          email: string;
          role_key: string;
          status?: 'invited' | 'active' | 'suspended';
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role_key?: string;
          status?: 'invited' | 'active' | 'suspended';
          user_id?: string | null;
        };
        Relationships: [];
      };

      prospects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          source: 'website' | 'referral' | 'outreach' | 'event' | 'inbound' | 'partner' | 'other';
          status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
          tags: string[];
          notes: string | null;
          owner_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: 'website' | 'referral' | 'outreach' | 'event' | 'inbound' | 'partner' | 'other';
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
          tags?: string[];
          notes?: string | null;
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: 'website' | 'referral' | 'outreach' | 'event' | 'inbound' | 'partner' | 'other';
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
          tags?: string[];
          notes?: string | null;
          owner_id?: string | null;
        };
        Relationships: [];
      };

      contacts: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          job_title: string | null;
          company: string | null;
          prospect_id: string | null;
          tags: string[];
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          job_title?: string | null;
          company?: string | null;
          prospect_id?: string | null;
          tags?: string[];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          job_title?: string | null;
          company?: string | null;
          prospect_id?: string | null;
          tags?: string[];
          notes?: string | null;
        };
        Relationships: [];
      };

      deals: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          value: number;
          stage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
          expected_close_date: string | null;
          prospect_id: string | null;
          contact_id: string | null;
          owner_id: string | null;
          tags: string[];
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          value?: number;
          stage?: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
          expected_close_date?: string | null;
          prospect_id?: string | null;
          contact_id?: string | null;
          owner_id?: string | null;
          tags?: string[];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          value?: number;
          stage?: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
          expected_close_date?: string | null;
          prospect_id?: string | null;
          contact_id?: string | null;
          owner_id?: string | null;
          tags?: string[];
          notes?: string | null;
        };
        Relationships: [];
      };

      tasks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          assignee_id: string | null;
          prospect_id: string | null;
          contact_id: string | null;
          deal_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          assignee_id?: string | null;
          prospect_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          assignee_id?: string | null;
          prospect_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_prospect_id_fkey',
            columns: ['prospect_id'],
            isOneToOne: false,
            referencedRelation: 'prospects',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'tasks_deal_id_fkey',
            columns: ['deal_id'],
            isOneToOne: false,
            referencedRelation: 'deals',
            referencedColumns: ['id'],
          },
        ];
      };

      notes: {
        Row: {
          id: string;
          organization_id: string;
          body: string;
          prospect_id: string | null;
          contact_id: string | null;
          deal_id: string | null;
          author_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          body: string;
          prospect_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          author_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          prospect_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          author_id?: string | null;
        };
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: number;
          organization_id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };

    Views: {
      v_org_stats: {
        Row: {
          organization_id: string;
          total_prospects: number;
          active_prospects: number;
          total_contacts: number;
          total_deals: number;
          total_pipeline_value: number;
          won_deals: number;
          won_pipeline_value: number;
          pending_tasks: number;
          members_total: number;
          members_active: number;
        };
        Relationships: [];
      };

      v_deals_by_stage: {
        Row: {
          organization_id: string;
          stage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
          count: number;
          total_value: number;
        };
        Relationships: [];
      };

      v_deals_by_month: {
        Row: {
          organization_id: string;
          month: string;
          won_count: number;
          won_value: number;
          total_count: number;
          total_value: number;
        };
        Relationships: [];
      };

      v_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          email: string;
          role_key: string;
          status: 'invited' | 'active' | 'suspended';
          invited_by: string | null;
          created_at: string;
          full_name: string | null;
          avatar_url: string | null;
          has_account: boolean;
        };
        Relationships: [];
      };
    };

    Functions: {
      claim_invites: { Args: Record<string, never>; Returns: Json };
      create_organization: {
        Args: { p_name: string; p_timezone?: string };
        Returns: string;
      };
    };

    Enums: {
      membership_status: 'invited' | 'active' | 'suspended';
      prospect_status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
      deal_stage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';
      task_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      task_priority: 'low' | 'medium' | 'high' | 'urgent';
    };

    CompositeTypes: never;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type Membership = Database['public']['Tables']['memberships']['Row'];
export type Prospect = Database['public']['Tables']['prospects']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Deal = Database['public']['Tables']['deals']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export type OrgStats = Database['public']['Views']['v_org_stats']['Row'];
export type DealsByStage = Database['public']['Views']['v_deals_by_stage']['Row'];
export type DealsByMonth = Database['public']['Views']['v_deals_by_month']['Row'];
export type MemberRow = Database['public']['Views']['v_members']['Row'];
