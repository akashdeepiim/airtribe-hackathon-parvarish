export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activity_batches: {
        Row: {
          child_id: string;
          created_at: string;
          id: string;
          items: NonNullable<Json>;
          model: string;
          prompt_version: string;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          child_id: string;
          created_at?: string;
          id?: string;
          items: NonNullable<Json>;
          model: string;
          prompt_version: string;
          week_start: string;
        };
        Update: {
          child_id?: string;
          created_at?: string;
          id?: string;
          items?: NonNullable<Json>;
          model?: string;
          prompt_version?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_batches_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_feedback: {
        Row: {
          activity_index: number;
          batch_id: string;
          child_id: string;
          created_at: string;
          id: string;
          memory_id: string | null;
          signal: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          activity_index: number;
          batch_id: string;
          child_id: string;
          created_at?: string;
          id?: string;
          memory_id?: string | null;
          signal: string;
          user_id: string;
        };
        Update: {
          activity_index?: number;
          batch_id?: string;
          child_id?: string;
          created_at?: string;
          id?: string;
          memory_id?: string | null;
          signal?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_feedback_child_id_batch_id_fkey';
            columns: ['child_id', 'batch_id'];
            isOneToOne: false;
            referencedRelation: 'activity_batches';
            referencedColumns: ['child_id', 'id'];
          },
          {
            foreignKeyName: 'activity_feedback_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_feedback_child_id_memory_id_fkey';
            columns: ['child_id', 'memory_id'];
            isOneToOne: false;
            referencedRelation: 'memories';
            referencedColumns: ['child_id', 'id'];
          },
          {
            foreignKeyName: 'activity_feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      allergies: {
        Row: {
          allergen: string;
          child_id: string;
          id: string;
          notes: string;
          severity: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          allergen: string;
          child_id: string;
          id?: string;
          notes?: string;
          severity: string;
          type: string;
        };
        Update: {
          allergen?: string;
          child_id?: string;
          id?: string;
          notes?: string;
          severity?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'allergies_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          at: string;
          child_id: string;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          at?: string;
          child_id: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          at?: string;
          child_id?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_log_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
        ];
      };
      child_invites: {
        Row: {
          accepted_at: string | null;
          child_id: string;
          created_at: string;
          email_hash: string;
          expires_at: string;
          id: string;
          invited_by: string;
          relationship: string;
          revoked_at: string | null;
          role: Database['public']['Enums']['member_role'];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          child_id: string;
          created_at?: string;
          email_hash: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          relationship: string;
          revoked_at?: string | null;
          role: Database['public']['Enums']['member_role'];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          child_id?: string;
          created_at?: string;
          email_hash?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          relationship?: string;
          revoked_at?: string | null;
          role?: Database['public']['Enums']['member_role'];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'child_invites_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'child_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      child_member_permissions: {
        Row: {
          allowed: boolean;
          capability: Database['public']['Enums']['capability'];
          child_id: string;
          granted_by: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          allowed: boolean;
          capability: Database['public']['Enums']['capability'];
          child_id: string;
          granted_by: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allowed?: boolean;
          capability?: Database['public']['Enums']['capability'];
          child_id?: string;
          granted_by?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'child_member_permissions_child_id_user_id_fkey';
            columns: ['child_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'child_members';
            referencedColumns: ['child_id', 'user_id'];
          },
          {
            foreignKeyName: 'child_member_permissions_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      child_members: {
        Row: {
          child_id: string;
          created_at: string;
          invited_by: string | null;
          relationship: string;
          role: Database['public']['Enums']['member_role'];
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          child_id: string;
          created_at?: string;
          invited_by?: string | null;
          relationship?: string;
          role: Database['public']['Enums']['member_role'];
          status?: string;
          user_id: string;
        };
        Update: {
          child_id?: string;
          created_at?: string;
          invited_by?: string | null;
          relationship?: string;
          role?: Database['public']['Enums']['member_role'];
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'child_members_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'child_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'child_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      child_milestones: {
        Row: {
          achieved_on: string | null;
          child_id: string;
          consult_card_shown_at: string | null;
          last_prompted_at: string | null;
          memory_id: string | null;
          milestone_id: string;
          next_prompt_at: string | null;
          nudges_enabled: boolean;
          recorded_by: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          achieved_on?: string | null;
          child_id: string;
          consult_card_shown_at?: string | null;
          last_prompted_at?: string | null;
          memory_id?: string | null;
          milestone_id: string;
          next_prompt_at?: string | null;
          nudges_enabled?: boolean;
          recorded_by: string;
          status: string;
        };
        Update: {
          achieved_on?: string | null;
          child_id?: string;
          consult_card_shown_at?: string | null;
          last_prompted_at?: string | null;
          memory_id?: string | null;
          milestone_id?: string;
          next_prompt_at?: string | null;
          nudges_enabled?: boolean;
          recorded_by?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'child_milestones_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'child_milestones_child_id_memory_id_fkey';
            columns: ['child_id', 'memory_id'];
            isOneToOne: false;
            referencedRelation: 'memories';
            referencedColumns: ['child_id', 'id'];
          },
          {
            foreignKeyName: 'child_milestones_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestone_catalog';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'child_milestones_recorded_by_fkey';
            columns: ['recorded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      children: {
        Row: {
          avatar_path: string | null;
          city: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          dob: string;
          id: string;
          interests: string[];
          name: string;
          sex: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          city?: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          dob: string;
          id?: string;
          interests?: string[];
          name: string;
          sex?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          city?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          dob?: string;
          id?: string;
          interests?: string[];
          name?: string;
          sex?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'children_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      community_directory: {
        Row: {
          age_focus: string | null;
          city: string | null;
          description: string;
          id: string;
          last_verified_at: string | null;
          name: string;
          platform: string;
          status: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          age_focus?: string | null;
          city?: string | null;
          description: string;
          id?: string;
          last_verified_at?: string | null;
          name: string;
          platform: string;
          status?: string;
          url: string;
        };
        Update: {
          age_focus?: string | null;
          city?: string | null;
          description?: string;
          id?: string;
          last_verified_at?: string | null;
          name?: string;
          platform?: string;
          status?: string;
          url?: string;
        };
        Relationships: [];
      };
      community_suggestions: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
          url: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          city: string;
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
          url: string;
          user_id: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'community_suggestions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      consents: {
        Row: {
          child_id: string;
          decided_at: string;
          decision: Database['public']['Enums']['consent_decision'];
          granted_at: string | null;
          id: string;
          notice_version: string;
          purpose: Database['public']['Enums']['consent_purpose'];
          user_id: string;
          verification_method: Database['public']['Enums']['verification_method'];
          withdrawn_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          child_id: string;
          decided_at?: string;
          decision: Database['public']['Enums']['consent_decision'];
          granted_at?: string | null;
          id?: string;
          notice_version: string;
          purpose: Database['public']['Enums']['consent_purpose'];
          user_id: string;
          verification_method: Database['public']['Enums']['verification_method'];
          withdrawn_at?: string | null;
        };
        Update: {
          child_id?: string;
          decided_at?: string;
          decision?: Database['public']['Enums']['consent_decision'];
          granted_at?: string | null;
          id?: string;
          notice_version?: string;
          purpose?: Database['public']['Enums']['consent_purpose'];
          user_id?: string;
          verification_method?: Database['public']['Enums']['verification_method'];
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'consents_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      memories: {
        Row: {
          caption: string;
          child_id: string;
          created_at: string;
          id: string;
          milestone_id: string | null;
          people_tags: string[];
          storage_path: string;
          taken_at: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          caption?: string;
          child_id: string;
          created_at?: string;
          id?: string;
          milestone_id?: string | null;
          people_tags?: string[];
          storage_path: string;
          taken_at: string;
          uploaded_by: string;
        };
        Update: {
          caption?: string;
          child_id?: string;
          created_at?: string;
          id?: string;
          milestone_id?: string | null;
          people_tags?: string[];
          storage_path?: string;
          taken_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memories_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_milestone_id_fkey';
            columns: ['milestone_id'];
            isOneToOne: false;
            referencedRelation: 'milestone_catalog';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      milestone_catalog: {
        Row: {
          clinical_review_status: string;
          consult_by_months: number;
          consult_copy: string;
          domain: string;
          id: string;
          prompt_question: string;
          reassurance_copy: string;
          source: string;
          title: string;
          typical_months: number;
          window_start_months: number;
        };
        ComputedFields: never;
        Insert: {
          clinical_review_status?: string;
          consult_by_months: number;
          consult_copy: string;
          domain: string;
          id?: string;
          prompt_question: string;
          reassurance_copy: string;
          source: string;
          title: string;
          typical_months: number;
          window_start_months: number;
        };
        Update: {
          clinical_review_status?: string;
          consult_by_months?: number;
          consult_copy?: string;
          domain?: string;
          id?: string;
          prompt_question?: string;
          reassurance_copy?: string;
          source?: string;
          title?: string;
          typical_months?: number;
          window_start_months?: number;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          child_id: string;
          quiet_end: string;
          quiet_start: string;
          show_child_name: boolean;
          timezone: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          child_id: string;
          quiet_end?: string;
          quiet_start?: string;
          show_child_name?: boolean;
          timezone?: string;
          user_id: string;
        };
        Update: {
          child_id?: string;
          quiet_end?: string;
          quiet_start?: string;
          show_child_name?: boolean;
          timezone?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications_log: {
        Row: {
          child_id: string;
          id: string;
          response: string | null;
          sent_at: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          child_id: string;
          id?: string;
          response?: string | null;
          sent_at?: string;
          type: string;
          user_id: string;
        };
        Update: {
          child_id?: string;
          id?: string;
          response?: string | null;
          sent_at?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_log_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          capability: Database['public']['Enums']['capability'];
          role: Database['public']['Enums']['member_role'];
        };
        ComputedFields: never;
        Insert: {
          capability: Database['public']['Enums']['capability'];
          role: Database['public']['Enums']['member_role'];
        };
        Update: {
          capability?: Database['public']['Enums']['capability'];
          role?: Database['public']['Enums']['member_role'];
        };
        Relationships: [];
      };
      users: {
        Row: {
          city: string;
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          phone: string | null;
        };
        ComputedFields: never;
        Insert: {
          city?: string;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id: string;
          phone?: string | null;
        };
        Update: {
          city?: string;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      vaccination_logs: {
        Row: {
          card_photo_path: string | null;
          child_id: string;
          given_on: string;
          id: string;
          notes: string;
          vaccine_name: string;
        };
        ComputedFields: never;
        Insert: {
          card_photo_path?: string | null;
          child_id: string;
          given_on: string;
          id?: string;
          notes?: string;
          vaccine_name: string;
        };
        Update: {
          card_photo_path?: string | null;
          child_id?: string;
          given_on?: string;
          id?: string;
          notes?: string;
          vaccine_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vaccination_logs_child_id_fkey';
            columns: ['child_id'];
            isOneToOne: false;
            referencedRelation: 'children';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: { adult: boolean; choices: Json; invite_token: string; notice_version: string };
        Returns: string;
      };
      authorize_photo: { Args: { object_path: string }; Returns: boolean };
      create_child: {
        Args: { adult_guardian: boolean; choices: Json; notice_version: string; profile: Json };
        Returns: string;
      };
      create_invite: {
        Args: {
          cid: string;
          member_role: Database['public']['Enums']['member_role'];
          recipient_email: string;
          relationship: string;
        };
        Returns: Json;
      };
      get_my_access: { Args: { cid: string }; Returns: Json };
      list_invites: {
        Args: { cid: string };
        Returns: {
          accepted_at: string;
          expires_at: string;
          id: string;
          relationship: string;
          revoked_at: string;
          role: Database['public']['Enums']['member_role'];
        }[];
      };
      read_health: { Args: { cid: string }; Returns: Json };
      revoke_invite: { Args: { invite_id: string }; Returns: undefined };
      revoke_member: { Args: { cid: string; member_id: string }; Returns: undefined };
      set_child_avatar: { Args: { cid: string; object_path: string }; Returns: undefined };
      set_consent: {
        Args: {
          cid: string;
          granted: boolean;
          notice_version: string;
          purpose: Database['public']['Enums']['consent_purpose'];
        };
        Returns: undefined;
      };
      set_member_access: {
        Args: { cid: string; member_id: string; permissions: Json; relationship: string };
        Returns: undefined;
      };
      update_child: { Args: { cid: string; profile: Json }; Returns: undefined };
      write_health: {
        Args: { cid: string; entity: string; payload: Json; record_id: string; remove?: boolean };
        Returns: string;
      };
    };
    Enums: {
      capability:
        | 'profile.read'
        | 'profile.edit'
        | 'memories.read'
        | 'memories.add'
        | 'memories.edit_own'
        | 'memories.edit_all'
        | 'memories.delete_own'
        | 'memories.delete_all'
        | 'milestones.read'
        | 'milestones.write'
        | 'activities.read'
        | 'activities.feedback'
        | 'family.read'
        | 'family.manage'
        | 'health.read'
        | 'health.write'
        | 'audit.read';
      consent_decision: 'granted' | 'declined' | 'withdrawn';
      consent_purpose: 'memories' | 'milestones' | 'health' | 'personalisation' | 'notifications';
      member_role: 'owner' | 'co_parent' | 'family_contributor' | 'family_viewer';
      verification_method: 'self_declaration' | 'digilocker' | 'token';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      capability: [
        'profile.read',
        'profile.edit',
        'memories.read',
        'memories.add',
        'memories.edit_own',
        'memories.edit_all',
        'memories.delete_own',
        'memories.delete_all',
        'milestones.read',
        'milestones.write',
        'activities.read',
        'activities.feedback',
        'family.read',
        'family.manage',
        'health.read',
        'health.write',
        'audit.read',
      ],
      consent_decision: ['granted', 'declined', 'withdrawn'],
      consent_purpose: ['memories', 'milestones', 'health', 'personalisation', 'notifications'],
      member_role: ['owner', 'co_parent', 'family_contributor', 'family_viewer'],
      verification_method: ['self_declaration', 'digilocker', 'token'],
    },
  },
} as const;
