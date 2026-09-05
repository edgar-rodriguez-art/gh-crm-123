/**
 * ARCHIVO GENERADO. NO SE EDITA A MANO.  (CLAUDE.md §4 prohibición 19)
 *
 * Origen: proyecto Supabase `dbcrm123` (ref sdcaqjzuaayxqioequdb).
 * Regenerar con:
 *     supabase gen types typescript --project-id sdcaqjzuaayxqioequdb > packages/core/src/types/database.ts
 *
 * Es la garantía de que el código no puede referirse a una columna que no
 * existe. Si una consulta no compila, la culpa es de la consulta, no del tipo.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          author_id: string
          created_at: string
          customer_id: string
          id: string
          next_action_at: string | null
          note: string
          opportunity_id: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          author_id: string
          created_at?: string
          customer_id: string
          id?: string
          next_action_at?: string | null
          note: string
          opportunity_id: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          author_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          next_action_at?: string | null
          note?: string
          opportunity_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_opportunity_board"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          emails_sent: number
          error_message: string | null
          finished_at: string | null
          flow: string
          id: string
          started_at: string
          status: Database["public"]["Enums"]["automation_status"]
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          triggered_by: string | null
        }
        Insert: {
          emails_sent?: number
          error_message?: string | null
          finished_at?: string | null
          flow: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["automation_status"]
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          triggered_by?: string | null
        }
        Update: {
          emails_sent?: number
          error_message?: string | null
          finished_at?: string | null
          flow?: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["automation_status"]
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          company: string | null
          created_at: string
          created_by: string
          full_name: string
          id: string
          is_archived: boolean
          owner_id: string
          phone: string
          source: Database["public"]["Enums"]["customer_source"] | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          full_name: string
          id?: string
          is_archived?: boolean
          owner_id: string
          phone: string
          source?: Database["public"]["Enums"]["customer_source"] | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          full_name?: string
          id?: string
          is_archived?: boolean
          owner_id?: string
          phone?: string
          source?: Database["public"]["Enums"]["customer_source"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "customers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      opportunities: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          customer_id: string
          estimated_amount: number
          final_amount: number | null
          id: string
          last_activity_at: string
          loss_note: string | null
          loss_reason: Database["public"]["Enums"]["loss_reason"] | null
          next_action_at: string | null
          owner_id: string
          stage: Database["public"]["Enums"]["opportunity_stage"]
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          estimated_amount: number
          final_amount?: number | null
          id?: string
          last_activity_at?: string
          loss_note?: string | null
          loss_reason?: Database["public"]["Enums"]["loss_reason"] | null
          next_action_at?: string | null
          owner_id: string
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          estimated_amount?: number
          final_amount?: number | null
          id?: string
          last_activity_at?: string
          loss_note?: string | null
          loss_reason?: Database["public"]["Enums"]["loss_reason"] | null
          next_action_at?: string | null
          owner_id?: string
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      quotas: {
        Row: {
          amount_eur: number
          created_at: string
          id: string
          period_month: number
          period_year: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          amount_eur: number
          created_at?: string
          id?: string
          period_month: number
          period_year: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          amount_eur?: number
          created_at?: string
          id?: string
          period_month?: number
          period_year?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      v_loss_reasons_month: {
        Row: {
          loss_reason: Database["public"]["Enums"]["loss_reason"] | null
          lost_count: number | null
          lost_estimated_amount: number | null
        }
        Relationships: []
      }
      v_opportunity_board: {
        Row: {
          created_at: string | null
          customer_company: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_source: Database["public"]["Enums"]["customer_source"] | null
          days_without_activity: number | null
          estimated_amount: number | null
          is_due_today: boolean | null
          is_overdue: boolean | null
          is_stale: boolean | null
          last_activity_at: string | null
          needs_attention: boolean | null
          next_action_at: string | null
          opportunity_id: string | null
          owner_id: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"] | null
          threshold_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_month_progress"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      v_seller_month_progress: {
        Row: {
          closed_amount: number | null
          closed_count: number | null
          email: string | null
          full_name: string | null
          needs_attention_count: number | null
          period_month: number | null
          period_year: number | null
          profile_id: string | null
          quota_amount: number | null
          quota_percent: number | null
          remaining_amount: number | null
          username: string | null
        }
        Relationships: []
      }
      v_team_month_progress: {
        Row: {
          sellers_count: number | null
          team_closed: number | null
          team_closed_count: number | null
          team_needs_attention: number | null
          team_quota: number | null
          team_quota_percent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
      owns_customer: { Args: { p_customer_id: string }; Returns: boolean }
      period_month_madrid: { Args: { p_ts: string }; Returns: number }
      period_year_madrid: { Args: { p_ts: string }; Returns: number }
      stale_threshold_days: {
        Args: { p_stage: Database["public"]["Enums"]["opportunity_stage"] }
        Returns: number
      }
    }
    Enums: {
      activity_type: "call" | "whatsapp" | "email" | "visit" | "note"
      automation_status: "running" | "success" | "failed"
      automation_trigger: "scheduled" | "manual"
      customer_source:
        | "physical_store"
        | "whatsapp"
        | "instagram"
        | "trade_show"
        | "referral"
        | "inbound_call"
        | "other"
      loss_reason:
        | "price"
        | "no_response"
        | "bought_from_competitor"
        | "no_budget"
        | "bad_timing"
        | "cancellation"
        | "other"
      opportunity_stage:
        | "new"
        | "contacted"
        | "proposal_sent"
        | "negotiation"
        | "closed"
      opportunity_status: "open" | "won" | "lost"
      user_role: "seller" | "supervisor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: ["call", "whatsapp", "email", "visit", "note"],
      automation_status: ["running", "success", "failed"],
      automation_trigger: ["scheduled", "manual"],
      customer_source: [
        "physical_store",
        "whatsapp",
        "instagram",
        "trade_show",
        "referral",
        "inbound_call",
        "other",
      ],
      loss_reason: [
        "price",
        "no_response",
        "bought_from_competitor",
        "no_budget",
        "bad_timing",
        "cancellation",
        "other",
      ],
      opportunity_stage: [
        "new",
        "contacted",
        "proposal_sent",
        "negotiation",
        "closed",
      ],
      opportunity_status: ["open", "won", "lost"],
      user_role: ["seller", "supervisor"],
    },
  },
} as const
