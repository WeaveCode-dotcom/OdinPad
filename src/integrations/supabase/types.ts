export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      app_remote_config: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      book_series: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_seed_prompts: {
        Row: {
          anchors_used: Json;
          context_snapshot: Json | null;
          generated_at: string;
          id: string;
          prompt: string;
          prompt_date: string;
          user_id: string;
        };
        Insert: {
          anchors_used?: Json;
          context_snapshot?: Json | null;
          generated_at?: string;
          id?: string;
          prompt: string;
          prompt_date: string;
          user_id: string;
        };
        Update: {
          anchors_used?: Json;
          context_snapshot?: Json | null;
          generated_at?: string;
          id?: string;
          prompt?: string;
          prompt_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      idea_web_entries: {
        Row: {
          body: string;
          category: string | null;
          created_at: string;
          deleted_at: string | null;
          harvest_target_novel_id: string | null;
          harvested_at: string | null;
          id: string;
          idea_type: string;
          metadata: Json;
          mood: string | null;
          novel_id: string | null;
          pinned: boolean;
          remind_at: string | null;
          source_type: string | null;
          status: string;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          category?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          harvest_target_novel_id?: string | null;
          harvested_at?: string | null;
          id: string;
          idea_type?: string;
          metadata?: Json;
          mood?: string | null;
          novel_id?: string | null;
          pinned?: boolean;
          remind_at?: string | null;
          source_type?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          category?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          harvest_target_novel_id?: string | null;
          harvested_at?: string | null;
          id?: string;
          idea_type?: string;
          metadata?: Json;
          mood?: string | null;
          novel_id?: string | null;
          pinned?: boolean;
          remind_at?: string | null;
          source_type?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_web_entries_harvest_target_novel_id_fkey";
            columns: ["harvest_target_novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_web_entries_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_web_links: {
        Row: {
          created_at: string;
          from_entry_id: string;
          id: string;
          kind: string;
          to_entry_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          from_entry_id: string;
          id: string;
          kind?: string;
          to_entry_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          from_entry_id?: string;
          id?: string;
          kind?: string;
          to_entry_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_web_links_from_entry_id_fkey";
            columns: ["from_entry_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_web_links_to_entry_id_fkey";
            columns: ["to_entry_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      novels: {
        Row: {
          author: string;
          created_at: string;
          data: Json;
          id: string;
          series_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author?: string;
          created_at?: string;
          data: Json;
          id: string;
          series_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          series_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "novels_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "book_series";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      sandbox_braindump_sessions: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          metadata: Json;
          novel_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id: string;
          metadata?: Json;
          novel_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          novel_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_braindump_sessions_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_conversations: {
        Row: {
          created_at: string;
          element_id: string | null;
          element_type: string;
          id: string;
          metadata: Json;
          novel_id: string | null;
          title: string;
          transcript: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          element_id?: string | null;
          element_type?: string;
          id: string;
          metadata?: Json;
          novel_id?: string | null;
          title?: string;
          transcript?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          element_id?: string | null;
          element_type?: string;
          id?: string;
          metadata?: Json;
          novel_id?: string | null;
          title?: string;
          transcript?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_conversations_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_daily_seed: {
        Row: {
          created_at: string;
          prompt_key: string;
          prompt_text: string;
          seed_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          prompt_key: string;
          prompt_text: string;
          seed_date: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          prompt_key?: string;
          prompt_text?: string;
          seed_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sandbox_expansion_sessions: {
        Row: {
          created_at: string;
          element_type: string;
          expanded_content: Json;
          id: string;
          metadata: Json;
          novel_id: string | null;
          promoted_to: Json | null;
          source_idea_id: string | null;
          template_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          element_type?: string;
          expanded_content?: Json;
          id: string;
          metadata?: Json;
          novel_id?: string | null;
          promoted_to?: Json | null;
          source_idea_id?: string | null;
          template_id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          element_type?: string;
          expanded_content?: Json;
          id?: string;
          metadata?: Json;
          novel_id?: string | null;
          promoted_to?: Json | null;
          source_idea_id?: string | null;
          template_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_expansion_sessions_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sandbox_expansion_sessions_source_idea_id_fkey";
            columns: ["source_idea_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_gamification_events: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          kind: string;
          payload?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      sandbox_list_items: {
        Row: {
          content: string;
          created_at: string;
          favorite: boolean;
          id: string;
          list_id: string;
          metadata: Json;
          rank: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          favorite?: boolean;
          id: string;
          list_id: string;
          metadata?: Json;
          rank?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          list_id?: string;
          metadata?: Json;
          rank?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "sandbox_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_lists: {
        Row: {
          created_at: string;
          id: string;
          list_type: string;
          metadata: Json;
          name: string;
          novel_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          list_type?: string;
          metadata?: Json;
          name?: string;
          novel_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          list_type?: string;
          metadata?: Json;
          name?: string;
          novel_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_lists_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_map_edges: {
        Row: {
          created_at: string;
          edge_type: string;
          id: string;
          label: string | null;
          map_id: string;
          source_node_id: string;
          target_node_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          edge_type?: string;
          id: string;
          label?: string | null;
          map_id: string;
          source_node_id: string;
          target_node_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          edge_type?: string;
          id?: string;
          label?: string | null;
          map_id?: string;
          source_node_id?: string;
          target_node_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_map_edges_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "sandbox_maps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sandbox_map_edges_source_node_id_fkey";
            columns: ["source_node_id"];
            isOneToOne: false;
            referencedRelation: "sandbox_map_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sandbox_map_edges_target_node_id_fkey";
            columns: ["target_node_id"];
            isOneToOne: false;
            referencedRelation: "sandbox_map_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_map_nodes: {
        Row: {
          color: string | null;
          content: string;
          created_at: string;
          id: string;
          linked_codex_id: string | null;
          linked_idea_id: string | null;
          map_id: string;
          metadata: Json;
          node_type: string;
          status: string | null;
          updated_at: string;
          user_id: string;
          x: number;
          y: number;
        };
        Insert: {
          color?: string | null;
          content?: string;
          created_at?: string;
          id: string;
          linked_codex_id?: string | null;
          linked_idea_id?: string | null;
          map_id: string;
          metadata?: Json;
          node_type?: string;
          status?: string | null;
          updated_at?: string;
          user_id: string;
          x?: number;
          y?: number;
        };
        Update: {
          color?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          linked_codex_id?: string | null;
          linked_idea_id?: string | null;
          map_id?: string;
          metadata?: Json;
          node_type?: string;
          status?: string | null;
          updated_at?: string;
          user_id?: string;
          x?: number;
          y?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_map_nodes_linked_idea_id_fkey";
            columns: ["linked_idea_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sandbox_map_nodes_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "sandbox_maps";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_maps: {
        Row: {
          created_at: string;
          id: string;
          layout_data: Json;
          map_type: string;
          name: string;
          novel_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          layout_data?: Json;
          map_type?: string;
          name?: string;
          novel_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          layout_data?: Json;
          map_type?: string;
          name?: string;
          novel_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_maps_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      sandbox_prompt_events: {
        Row: {
          created_at: string;
          id: string;
          idea_web_entry_id: string | null;
          metadata: Json;
          novel_id: string | null;
          prompt_key: string;
          prompt_text: string;
          prompt_type: string;
          user_id: string;
          user_response: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          idea_web_entry_id?: string | null;
          metadata?: Json;
          novel_id?: string | null;
          prompt_key?: string;
          prompt_text?: string;
          prompt_type?: string;
          user_id: string;
          user_response?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          idea_web_entry_id?: string | null;
          metadata?: Json;
          novel_id?: string | null;
          prompt_key?: string;
          prompt_text?: string;
          prompt_type?: string;
          user_id?: string;
          user_response?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sandbox_prompt_events_idea_web_entry_id_fkey";
            columns: ["idea_web_entry_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sandbox_prompt_events_novel_id_fkey";
            columns: ["novel_id"];
            isOneToOne: false;
            referencedRelation: "novels";
            referencedColumns: ["id"];
          },
        ];
      };
      user_daily_quotes: {
        Row: {
          character_name: string;
          created_at: string;
          id: string;
          quote_date: string;
          quote_text: string;
          user_id: string;
          work_title: string;
        };
        Insert: {
          character_name: string;
          created_at?: string;
          id?: string;
          quote_date: string;
          quote_text: string;
          user_id: string;
          work_title: string;
        };
        Update: {
          character_name?: string;
          created_at?: string;
          id?: string;
          quote_date?: string;
          quote_text?: string;
          user_id?: string;
          work_title?: string;
        };
        Relationships: [];
      };
      user_migrations: {
        Row: {
          created_at: string;
          novels_imported_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          novels_imported_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          novels_imported_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_odyssey_badges: {
        Row: {
          badge_key: string;
          earned_at: string;
          id: string;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          badge_key: string;
          earned_at?: string;
          id?: string;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          badge_key?: string;
          earned_at?: string;
          id?: string;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      user_odyssey_points: {
        Row: {
          total_points: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          total_points?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          total_points?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          ai_companion: Json;
          behavior_pace: string | null;
          behavior_support: string | null;
          checklist_character_done: boolean;
          checklist_goal_done: boolean;
          checklist_opening_scene_done: boolean;
          created_at: string;
          daily_word_goal: number;
          default_framework_id: string | null;
          first_100_words_at: string | null;
          first_run_idea_web_visited: boolean;
          first_run_novel_created: boolean;
          first_run_write_opened: boolean;
          font_family: string;
          font_size: number;
          foundations_badge_unlocked: boolean;
          gamification_enabled: boolean;
          genres: string[];
          guided_tour_completed_at: string | null;
          idea_web_settings: Json;
          line_spacing: number;
          onboarding_completed_at: string | null;
          onboarding_deferred: boolean;
          onboarding_skip_reason: string | null;
          onboarding_step: string;
          pomodoro_minutes: number;
          preferred_workspace_mode: string | null;
          primary_goal: string | null;
          reminder_daily: boolean;
          reminder_progress_email: string;
          reminder_push_enabled: boolean;
          reminder_streak: boolean;
          seasonal_events_enabled: boolean;
          show_odyssey_ui: boolean;
          streak_rest_date: string | null;
          theme: string;
          typewriter_mode: boolean;
          updated_at: string;
          user_id: string;
          weekly_word_goal: number;
          writing_stage: string | null;
          writing_style: string | null;
        };
        Insert: {
          ai_companion?: Json;
          behavior_pace?: string | null;
          behavior_support?: string | null;
          checklist_character_done?: boolean;
          checklist_goal_done?: boolean;
          checklist_opening_scene_done?: boolean;
          created_at?: string;
          daily_word_goal?: number;
          default_framework_id?: string | null;
          first_100_words_at?: string | null;
          first_run_idea_web_visited?: boolean;
          first_run_novel_created?: boolean;
          first_run_write_opened?: boolean;
          font_family?: string;
          font_size?: number;
          foundations_badge_unlocked?: boolean;
          gamification_enabled?: boolean;
          genres?: string[];
          guided_tour_completed_at?: string | null;
          idea_web_settings?: Json;
          line_spacing?: number;
          onboarding_completed_at?: string | null;
          onboarding_deferred?: boolean;
          onboarding_skip_reason?: string | null;
          onboarding_step?: string;
          pomodoro_minutes?: number;
          preferred_workspace_mode?: string | null;
          primary_goal?: string | null;
          reminder_daily?: boolean;
          reminder_progress_email?: string;
          reminder_push_enabled?: boolean;
          reminder_streak?: boolean;
          seasonal_events_enabled?: boolean;
          show_odyssey_ui?: boolean;
          streak_rest_date?: string | null;
          theme?: string;
          typewriter_mode?: boolean;
          updated_at?: string;
          user_id: string;
          weekly_word_goal?: number;
          writing_stage?: string | null;
          writing_style?: string | null;
        };
        Update: {
          ai_companion?: Json;
          behavior_pace?: string | null;
          behavior_support?: string | null;
          checklist_character_done?: boolean;
          checklist_goal_done?: boolean;
          checklist_opening_scene_done?: boolean;
          created_at?: string;
          daily_word_goal?: number;
          default_framework_id?: string | null;
          first_100_words_at?: string | null;
          first_run_idea_web_visited?: boolean;
          first_run_novel_created?: boolean;
          first_run_write_opened?: boolean;
          font_family?: string;
          font_size?: number;
          foundations_badge_unlocked?: boolean;
          gamification_enabled?: boolean;
          genres?: string[];
          guided_tour_completed_at?: string | null;
          idea_web_settings?: Json;
          line_spacing?: number;
          onboarding_completed_at?: string | null;
          onboarding_deferred?: boolean;
          onboarding_skip_reason?: string | null;
          onboarding_step?: string;
          pomodoro_minutes?: number;
          preferred_workspace_mode?: string | null;
          primary_goal?: string | null;
          reminder_daily?: boolean;
          reminder_progress_email?: string;
          reminder_push_enabled?: boolean;
          reminder_streak?: boolean;
          seasonal_events_enabled?: boolean;
          show_odyssey_ui?: boolean;
          streak_rest_date?: string | null;
          theme?: string;
          typewriter_mode?: boolean;
          updated_at?: string;
          user_id?: string;
          weekly_word_goal?: number;
          writing_stage?: string | null;
          writing_style?: string | null;
        };
        Relationships: [];
      };
      user_quote_fingerprints: {
        Row: {
          created_at: string;
          fingerprint: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fingerprint: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          fingerprint?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_stats_daily: {
        Row: {
          created_at: string;
          project_count: number;
          session_count: number;
          stat_date: string;
          updated_at: string;
          user_id: string;
          words_written: number;
        };
        Insert: {
          created_at?: string;
          project_count?: number;
          session_count?: number;
          stat_date?: string;
          updated_at?: string;
          user_id: string;
          words_written?: number;
        };
        Update: {
          created_at?: string;
          project_count?: number;
          session_count?: number;
          stat_date?: string;
          updated_at?: string;
          user_id?: string;
          words_written?: number;
        };
        Relationships: [];
      };
      weekly_digests: {
        Row: {
          best_seed_id: string | null;
          best_seed_reason: string | null;
          created_at: string;
          id: string;
          summary: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          best_seed_id?: string | null;
          best_seed_reason?: string | null;
          created_at?: string;
          id?: string;
          summary: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          best_seed_id?: string | null;
          best_seed_reason?: string | null;
          created_at?: string;
          id?: string;
          summary?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_digests_best_seed_id_fkey";
            columns: ["best_seed_id"];
            isOneToOne: false;
            referencedRelation: "idea_web_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      writing_sessions: {
        Row: {
          created_at: string;
          duration_secs: number;
          ended_at: string;
          id: string;
          novel_id: string | null;
          started_at: string;
          user_id: string;
          words_written: number;
        };
        Insert: {
          created_at?: string;
          duration_secs?: number;
          ended_at: string;
          id?: string;
          novel_id?: string | null;
          started_at: string;
          user_id: string;
          words_written?: number;
        };
        Update: {
          created_at?: string;
          duration_secs?: number;
          ended_at?: string;
          id?: string;
          novel_id?: string | null;
          started_at?: string;
          user_id?: string;
          words_written?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_my_account: { Args: never; Returns: undefined };
      increment_user_daily_words: {
        Args: { p_delta: number; p_stat_date: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
