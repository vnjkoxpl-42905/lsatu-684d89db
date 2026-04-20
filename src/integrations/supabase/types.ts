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
      achievements: {
        Row: {
          achievement_id: string | null
          badge_id: string
          category: string | null
          class_id: string
          earned_at: string | null
          id: string
          progress: Json | null
          requirement: string | null
          unlocked_at: string | null
        }
        Insert: {
          achievement_id?: string | null
          badge_id: string
          category?: string | null
          class_id: string
          earned_at?: string | null
          id?: string
          progress?: Json | null
          requirement?: string | null
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string | null
          badge_id?: string
          category?: string | null
          class_id?: string
          earned_at?: string | null
          id?: string
          progress?: Json | null
          requirement?: string | null
          unlocked_at?: string | null
        }
        Relationships: []
      }
      attempts: {
        Row: {
          app_version: string | null
          br_answer: string | null
          br_changed: boolean | null
          br_delta: string | null
          br_marked: boolean | null
          br_outcome: string | null
          br_rationale: string | null
          br_selected: boolean | null
          br_time_ms: number | null
          class_id: string
          confidence: number | null
          correct: boolean
          id: string
          level: number
          mode: string
          pre_answer: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          selected_answer: string | null
          set_id: string | null
          time_ms: number
          timestamp_iso: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          br_answer?: string | null
          br_changed?: boolean | null
          br_delta?: string | null
          br_marked?: boolean | null
          br_outcome?: string | null
          br_rationale?: string | null
          br_selected?: boolean | null
          br_time_ms?: number | null
          class_id: string
          confidence?: number | null
          correct: boolean
          id?: string
          level: number
          mode: string
          pre_answer?: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          selected_answer?: string | null
          set_id?: string | null
          time_ms: number
          timestamp_iso?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          br_answer?: string | null
          br_changed?: boolean | null
          br_delta?: string | null
          br_marked?: boolean | null
          br_outcome?: string | null
          br_rationale?: string | null
          br_selected?: boolean | null
          br_time_ms?: number | null
          class_id?: string
          confidence?: number | null
          correct?: boolean
          id?: string
          level?: number
          mode?: string
          pre_answer?: string | null
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          section?: number
          selected_answer?: string | null
          set_id?: string | null
          time_ms?: number
          timestamp_iso?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blind_review_sessions: {
        Row: {
          br_confirmed_count: number | null
          br_corrected_count: number | null
          br_items_count: number | null
          br_median_time_ms: number | null
          br_regret_count: number | null
          br_stuck_count: number | null
          class_id: string
          completed_at: string | null
          confidence_ratings: Json | null
          created_at: string | null
          flagged_qids: string[] | null
          id: string
          original_answers: Json | null
          pt: number | null
          reviewed_answers: Json | null
          section: number | null
          session_id: string | null
          started_at: string | null
        }
        Insert: {
          br_confirmed_count?: number | null
          br_corrected_count?: number | null
          br_items_count?: number | null
          br_median_time_ms?: number | null
          br_regret_count?: number | null
          br_stuck_count?: number | null
          class_id: string
          completed_at?: string | null
          confidence_ratings?: Json | null
          created_at?: string | null
          flagged_qids?: string[] | null
          id?: string
          original_answers?: Json | null
          pt?: number | null
          reviewed_answers?: Json | null
          section?: number | null
          session_id?: string | null
          started_at?: string | null
        }
        Update: {
          br_confirmed_count?: number | null
          br_corrected_count?: number | null
          br_items_count?: number | null
          br_median_time_ms?: number | null
          br_regret_count?: number | null
          br_stuck_count?: number | null
          class_id?: string
          completed_at?: string | null
          confidence_ratings?: Json | null
          created_at?: string | null
          flagged_qids?: string[] | null
          id?: string
          original_answers?: Json | null
          pt?: number | null
          reviewed_answers?: Json | null
          section?: number | null
          session_id?: string | null
          started_at?: string | null
        }
        Relationships: []
      }
      concept_library: {
        Row: {
          application: string | null
          category: string | null
          concept_name: string
          created_at: string | null
          examples: string | null
          explanation: string
          id: string
          keywords: string[] | null
          reasoning_type: string | null
          related_concepts: string[] | null
        }
        Insert: {
          application?: string | null
          category?: string | null
          concept_name: string
          created_at?: string | null
          examples?: string | null
          explanation: string
          id?: string
          keywords?: string[] | null
          reasoning_type?: string | null
          related_concepts?: string[] | null
        }
        Update: {
          application?: string | null
          category?: string | null
          concept_name?: string
          created_at?: string | null
          examples?: string | null
          explanation?: string
          id?: string
          keywords?: string[] | null
          reasoning_type?: string | null
          related_concepts?: string[] | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          subject?: string | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          class_id: string
          correct_answers: number | null
          created_at: string | null
          date: string
          id: string
          questions_answered: number | null
          time_spent_ms: number | null
          xp_earned: number | null
        }
        Insert: {
          class_id: string
          correct_answers?: number | null
          created_at?: string | null
          date?: string
          id?: string
          questions_answered?: number | null
          time_spent_ms?: number | null
          xp_earned?: number | null
        }
        Update: {
          class_id?: string
          correct_answers?: number | null
          created_at?: string | null
          date?: string
          id?: string
          questions_answered?: number | null
          time_spent_ms?: number | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      drill_templates: {
        Row: {
          class_id: string
          config_json: Json | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          config_json?: Json | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          config_json?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          class_id: string
          details: Json | null
          event: string
          id: string
          timestamp_iso: string | null
          user_id: string | null
        }
        Insert: {
          class_id: string
          details?: Json | null
          event: string
          id?: string
          timestamp_iso?: string | null
          user_id?: string | null
        }
        Update: {
          class_id?: string
          details?: Json | null
          event?: string
          id?: string
          timestamp_iso?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      flagged_questions: {
        Row: {
          class_id: string
          flagged_at: string | null
          id: string
          level: number
          note: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          user_id: string | null
        }
        Insert: {
          class_id: string
          flagged_at?: string | null
          id?: string
          level: number
          note?: string | null
          pt: number
          qid: string
          qnum: number
          qtype: string
          section: number
          user_id?: string | null
        }
        Update: {
          class_id?: string
          flagged_at?: string | null
          id?: string
          level?: number
          note?: string | null
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          section?: number
          user_id?: string | null
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string
          mime_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          message_id: string
          mime_type: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string
          mime_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          by_level_json: Json | null
          by_qtype_json: Json | null
          class_id: string
          daily_goal_questions: number | null
          daily_goal_streak: number | null
          display_name: string | null
          has_analytics_access: boolean
          has_bootcamp_access: boolean
          has_chat_access: boolean
          has_classroom_access: boolean
          has_drill_access: boolean
          has_export_access: boolean
          has_flagged_access: boolean
          has_practice_access: boolean
          has_schedule_access: boolean
          has_seen_tour: boolean
          has_waj_access: boolean
          last_practice_date: string | null
          last_seen_at: string | null
          level: number | null
          longest_streak: number | null
          overall_answered: number | null
          overall_avg_ms: number | null
          overall_correct: number | null
          streak_current: number | null
          updated_at: string | null
          xp_total: number | null
        }
        Insert: {
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id: string
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          display_name?: string | null
          has_analytics_access?: boolean
          has_bootcamp_access?: boolean
          has_chat_access?: boolean
          has_classroom_access?: boolean
          has_drill_access?: boolean
          has_export_access?: boolean
          has_flagged_access?: boolean
          has_practice_access?: boolean
          has_schedule_access?: boolean
          has_seen_tour?: boolean
          has_waj_access?: boolean
          last_practice_date?: string | null
          last_seen_at?: string | null
          level?: number | null
          longest_streak?: number | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          streak_current?: number | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Update: {
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id?: string
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          display_name?: string | null
          has_analytics_access?: boolean
          has_bootcamp_access?: boolean
          has_chat_access?: boolean
          has_classroom_access?: boolean
          has_drill_access?: boolean
          has_export_access?: boolean
          has_flagged_access?: boolean
          has_practice_access?: boolean
          has_schedule_access?: boolean
          has_seen_tour?: boolean
          has_waj_access?: boolean
          last_practice_date?: string | null
          last_seen_at?: string | null
          level?: number | null
          longest_streak?: number | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          streak_current?: number | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: []
      }
      question_type_strategies: {
        Row: {
          answer_strategy: string
          category: string
          correct_answer_patterns: string | null
          created_at: string | null
          difficulty_indicators: string | null
          id: string
          prephrase_goal: string | null
          question_type: string
          reading_strategy: string
          related_reasoning_types: string[] | null
          stem_keywords: string[] | null
          wrong_answer_patterns: string | null
        }
        Insert: {
          answer_strategy: string
          category: string
          correct_answer_patterns?: string | null
          created_at?: string | null
          difficulty_indicators?: string | null
          id?: string
          prephrase_goal?: string | null
          question_type: string
          reading_strategy: string
          related_reasoning_types?: string[] | null
          stem_keywords?: string[] | null
          wrong_answer_patterns?: string | null
        }
        Update: {
          answer_strategy?: string
          category?: string
          correct_answer_patterns?: string | null
          created_at?: string | null
          difficulty_indicators?: string | null
          id?: string
          prephrase_goal?: string | null
          question_type?: string
          reading_strategy?: string
          related_reasoning_types?: string[] | null
          stem_keywords?: string[] | null
          wrong_answer_patterns?: string | null
        }
        Relationships: []
      }
      question_usage: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          last_seen_at: string | null
          mode: string | null
          qid: string
          times_seen: number | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          mode?: string | null
          qid: string
          times_seen?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          mode?: string | null
          qid?: string
          times_seen?: number | null
        }
        Relationships: []
      }
      question_views: {
        Row: {
          answered: boolean
          class_id: string
          id: string
          mode: string | null
          qid: string
          viewed_at: string
        }
        Insert: {
          answered?: boolean
          class_id: string
          id?: string
          mode?: string | null
          qid: string
          viewed_at?: string
        }
        Update: {
          answered?: boolean
          class_id?: string
          id?: string
          mode?: string | null
          qid?: string
          viewed_at?: string
        }
        Relationships: []
      }
      reasoning_type_guidance: {
        Row: {
          common_flaws: string[] | null
          created_at: string | null
          description: string
          examples: string | null
          id: string
          key_indicators: string[] | null
          reasoning_type: string
          relevant_question_types: string[] | null
          strengthen_tactics: string | null
          weaken_tactics: string | null
        }
        Insert: {
          common_flaws?: string[] | null
          created_at?: string | null
          description: string
          examples?: string | null
          id?: string
          key_indicators?: string[] | null
          reasoning_type: string
          relevant_question_types?: string[] | null
          strengthen_tactics?: string | null
          weaken_tactics?: string | null
        }
        Update: {
          common_flaws?: string[] | null
          created_at?: string | null
          description?: string
          examples?: string | null
          id?: string
          key_indicators?: string[] | null
          reasoning_type?: string
          relevant_question_types?: string[] | null
          strengthen_tactics?: string | null
          weaken_tactics?: string | null
        }
        Relationships: []
      }
      section_history: {
        Row: {
          avg_time_ms: number | null
          blind_review_percent: number | null
          blind_review_score: number | null
          br_delta: number | null
          br_percent: number | null
          br_score: number | null
          br_total: number | null
          br_used: boolean | null
          by_difficulty_json: Json | null
          by_qtype_json: Json | null
          class_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          initial_percent: number | null
          initial_score: number
          initial_total: number | null
          mode: string | null
          pt: number
          questions_json: Json | null
          section: number
          time_taken_ms: number
          total_questions: number
          total_time_ms: number | null
          unanswered_count: number | null
          user_id: string | null
        }
        Insert: {
          avg_time_ms?: number | null
          blind_review_percent?: number | null
          blind_review_score?: number | null
          br_delta?: number | null
          br_percent?: number | null
          br_score?: number | null
          br_total?: number | null
          br_used?: boolean | null
          by_difficulty_json?: Json | null
          by_qtype_json?: Json | null
          class_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          initial_percent?: number | null
          initial_score?: number
          initial_total?: number | null
          mode?: string | null
          pt: number
          questions_json?: Json | null
          section: number
          time_taken_ms?: number
          total_questions?: number
          total_time_ms?: number | null
          unanswered_count?: number | null
          user_id?: string | null
        }
        Update: {
          avg_time_ms?: number | null
          blind_review_percent?: number | null
          blind_review_score?: number | null
          br_delta?: number | null
          br_percent?: number | null
          br_score?: number | null
          br_total?: number | null
          br_used?: boolean | null
          by_difficulty_json?: Json | null
          by_qtype_json?: Json | null
          class_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          initial_percent?: number | null
          initial_score?: number
          initial_total?: number | null
          mode?: string | null
          pt?: number
          questions_json?: Json | null
          section?: number
          time_taken_ms?: number
          total_questions?: number
          total_time_ms?: number | null
          unanswered_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          class_id: string
          cooldowns_json: Json | null
          current_qid: string | null
          cursor_index: number | null
          elapsed_ms: number | null
          markup_json: Json | null
          queue_json: Json | null
          review_queue_json: Json | null
          started_at: string | null
          timer_mode: string | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          cooldowns_json?: Json | null
          current_qid?: string | null
          cursor_index?: number | null
          elapsed_ms?: number | null
          markup_json?: Json | null
          queue_json?: Json | null
          review_queue_json?: Json | null
          started_at?: string | null
          timer_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          cooldowns_json?: Json | null
          current_qid?: string | null
          cursor_index?: number | null
          elapsed_ms?: number | null
          markup_json?: Json | null
          queue_json?: Json | null
          review_queue_json?: Json | null
          started_at?: string | null
          timer_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          adaptive_on: boolean | null
          class_id: string
          enabled_levels: number[] | null
          enabled_qtypes: string[] | null
          explore_ratio: number | null
          pace_vs_challenge: number | null
          time_pref: string | null
          updated_at: string | null
        }
        Insert: {
          adaptive_on?: boolean | null
          class_id: string
          enabled_levels?: number[] | null
          enabled_qtypes?: string[] | null
          explore_ratio?: number | null
          pace_vs_challenge?: number | null
          time_pref?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptive_on?: boolean | null
          class_id?: string
          enabled_levels?: number[] | null
          enabled_qtypes?: string[] | null
          explore_ratio?: number | null
          pace_vs_challenge?: number | null
          time_pref?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          last_active_at: string | null
          pin_hash: string | null
          schema_version: number | null
          student_label: string | null
          token_hash: string
          user_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          pin_hash?: string | null
          schema_version?: number | null
          student_label?: string | null
          token_hash: string
          user_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          pin_hash?: string | null
          schema_version?: number | null
          student_label?: string | null
          token_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tactical_patterns: {
        Row: {
          application: string | null
          created_at: string | null
          description: string
          examples: string | null
          formula: string | null
          id: string
          pattern_name: string
          pattern_type: string
          question_types: string[] | null
          reasoning_type: string | null
        }
        Insert: {
          application?: string | null
          created_at?: string | null
          description: string
          examples?: string | null
          formula?: string | null
          id?: string
          pattern_name: string
          pattern_type: string
          question_types?: string[] | null
          reasoning_type?: string | null
        }
        Update: {
          application?: string | null
          created_at?: string | null
          description?: string
          examples?: string | null
          formula?: string | null
          id?: string
          pattern_name?: string
          pattern_type?: string
          question_types?: string[] | null
          reasoning_type?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          category: string | null
          class_id: string
          earned_at: string | null
          id: string
          requirement: string | null
        }
        Insert: {
          achievement_id: string
          category?: string | null
          class_id: string
          earned_at?: string | null
          id?: string
          requirement?: string | null
        }
        Update: {
          achievement_id?: string
          category?: string | null
          class_id?: string
          earned_at?: string | null
          id?: string
          requirement?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_coaching_sessions: {
        Row: {
          action_taken: string | null
          class_id: string
          coach_response: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          qid: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          class_id: string
          coach_response?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          qid?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          class_id?: string
          coach_response?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          qid?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wrong_answer_journal: {
        Row: {
          class_id: string
          created_at: string | null
          first_wrong_at_iso: string
          history_json: Json
          id: string
          last_status: string
          level: number
          pt: number
          qid: string
          qnum: number
          qtype: string
          revisit_count: number
          section: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          first_wrong_at_iso?: string
          history_json?: Json
          id?: string
          last_status: string
          level: number
          pt: number
          qid: string
          qnum: number
          qtype: string
          revisit_count?: number
          section: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          first_wrong_at_iso?: string
          history_json?: Json
          id?: string
          last_status?: string
          level?: number
          pt?: number
          qid?: string
          qnum?: number
          qtype?: string
          revisit_count?: number
          section?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      students_safe: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string | null
          last_active_at: string | null
          schema_version: number | null
          student_label: string | null
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string | null
          last_active_at?: string | null
          schema_version?: number | null
          student_label?: string | null
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string | null
          last_active_at?: string | null
          schema_version?: number | null
          student_label?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_conversation_participant_names: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          is_admin: boolean
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
