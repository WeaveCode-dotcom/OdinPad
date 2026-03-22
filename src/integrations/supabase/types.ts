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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      novels: {
        Row: {
          author: string
          created_at: string
          data: Json
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          created_at?: string
          data: Json
          id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          created_at?: string
          data?: Json
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_migrations: {
        Row: {
          created_at: string
          novels_imported_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          novels_imported_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          novels_imported_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          behavior_pace: string | null
          behavior_support: string | null
          checklist_character_done: boolean
          checklist_goal_done: boolean
          checklist_opening_scene_done: boolean
          created_at: string
          daily_word_goal: number
          default_framework_id: string | null
          first_100_words_at: string | null
          font_family: string
          font_size: number
          genres: string[]
          guided_tour_completed_at: string | null
          line_spacing: number
          onboarding_completed_at: string | null
          onboarding_deferred: boolean
          onboarding_step: string
          pomodoro_minutes: number
          preferred_workspace_mode: string | null
          primary_goal: string | null
          reminder_daily: boolean
          reminder_progress_email: string
          reminder_push_enabled: boolean
          reminder_streak: boolean
          theme: string
          typewriter_mode: boolean
          updated_at: string
          user_id: string
          weekly_word_goal: number
          writing_stage: string | null
          writing_style: string | null
        }
        Insert: {
          behavior_pace?: string | null
          behavior_support?: string | null
          checklist_character_done?: boolean
          checklist_goal_done?: boolean
          checklist_opening_scene_done?: boolean
          created_at?: string
          daily_word_goal?: number
          default_framework_id?: string | null
          first_100_words_at?: string | null
          font_family?: string
          font_size?: number
          genres?: string[]
          guided_tour_completed_at?: string | null
          line_spacing?: number
          onboarding_completed_at?: string | null
          onboarding_deferred?: boolean
          onboarding_step?: string
          pomodoro_minutes?: number
          preferred_workspace_mode?: string | null
          primary_goal?: string | null
          reminder_daily?: boolean
          reminder_progress_email?: string
          reminder_push_enabled?: boolean
          reminder_streak?: boolean
          theme?: string
          typewriter_mode?: boolean
          updated_at?: string
          user_id: string
          weekly_word_goal?: number
          writing_stage?: string | null
          writing_style?: string | null
        }
        Update: {
          behavior_pace?: string | null
          behavior_support?: string | null
          checklist_character_done?: boolean
          checklist_goal_done?: boolean
          checklist_opening_scene_done?: boolean
          created_at?: string
          daily_word_goal?: number
          default_framework_id?: string | null
          first_100_words_at?: string | null
          font_family?: string
          font_size?: number
          genres?: string[]
          guided_tour_completed_at?: string | null
          line_spacing?: number
          onboarding_completed_at?: string | null
          onboarding_deferred?: boolean
          onboarding_step?: string
          pomodoro_minutes?: number
          preferred_workspace_mode?: string | null
          primary_goal?: string | null
          reminder_daily?: boolean
          reminder_progress_email?: string
          reminder_push_enabled?: boolean
          reminder_streak?: boolean
          theme?: string
          typewriter_mode?: boolean
          updated_at?: string
          user_id?: string
          weekly_word_goal?: number
          writing_stage?: string | null
          writing_style?: string | null
        }
        Relationships: []
      }
      user_stats_daily: {
        Row: {
          created_at: string
          project_count: number
          session_count: number
          stat_date: string
          updated_at: string
          user_id: string
          words_written: number
        }
        Insert: {
          created_at?: string
          project_count?: number
          session_count?: number
          stat_date?: string
          updated_at?: string
          user_id: string
          words_written?: number
        }
        Update: {
          created_at?: string
          project_count?: number
          session_count?: number
          stat_date?: string
          updated_at?: string
          user_id?: string
          words_written?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
