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
      abstract_drill_attempts: {
        Row: {
          completed_at: string
          confidence: string
          correct: boolean
          drill_id: string
          drill_type: string
          id: string
          selected_index: number
          time_ms: number | null
          trap_tag: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          confidence: string
          correct: boolean
          drill_id: string
          drill_type: string
          id?: string
          selected_index: number
          time_ms?: number | null
          trap_tag?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          confidence?: string
          correct?: boolean
          drill_id?: string
          drill_type?: string
          id?: string
          selected_index?: number
          time_ms?: number | null
          trap_tag?: string | null
          user_id?: string
        }
        Relationships: []
      }
      abstract_final_set: {
        Row: {
          completed_at: string
          id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      abstract_gauntlet_attempts: {
        Row: {
          choice_id: number
          completed_at: string
          correct_count: number
          id: string
          keywords_picked: string[]
          requirements_checked: number[]
          translation_text: string
          user_id: string
        }
        Insert: {
          choice_id: number
          completed_at?: string
          correct_count?: number
          id?: string
          keywords_picked?: string[]
          requirements_checked?: number[]
          translation_text?: string
          user_id: string
        }
        Update: {
          choice_id?: number
          completed_at?: string
          correct_count?: number
          id?: string
          keywords_picked?: string[]
          requirements_checked?: number[]
          translation_text?: string
          user_id?: string
        }
        Relationships: []
      }
      abstract_lesson_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: []
      }
      abstract_translator_attempts: {
        Row: {
          completed_at: string
          id: string
          keywords_picked: string[]
          stem_number: number
          translation_text: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          keywords_picked?: string[]
          stem_number: number
          translation_text?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          keywords_picked?: string[]
          stem_number?: number
          translation_text?: string
          user_id?: string
        }
        Relationships: []
      }
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
      ai_ta_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          class_id: string | null
          created_at: string
          created_by: string
          draft_json: Json | null
          draft_markdown: string | null
          draft_type: string
          id: string
          input_snapshot_json: Json
          posted_at: string | null
          prompt: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by: string
          draft_json?: Json | null
          draft_markdown?: string | null
          draft_type: string
          id?: string
          input_snapshot_json?: Json
          posted_at?: string | null
          prompt?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string
          draft_json?: Json | null
          draft_markdown?: string | null
          draft_type?: string
          id?: string
          input_snapshot_json?: Json
          posted_at?: string | null
          prompt?: string | null
          status?: string
          student_id?: string
          updated_at?: string
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
      bootcamp_kv: {
        Row: {
          data: Json
          record_id: string
          table_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          record_id: string
          table_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          record_id?: string
          table_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_progress: {
        Row: {
          first_viewed_at: string
          last_viewed_at: string
          section_id: string
          topic_tag: string
          user_id: string
          view_count: number
        }
        Insert: {
          first_viewed_at?: string
          last_viewed_at?: string
          section_id: string
          topic_tag: string
          user_id: string
          view_count?: number
        }
        Update: {
          first_viewed_at?: string
          last_viewed_at?: string
          section_id?: string
          topic_tag?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      classroom_items: {
        Row: {
          class_id: string | null
          completed_at: string | null
          content_html: string | null
          content_markdown: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          metadata_json: Json
          priority: number
          source_id: string | null
          source_table: string | null
          status: string
          student_id: string
          title: string
          type: string
          unlock_at: string | null
          updated_at: string
          visible_to_student: boolean
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata_json?: Json
          priority?: number
          source_id?: string | null
          source_table?: string | null
          status?: string
          student_id: string
          title: string
          type: string
          unlock_at?: string | null
          updated_at?: string
          visible_to_student?: boolean
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata_json?: Json
          priority?: number
          source_id?: string | null
          source_table?: string | null
          status?: string
          student_id?: string
          title?: string
          type?: string
          unlock_at?: string | null
          updated_at?: string
          visible_to_student?: boolean
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
      drive_files: {
        Row: {
          admin_user_id: string
          file_name: string
          google_file_id: string
          id: string
          mime_type: string | null
          picked_at: string
          thumbnail_url: string | null
          web_view_link: string
        }
        Insert: {
          admin_user_id: string
          file_name: string
          google_file_id: string
          id?: string
          mime_type?: string | null
          picked_at?: string
          thumbnail_url?: string | null
          web_view_link: string
        }
        Update: {
          admin_user_id?: string
          file_name?: string
          google_file_id?: string
          id?: string
          mime_type?: string | null
          picked_at?: string
          thumbnail_url?: string | null
          web_view_link?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      external_work_uploads: {
        Row: {
          applied_to_analytics: boolean
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          processing_status: string
          reviewed_at: string | null
          source_platform: string | null
          storage_path: string
          student_id: string
          upload_type: string
          uploaded_by: string
        }
        Insert: {
          applied_to_analytics?: boolean
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          processing_status?: string
          reviewed_at?: string | null
          source_platform?: string | null
          storage_path: string
          student_id: string
          upload_type?: string
          uploaded_by: string
        }
        Update: {
          applied_to_analytics?: boolean
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          processing_status?: string
          reviewed_at?: string | null
          source_platform?: string | null
          storage_path?: string
          student_id?: string
          upload_type?: string
          uploaded_by?: string
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
      flashcard_reviews: {
        Row: {
          card_id: string
          due_at: string
          id: string
          interval_days: number
          rating: string
          review_count: number
          reviewed_at: string
          topic_tag: string
          user_id: string
        }
        Insert: {
          card_id: string
          due_at: string
          id?: string
          interval_days: number
          rating: string
          review_count?: number
          reviewed_at?: string
          topic_tag: string
          user_id: string
        }
        Update: {
          card_id?: string
          due_at?: string
          id?: string
          interval_days?: number
          rating?: string
          review_count?: number
          reviewed_at?: string
          topic_tag?: string
          user_id?: string
        }
        Relationships: []
      }
      gcal_sync_state: {
        Row: {
          calendar_id: string
          id: number
          last_full_sync_at: string | null
          last_synced_at: string | null
          sync_token: string | null
        }
        Insert: {
          calendar_id?: string
          id?: number
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
        }
        Update: {
          calendar_id?: string
          id?: number
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
        }
        Relationships: []
      }
      guided_drill_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          attempt_session_id: string | null
          class_id: string
          completed_at: string | null
          created_at: string
          guided_drill_id: string
          id: string
          question_qids: string[]
          read_card_at: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          student_id: string
          unlock_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          attempt_session_id?: string | null
          class_id: string
          completed_at?: string | null
          created_at?: string
          guided_drill_id: string
          id?: string
          question_qids?: string[]
          read_card_at?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          student_id: string
          unlock_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          attempt_session_id?: string | null
          class_id?: string
          completed_at?: string | null
          created_at?: string
          guided_drill_id?: string
          id?: string
          question_qids?: string[]
          read_card_at?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          student_id?: string
          unlock_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guided_drill_assignments_guided_drill_id_fkey"
            columns: ["guided_drill_id"]
            isOneToOne: false
            referencedRelation: "guided_drills"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_drills: {
        Row: {
          bank_filter: Json
          category: string | null
          created_at: string
          difficulty_max: number | null
          difficulty_min: number | null
          estimated_minutes: number | null
          id: string
          instruction_card: Json
          is_published: boolean
          order_in_week: number
          question_count: number | null
          question_features: string[]
          question_qids: string[]
          question_types: string[]
          reasoning_types: string[]
          slug: string
          source_file: string | null
          start_button_label: string | null
          title: string
          updated_at: string
          week: number
        }
        Insert: {
          bank_filter?: Json
          category?: string | null
          created_at?: string
          difficulty_max?: number | null
          difficulty_min?: number | null
          estimated_minutes?: number | null
          id?: string
          instruction_card?: Json
          is_published?: boolean
          order_in_week?: number
          question_count?: number | null
          question_features?: string[]
          question_qids?: string[]
          question_types?: string[]
          reasoning_types?: string[]
          slug: string
          source_file?: string | null
          start_button_label?: string | null
          title: string
          updated_at?: string
          week: number
        }
        Update: {
          bank_filter?: Json
          category?: string | null
          created_at?: string
          difficulty_max?: number | null
          difficulty_min?: number | null
          estimated_minutes?: number | null
          id?: string
          instruction_card?: Json
          is_published?: boolean
          order_in_week?: number
          question_count?: number | null
          question_features?: string[]
          question_qids?: string[]
          question_types?: string[]
          reasoning_types?: string[]
          slug?: string
          source_file?: string | null
          start_button_label?: string | null
          title?: string
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          assigned_by: string
          class_id: string
          completed_at: string | null
          created_at: string
          id: string
          question_qids: string[]
          score: number | null
          set_description: string | null
          set_id: string | null
          set_title: string
          started_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          assigned_by: string
          class_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          question_qids: string[]
          score?: number | null
          set_description?: string | null
          set_id?: string | null
          set_title: string
          started_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          assigned_by?: string
          class_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          question_qids?: string[]
          score?: number | null
          set_description?: string | null
          set_id?: string | null
          set_title?: string
          started_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "homework_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_sets: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          description: string | null
          estimated_minutes: number | null
          guided_set_type: string | null
          id: string
          is_guided_set: boolean
          question_qids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          description?: string | null
          estimated_minutes?: number | null
          guided_set_type?: string | null
          id?: string
          is_guided_set?: boolean
          question_qids?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_minutes?: number | null
          guided_set_type?: string | null
          id?: string
          is_guided_set?: boolean
          question_qids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          drive_file_id: string | null
          file_name: string
          file_size: number
          id: string
          kind: string
          message_id: string
          mime_type: string
          storage_path: string | null
          web_view_link: string | null
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          file_name: string
          file_size?: number
          id?: string
          kind?: string
          message_id: string
          mime_type: string
          storage_path?: string | null
          web_view_link?: string | null
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          file_name?: string
          file_size?: number
          id?: string
          kind?: string
          message_id?: string
          mime_type?: string
          storage_path?: string | null
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_drive_file_id_fkey"
            columns: ["drive_file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operator_conversations: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      operator_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "operator_conversations"
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
          has_ta_access: boolean
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
          has_ta_access?: boolean
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
          has_ta_access?: boolean
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
      schedule_events: {
        Row: {
          all_day: boolean
          calendar_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_at: string
          etag: string | null
          google_event_id: string | null
          html_link: string | null
          id: string
          last_synced_at: string
          location: string | null
          source: string
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at: string
          etag?: string | null
          google_event_id?: string | null
          html_link?: string | null
          id?: string
          last_synced_at?: string
          location?: string | null
          source?: string
          start_at: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          calendar_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_at?: string
          etag?: string | null
          google_event_id?: string | null
          html_link?: string | null
          id?: string
          last_synced_at?: string
          location?: string | null
          source?: string
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
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
      session_replays: {
        Row: {
          class_id: string
          created_at: string
          events_jsonb: Json
          id: string
          mode: string
          qid: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          events_jsonb?: Json
          id?: string
          mode: string
          qid: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          events_jsonb?: Json
          id?: string
          mode?: string
          qid?: string
          user_id?: string
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
      smartboard_sessions: {
        Row: {
          created_at: string
          created_by: string
          excalidraw_scene_json: Json
          export_pdf_path: string | null
          id: string
          linked_recap_item_id: string | null
          posted_to_classroom: boolean
          preview_image_path: string | null
          session_date: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          excalidraw_scene_json?: Json
          export_pdf_path?: string | null
          id?: string
          linked_recap_item_id?: string | null
          posted_to_classroom?: boolean
          preview_image_path?: string | null
          session_date?: string
          student_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          excalidraw_scene_json?: Json
          export_pdf_path?: string | null
          id?: string
          linked_recap_item_id?: string | null
          posted_to_classroom?: boolean
          preview_image_path?: string | null
          session_date?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_analytics_sources: {
        Row: {
          created_at: string
          embed_status: string
          id: string
          last_imported_at: string | null
          notes: string | null
          source_name: string
          source_url: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          embed_status?: string
          id?: string
          last_imported_at?: string | null
          notes?: string | null
          source_name: string
          source_url?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          embed_status?: string
          id?: string
          last_imported_at?: string | null
          notes?: string | null
          source_name?: string
          source_url?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_context: {
        Row: {
          content_text: string | null
          context_type: string
          created_at: string
          created_by: string
          file_path: string | null
          id: string
          metadata: Json
          source: string | null
          student_id: string
          title: string
        }
        Insert: {
          content_text?: string | null
          context_type: string
          created_at?: string
          created_by: string
          file_path?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          student_id: string
          title: string
        }
        Update: {
          content_text?: string | null
          context_type?: string
          created_at?: string
          created_by?: string
          file_path?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      student_sessions: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number | null
          id: string
          notes: string | null
          scheduled_at: string
          source: string | null
          status: string
          student_id: string
          transcript_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_at: string
          source?: string | null
          status?: string
          student_id: string
          transcript_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          source?: string | null
          status?: string
          student_id?: string
          transcript_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "student_context"
            referencedColumns: ["id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ta_assignments: {
        Row: {
          asset_ids: string[]
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          content_html: string
          created_at: string
          id: string
          interaction_id: string | null
          pdf_url: string | null
          status: string
          student_id: string
          title: string
          viewed_at: string | null
        }
        Insert: {
          asset_ids?: string[]
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          content_html: string
          created_at?: string
          id?: string
          interaction_id?: string | null
          pdf_url?: string | null
          status?: string
          student_id: string
          title: string
          viewed_at?: string | null
        }
        Update: {
          asset_ids?: string[]
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          content_html?: string
          created_at?: string
          id?: string
          interaction_id?: string | null
          pdf_url?: string | null
          status?: string
          student_id?: string
          title?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ta_assignments_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "ta_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ta_interactions: {
        Row: {
          asset_ids: string[]
          created_at: string
          created_by: string | null
          draft_content: Json | null
          draft_status: string | null
          id: string
          message: string
          role: string
          student_id: string
        }
        Insert: {
          asset_ids?: string[]
          created_at?: string
          created_by?: string | null
          draft_content?: Json | null
          draft_status?: string | null
          id?: string
          message: string
          role: string
          student_id: string
        }
        Update: {
          asset_ids?: string[]
          created_at?: string
          created_by?: string | null
          draft_content?: Json | null
          draft_status?: string | null
          id?: string
          message?: string
          role?: string
          student_id?: string
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
      teacher_message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          owner_id: string
          placeholders: Json
          subject: string | null
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          owner_id: string
          placeholders?: Json
          subject?: string | null
          template_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          placeholders?: Json
          subject?: string | null
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teaching_assets: {
        Row: {
          asset_type: string
          content_text: string | null
          created_at: string
          created_by: string
          description: string | null
          file_path: string | null
          id: string
          metadata: Json
          title: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          content_text?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          content_text?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutor_conversations: {
        Row: {
          content: string
          correct_answer: string | null
          created_at: string
          id: string
          mode: string | null
          pt: number | null
          qid: string
          qnum: number | null
          qtype: string | null
          role: string
          section: number | null
          session_id: string | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          content: string
          correct_answer?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          pt?: number | null
          qid: string
          qnum?: number | null
          qtype?: string | null
          role: string
          section?: number | null
          session_id?: string | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          content?: string
          correct_answer?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          pt?: number | null
          qid?: string
          qnum?: number | null
          qtype?: string | null
          role?: string
          section?: number | null
          session_id?: string | null
          user_answer?: string | null
          user_id?: string
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
      weekly_plan_items: {
        Row: {
          classroom_item_id: string | null
          day_date: string
          due_at: string | null
          estimated_minutes: number | null
          id: string
          instructions: string | null
          metadata_json: Json
          sort_order: number
          status: string
          student_id: string
          title: string
          unlock_at: string | null
          weekly_plan_id: string
        }
        Insert: {
          classroom_item_id?: string | null
          day_date: string
          due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          metadata_json?: Json
          sort_order?: number
          status?: string
          student_id: string
          title: string
          unlock_at?: string | null
          weekly_plan_id: string
        }
        Update: {
          classroom_item_id?: string | null
          day_date?: string
          due_at?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          metadata_json?: Json
          sort_order?: number
          status?: string
          student_id?: string
          title?: string
          unlock_at?: string | null
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_items_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          ai_generated: boolean
          created_at: string
          created_by: string
          id: string
          published_at: string | null
          rationale: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          ai_generated?: boolean
          created_at?: string
          created_by: string
          id?: string
          published_at?: string | null
          rationale?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          ai_generated?: boolean
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          rationale?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
          week_end?: string
          week_start?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_assignment_counts_per_student: {
        Args: never
        Returns: {
          assigned: number
          completed: number
          student_id: string
          total: number
          viewed: number
        }[]
      }
      get_conversation_participant_names: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          is_admin: boolean
          user_id: string
        }[]
      }
      get_or_create_joshua_conversation: { Args: never; Returns: string }
      get_student_email: { Args: { _student_id: string }; Returns: string }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      search_teaching_assets: {
        Args: { max_rows?: number; q: string }
        Returns: {
          asset_type: string
          description: string
          excerpt: string
          id: string
          rank: number
          title: string
        }[]
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
