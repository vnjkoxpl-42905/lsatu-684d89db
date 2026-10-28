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
      activities: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          id: string
          instructions: Json
          item_format: string
          items: Json
          mode: string | null
          slug: string
          source_section: string | null
          subtitle: string | null
          time_goal_minutes: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          id?: string
          instructions?: Json
          item_format?: string
          items?: Json
          mode?: string | null
          slug: string
          source_section?: string | null
          subtitle?: string | null
          time_goal_minutes?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          id?: string
          instructions?: Json
          item_format?: string
          items?: Json
          mode?: string | null
          slug?: string
          source_section?: string | null
          subtitle?: string | null
          time_goal_minutes?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_ai_budget_buckets_v1: {
        Row: {
          actor_key: string
          admissions: number
          bucket_start: string
          kind: string
        }
        Insert: {
          actor_key: string
          admissions: number
          bucket_start: string
          kind: string
        }
        Update: {
          actor_key?: string
          admissions?: number
          bucket_start?: string
          kind?: string
        }
        Relationships: []
      }
      activity_ai_configuration_v1: {
        Row: {
          actor_concurrency: number
          actor_day: number
          actor_minute: number
          allowed_activity_ids: string[] | null
          enabled: boolean
          global_day: number
          grader_revision: string
          lease_seconds: number
          singleton: boolean
        }
        Insert: {
          actor_concurrency?: number
          actor_day?: number
          actor_minute?: number
          allowed_activity_ids?: string[] | null
          enabled?: boolean
          global_day?: number
          grader_revision?: string
          lease_seconds?: number
          singleton?: boolean
        }
        Update: {
          actor_concurrency?: number
          actor_day?: number
          actor_minute?: number
          allowed_activity_ids?: string[] | null
          enabled?: boolean
          global_day?: number
          grader_revision?: string
          lease_seconds?: number
          singleton?: boolean
        }
        Relationships: []
      }
      activity_ai_receipts_v1: {
        Row: {
          admitted_at: string
          attempt_no: number
          canonical_payload: Json
          claim_id: string
          dispatched_at: string | null
          failure_category: string | null
          finished_at: string | null
          id: string
          item_order: number
          lease_expires_at: string
          owner_id: string
          payload_sha256: string
          result: Json | null
          source_id: string
          source_kind: string
          state: string
        }
        Insert: {
          admitted_at?: string
          attempt_no: number
          canonical_payload: Json
          claim_id: string
          dispatched_at?: string | null
          failure_category?: string | null
          finished_at?: string | null
          id: string
          item_order: number
          lease_expires_at: string
          owner_id: string
          payload_sha256: string
          result?: Json | null
          source_id: string
          source_kind: string
          state: string
        }
        Update: {
          admitted_at?: string
          attempt_no?: number
          canonical_payload?: Json
          claim_id?: string
          dispatched_at?: string | null
          failure_category?: string | null
          finished_at?: string | null
          id?: string
          item_order?: number
          lease_expires_at?: string
          owner_id?: string
          payload_sha256?: string
          result?: Json | null
          source_id?: string
          source_kind?: string
          state?: string
        }
        Relationships: []
      }
      activity_ai_request_keys_v1: {
        Row: {
          created_at: string
          owner_id: string
          payload_sha256: string
          receipt_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          payload_sha256: string
          receipt_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          payload_sha256?: string
          receipt_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_ai_request_keys_v1_receipt_id_owner_id_fkey"
            columns: ["receipt_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "activity_ai_receipts_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      activity_assignments: {
        Row: {
          activity_id: string | null
          assigned_by: string
          class_id: string
          completed_at: string | null
          created_at: string
          id: string
          instructions: Json
          issuance: number
          item_count: number | null
          item_format: string
          items: Json
          mode: string | null
          notification_group_id: string | null
          notification_policy: string
          revoked_at: string | null
          revoked_by: string | null
          score: number | null
          score_judged: number | null
          score_numerator: number | null
          score_total: number | null
          scoring_version: number | null
          source_section: string | null
          started_at: string | null
          status: string
          student_id: string
          subtitle: string | null
          time_goal_minutes: Json | null
          title: string
          unlock_at: string | null
        }
        Insert: {
          activity_id?: string | null
          assigned_by: string
          class_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instructions?: Json
          issuance?: number
          item_count?: number | null
          item_format?: string
          items?: Json
          mode?: string | null
          notification_group_id?: string | null
          notification_policy?: string
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          score_judged?: number | null
          score_numerator?: number | null
          score_total?: number | null
          scoring_version?: number | null
          source_section?: string | null
          started_at?: string | null
          status?: string
          student_id: string
          subtitle?: string | null
          time_goal_minutes?: Json | null
          title: string
          unlock_at?: string | null
        }
        Update: {
          activity_id?: string | null
          assigned_by?: string
          class_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          instructions?: Json
          issuance?: number
          item_count?: number | null
          item_format?: string
          items?: Json
          mode?: string | null
          notification_group_id?: string | null
          notification_policy?: string
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          score_judged?: number | null
          score_numerator?: number | null
          score_total?: number | null
          scoring_version?: number | null
          source_section?: string | null
          started_at?: string | null
          status?: string
          student_id?: string
          subtitle?: string | null
          time_goal_minutes?: Json | null
          title?: string
          unlock_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_grade_disputes: {
        Row: {
          assignment_id: string
          attempt_no: number
          created_at: string
          disputed_band: string | null
          disputed_reason: string | null
          id: string
          note: string | null
          source_section: string | null
          stimulus_slug: string
          student_id: string
        }
        Insert: {
          assignment_id: string
          attempt_no: number
          created_at?: string
          disputed_band?: string | null
          disputed_reason?: string | null
          id?: string
          note?: string | null
          source_section?: string | null
          stimulus_slug: string
          student_id: string
        }
        Update: {
          assignment_id?: string
          attempt_no?: number
          created_at?: string
          disputed_band?: string | null
          disputed_reason?: string | null
          id?: string
          note?: string | null
          source_section?: string | null
          stimulus_slug?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_grade_disputes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "activity_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_item_responses: {
        Row: {
          assignment_id: string
          attempt_no: number
          created_at: string
          id: string
          item_order: number
          judge_source: string | null
          latency_ms: number | null
          parser_version: string | null
          response_text: string
          rrc: Json | null
          shadow_fault: string | null
          student_id: string
          verdict: string | null
        }
        Insert: {
          assignment_id: string
          attempt_no?: number
          created_at?: string
          id?: string
          item_order: number
          judge_source?: string | null
          latency_ms?: number | null
          parser_version?: string | null
          response_text?: string
          rrc?: Json | null
          shadow_fault?: string | null
          student_id: string
          verdict?: string | null
        }
        Update: {
          assignment_id?: string
          attempt_no?: number
          created_at?: string
          id?: string
          item_order?: number
          judge_source?: string | null
          latency_ms?: number | null
          parser_version?: string | null
          response_text?: string
          rrc?: Json | null
          shadow_fault?: string | null
          student_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_item_responses_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "activity_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_section_grades: {
        Row: {
          assignment_id: string
          attempt_no: number
          created_at: string
          graded_at: string
          grader_version: number
          section: Json
          source_section: string
          stimuli: Json
          student_id: string
          transcript_engine: string
          transcript_text: string | null
        }
        Insert: {
          assignment_id: string
          attempt_no?: number
          created_at?: string
          graded_at?: string
          grader_version: number
          section: Json
          source_section: string
          stimuli: Json
          student_id: string
          transcript_engine: string
          transcript_text?: string | null
        }
        Update: {
          assignment_id?: string
          attempt_no?: number
          created_at?: string
          graded_at?: string
          grader_version?: number
          section?: Json
          source_section?: string
          stimuli?: Json
          student_id?: string
          transcript_engine?: string
          transcript_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_section_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "activity_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_section_grading_claims: {
        Row: {
          assignment_id: string
          attempt_no: number
          claimed_at: string
        }
        Insert: {
          assignment_id: string
          attempt_no: number
          claimed_at?: string
        }
        Update: {
          assignment_id?: string
          attempt_no?: number
          claimed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_section_grading_claims_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "activity_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_question_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          qid: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          qid: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          qid?: string
          updated_at?: string
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
      assignment_delivery_control: {
        Row: {
          activated_at: string | null
          enabled: boolean
          singleton: boolean
          verified_frontend_sha: string | null
        }
        Insert: {
          activated_at?: string | null
          enabled?: boolean
          singleton?: boolean
          verified_frontend_sha?: string | null
        }
        Update: {
          activated_at?: string | null
          enabled?: boolean
          singleton?: boolean
          verified_frontend_sha?: string | null
        }
        Relationships: []
      }
      assignment_delivery_events: {
        Row: {
          cancelled_at: string | null
          created_at: string
          delivered_at: string | null
          group_id: string | null
          id: string
          issuance: number
          policy: string
          source_id: string
          source_table: string
          student_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          issuance: number
          policy: string
          source_id: string
          source_table: string
          student_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          issuance?: number
          policy?: string
          source_id?: string
          source_table?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_delivery_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assignment_notification_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_notification_deliveries: {
        Row: {
          cohort_key: string
          delivered_at: string
          event_id: string | null
          group_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          cohort_key: string
          delivered_at?: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          cohort_key?: string
          delivered_at?: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_notification_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "assignment_delivery_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notification_deliveries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assignment_notification_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_notification_groups: {
        Row: {
          collection_opened_at: string | null
          created_at: string
          finalized_at: string | null
          id: string
          kind: string
          link: string
          message: string | null
          optional_channels_claimed_at: string | null
          student_id: string
          title: string
        }
        Insert: {
          collection_opened_at?: string | null
          created_at?: string
          finalized_at?: string | null
          id: string
          kind?: string
          link?: string
          message?: string | null
          optional_channels_claimed_at?: string | null
          student_id: string
          title?: string
        }
        Update: {
          collection_opened_at?: string | null
          created_at?: string
          finalized_at?: string | null
          id?: string
          kind?: string
          link?: string
          message?: string | null
          optional_channels_claimed_at?: string | null
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      assignment_notification_legacy_links: {
        Row: {
          issuance: number
          notification_id: string
          source_id: string
          source_table: string
          student_id: string
        }
        Insert: {
          issuance: number
          notification_id: string
          source_id: string
          source_table: string
          student_id: string
        }
        Update: {
          issuance?: number
          notification_id?: string
          source_id?: string
          source_table?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_notification_legacy_links_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
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
          timed_pt_leg: number | null
          timed_pt_run_id: string | null
          timed_section_sitting_id: string | null
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
          timed_pt_leg?: number | null
          timed_pt_run_id?: string | null
          timed_section_sitting_id?: string | null
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
          timed_pt_leg?: number | null
          timed_pt_run_id?: string | null
          timed_section_sitting_id?: string | null
          timestamp_iso?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timed_lr_attempt_parent_v1"
            columns: ["timed_pt_run_id", "user_id"]
            isOneToOne: false
            referencedRelation: "practice_test_runs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "timed_section_attempt_owner_v1"
            columns: ["timed_section_sitting_id", "user_id"]
            isOneToOne: false
            referencedRelation: "timed_section_sittings_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
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
      booking_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      booking_availability_config: {
        Row: {
          buffer_minutes: number
          id: number
          minimum_notice_minutes: number
          timezone: string
          updated_at: string
          window_days: number
        }
        Insert: {
          buffer_minutes?: number
          id?: number
          minimum_notice_minutes?: number
          timezone?: string
          updated_at?: string
          window_days?: number
        }
        Update: {
          buffer_minutes?: number
          id?: number
          minimum_notice_minutes?: number
          timezone?: string
          updated_at?: string
          window_days?: number
        }
        Relationships: []
      }
      booking_availability_overrides: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          note: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          note?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          note?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      booking_calendar_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json
          id: string
          redemption_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          single_session_booking_id: string | null
          status: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json
          id?: string
          redemption_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          single_session_booking_id?: string | null
          status?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json
          id?: string
          redemption_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          single_session_booking_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_calendar_alerts_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "booking_pass_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_calendar_alerts_single_session_booking_id_fkey"
            columns: ["single_session_booking_id"]
            isOneToOne: false
            referencedRelation: "single_session_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_commerce_events: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          email: string | null
          event_type: string
          former_student_id: string | null
          id: string
          offer_id: string | null
          payload: Json
          provider: string
          provider_event_id: string
          single_session_booking_id: string | null
          student_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          event_type: string
          former_student_id?: string | null
          id?: string
          offer_id?: string | null
          payload?: Json
          provider: string
          provider_event_id: string
          single_session_booking_id?: string | null
          student_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          event_type?: string
          former_student_id?: string | null
          id?: string
          offer_id?: string | null
          payload?: Json
          provider?: string
          provider_event_id?: string
          single_session_booking_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_commerce_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_commerce_events_single_session_booking_id_fkey"
            columns: ["single_session_booking_id"]
            isOneToOne: false
            referencedRelation: "single_session_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_event_types: {
        Row: {
          active: boolean
          buffer_after_minutes: number
          buffer_before_minutes: number
          created_at: string
          currency: string
          label: string
          length_minutes: number
          minimum_notice_minutes: number
          note: string | null
          pinned_start_at: string | null
          price_cents: number
          requires_payment: boolean
          single_use: boolean
          slot_interval_minutes: number | null
          slug: string
          updated_at: string
          window_business_days: number
          window_calendar_days: number | null
        }
        Insert: {
          active?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          currency?: string
          label: string
          length_minutes: number
          minimum_notice_minutes?: number
          note?: string | null
          pinned_start_at?: string | null
          price_cents?: number
          requires_payment?: boolean
          single_use?: boolean
          slot_interval_minutes?: number | null
          slug: string
          updated_at?: string
          window_business_days?: number
          window_calendar_days?: number | null
        }
        Update: {
          active?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          currency?: string
          label?: string
          length_minutes?: number
          minimum_notice_minutes?: number
          note?: string | null
          pinned_start_at?: string | null
          price_cents?: number
          requires_payment?: boolean
          single_use?: boolean
          slot_interval_minutes?: number | null
          slug?: string
          updated_at?: string
          window_business_days?: number
          window_calendar_days?: number | null
        }
        Relationships: []
      }
      booking_link_hits: {
        Row: {
          action: string
          count: number
          ip_hash: string
          slug: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          ip_hash: string
          slug: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          ip_hash?: string
          slug?: string
          window_start?: string
        }
        Relationships: []
      }
      booking_offers: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          id: string
          label: string
          provider: string
          provider_ref: string
          student_visible: boolean
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits?: number
          id: string
          label: string
          provider: string
          provider_ref: string
          student_visible?: boolean
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          id?: string
          label?: string
          provider?: string
          provider_ref?: string
          student_visible?: boolean
          url?: string
        }
        Relationships: []
      }
      booking_pass_redemptions: {
        Row: {
          booking_pass_id: string
          calendar_action: string
          calendar_attempts: number
          calendar_error: string | null
          calendar_last_synced_at: string | null
          calendar_lease_until: string | null
          calendar_status: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          credit_refunded: boolean
          end_at: string
          gcal_attempts: number
          gcal_error: string | null
          gcal_lease_until: string | null
          gcal_state: string
          google_event_id: string | null
          id: string
          idempotency_key: string
          meet_url: string | null
          needs_gcal_sync: boolean
          reschedule_count: number
          schedule_event_id: string | null
          start_at: string
          status: string
          student_email_snapshot: string | null
          student_name_snapshot: string | null
          student_note: string | null
          submission_error: string | null
          submission_status: string
          teacher_missed_at: string | null
          teacher_missed_by: string | null
          updated_at: string
        }
        Insert: {
          booking_pass_id: string
          calendar_action?: string
          calendar_attempts?: number
          calendar_error?: string | null
          calendar_last_synced_at?: string | null
          calendar_lease_until?: string | null
          calendar_status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          credit_refunded?: boolean
          end_at: string
          gcal_attempts?: number
          gcal_error?: string | null
          gcal_lease_until?: string | null
          gcal_state?: string
          google_event_id?: string | null
          id?: string
          idempotency_key: string
          meet_url?: string | null
          needs_gcal_sync?: boolean
          reschedule_count?: number
          schedule_event_id?: string | null
          start_at: string
          status: string
          student_email_snapshot?: string | null
          student_name_snapshot?: string | null
          student_note?: string | null
          submission_error?: string | null
          submission_status?: string
          teacher_missed_at?: string | null
          teacher_missed_by?: string | null
          updated_at?: string
        }
        Update: {
          booking_pass_id?: string
          calendar_action?: string
          calendar_attempts?: number
          calendar_error?: string | null
          calendar_last_synced_at?: string | null
          calendar_lease_until?: string | null
          calendar_status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          credit_refunded?: boolean
          end_at?: string
          gcal_attempts?: number
          gcal_error?: string | null
          gcal_lease_until?: string | null
          gcal_state?: string
          google_event_id?: string | null
          id?: string
          idempotency_key?: string
          meet_url?: string | null
          needs_gcal_sync?: boolean
          reschedule_count?: number
          schedule_event_id?: string | null
          start_at?: string
          status?: string
          student_email_snapshot?: string | null
          student_name_snapshot?: string | null
          student_note?: string | null
          submission_error?: string | null
          submission_status?: string
          teacher_missed_at?: string | null
          teacher_missed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_pass_redemptions_booking_pass_id_fkey"
            columns: ["booking_pass_id"]
            isOneToOne: false
            referencedRelation: "booking_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_pass_redemptions_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_passes: {
        Row: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        Insert: {
          booking_slug?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          former_student_id?: string | null
          id?: string
          notes?: string | null
          session_length_minutes?: number
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          token_hash: string
          total_credits: number
          updated_at?: string
          used_credits?: number
        }
        Update: {
          booking_slug?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          former_student_id?: string | null
          id?: string
          notes?: string | null
          session_length_minutes?: number
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_name?: string | null
          token_hash?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
        }
        Relationships: []
      }
      booking_price_overrides: {
        Row: {
          created_at: string
          email: string
          event_slug: string
          note: string | null
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          event_slug: string
          note?: string | null
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_slug?: string
          note?: string | null
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_price_overrides_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "booking_event_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      booking_refusals: {
        Row: {
          booking_pass_id: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          start_at: string | null
          surface: string
        }
        Insert: {
          booking_pass_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          start_at?: string | null
          surface: string
        }
        Update: {
          booking_pass_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          start_at?: string | null
          surface?: string
        }
        Relationships: []
      }
      booking_worker_heartbeats: {
        Row: {
          last_error: string | null
          last_error_at: string | null
          last_start_at: string | null
          last_success_at: string | null
          metadata: Json
          updated_at: string
          worker_name: string
        }
        Insert: {
          last_error?: string | null
          last_error_at?: string | null
          last_start_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          updated_at?: string
          worker_name: string
        }
        Update: {
          last_error?: string | null
          last_error_at?: string | null
          last_start_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          updated_at?: string
          worker_name?: string
        }
        Relationships: []
      }
      booking_worker_secrets: {
        Row: {
          secret: string
          updated_at: string
          worker: string
        }
        Insert: {
          secret: string
          updated_at?: string
          worker: string
        }
        Update: {
          secret?: string
          updated_at?: string
          worker?: string
        }
        Relationships: []
      }
      booking_worker_tickets: {
        Row: {
          consumed_at: string | null
          expires_at: string
          issued_at: string
          token: string
          worker: string
        }
        Insert: {
          consumed_at?: string | null
          expires_at?: string
          issued_at?: string
          token?: string
          worker: string
        }
        Update: {
          consumed_at?: string | null
          expires_at?: string
          issued_at?: string
          token?: string
          worker?: string
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
          issuance: number
          metadata_json: Json
          notification_group_id: string | null
          notification_policy: string
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
          issuance?: number
          metadata_json?: Json
          notification_group_id?: string | null
          notification_policy?: string
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
          issuance?: number
          metadata_json?: Json
          notification_group_id?: string | null
          notification_policy?: string
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
      conditional_practice_runs: {
        Row: {
          created_at: string
          id: string
          revision: number
          snapshot: Json
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          revision?: number
          snapshot: Json
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revision?: number
          snapshot?: Json
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          home_cleared_at: string | null
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          home_cleared_at?: string | null
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          home_cleared_at?: string | null
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
      cs_attempts: {
        Row: {
          correct: boolean | null
          created_at: string
          id: string
          module_id: string
          question_id: string
          selected_answer: string | null
          time_ms: number | null
          user_id: string
        }
        Insert: {
          correct?: boolean | null
          created_at?: string
          id?: string
          module_id: string
          question_id: string
          selected_answer?: string | null
          time_ms?: number | null
          user_id: string
        }
        Update: {
          correct?: boolean | null
          created_at?: string
          id?: string
          module_id?: string
          question_id?: string
          selected_answer?: string | null
          time_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      curriculum_track_items: {
        Row: {
          created_at: string
          estimated_minutes: number | null
          guided_drill_id: string
          id: string
          is_optional: boolean
          notes: string | null
          position: number
          suggested_week: number | null
          track_id: string
        }
        Insert: {
          created_at?: string
          estimated_minutes?: number | null
          guided_drill_id: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          position: number
          suggested_week?: number | null
          track_id: string
        }
        Update: {
          created_at?: string
          estimated_minutes?: number | null
          guided_drill_id?: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          position?: number
          suggested_week?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_track_items_guided_drill_id_fkey"
            columns: ["guided_drill_id"]
            isOneToOne: false
            referencedRelation: "guided_drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_track_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "curriculum_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          slug?: string
          title?: string
          updated_at?: string
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
      deleted_students: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          display_name: string | null
          email: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          display_name?: string | null
          email?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          display_name?: string | null
          email?: string | null
          note?: string | null
          user_id?: string
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
      external_booking_events: {
        Row: {
          attendee_name: string | null
          created_at: string
          email: string | null
          end_at: string | null
          former_student_id: string | null
          google_event_id: string | null
          id: string
          offer_id: string | null
          payload: Json
          provider: string
          provider_booking_id: string
          schedule_event_id: string | null
          source_url: string | null
          start_at: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          attendee_name?: string | null
          created_at?: string
          email?: string | null
          end_at?: string | null
          former_student_id?: string | null
          google_event_id?: string | null
          id?: string
          offer_id?: string | null
          payload?: Json
          provider?: string
          provider_booking_id: string
          schedule_event_id?: string | null
          source_url?: string | null
          start_at?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          attendee_name?: string | null
          created_at?: string
          email?: string | null
          end_at?: string | null
          former_student_id?: string | null
          google_event_id?: string | null
          id?: string
          offer_id?: string | null
          payload?: Json
          provider?: string
          provider_booking_id?: string
          schedule_event_id?: string | null
          source_url?: string | null
          start_at?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_booking_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_booking_events_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      external_work_uploads: {
        Row: {
          applied_to_analytics: boolean
          booking_idempotency_key: string | null
          booking_pass_id: string | null
          cleanup_claimed_at: string | null
          client_upload_id: string | null
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          processing_status: string
          redemption_id: string | null
          reviewed_at: string | null
          source_platform: string | null
          storage_bucket: string
          storage_path: string
          student_id: string | null
          upload_type: string
          uploaded_by: string | null
        }
        Insert: {
          applied_to_analytics?: boolean
          booking_idempotency_key?: string | null
          booking_pass_id?: string | null
          cleanup_claimed_at?: string | null
          client_upload_id?: string | null
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          processing_status?: string
          redemption_id?: string | null
          reviewed_at?: string | null
          source_platform?: string | null
          storage_bucket?: string
          storage_path: string
          student_id?: string | null
          upload_type?: string
          uploaded_by?: string | null
        }
        Update: {
          applied_to_analytics?: boolean
          booking_idempotency_key?: string | null
          booking_pass_id?: string | null
          cleanup_claimed_at?: string | null
          client_upload_id?: string | null
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          processing_status?: string
          redemption_id?: string | null
          reviewed_at?: string | null
          source_platform?: string | null
          storage_bucket?: string
          storage_path?: string
          student_id?: string | null
          upload_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_work_uploads_booking_pass_id_fkey"
            columns: ["booking_pass_id"]
            isOneToOne: false
            referencedRelation: "booking_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_work_uploads_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "booking_pass_redemptions"
            referencedColumns: ["id"]
          },
        ]
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
          busy_calendar_ids: string[]
          calendar_id: string
          id: number
          last_attempt_at: string | null
          last_full_sync_at: string | null
          last_synced_at: string | null
          sync_token: string | null
          sync_token_updated_at: string | null
        }
        Insert: {
          busy_calendar_ids?: string[]
          calendar_id?: string
          id?: number
          last_attempt_at?: string | null
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
          sync_token_updated_at?: string | null
        }
        Update: {
          busy_calendar_ids?: string[]
          calendar_id?: string
          id?: number
          last_attempt_at?: string | null
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
          sync_token_updated_at?: string | null
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
          issuance: number
          level: string | null
          notification_group_id: string | null
          notification_policy: string
          question_count: number | null
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
          issuance?: number
          level?: string | null
          notification_group_id?: string | null
          notification_policy?: string
          question_count?: number | null
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
          issuance?: number
          level?: string | null
          notification_group_id?: string | null
          notification_policy?: string
          question_count?: number | null
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
          level: string | null
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
          level?: string | null
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
          level?: string | null
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
          issuance: number
          notification_group_id: string | null
          notification_policy: string
          question_qids: string[]
          score: number | null
          set_description: string | null
          set_id: string | null
          set_title: string
          started_at: string | null
          status: string
          student_id: string
          unlock_at: string | null
        }
        Insert: {
          assigned_by: string
          class_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          question_qids: string[]
          score?: number | null
          set_description?: string | null
          set_id?: string | null
          set_title: string
          started_at?: string | null
          status?: string
          student_id: string
          unlock_at?: string | null
        }
        Update: {
          assigned_by?: string
          class_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          question_qids?: string[]
          score?: number | null
          set_description?: string | null
          set_id?: string | null
          set_title?: string
          started_at?: string | null
          status?: string
          student_id?: string
          unlock_at?: string | null
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
      intro_lr_attempts: {
        Row: {
          correct: boolean
          created_at: string
          drill_id: string
          id: string
          mode: string
          question_id: string
          selected_answer: string | null
          time_ms: number | null
          user_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string
          drill_id: string
          id?: string
          mode: string
          question_id: string
          selected_answer?: string | null
          time_ms?: number | null
          user_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string
          drill_id?: string
          id?: string
          mode?: string
          question_id?: string
          selected_answer?: string | null
          time_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      journal_databases: {
        Row: {
          columns: Json
          created_at: string
          page_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          page_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          page_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_databases_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "journal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_pages: {
        Row: {
          body: Json
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          parent_page_id: string | null
          properties: Json
          sort_order: number
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: Json
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          parent_page_id?: string | null
          properties?: Json
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: Json
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          parent_page_id?: string | null
          properties?: Json
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "journal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_views: {
        Row: {
          config: Json
          created_at: string
          database_id: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          database_id: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          database_id?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_views_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "journal_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_answer_choices: {
        Row: {
          choice_text: string
          created_at: string
          id: string
          is_correct: boolean
          letter: string
          question_id: string
          student_percent: number | null
          tag: string | null
          updated_at: string
        }
        Insert: {
          choice_text: string
          created_at?: string
          id?: string
          is_correct?: boolean
          letter: string
          question_id: string
          student_percent?: number | null
          tag?: string | null
          updated_at?: string
        }
        Update: {
          choice_text?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          letter?: string
          question_id?: string
          student_percent?: number | null
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_answer_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lr_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_explanation_choice_notes: {
        Row: {
          body: string
          created_at: string
          explanation_id: string
          id: string
          letter: string
        }
        Insert: {
          body: string
          created_at?: string
          explanation_id: string
          id?: string
          letter: string
        }
        Update: {
          body?: string
          created_at?: string
          explanation_id?: string
          id?: string
          letter?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_explanation_choice_notes_explanation_id_fkey"
            columns: ["explanation_id"]
            isOneToOne: false
            referencedRelation: "lr_explanations"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_explanation_steps: {
        Row: {
          body: string
          created_at: string
          explanation_id: string
          id: string
          label: string
          position: number
        }
        Insert: {
          body: string
          created_at?: string
          explanation_id: string
          id?: string
          label: string
          position: number
        }
        Update: {
          body?: string
          created_at?: string
          explanation_id?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "lr_explanation_steps_explanation_id_fkey"
            columns: ["explanation_id"]
            isOneToOne: false
            referencedRelation: "lr_explanations"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_explanations: {
        Row: {
          created_at: string
          id: string
          question_id: string
          style: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          style: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          style?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_explanations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lr_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_preptests: {
        Row: {
          created_at: string
          preptest: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          preptest: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          preptest?: number
          updated_at?: string
        }
        Relationships: []
      }
      lr_questions: {
        Row: {
          correct_choice: string | null
          created_at: string
          id: string
          is_explained: boolean
          preptest: number
          prompt: string | null
          qid: string
          question_number: number
          question_type: string
          section: number
          section_id: string
          source_note: string | null
          stimulus: string | null
          updated_at: string
        }
        Insert: {
          correct_choice?: string | null
          created_at?: string
          id?: string
          is_explained?: boolean
          preptest: number
          prompt?: string | null
          qid: string
          question_number: number
          question_type: string
          section: number
          section_id: string
          source_note?: string | null
          stimulus?: string | null
          updated_at?: string
        }
        Update: {
          correct_choice?: string | null
          created_at?: string
          id?: string
          is_explained?: boolean
          preptest?: number
          prompt?: string | null
          qid?: string
          question_number?: number
          question_type?: string
          section?: number
          section_id?: string
          source_note?: string | null
          stimulus?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "lr_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      lr_sections: {
        Row: {
          created_at: string
          id: string
          preptest: number
          section: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          preptest: number
          section: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preptest?: number
          section?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lr_sections_preptest_fkey"
            columns: ["preptest"]
            isOneToOne: false
            referencedRelation: "lr_preptests"
            referencedColumns: ["preptest"]
          },
        ]
      }
      lsat_knowledge_sources: {
        Row: {
          authority: string
          domain: string
          id: string
          imported_at: string
          metadata: Json
          raw_markdown: string
          slug: string
          source_format: string
          source_sha256: string
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          authority?: string
          domain: string
          id?: string
          imported_at?: string
          metadata?: Json
          raw_markdown: string
          slug: string
          source_format?: string
          source_sha256: string
          status?: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          authority?: string
          domain?: string
          id?: string
          imported_at?: string
          metadata?: Json
          raw_markdown?: string
          slug?: string
          source_format?: string
          source_sha256?: string
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      lsatu_content_index: {
        Row: {
          body: string | null
          chunk_index: number
          created_at: string
          embedding: string | null
          id: string
          kind: string
          metadata: Json
          source_id: string
          subtitle: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          chunk_index?: number
          created_at?: string
          embedding?: string | null
          id?: string
          kind: string
          metadata?: Json
          source_id: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          chunk_index?: number
          created_at?: string
          embedding?: string | null
          id?: string
          kind?: string
          metadata?: Json
          source_id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      lsatu_content_staging: {
        Row: {
          body: string | null
          chunk_index: number
          created_at: string
          embedding: string | null
          id: string
          import_version: string
          kind: string
          metadata: Json
          source_id: string
          subtitle: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          body?: string | null
          chunk_index: number
          created_at?: string
          embedding?: string | null
          id?: string
          import_version: string
          kind: string
          metadata?: Json
          source_id: string
          subtitle?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          body?: string | null
          chunk_index?: number
          created_at?: string
          embedding?: string | null
          id?: string
          import_version?: string
          kind?: string
          metadata?: Json
          source_id?: string
          subtitle?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      mcp_write_audit: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          idempotency_key: string
          result: Json
          student_id: string | null
          tool_name: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          result: Json
          student_id?: string | null
          tool_name: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          result?: Json
          student_id?: string | null
          tool_name?: string
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
      model_runs: {
        Row: {
          asr_engine: string | null
          asr_model: string | null
          audio_bucket: string
          audio_bytes: number | null
          audio_path: string | null
          audio_sha256: string | null
          citation: string | null
          created_at: string
          id: string
          slug: string
          source_section: string
          status: string
          transcribed_at: string | null
          transcript_sha256: string | null
          transcript_text: string | null
          updated_at: string
          version: number
          walkthrough_md: string | null
        }
        Insert: {
          asr_engine?: string | null
          asr_model?: string | null
          audio_bucket?: string
          audio_bytes?: number | null
          audio_path?: string | null
          audio_sha256?: string | null
          citation?: string | null
          created_at?: string
          id?: string
          slug: string
          source_section: string
          status?: string
          transcribed_at?: string | null
          transcript_sha256?: string | null
          transcript_text?: string | null
          updated_at?: string
          version?: number
          walkthrough_md?: string | null
        }
        Update: {
          asr_engine?: string | null
          asr_model?: string | null
          audio_bucket?: string
          audio_bytes?: number | null
          audio_path?: string | null
          audio_sha256?: string | null
          citation?: string | null
          created_at?: string
          id?: string
          slug?: string
          source_section?: string
          status?: string
          transcribed_at?: string | null
          transcript_sha256?: string | null
          transcript_text?: string | null
          updated_at?: string
          version?: number
          walkthrough_md?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          assignment_delivery_id: string | null
          assignment_event_id: string | null
          assignment_group_id: string | null
          assignment_superseded_at: string | null
          assignment_superseded_by_issuance: number | null
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
          assignment_delivery_id?: string | null
          assignment_event_id?: string | null
          assignment_group_id?: string | null
          assignment_superseded_at?: string | null
          assignment_superseded_by_issuance?: number | null
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
          assignment_delivery_id?: string | null
          assignment_event_id?: string | null
          assignment_group_id?: string | null
          assignment_superseded_at?: string | null
          assignment_superseded_by_issuance?: number | null
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
      practice_test_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          issuance: number
          notification_group_id: string | null
          notification_policy: string
          pt: number
          status: string
          student_id: string
          unlock_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          pt: number
          status?: string
          student_id: string
          unlock_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          pt?: number
          status?: string
          student_id?: string
          unlock_at?: string | null
        }
        Relationships: []
      }
      practice_test_runs: {
        Row: {
          active_device_id: string | null
          break_after_leg: number
          break_started_at: string | null
          break_taken: boolean
          completed_at: string | null
          created_at: string
          current_leg: number
          id: string
          legs: Json
          pace: string
          pt: number
          raw_correct: number | null
          raw_total: number | null
          revision: number
          scaled_score: number | null
          score_source: string | null
          section_seconds: number | null
          status: string
          timed_clock_leg: number | null
          timed_contract_version: number | null
          timed_elapsed_ms: number | null
          timed_frozen_legs: Json | null
          timed_lease_expires_at: string | null
          timed_lease_ms: number | null
          timed_manifest: Json | null
          timed_manifest_sha256: string | null
          timed_phase: string | null
          timed_running_anchor: string | null
          timed_writer_epoch: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_device_id?: string | null
          break_after_leg: number
          break_started_at?: string | null
          break_taken?: boolean
          completed_at?: string | null
          created_at?: string
          current_leg?: number
          id: string
          legs: Json
          pace: string
          pt: number
          raw_correct?: number | null
          raw_total?: number | null
          revision?: number
          scaled_score?: number | null
          score_source?: string | null
          section_seconds?: number | null
          status: string
          timed_clock_leg?: number | null
          timed_contract_version?: number | null
          timed_elapsed_ms?: number | null
          timed_frozen_legs?: Json | null
          timed_lease_expires_at?: string | null
          timed_lease_ms?: number | null
          timed_manifest?: Json | null
          timed_manifest_sha256?: string | null
          timed_phase?: string | null
          timed_running_anchor?: string | null
          timed_writer_epoch?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_device_id?: string | null
          break_after_leg?: number
          break_started_at?: string | null
          break_taken?: boolean
          completed_at?: string | null
          created_at?: string
          current_leg?: number
          id?: string
          legs?: Json
          pace?: string
          pt?: number
          raw_correct?: number | null
          raw_total?: number | null
          revision?: number
          scaled_score?: number | null
          score_source?: string | null
          section_seconds?: number | null
          status?: string
          timed_clock_leg?: number | null
          timed_contract_version?: number | null
          timed_elapsed_ms?: number | null
          timed_frozen_legs?: Json | null
          timed_lease_expires_at?: string | null
          timed_lease_ms?: number | null
          timed_manifest?: Json | null
          timed_manifest_sha256?: string | null
          timed_phase?: string | null
          timed_running_anchor?: string | null
          timed_writer_epoch?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_tier: string | null
          archived_at: string | null
          archived_reason: string | null
          by_level_json: Json | null
          by_qtype_json: Json | null
          class_id: string
          daily_goal_questions: number | null
          daily_goal_streak: number | null
          display_name: string | null
          has_activity_access: boolean
          has_analytics_access: boolean
          has_bootcamp_access: boolean
          has_chat_access: boolean
          has_classroom_access: boolean
          has_drill_access: boolean
          has_export_access: boolean
          has_flagged_access: boolean
          has_journal_access: boolean
          has_practice_access: boolean
          has_schedule_access: boolean
          has_seen_tour: boolean
          has_ta_access: boolean
          has_waj_access: boolean
          last_practice_date: string | null
          last_seen_at: string | null
          layout_prefs: Json | null
          level: number | null
          longest_streak: number | null
          lsat_accommodation: string
          onboarding: Json | null
          onboarding_completed_at: string | null
          onboarding_notified_at: string | null
          overall_answered: number | null
          overall_avg_ms: number | null
          overall_correct: number | null
          proficiency_level: string | null
          streak_current: number | null
          test_date: string | null
          updated_at: string | null
          xp_total: number | null
        }
        Insert: {
          access_tier?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id: string
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          display_name?: string | null
          has_activity_access?: boolean
          has_analytics_access?: boolean
          has_bootcamp_access?: boolean
          has_chat_access?: boolean
          has_classroom_access?: boolean
          has_drill_access?: boolean
          has_export_access?: boolean
          has_flagged_access?: boolean
          has_journal_access?: boolean
          has_practice_access?: boolean
          has_schedule_access?: boolean
          has_seen_tour?: boolean
          has_ta_access?: boolean
          has_waj_access?: boolean
          last_practice_date?: string | null
          last_seen_at?: string | null
          layout_prefs?: Json | null
          level?: number | null
          longest_streak?: number | null
          lsat_accommodation?: string
          onboarding?: Json | null
          onboarding_completed_at?: string | null
          onboarding_notified_at?: string | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          proficiency_level?: string | null
          streak_current?: number | null
          test_date?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Update: {
          access_tier?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          by_level_json?: Json | null
          by_qtype_json?: Json | null
          class_id?: string
          daily_goal_questions?: number | null
          daily_goal_streak?: number | null
          display_name?: string | null
          has_activity_access?: boolean
          has_analytics_access?: boolean
          has_bootcamp_access?: boolean
          has_chat_access?: boolean
          has_classroom_access?: boolean
          has_drill_access?: boolean
          has_export_access?: boolean
          has_flagged_access?: boolean
          has_journal_access?: boolean
          has_practice_access?: boolean
          has_schedule_access?: boolean
          has_seen_tour?: boolean
          has_ta_access?: boolean
          has_waj_access?: boolean
          last_practice_date?: string | null
          last_seen_at?: string | null
          layout_prefs?: Json | null
          level?: number | null
          longest_streak?: number | null
          lsat_accommodation?: string
          onboarding?: Json | null
          onboarding_completed_at?: string | null
          onboarding_notified_at?: string | null
          overall_answered?: number | null
          overall_avg_ms?: number | null
          overall_correct?: number | null
          proficiency_level?: string | null
          streak_current?: number | null
          test_date?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: []
      }
      question_exposures: {
        Row: {
          id: string
          question_id: string
          shown_at: string
          user_id: string
        }
        Insert: {
          id?: string
          question_id: string
          shown_at?: string
          user_id: string
        }
        Update: {
          id?: string
          question_id?: string
          shown_at?: string
          user_id?: string
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
      rc_annotations: {
        Row: {
          highlights: Json
          passage_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          highlights?: Json
          passage_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          highlights?: Json
          passage_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rc_answer_choices: {
        Row: {
          catalog_answer_types: string | null
          correct: boolean | null
          explanation: string | null
          letter: string
          percent: number | null
          question_id: number
          response_count: number | null
          tag: string | null
          text: string | null
        }
        Insert: {
          catalog_answer_types?: string | null
          correct?: boolean | null
          explanation?: string | null
          letter: string
          percent?: number | null
          question_id: number
          response_count?: number | null
          tag?: string | null
          text?: string | null
        }
        Update: {
          catalog_answer_types?: string | null
          correct?: boolean | null
          explanation?: string | null
          letter?: string
          percent?: number | null
          question_id?: number
          response_count?: number | null
          tag?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rc_answer_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rc_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      rc_attempts: {
        Row: {
          created_at: string
          eliminations: string[]
          flagged: boolean
          id: string
          is_correct: boolean | null
          is_first_attempt: boolean
          passage_id: number
          question_id: number
          selected: string | null
          session_id: string
          time_ms: number
          user_id: string
        }
        Insert: {
          created_at?: string
          eliminations?: string[]
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          is_first_attempt?: boolean
          passage_id: number
          question_id: number
          selected?: string | null
          session_id: string
          time_ms?: number
          user_id: string
        }
        Update: {
          created_at?: string
          eliminations?: string[]
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          is_first_attempt?: boolean
          passage_id?: number
          question_id?: number
          selected?: string | null
          session_id?: string
          time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rc_drill_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rc_attempts_session_owner_fk"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "rc_drill_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      rc_drill_sessions: {
        Row: {
          completed_at: string | null
          config: Json
          excluded_from_analytics: boolean
          id: string
          passage_ids: number[]
          practice_test_leg: number | null
          practice_test_run_id: string | null
          started_at: string
          status: string
          timed_section_sitting_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config: Json
          excluded_from_analytics?: boolean
          id?: string
          passage_ids: number[]
          practice_test_leg?: number | null
          practice_test_run_id?: string | null
          started_at?: string
          status?: string
          timed_section_sitting_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          excluded_from_analytics?: boolean
          id?: string
          passage_ids?: number[]
          practice_test_leg?: number | null
          practice_test_run_id?: string | null
          started_at?: string
          status?: string
          timed_section_sitting_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_sessions_pt_run_fk"
            columns: ["practice_test_run_id", "user_id"]
            isOneToOne: false
            referencedRelation: "practice_test_runs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "timed_section_rc_owner_v1"
            columns: ["timed_section_sitting_id", "user_id"]
            isOneToOne: false
            referencedRelation: "timed_section_sittings_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      rc_lesson_progress: {
        Row: {
          completed_at: string | null
          data: Json
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          data?: Json
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          data?: Json
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rc_passage_frameworks: {
        Row: {
          framework: string
          passage_id: number
        }
        Insert: {
          framework: string
          passage_id: number
        }
        Update: {
          framework?: string
          passage_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rc_passage_frameworks_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "rc_passages"
            referencedColumns: ["passage_id"]
          },
        ]
      }
      rc_passages: {
        Row: {
          difficulty: number | null
          format: string | null
          passage_id: number
          preptest: number
          question_count: number
          section: number
          set_number: number
          summary_another_way: string | null
          summary_brief: string | null
          summary_standard: string | null
          text: string | null
          title: string | null
          topic: string | null
        }
        Insert: {
          difficulty?: number | null
          format?: string | null
          passage_id: number
          preptest: number
          question_count: number
          section: number
          set_number: number
          summary_another_way?: string | null
          summary_brief?: string | null
          summary_standard?: string | null
          text?: string | null
          title?: string | null
          topic?: string | null
        }
        Update: {
          difficulty?: number | null
          format?: string | null
          passage_id?: number
          preptest?: number
          question_count?: number
          section?: number
          set_number?: number
          summary_another_way?: string | null
          summary_brief?: string | null
          summary_standard?: string | null
          text?: string | null
          title?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      rc_question_features: {
        Row: {
          feature: string
          feature_group: string | null
          question_id: number
        }
        Insert: {
          feature: string
          feature_group?: string | null
          question_id: number
        }
        Update: {
          feature?: string
          feature_group?: string | null
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rc_question_features_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rc_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      rc_question_legacy_tags: {
        Row: {
          legacy_tag: string
          question_id: number
        }
        Insert: {
          legacy_tag: string
          question_id: number
        }
        Update: {
          legacy_tag?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rc_question_legacy_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rc_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      rc_questions: {
        Row: {
          correct_answer: string | null
          difficulty: number | null
          explanation_blocks: Json | null
          has_written_explanation: boolean
          passage_id: number
          position: number
          preptest: number
          prompt: string | null
          question_id: number
          question_type: string
          question_type_family: string | null
          section: number
          set_number: number
          total_responses: number | null
        }
        Insert: {
          correct_answer?: string | null
          difficulty?: number | null
          explanation_blocks?: Json | null
          has_written_explanation: boolean
          passage_id: number
          position: number
          preptest: number
          prompt?: string | null
          question_id: number
          question_type: string
          question_type_family?: string | null
          section: number
          set_number: number
          total_responses?: number | null
        }
        Update: {
          correct_answer?: string | null
          difficulty?: number | null
          explanation_blocks?: Json | null
          has_written_explanation?: boolean
          passage_id?: number
          position?: number
          preptest?: number
          prompt?: string | null
          question_id?: number
          question_type?: string
          question_type_family?: string | null
          section?: number
          set_number?: number
          total_responses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rc_questions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "rc_passages"
            referencedColumns: ["passage_id"]
          },
        ]
      }
      rc_recall_attempts: {
        Row: {
          completed: boolean
          confirmation_scope: string | null
          created_at: string
          elapsed_seconds: number | null
          finished_at: string | null
          id: string
          mode: string
          passage_ids: number[]
          preptest: number
          section: number
          segmentation_version: number
          started_at: string
          student_id: string
        }
        Insert: {
          completed?: boolean
          confirmation_scope?: string | null
          created_at?: string
          elapsed_seconds?: number | null
          finished_at?: string | null
          id: string
          mode: string
          passage_ids: number[]
          preptest: number
          section: number
          segmentation_version?: number
          started_at?: string
          student_id: string
        }
        Update: {
          completed?: boolean
          confirmation_scope?: string | null
          created_at?: string
          elapsed_seconds?: number | null
          finished_at?: string | null
          id?: string
          mode?: string
          passage_ids?: number[]
          preptest?: number
          section?: number
          segmentation_version?: number
          started_at?: string
          student_id?: string
        }
        Relationships: []
      }
      rc_recall_capture_transcripts: {
        Row: {
          asr_calls: number
          asr_engine: string | null
          asr_words: Json | null
          attempt_id: string
          audio_hash: string | null
          audio_seconds: number | null
          capture_id: string
          claim_token: string | null
          created_at: string
          lease_until: string | null
          status: string
          student_id: string
          transcript: string | null
          tries: number
          updated_at: string
        }
        Insert: {
          asr_calls?: number
          asr_engine?: string | null
          asr_words?: Json | null
          attempt_id: string
          audio_hash?: string | null
          audio_seconds?: number | null
          capture_id: string
          claim_token?: string | null
          created_at?: string
          lease_until?: string | null
          status: string
          student_id: string
          transcript?: string | null
          tries?: number
          updated_at?: string
        }
        Update: {
          asr_calls?: number
          asr_engine?: string | null
          asr_words?: Json | null
          attempt_id?: string
          audio_hash?: string | null
          audio_seconds?: number | null
          capture_id?: string
          claim_token?: string | null
          created_at?: string
          lease_until?: string | null
          status?: string
          student_id?: string
          transcript?: string | null
          tries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_recall_capture_transcripts_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rc_recall_capture_transcripts_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: true
            referencedRelation: "rc_recall_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_recall_captures: {
        Row: {
          attempt_id: string
          created_at: string
          duration_ms: number | null
          id: string
          mime_type: string | null
          object_path: string | null
          recording_state: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          duration_ms?: number | null
          id: string
          mime_type?: string | null
          object_path?: string | null
          recording_state?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          mime_type?: string | null
          object_path?: string | null
          recording_state?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_recall_captures_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_recall_grades: {
        Row: {
          asr_calls: number
          asr_engine: string | null
          asr_words: Json | null
          assessment: Json | null
          attempt_id: string
          audio_hash: string | null
          audio_seconds: number | null
          capture_id: string | null
          claim_token: string | null
          created_at: string
          grader_version: number
          id: string
          judge_calls: number
          lease_until: string | null
          model: string | null
          object_path: string | null
          paragraph_index: number | null
          passage_id: number | null
          provider_usage: Json | null
          reason: string | null
          recall_end_ms: number | null
          recall_start_ms: number | null
          recap_id: string
          source_hash: string | null
          source_text: string | null
          status: string
          student_id: string
          transcript: string | null
          tries: number
          updated_at: string
        }
        Insert: {
          asr_calls?: number
          asr_engine?: string | null
          asr_words?: Json | null
          assessment?: Json | null
          attempt_id: string
          audio_hash?: string | null
          audio_seconds?: number | null
          capture_id?: string | null
          claim_token?: string | null
          created_at?: string
          grader_version: number
          id?: string
          judge_calls?: number
          lease_until?: string | null
          model?: string | null
          object_path?: string | null
          paragraph_index?: number | null
          passage_id?: number | null
          provider_usage?: Json | null
          reason?: string | null
          recall_end_ms?: number | null
          recall_start_ms?: number | null
          recap_id: string
          source_hash?: string | null
          source_text?: string | null
          status: string
          student_id: string
          transcript?: string | null
          tries?: number
          updated_at?: string
        }
        Update: {
          asr_calls?: number
          asr_engine?: string | null
          asr_words?: Json | null
          assessment?: Json | null
          attempt_id?: string
          audio_hash?: string | null
          audio_seconds?: number | null
          capture_id?: string | null
          claim_token?: string | null
          created_at?: string
          grader_version?: number
          id?: string
          judge_calls?: number
          lease_until?: string | null
          model?: string | null
          object_path?: string | null
          paragraph_index?: number | null
          passage_id?: number | null
          provider_usage?: Json | null
          reason?: string | null
          recall_end_ms?: number | null
          recall_start_ms?: number | null
          recap_id?: string
          source_hash?: string | null
          source_text?: string | null
          status?: string
          student_id?: string
          transcript?: string | null
          tries?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_recall_grades_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rc_recall_grades_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rc_recall_grades_recap_id_fkey"
            columns: ["recap_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_recaps"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_recall_passage_progress: {
        Row: {
          active_ms: number
          attempt_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          passage_id: number
          passage_position: number
          student_id: string
          updated_at: string
        }
        Insert: {
          active_ms?: number
          attempt_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          passage_id: number
          passage_position: number
          student_id: string
          updated_at?: string
        }
        Update: {
          active_ms?: number
          attempt_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          passage_id?: number
          passage_position?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_recall_passage_progress_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_recall_recaps: {
        Row: {
          attempt_id: string
          capture_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          kind: string
          mime_type: string | null
          object_path: string | null
          passage_position: number
          recall_end_ms: number | null
          recall_start_ms: number | null
          recap_key: string
          recording_state: string
          student_id: string
          updated_at: string
          voice: string
        }
        Insert: {
          attempt_id: string
          capture_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id: string
          kind: string
          mime_type?: string | null
          object_path?: string | null
          passage_position: number
          recall_end_ms?: number | null
          recall_start_ms?: number | null
          recap_key: string
          recording_state: string
          student_id: string
          updated_at?: string
          voice: string
        }
        Update: {
          attempt_id?: string
          capture_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          object_path?: string | null
          passage_position?: number
          recall_end_ms?: number | null
          recall_start_ms?: number | null
          recap_key?: string
          recording_state?: string
          student_id?: string
          updated_at?: string
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "rc_recall_recaps_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rc_recall_recaps_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "rc_recall_captures"
            referencedColumns: ["id"]
          },
        ]
      }
      rc_taxonomy: {
        Row: {
          group: string | null
          kind: string
          name: string
          source_id: number
        }
        Insert: {
          group?: string | null
          kind: string
          name: string
          source_id: number
        }
        Update: {
          group?: string | null
          kind?: string
          name?: string
          source_id?: number
        }
        Relationships: []
      }
      reading_center_bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          passage_id: string
          user_id: string
          word_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          passage_id: string
          user_id: string
          word_index: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          passage_id?: string
          user_id?: string
          word_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_center_bookmarks_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_center_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_center_passage_metadata: {
        Row: {
          author_override: string | null
          body_override: string | null
          cover_url_override: string | null
          genre_override: string | null
          hidden: boolean
          passage_id: string
          tags: string[]
          title_override: string | null
          user_id: string
        }
        Insert: {
          author_override?: string | null
          body_override?: string | null
          cover_url_override?: string | null
          genre_override?: string | null
          hidden?: boolean
          passage_id: string
          tags?: string[]
          title_override?: string | null
          user_id: string
        }
        Update: {
          author_override?: string | null
          body_override?: string | null
          cover_url_override?: string | null
          genre_override?: string | null
          hidden?: boolean
          passage_id?: string
          tags?: string[]
          title_override?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_center_passage_metadata_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_center_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_center_passages: {
        Row: {
          author: string | null
          body: string
          cover_url: string | null
          created_at: string
          genre: string | null
          id: string
          is_published: boolean
          owner_id: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          author?: string | null
          body: string
          cover_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_published?: boolean
          owner_id?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          author?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_published?: boolean
          owner_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: []
      }
      reading_center_preferences: {
        Row: {
          center_text: boolean
          font_family: string
          font_size: number
          goal_wpm: number
          line_spacing: number
          number_of_lines: number
          punctuation_pauses: boolean
          reading_mode: string
          speed_variability: boolean
          theme: string
          updated_at: string
          user_id: string
          words_per_line: number
          wpm: number
        }
        Insert: {
          center_text?: boolean
          font_family?: string
          font_size?: number
          goal_wpm?: number
          line_spacing?: number
          number_of_lines?: number
          punctuation_pauses?: boolean
          reading_mode?: string
          speed_variability?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          words_per_line?: number
          wpm?: number
        }
        Update: {
          center_text?: boolean
          font_family?: string
          font_size?: number
          goal_wpm?: number
          line_spacing?: number
          number_of_lines?: number
          punctuation_pauses?: boolean
          reading_mode?: string
          speed_variability?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          words_per_line?: number
          wpm?: number
        }
        Relationships: []
      }
      reading_center_profile: {
        Row: {
          display_name: string
          user_id: string
        }
        Insert: {
          display_name?: string
          user_id: string
        }
        Update: {
          display_name?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_center_progress: {
        Row: {
          completed_at: string | null
          hidden_from_recent: boolean
          last_opened_at: string
          passage_id: string
          user_id: string
          word_index: number
        }
        Insert: {
          completed_at?: string | null
          hidden_from_recent?: boolean
          last_opened_at?: string
          passage_id: string
          user_id: string
          word_index?: number
        }
        Update: {
          completed_at?: string | null
          hidden_from_recent?: boolean
          last_opened_at?: string
          passage_id?: string
          user_id?: string
          word_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_center_progress_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_center_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_center_sessions: {
        Row: {
          active_ms: number
          ended_at: string
          id: string
          passage_id: string
          paused_ms: number
          reading_mode: string
          started_at: string
          user_id: string
          words_read: number
          wpm: number
        }
        Insert: {
          active_ms: number
          ended_at: string
          id?: string
          passage_id: string
          paused_ms?: number
          reading_mode: string
          started_at: string
          user_id: string
          words_read: number
          wpm: number
        }
        Update: {
          active_ms?: number
          ended_at?: string
          id?: string
          passage_id?: string
          paused_ms?: number
          reading_mode?: string
          started_at?: string
          user_id?: string
          words_read?: number
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_center_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "reading_center_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_center_tags: {
        Row: {
          color: number
          name: string
          user_id: string
        }
        Insert: {
          color?: number
          name: string
          user_id: string
        }
        Update: {
          color?: number
          name?: string
          user_id?: string
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
      review_episode_events_v1: {
        Row: {
          actor_id: string
          created_at: string
          episode_id: string
          id: string
          kind: string
          payload: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          episode_id: string
          id: string
          kind: string
          payload: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          episode_id?: string
          id?: string
          kind?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "review_episode_events_v1_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "review_episodes_v1"
            referencedColumns: ["id"]
          },
        ]
      }
      review_episodes_v1: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          question_id: string
          reason: string
          selection_reason: string | null
          source_id: string
          source_kind: string
          student_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          question_id: string
          reason: string
          selection_reason?: string | null
          source_id: string
          source_kind: string
          student_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          selection_reason?: string | null
          source_id?: string
          source_kind?: string
          student_id?: string
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
          meet_url: string | null
          source: string
          start_at: string
          status: string
          title: string
          transparency: string
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
          meet_url?: string | null
          source?: string
          start_at: string
          status?: string
          title?: string
          transparency?: string
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
          meet_url?: string | null
          source?: string
          start_at?: string
          status?: string
          title?: string
          transparency?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_templates: {
        Row: {
          created_at: string
          created_by: string | null
          days_json: Json
          description: string | null
          id: string
          is_default: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_json?: Json
          description?: string | null
          id?: string
          is_default?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_json?: Json
          description?: string | null
          id?: string
          is_default?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      section_history: {
        Row: {
          analysis_json: Json | null
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
          practice_test_leg: number | null
          practice_test_run_id: string | null
          pt: number
          questions_json: Json | null
          report_email_error: string | null
          report_emailed_at: string | null
          section: number
          time_taken_ms: number
          timed_section_sitting_id: string | null
          total_questions: number
          total_time_ms: number | null
          unanswered_count: number | null
          user_id: string | null
        }
        Insert: {
          analysis_json?: Json | null
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
          practice_test_leg?: number | null
          practice_test_run_id?: string | null
          pt: number
          questions_json?: Json | null
          report_email_error?: string | null
          report_emailed_at?: string | null
          section: number
          time_taken_ms?: number
          timed_section_sitting_id?: string | null
          total_questions?: number
          total_time_ms?: number | null
          unanswered_count?: number | null
          user_id?: string | null
        }
        Update: {
          analysis_json?: Json | null
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
          practice_test_leg?: number | null
          practice_test_run_id?: string | null
          pt?: number
          questions_json?: Json | null
          report_email_error?: string | null
          report_emailed_at?: string | null
          section?: number
          time_taken_ms?: number
          timed_section_sitting_id?: string | null
          total_questions?: number
          total_time_ms?: number | null
          unanswered_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_history_pt_run_fk"
            columns: ["practice_test_run_id", "user_id"]
            isOneToOne: false
            referencedRelation: "practice_test_runs"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "timed_section_history_owner_v1"
            columns: ["timed_section_sitting_id", "user_id"]
            isOneToOne: false
            referencedRelation: "timed_section_sittings_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      session_ingestions: {
        Row: {
          attempt_count: number
          calendar_event_id: string | null
          created_at: string
          created_by: string
          discard_reason: string | null
          draft_id: string | null
          error_message: string | null
          gdrive_doc_id: string | null
          gmail_message_id: string | null
          id: string
          last_attempt_at: string | null
          match_confidence: string | null
          match_reason: string | null
          matched_student_id: string | null
          raw_meta: Json
          raw_subject: string | null
          resolved_at: string | null
          resolved_by: string | null
          scan_requested_by: string | null
          session_id: string | null
          status: string
          transcript_context_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          calendar_event_id?: string | null
          created_at?: string
          created_by: string
          discard_reason?: string | null
          draft_id?: string | null
          error_message?: string | null
          gdrive_doc_id?: string | null
          gmail_message_id?: string | null
          id?: string
          last_attempt_at?: string | null
          match_confidence?: string | null
          match_reason?: string | null
          matched_student_id?: string | null
          raw_meta?: Json
          raw_subject?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_requested_by?: string | null
          session_id?: string | null
          status?: string
          transcript_context_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          calendar_event_id?: string | null
          created_at?: string
          created_by?: string
          discard_reason?: string | null
          draft_id?: string | null
          error_message?: string | null
          gdrive_doc_id?: string | null
          gmail_message_id?: string | null
          id?: string
          last_attempt_at?: string | null
          match_confidence?: string | null
          match_reason?: string | null
          matched_student_id?: string | null
          raw_meta?: Json
          raw_subject?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_requested_by?: string | null
          session_id?: string | null
          status?: string
          transcript_context_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_ingestions_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "ai_ta_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ingestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ingestions_transcript_context_id_fkey"
            columns: ["transcript_context_id"]
            isOneToOne: false
            referencedRelation: "student_context"
            referencedColumns: ["id"]
          },
        ]
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
      single_session_bookings: {
        Row: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          booker_timezone?: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at?: string | null
          cancel_token_hash?: string | null
          checkout_fingerprint_disposition?: string
          checkout_request_fingerprint?: string | null
          client_idempotency_key: string
          created_at?: string
          currency?: string | null
          draft_expires_at: string
          email?: string | null
          end_at: string
          event_slug?: string
          former_student_id?: string | null
          gcal_event_id?: string | null
          guests?: Json
          id?: string
          ip_hash?: string | null
          lifecycle_version?: number
          livemode?: boolean | null
          meet_url?: string | null
          name?: string | null
          notes?: string | null
          quoted_amount_cents?: number | null
          quoted_currency?: string | null
          start_at: string
          status?: string
          status_changed_at?: string
          stripe_checkout_session_id?: string | null
          stripe_checkout_url?: string | null
          stripe_expires_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refund_status?: string | null
          sweep_attempts?: number
          sweep_lease_token?: string | null
          sweep_lease_until?: string | null
          sweep_worker_id?: string | null
          terminal_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          booker_timezone?: string | null
          booking_token_expires_at?: string
          booking_token_hash?: string
          cancel_token_expires_at?: string | null
          cancel_token_hash?: string | null
          checkout_fingerprint_disposition?: string
          checkout_request_fingerprint?: string | null
          client_idempotency_key?: string
          created_at?: string
          currency?: string | null
          draft_expires_at?: string
          email?: string | null
          end_at?: string
          event_slug?: string
          former_student_id?: string | null
          gcal_event_id?: string | null
          guests?: Json
          id?: string
          ip_hash?: string | null
          lifecycle_version?: number
          livemode?: boolean | null
          meet_url?: string | null
          name?: string | null
          notes?: string | null
          quoted_amount_cents?: number | null
          quoted_currency?: string | null
          start_at?: string
          status?: string
          status_changed_at?: string
          stripe_checkout_session_id?: string | null
          stripe_checkout_url?: string | null
          stripe_expires_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_refund_status?: string | null
          sweep_attempts?: number
          sweep_lease_token?: string | null
          sweep_lease_until?: string | null
          sweep_worker_id?: string | null
          terminal_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "single_session_bookings_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "booking_event_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      single_session_outbox: {
        Row: {
          action: string
          attempts: number
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          lease_worker_id: string | null
          max_attempts: number
          next_retry_at: string
          payload_ciphertext: string | null
          precondition_lifecycle_version: number
          precondition_status: string
          provider_status: string | null
          recipient: string
          result: Json
          sensitive_payload_purged_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          action: string
          attempts?: number
          booking_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          lease_worker_id?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload_ciphertext?: string | null
          precondition_lifecycle_version: number
          precondition_status: string
          provider_status?: string | null
          recipient?: string
          result?: Json
          sensitive_payload_purged_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          lease_worker_id?: string | null
          max_attempts?: number
          next_retry_at?: string
          payload_ciphertext?: string | null
          precondition_lifecycle_version?: number
          precondition_status?: string
          provider_status?: string | null
          recipient?: string
          result?: Json
          sensitive_payload_purged_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "single_session_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "single_session_bookings"
            referencedColumns: ["id"]
          },
        ]
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
      stripe_payments: {
        Row: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          amount_refunded_cents?: number
          auto_grant_eligible?: boolean
          checkout_session_id?: string | null
          created_at?: string
          currency: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          grant_state?: string
          granted_at?: string | null
          granted_by?: string | null
          granted_credits?: number | null
          id?: string
          livemode: boolean
          match_state?: string
          offer_id?: string | null
          paid_at: string
          payer_name?: string | null
          payment_intent_id?: string | null
          payment_link_id?: string | null
          product?: string | null
          source?: string
          status: string
          stripe_charge_id: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          amount_refunded_cents?: number
          auto_grant_eligible?: boolean
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          grant_state?: string
          granted_at?: string | null
          granted_by?: string | null
          granted_credits?: number | null
          id?: string
          livemode?: boolean
          match_state?: string
          offer_id?: string | null
          paid_at?: string
          payer_name?: string | null
          payment_intent_id?: string | null
          payment_link_id?: string | null
          product?: string | null
          source?: string
          status?: string
          stripe_charge_id?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_sync_runs: {
        Row: {
          charges_seen: number
          error: string | null
          finished_at: string | null
          id: string
          rows_written: number
          since: string
          started_at: string
        }
        Insert: {
          charges_seen?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_written?: number
          since: string
          started_at?: string
        }
        Update: {
          charges_seen?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_written?: number
          since?: string
          started_at?: string
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
      student_booking_offers: {
        Row: {
          created_at: string
          enabled: boolean
          offer_id: string
          student_id: string
          updated_at: string
          url_override: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          offer_id: string
          student_id: string
          updated_at?: string
          url_override?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          offer_id?: string
          student_id?: string
          updated_at?: string
          url_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_booking_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
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
      student_curriculum_enrollments: {
        Row: {
          pace_multiplier: number
          started_on: string | null
          student_id: string
          track_id: string
          updated_at: string
        }
        Insert: {
          pace_multiplier?: number
          started_on?: string | null
          student_id: string
          track_id: string
          updated_at?: string
        }
        Update: {
          pace_multiplier?: number
          started_on?: string | null
          student_id?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_enrollments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "curriculum_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      student_curriculum_overrides: {
        Row: {
          action: string
          created_at: string
          guided_drill_id: string | null
          id: string
          level: string | null
          notes: string | null
          position: number | null
          student_id: string
          track_id: string
          track_item_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          guided_drill_id?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          position?: number | null
          student_id: string
          track_id: string
          track_item_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          guided_drill_id?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          position?: number | null
          student_id?: string
          track_id?: string
          track_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_curriculum_overrides_guided_drill_id_fkey"
            columns: ["guided_drill_id"]
            isOneToOne: false
            referencedRelation: "guided_drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_overrides_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "curriculum_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_curriculum_overrides_track_item_id_fkey"
            columns: ["track_item_id"]
            isOneToOne: false
            referencedRelation: "curriculum_track_items"
            referencedColumns: ["id"]
          },
        ]
      }
      student_external_metrics: {
        Row: {
          avg_time_ms: number | null
          captured_at: string | null
          created_at: string
          first_accuracy: number | null
          id: string
          metric_kind: string
          period_label: string | null
          pt_number: string | null
          question_type: string | null
          sample_size: number | null
          scaled_score: number | null
          source_platform: string | null
          source_upload_id: string
          student_id: string
        }
        Insert: {
          avg_time_ms?: number | null
          captured_at?: string | null
          created_at?: string
          first_accuracy?: number | null
          id?: string
          metric_kind: string
          period_label?: string | null
          pt_number?: string | null
          question_type?: string | null
          sample_size?: number | null
          scaled_score?: number | null
          source_platform?: string | null
          source_upload_id: string
          student_id: string
        }
        Update: {
          avg_time_ms?: number | null
          captured_at?: string | null
          created_at?: string
          first_accuracy?: number | null
          id?: string
          metric_kind?: string
          period_label?: string | null
          pt_number?: string | null
          question_type?: string | null
          sample_size?: number | null
          scaled_score?: number | null
          source_platform?: string | null
          source_upload_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_external_metrics_source_upload_id_fkey"
            columns: ["source_upload_id"]
            isOneToOne: false
            referencedRelation: "external_work_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      student_schedules: {
        Row: {
          schedule_template_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          schedule_template_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          schedule_template_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_schedules_schedule_template_id_fkey"
            columns: ["schedule_template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number | null
          former_student_id: string | null
          id: string
          notes: string | null
          scheduled_at: string
          source: string | null
          status: string
          student_id: string | null
          transcript_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          former_student_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          source?: string | null
          status?: string
          student_id?: string | null
          transcript_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          former_student_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          source?: string | null
          status?: string
          student_id?: string | null
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
      student_work_receipts: {
        Row: {
          first_opened_at: string
          issuance: number
          last_opened_at: string
          read_at: string
          source_id: string
          source_table: string
          student_id: string
        }
        Insert: {
          first_opened_at: string
          issuance: number
          last_opened_at: string
          read_at: string
          source_id: string
          source_table: string
          student_id: string
        }
        Update: {
          first_opened_at?: string
          issuance?: number
          last_opened_at?: string
          read_at?: string
          source_id?: string
          source_table?: string
          student_id?: string
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
          answer_key_html: string | null
          asset_ids: string[]
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          content_html: string
          created_at: string
          id: string
          interaction_id: string | null
          issuance: number
          notification_group_id: string | null
          notification_policy: string
          pdf_url: string | null
          response_data: Json
          response_saved_at: string | null
          response_schema: Json
          status: string
          student_id: string
          title: string
          unlock_at: string | null
          viewed_at: string | null
        }
        Insert: {
          answer_key_html?: string | null
          asset_ids?: string[]
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          content_html: string
          created_at?: string
          id?: string
          interaction_id?: string | null
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          pdf_url?: string | null
          response_data?: Json
          response_saved_at?: string | null
          response_schema?: Json
          status?: string
          student_id: string
          title: string
          unlock_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          answer_key_html?: string | null
          asset_ids?: string[]
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          content_html?: string
          created_at?: string
          id?: string
          interaction_id?: string | null
          issuance?: number
          notification_group_id?: string | null
          notification_policy?: string
          pdf_url?: string | null
          response_data?: Json
          response_saved_at?: string | null
          response_schema?: Json
          status?: string
          student_id?: string
          title?: string
          unlock_at?: string | null
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
          action_proposal: Json | null
          action_status: string | null
          asset_ids: string[]
          created_at: string
          created_by: string | null
          draft_content: Json | null
          draft_status: string | null
          id: string
          message: string
          role: string
          student_id: string | null
        }
        Insert: {
          action_proposal?: Json | null
          action_status?: string | null
          asset_ids?: string[]
          created_at?: string
          created_by?: string | null
          draft_content?: Json | null
          draft_status?: string | null
          id?: string
          message: string
          role: string
          student_id?: string | null
        }
        Update: {
          action_proposal?: Json | null
          action_status?: string | null
          asset_ids?: string[]
          created_at?: string
          created_by?: string | null
          draft_content?: Json | null
          draft_status?: string | null
          id?: string
          message?: string
          role?: string
          student_id?: string | null
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
      teacher_calendar_label_events: {
        Row: {
          created_at: string
          event_id: string
          id: number
          kind: string
          owner_id: string
          revision: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: never
          kind: string
          owner_id: string
          revision: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: never
          kind?: string
          owner_id?: string
          revision?: number
        }
        Relationships: []
      }
      teacher_calendar_labels: {
        Row: {
          calendar_id: string
          event_id: string
          kind: string
          labelled_at: string
          owner_id: string
          revision: number
        }
        Insert: {
          calendar_id: string
          event_id: string
          kind: string
          labelled_at?: string
          owner_id: string
          revision?: number
        }
        Update: {
          calendar_id?: string
          event_id?: string
          kind?: string
          labelled_at?: string
          owner_id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_calendar_labels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "teacher_post_session_settings"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      teacher_home_credit_adds: {
        Row: {
          created_at: string
          delta: number
          operation_key: string
          owner_id: string
          pass_id: string
          payload_hash: string
          receipt: Json
          student_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          operation_key: string
          owner_id: string
          pass_id: string
          payload_hash: string
          receipt: Json
          student_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          operation_key?: string
          owner_id?: string
          pass_id?: string
          payload_hash?: string
          receipt?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_home_credit_adds_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "booking_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_home_manual: {
        Row: {
          blocker: string | null
          calendar_id: string | null
          created_at: string
          ends_at: string | null
          event_id: string | null
          handled_at: string | null
          id: string
          kind: string
          operation_key: string | null
          owner_id: string
          revision: number
          source_checked_at: string
          source_state: string | null
          source_updated_at: string | null
          starts_at: string | null
          student_id: string | null
          title: string
        }
        Insert: {
          blocker?: string | null
          calendar_id?: string | null
          created_at?: string
          ends_at?: string | null
          event_id?: string | null
          handled_at?: string | null
          id?: string
          kind?: string
          operation_key?: string | null
          owner_id: string
          revision?: number
          source_checked_at?: string
          source_state?: string | null
          source_updated_at?: string | null
          starts_at?: string | null
          student_id?: string | null
          title: string
        }
        Update: {
          blocker?: string | null
          calendar_id?: string | null
          created_at?: string
          ends_at?: string | null
          event_id?: string | null
          handled_at?: string | null
          id?: string
          kind?: string
          operation_key?: string | null
          owner_id?: string
          revision?: number
          source_checked_at?: string
          source_state?: string | null
          source_updated_at?: string | null
          starts_at?: string | null
          student_id?: string | null
          title?: string
        }
        Relationships: []
      }
      teacher_home_manual_events: {
        Row: {
          action: string
          created_at: string
          detail: Json
          id: number
          owner_id: string
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail: Json
          id?: never
          owner_id: string
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          id?: never
          owner_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_home_manual_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "teacher_home_manual"
            referencedColumns: ["id"]
          },
        ]
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
      teacher_post_session_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          id: number
          owner_id: string
          task_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          owner_id: string
          task_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          owner_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_post_session_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "teacher_post_session_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_post_session_settings: {
        Row: {
          activation_cutoff: string | null
          calendar_id: string
          catching_up: boolean
          covered_through: string | null
          drive_root_id: string | null
          enabled: boolean
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          lease_token: string | null
          lease_until: string | null
          owner_id: string
          updated_checkpoint: string | null
        }
        Insert: {
          activation_cutoff?: string | null
          calendar_id: string
          catching_up?: boolean
          covered_through?: string | null
          drive_root_id?: string | null
          enabled?: boolean
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          lease_token?: string | null
          lease_until?: string | null
          owner_id: string
          updated_checkpoint?: string | null
        }
        Update: {
          activation_cutoff?: string | null
          calendar_id?: string
          catching_up?: boolean
          covered_through?: string | null
          drive_root_id?: string | null
          enabled?: boolean
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          lease_token?: string | null
          lease_until?: string | null
          owner_id?: string
          updated_checkpoint?: string | null
        }
        Relationships: []
      }
      teacher_post_session_tasks: {
        Row: {
          blocker: string | null
          calendar_id: string
          ends_at: string
          event_id: string
          handled_at: string | null
          id: string
          manual_match: boolean
          match_state: string
          notes_done: boolean
          owner_id: string
          recap_done: boolean
          recap_posted: boolean
          revision: number
          source_checked_at: string
          source_state: string
          source_title: string
          source_updated_at: string
          starts_at: string
          student_id: string | null
          student_name: string | null
          transcript_doc_id: string | null
          transcript_source: string | null
          transcript_status: string
          work_assigned: boolean
        }
        Insert: {
          blocker?: string | null
          calendar_id: string
          ends_at: string
          event_id: string
          handled_at?: string | null
          id?: string
          manual_match?: boolean
          match_state: string
          notes_done?: boolean
          owner_id: string
          recap_done?: boolean
          recap_posted?: boolean
          revision?: number
          source_checked_at?: string
          source_state: string
          source_title: string
          source_updated_at: string
          starts_at: string
          student_id?: string | null
          student_name?: string | null
          transcript_doc_id?: string | null
          transcript_source?: string | null
          transcript_status?: string
          work_assigned?: boolean
        }
        Update: {
          blocker?: string | null
          calendar_id?: string
          ends_at?: string
          event_id?: string
          handled_at?: string | null
          id?: string
          manual_match?: boolean
          match_state?: string
          notes_done?: boolean
          owner_id?: string
          recap_done?: boolean
          recap_posted?: boolean
          revision?: number
          source_checked_at?: string
          source_state?: string
          source_title?: string
          source_updated_at?: string
          starts_at?: string
          student_id?: string | null
          student_name?: string | null
          transcript_doc_id?: string | null
          transcript_source?: string | null
          transcript_status?: string
          work_assigned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "teacher_post_session_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "teacher_post_session_settings"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      teacher_student_folders: {
        Row: {
          aliases: string[]
          folder_id: string
          local_slug: string
          owner_id: string
          student_id: string
        }
        Insert: {
          aliases?: string[]
          folder_id: string
          local_slug: string
          owner_id: string
          student_id: string
        }
        Update: {
          aliases?: string[]
          folder_id?: string
          local_slug?: string
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_student_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "teacher_post_session_settings"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      teacher_todo_dismissals: {
        Row: {
          admin_user_id: string
          created_at: string
          dismissed_at: string
          expires_at: string | null
          id: string
          source_id: string
          source_kind: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          dismissed_at?: string
          expires_at?: string | null
          id?: string
          source_id: string
          source_kind: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          dismissed_at?: string
          expires_at?: string | null
          id?: string
          source_id?: string
          source_kind?: string
        }
        Relationships: []
      }
      teacher_worker_tickets: {
        Row: {
          expires_at: string
          id: string
          owner_id: string
          used_at: string | null
          worker: string
        }
        Insert: {
          expires_at: string
          id?: string
          owner_id: string
          used_at?: string | null
          worker: string
        }
        Update: {
          expires_at?: string
          id?: string
          owner_id?: string
          used_at?: string | null
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_worker_tickets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "teacher_post_session_settings"
            referencedColumns: ["owner_id"]
          },
        ]
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
      timed_content_manifests_v1: {
        Row: {
          blueprint: Json
          manifest_sha256: string
          pt: number
        }
        Insert: {
          blueprint: Json
          manifest_sha256: string
          pt: number
        }
        Update: {
          blueprint?: Json
          manifest_sha256?: string
          pt?: number
        }
        Relationships: []
      }
      timed_pt_configuration_v1: {
        Row: {
          enabled: boolean
          lease_ms: number | null
          manifest_sha256: string | null
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          lease_ms?: number | null
          manifest_sha256?: string | null
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          lease_ms?: number | null
          manifest_sha256?: string | null
          singleton?: boolean
        }
        Relationships: []
      }
      timed_pt_lr_bindings_v1: {
        Row: {
          created_at: string
          frozen_qids: string[]
          leg_index: number
          namespace: string
          owner_id: string
          record_id: string
          run_id: string
          source_key: string
        }
        Insert: {
          created_at?: string
          frozen_qids: string[]
          leg_index: number
          namespace: string
          owner_id: string
          record_id: string
          run_id: string
          source_key: string
        }
        Update: {
          created_at?: string
          frozen_qids?: string[]
          leg_index?: number
          namespace?: string
          owner_id?: string
          record_id?: string
          run_id?: string
          source_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "timed_pt_lr_bindings_v1_run_id_owner_id_fkey"
            columns: ["run_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "practice_test_runs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      timed_pt_receipts_v1: {
        Row: {
          canonical_command: Json
          command_hash: string
          command_id: string
          committed_at: string
          committed_result: Json
          committed_revision: number
          owner_id: string
          work_id: string
          work_kind: string
        }
        Insert: {
          canonical_command: Json
          command_hash: string
          command_id: string
          committed_at?: string
          committed_result: Json
          committed_revision: number
          owner_id: string
          work_id: string
          work_kind: string
        }
        Update: {
          canonical_command?: Json
          command_hash?: string
          command_id?: string
          committed_at?: string
          committed_result?: Json
          committed_revision?: number
          owner_id?: string
          work_id?: string
          work_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "timed_pt_receipts_v1_work_id_owner_id_fkey"
            columns: ["work_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "practice_test_runs"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      timed_section_configuration_v1: {
        Row: {
          enabled: boolean
          lease_ms: number
          manifest_sha256: string | null
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          lease_ms?: number
          manifest_sha256?: string | null
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          lease_ms?: number
          manifest_sha256?: string | null
          singleton?: boolean
        }
        Relationships: []
      }
      timed_section_content_manifests_v1: {
        Row: {
          definition: Json
          kind: string
          manifest_sha256: string
          pt: number
          section: number
        }
        Insert: {
          definition: Json
          kind: string
          manifest_sha256: string
          pt: number
          section: number
        }
        Update: {
          definition?: Json
          kind?: string
          manifest_sha256?: string
          pt?: number
          section?: number
        }
        Relationships: []
      }
      timed_section_receipts_v1: {
        Row: {
          canonical_command: Json
          command_id: string
          committed_at: string
          committed_revision: number
          owner_id: string
          result: Json
          sitting_id: string
        }
        Insert: {
          canonical_command: Json
          command_id: string
          committed_at?: string
          committed_revision: number
          owner_id: string
          result: Json
          sitting_id: string
        }
        Update: {
          canonical_command?: Json
          command_id?: string
          committed_at?: string
          committed_revision?: number
          owner_id?: string
          result?: Json
          sitting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timed_section_receipts_v1_sitting_id_owner_id_fkey"
            columns: ["sitting_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "timed_section_sittings_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      timed_section_sittings_v1: {
        Row: {
          budget_ms: number | null
          clock_anchor_at: string | null
          completed_at: string | null
          created_at: string
          current_index: number
          device_id: string
          elapsed_ms: number
          frozen_qids: string[]
          frozen_source: Json
          id: string
          kind: string
          lease_expires_at: string | null
          lease_ms: number
          manifest_sha256: string
          owner_id: string
          pace: string
          phase: string
          pt: number
          result: Json | null
          revision: number
          section: number
          snapshot: Json
          source_key: string
          source_kind: string
          updated_at: string
          writer_epoch: number
        }
        Insert: {
          budget_ms?: number | null
          clock_anchor_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_index?: number
          device_id: string
          elapsed_ms?: number
          frozen_qids: string[]
          frozen_source: Json
          id: string
          kind: string
          lease_expires_at?: string | null
          lease_ms: number
          manifest_sha256: string
          owner_id: string
          pace: string
          phase?: string
          pt: number
          result?: Json | null
          revision?: number
          section: number
          snapshot?: Json
          source_key: string
          source_kind: string
          updated_at?: string
          writer_epoch?: number
        }
        Update: {
          budget_ms?: number | null
          clock_anchor_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_index?: number
          device_id?: string
          elapsed_ms?: number
          frozen_qids?: string[]
          frozen_source?: Json
          id?: string
          kind?: string
          lease_expires_at?: string | null
          lease_ms?: number
          manifest_sha256?: string
          owner_id?: string
          pace?: string
          phase?: string
          pt?: number
          result?: Json | null
          revision?: number
          section?: number
          snapshot?: Json
          source_key?: string
          source_kind?: string
          updated_at?: string
          writer_epoch?: number
        }
        Relationships: [
          {
            foreignKeyName: "timed_section_catalog_source_v1"
            columns: ["manifest_sha256", "pt", "kind", "section"]
            isOneToOne: false
            referencedRelation: "timed_section_content_manifests_v1"
            referencedColumns: ["manifest_sha256", "pt", "kind", "section"]
          },
        ]
      }
      timed_section_source_bindings_v1: {
        Row: {
          kind: string
          namespace: string | null
          owner_id: string
          rc_session_id: string | null
          record_id: string | null
          sitting_id: string
        }
        Insert: {
          kind: string
          namespace?: string | null
          owner_id: string
          rc_session_id?: string | null
          record_id?: string | null
          sitting_id: string
        }
        Update: {
          kind?: string
          namespace?: string | null
          owner_id?: string
          rc_session_id?: string | null
          record_id?: string | null
          sitting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_lr_binding_owner_v1"
            columns: ["owner_id", "namespace", "record_id"]
            isOneToOne: true
            referencedRelation: "bootcamp_kv"
            referencedColumns: ["user_id", "table_name", "record_id"]
          },
          {
            foreignKeyName: "section_rc_binding_owner_v1"
            columns: ["rc_session_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "rc_drill_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "timed_section_source_bindings_v1_sitting_id_owner_id_fkey"
            columns: ["sitting_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "timed_section_sittings_v1"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      tutor_conversations: {
        Row: {
          action_status: string | null
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
          action_status?: string | null
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
          action_status?: string | null
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
      user_last_activity: {
        Row: {
          activity_id: string
          activity_type: string
          state_snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          activity_type: string
          state_snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          activity_type?: string
          state_snapshot?: Json
          updated_at?: string
          user_id?: string
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
      user_saved_sets: {
        Row: {
          created_at: string
          filter_state: Json
          id: string
          name: string
          question_ids: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_state?: Json
          id?: string
          name: string
          question_ids?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          filter_state?: Json
          id?: string
          name?: string
          question_ids?: string[]
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
      wrong_answer_journal_notes: {
        Row: {
          annotations: Json | null
          class_id: string
          correct_reasoning: string | null
          created_at: string
          date_taken: string | null
          id: string
          lesson: string | null
          next_action: string | null
          other_notes: string | null
          qid: string
          question_summary: string | null
          reattempt_due_at: string | null
          review_status: string
          root_cause: string | null
          self_rating: string | null
          student_note: string | null
          title: string | null
          trap_pattern: string | null
          updated_at: string
          user_id: string
          wrong_answer: string | null
          wrong_reasoning: string | null
        }
        Insert: {
          annotations?: Json | null
          class_id: string
          correct_reasoning?: string | null
          created_at?: string
          date_taken?: string | null
          id?: string
          lesson?: string | null
          next_action?: string | null
          other_notes?: string | null
          qid: string
          question_summary?: string | null
          reattempt_due_at?: string | null
          review_status?: string
          root_cause?: string | null
          self_rating?: string | null
          student_note?: string | null
          title?: string | null
          trap_pattern?: string | null
          updated_at?: string
          user_id: string
          wrong_answer?: string | null
          wrong_reasoning?: string | null
        }
        Update: {
          annotations?: Json | null
          class_id?: string
          correct_reasoning?: string | null
          created_at?: string
          date_taken?: string | null
          id?: string
          lesson?: string | null
          next_action?: string | null
          other_notes?: string | null
          qid?: string
          question_summary?: string | null
          reattempt_due_at?: string | null
          review_status?: string
          root_cause?: string | null
          self_rating?: string | null
          student_note?: string | null
          title?: string | null
          trap_pattern?: string | null
          updated_at?: string
          user_id?: string
          wrong_answer?: string | null
          wrong_reasoning?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      drill_history: {
        Row: {
          attempted_at: string | null
          correct: boolean | null
          detail: string | null
          mode: string | null
          question_key: string | null
          question_ref: string | null
          selected_answer: string | null
          source: string | null
          time_ms: number | null
          user_id: string | null
        }
        Relationships: []
      }
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
      abandon_single_session_booking: {
        Args: { _booking_id: string; _booking_token_hash: string }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      abandon_stale_practice_tests: {
        Args: { exclude_ids?: string[] }
        Returns: string[]
      }
      acknowledge_assignment_notification_group: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      acknowledge_student_work: {
        Args: {
          p_issuance: number
          p_source_id: string
          p_source_table: string
        }
        Returns: Json
      }
      activate_assignment_delivery: {
        Args: { p_verified_frontend_sha: string }
        Returns: Json
      }
      activity_ai_answer_key_shape_v1: { Args: { key: Json }; Returns: boolean }
      activity_ai_answer_key_valid_v1: { Args: { key: Json }; Returns: boolean }
      activity_ai_reply_v1: {
        Args: {
          p_code: string
          p_http: number
          p_receipt: Database["public"]["Tables"]["activity_ai_receipts_v1"]["Row"]
          p_request: string
          p_status: string
        }
        Returns: Json
      }
      activity_ai_source_base_v1: {
        Args: {
          p_attempt: number
          p_kind: string
          p_order: number
          p_owner: string
          p_response: string
          p_source: string
        }
        Returns: Json
      }
      activity_ai_source_keyed_v1: {
        Args: {
          p_attempt: number
          p_kind: string
          p_order: number
          p_owner: string
          p_response: string
          p_source: string
        }
        Returns: Json
      }
      activity_ai_source_v1: {
        Args: {
          p_attempt: number
          p_kind: string
          p_order: number
          p_owner: string
          p_response: string
          p_source: string
        }
        Returns: Json
      }
      activity_revocation_capability: { Args: never; Returns: Json }
      admin_dismiss_stripe_payment: {
        Args: { _payment_id: string }
        Returns: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_grant_stripe_payment: {
        Args: { _payment_id: string }
        Returns: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_link_stripe_payment: {
        Args: { _payment_id: string; _student_id: string }
        Returns: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_return_teacher_missed_credit: {
        Args: { _redemption_id: string }
        Returns: Json
      }
      append_review_event_v1: {
        Args: {
          p_episode: string
          p_event: string
          p_kind: string
          p_payload: Json
        }
        Returns: Json
      }
      append_waj_correct: {
        Args: { p_class_id: string; p_item: Json; p_qid: string }
        Returns: undefined
      }
      append_waj_wrong: {
        Args: {
          p_class_id: string
          p_item: Json
          p_level?: number
          p_pt?: number
          p_qid: string
          p_qnum?: number
          p_qtype?: string
          p_section?: number
        }
        Returns: undefined
      }
      apply_booking_package_payment: {
        Args: {
          _email?: string
          _offer_id: string
          _provider_event_id: string
          _student_id: string
        }
        Returns: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        SetofOptions: {
          from: "*"
          to: "booking_passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_reading_center:
        | {
            Args: {
              p_description?: string
              p_student_id: string
              p_title?: string
              p_unlock_at?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_description: string
              p_notification_group_id: string
              p_notification_policy: string
              p_student_id: string
              p_title: string
              p_unlock_at: string
            }
            Returns: Json
          }
      assignment_notification_group_link: {
        Args: { p_group: string; p_link: string }
        Returns: string
      }
      attach_single_session_checkout: {
        Args: {
          _booking_id: string
          _expected_version: number
          _stripe_checkout_session_id: string
          _stripe_checkout_url: string
          _stripe_expires_at: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attempt_accuracy_rollup: {
        Args: { p_class_id: string }
        Returns: {
          bucket: string
          correct: number
          level: number
          qtype: string
          total: number
        }[]
      }
      attempt_totals: {
        Args: { p_class_id: string }
        Returns: {
          correct: number
          total: number
        }[]
      }
      auto_grant_stripe_payment: {
        Args: {
          _charge_id: string
          _checkout_session_id: string
          _offer_id: string
          _student_id: string
        }
        Returns: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      begin_activity_ai_request_base_v1: {
        Args: {
          p_attempt_no: number
          p_item_order: number
          p_owner_id: string
          p_request_id: string
          p_source_id: string
          p_source_kind: string
          p_student_response: string
        }
        Returns: Json
      }
      begin_activity_ai_request_v1: {
        Args: {
          p_attempt_no: number
          p_item_order: number
          p_owner_id: string
          p_request_id: string
          p_source_id: string
          p_source_kind: string
          p_student_response: string
        }
        Returns: Json
      }
      booking_buffer_minutes: { Args: never; Returns: number }
      booking_buffered_range: {
        Args: { _e: string; _s: string }
        Returns: unknown
      }
      booking_event_is_spent: {
        Args: { _event_slug: string }
        Returns: boolean
      }
      booking_price_cents: {
        Args: { _email: string; _event_slug: string }
        Returns: number
      }
      booking_ranges_for_date: {
        Args: { _date: string }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
      booking_slot_is_clear: {
        Args: {
          _buffer_after_minutes: number
          _buffer_before_minutes: number
          _end_at: string
          _ignore_google_event_id?: string
          _ignore_schedule_event_id?: string
          _ignore_single_session_id?: string
          _start_at: string
        }
        Returns: boolean
      }
      bump_booking_hit: {
        Args: { _action: string; _ip_hash: string; _slug: string }
        Returns: number
      }
      can_sit_practice_test: {
        Args: { _pt: number; _user: string }
        Returns: boolean
      }
      cancel_booking_redemption: {
        Args: { _actor_id?: string; _redemption_id: string; _refund?: boolean }
        Returns: Json
      }
      cancel_single_session_booking: {
        Args: { _cancel_token_hash: string }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_assignment_notification_channels: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      claim_booking_calendar_actions: {
        Args: { _lease_seconds?: number; _limit?: number }
        Returns: {
          booking_pass_id: string
          calendar_action: string
          calendar_attempts: number
          calendar_error: string | null
          calendar_last_synced_at: string | null
          calendar_lease_until: string | null
          calendar_status: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          credit_refunded: boolean
          end_at: string
          gcal_attempts: number
          gcal_error: string | null
          gcal_lease_until: string | null
          gcal_state: string
          google_event_id: string | null
          id: string
          idempotency_key: string
          meet_url: string | null
          needs_gcal_sync: boolean
          reschedule_count: number
          schedule_event_id: string | null
          start_at: string
          status: string
          student_email_snapshot: string | null
          student_name_snapshot: string | null
          student_note: string | null
          submission_error: string | null
          submission_status: string
          teacher_missed_at: string | null
          teacher_missed_by: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "booking_pass_redemptions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_section_grading: {
        Args: {
          p_assignment_id: string
          p_attempt_no: number
          p_stale_seconds?: number
        }
        Returns: boolean
      }
      claim_single_session_outbox: {
        Args: {
          _actions?: string[]
          _lease_seconds?: number
          _limit?: number
          _worker_id: string
        }
        Returns: {
          action: string
          attempts: number
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          lease_worker_id: string | null
          max_attempts: number
          next_retry_at: string
          payload_ciphertext: string | null
          precondition_lifecycle_version: number
          precondition_status: string
          provider_status: string | null
          recipient: string
          result: Json
          sensitive_payload_purged_at: string | null
          state: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "single_session_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_single_session_slot: {
        Args: {
          _booker_timezone?: string
          _booking_token_hash: string
          _client_idempotency_key: string
          _email: string
          _event_slug?: string
          _guests: Json
          _ip_hash: string
          _name: string
          _notes: string
          _start_at: string
          _user_id?: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_single_session_slot_without_confirmation_details: {
        Args: {
          _booking_token_hash: string
          _client_idempotency_key: string
          _email: string
          _event_slug?: string
          _guests: Json
          _ip_hash: string
          _name: string
          _notes: string
          _start_at: string
          _user_id?: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_single_session_sweeps: {
        Args: { _lease_seconds?: number; _limit?: number; _worker_id: string }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      commit_timed_section_v1: { Args: { p_command: Json }; Returns: Json }
      commit_timed_work_v1: { Args: { p_command: Json }; Returns: Json }
      complete_single_session_outbox: {
        Args: {
          _job_id: string
          _lease_token: string
          _meet_url?: string
          _provider_status?: string
          _result?: Json
        }
        Returns: Json
      }
      consume_booking_worker_ticket: {
        Args: { _token: string; _worker: string }
        Returns: boolean
      }
      create_manual_booking_pass: {
        Args: {
          _booking_slug: string
          _created_by: string
          _expires_at: string
          _notes: string
          _session_length_minutes: number
          _student_email: string
          _student_name: string
          _token_hash: string
          _total_credits: number
        }
        Returns: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        SetofOptions: {
          from: "*"
          to: "booking_passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_timed_practice_test_v1: {
        Args: { p_command: Json }
        Returns: Json
      }
      create_timed_section_v1: { Args: { p_command: Json }; Returns: Json }
      dispatch_activity_ai_request_v1: {
        Args: { p_claim_id: string; p_owner_id: string; p_request_id: string }
        Returns: Json
      }
      enqueue_single_session_outbox: {
        Args: {
          _action: string
          _booking_id: string
          _payload_ciphertext?: string
          _precondition_lifecycle_version: number
          _precondition_status: string
          _recipient: string
          _state: string
        }
        Returns: {
          action: string
          attempts: number
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          lease_worker_id: string | null
          max_attempts: number
          next_retry_at: string
          payload_ciphertext: string | null
          precondition_lifecycle_version: number
          precondition_status: string
          provider_status: string | null
          recipient: string
          result: Json
          sensitive_payload_purged_at: string | null
          state: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "single_session_outbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_single_session_checkout: {
        Args: {
          _booking_id: string
          _reason: string
          _stripe_checkout_session_id: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_single_session_draft: {
        Args: {
          _booking_id: string
          _expected_version: number
          _reason: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_single_session_outbox: {
        Args: {
          _confirmed_failure?: boolean
          _error: string
          _job_id: string
          _lease_token: string
          _provider_status?: string
        }
        Returns: {
          action: string
          attempts: number
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          lease_worker_id: string | null
          max_attempts: number
          next_retry_at: string
          payload_ciphertext: string | null
          precondition_lifecycle_version: number
          precondition_status: string
          provider_status: string | null
          recipient: string
          result: Json
          sensitive_payload_purged_at: string | null
          state: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "single_session_outbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_assignment_notification_group: {
        Args: {
          p_group_id: string
          p_link?: string
          p_message?: string
          p_title?: string
        }
        Returns: Json
      }
      finalize_single_session_free: {
        Args: {
          _booking_id: string
          _cancel_payload_ciphertext: string
          _cancel_token_hash: string
          _expected_version: number
          _live_calendar_clear: boolean
        }
        Returns: Json
      }
      finalize_single_session_payment: {
        Args: {
          _amount_cents: number
          _booking_id: string
          _cancel_payload_ciphertext: string
          _cancel_token_hash: string
          _currency: string
          _live_calendar_clear: boolean
          _livemode: boolean
          _provider_event_id: string
          _stripe_checkout_session_id: string
          _stripe_payment_intent_id: string
        }
        Returns: Json
      }
      finish_activity_ai_request_v1: {
        Args: {
          p_claim_id: string
          p_failure_category?: string
          p_owner_id: string
          p_request_id: string
          p_result?: Json
        }
        Returns: Json
      }
      fts_lsatu_content: {
        Args: { kind_filter?: string[]; match_count?: number; q: string }
        Returns: {
          id: string
          kind: string
          metadata: Json
          rank: number
          snippet: string
          source_id: string
          subtitle: string
          title: string
          url: string
        }[]
      }
      generate_strong_booking_slug: {
        Args: { _email: string; _name: string }
        Returns: string
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
      get_assignment_notification_group_items: {
        Args: { p_group_id: string }
        Returns: {
          issuance: number
          link: string
          read_at: string
          source_id: string
          source_table: string
          title: string
        }[]
      }
      get_assignment_notification_links: {
        Args: never
        Returns: {
          group_id: string
          issuance: number
          notification_id: string
          source_id: string
          source_table: string
        }[]
      }
      get_booking_availability: { Args: never; Returns: Json }
      get_booking_health: { Args: never; Returns: Json }
      get_conversation_participant_names: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          is_admin: boolean
          user_id: string
        }[]
      }
      get_conversations_with_attachments: {
        Args: { conv_ids: string[] }
        Returns: {
          conversation_id: string
        }[]
      }
      get_effective_booking_offers: {
        Args: { _student_id: string }
        Returns: {
          credits: number
          enabled: boolean
          id: string
          is_legacy_external_override: boolean
          label: string
          provider: string
          provider_ref: string
          url: string
        }[]
      }
      get_latest_messages: {
        Args: { conv_ids: string[] }
        Returns: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }[]
      }
      get_lsat_knowledge_by_canonical_id: {
        Args: { _canonical_id: string; _kinds?: string[] }
        Returns: {
          body: string
          chunk_index: number
          heading_path: Json
          id: string
          kind: string
          metadata: Json
          record_id: string
          source_id: string
          subtitle: string
          title: string
          url: string
        }[]
      }
      get_or_create_joshua_conversation: { Args: never; Returns: string }
      get_single_session_status: {
        Args: {
          _booking_id?: string
          _booking_token_hash?: string
          _stripe_checkout_session_id?: string
        }
        Returns: Json
      }
      get_student_booking: { Args: { _auth_user_id: string }; Returns: Json }
      get_student_email: { Args: { _student_id: string }; Returns: string }
      get_student_progress_user_id: {
        Args: { p_class_id: string }
        Returns: string
      }
      get_student_work_access: {
        Args: never
        Returns: {
          available: boolean
          issuance: number
          source_id: string
          source_table: string
        }[]
      }
      get_student_work_receipts: {
        Args: never
        Returns: {
          first_opened_at: string
          issuance: number
          last_opened_at: string
          read_at: string
          source_id: string
          source_table: string
        }[]
      }
      grant_booking_access: {
        Args: {
          _booking_slug: string
          _created_by: string
          _expires_at: string
          _session_length_minutes: number
          _student_email: string
          _student_id: string
          _student_name: string
          _token_hash: string
          _total_credits: number
        }
        Returns: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        SetofOptions: {
          from: "*"
          to: "booking_passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_stripe_package_locked: {
        Args: { _actor: string; _payment_id: string }
        Returns: {
          amount_cents: number
          amount_refunded_cents: number
          auto_grant_eligible: boolean
          checkout_session_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          email: string | null
          grant_state: string
          granted_at: string | null
          granted_by: string | null
          granted_credits: number | null
          id: string
          livemode: boolean
          match_state: string
          offer_id: string | null
          paid_at: string
          payer_name: string | null
          payment_intent_id: string | null
          payment_link_id: string | null
          product: string | null
          source: string
          status: string
          stripe_charge_id: string
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_reading_center_access: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_chapter_view: {
        Args: { p_section_id: string; p_topic_tag: string }
        Returns: undefined
      }
      increment_daily_stats: {
        Args: {
          p_class_id: string
          p_correct: boolean
          p_date: string
          p_time_ms: number
          p_xp: number
        }
        Returns: undefined
      }
      increment_question_seen: {
        Args: { p_class_id: string; p_mode: string; p_qid: string }
        Returns: undefined
      }
      increment_xp_total: {
        Args: { p_class_id: string; p_xp: number }
        Returns: undefined
      }
      invoke_gcal_reconcile: { Args: never; Returns: string }
      invoke_gcal_sync_pull: { Args: never; Returns: string }
      invoke_single_session_outbox: { Args: never; Returns: string }
      invoke_single_session_sweeper: { Args: never; Returns: string }
      is_conversation_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_single_session_slot_bookable: {
        Args: { _event_slug?: string; _now?: string; _start_at: string }
        Returns: boolean
      }
      is_slot_bookable: {
        Args: { _len: number; _start_at: string }
        Returns: boolean
      }
      is_strong_booking_slug: { Args: { _slug: string }; Returns: boolean }
      list_section_activities: {
        Args: never
        Returns: {
          goal_minutes: Json
          id: string
          source_section: string
          stimulus_count: number
          title: string
        }[]
      }
      manage_booking_pass: {
        Args: {
          _action: string
          _clear_expiry?: boolean
          _credits?: number
          _expires_at?: string
          _pass_id: string
          _session_length_minutes?: number
        }
        Returns: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        SetofOptions: {
          from: "*"
          to: "booking_passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      map_student_work_notification_link: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      match_lsatu_content: {
        Args: {
          kind_filter?: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          id: string
          kind: string
          metadata: Json
          similarity: number
          snippet: string
          source_id: string
          subtitle: string
          title: string
          url: string
        }[]
      }
      materialize_session_bundle_part: {
        Args: {
          p_content_markdown: string
          p_draft_id: string
          p_expected_part?: Json
          p_notification_group_id?: string
          p_part: string
          p_student_id: string
          p_title: string
        }
        Returns: Json
      }
      mcp_assign_homework_set: {
        Args: {
          p_idempotency_key: string
          p_notify?: boolean
          p_set_id: string
          p_student_id: string
        }
        Returns: Json
      }
      mcp_assign_passage_map_homework: {
        Args: {
          p_answer_key_html: string
          p_content_html: string
          p_idempotency_key: string
          p_notify?: boolean
          p_response_schema: Json
          p_student_id: string
          p_title: string
        }
        Returns: Json
      }
      mcp_find_students: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          display_name: string
          email: string
          student_id: string
        }[]
      }
      mcp_get_assignment_status: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      mcp_get_or_create_admin_student_conversation: {
        Args: { p_admin_id: string; p_student_id: string }
        Returns: string
      }
      mcp_post_classroom_note: {
        Args: {
          p_content_html: string
          p_description?: string
          p_idempotency_key: string
          p_notify?: boolean
          p_student_id: string
          p_title: string
        }
        Returns: Json
      }
      mcp_require_admin: { Args: never; Returns: string }
      open_review_episode_v1: {
        Args: {
          p_reason: string
          p_selection_reason?: string
          p_source: string
          p_source_id: string
          p_student: string
        }
        Returns: Json
      }
      persist_single_session_checkout_fingerprint: {
        Args: {
          _booking_id: string
          _expected_version: number
          _fingerprint_ciphertext: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      promote_lsat_knowledge_version: {
        Args: { _expected_count: number; _slug: string; _version: string }
        Returns: Json
      }
      publish_assignment_plan_notification: {
        Args: { p_group_id: string; p_link?: string; p_student_id: string }
        Returns: Json
      }
      purge_single_session_pii: { Args: { _now?: string }; Returns: Json }
      purge_student_account_data: {
        Args: { p_class_id: string }
        Returns: undefined
      }
      read_review_episodes_v1: { Args: { p_student: string }; Returns: Json }
      read_timed_practice_test_v1: {
        Args: { p_work_id: string }
        Returns: Json
      }
      read_timed_section_v1: { Args: { p_work_id: string }; Returns: Json }
      reading_center_delete_tag: {
        Args: { p_name: string }
        Returns: undefined
      }
      reading_center_rename_tag: {
        Args: { p_color: number; p_new_name: string; p_old_name: string }
        Returns: undefined
      }
      reconcile_booking_calendar_event: {
        Args: {
          _deleted?: boolean
          _end_at: string
          _google_event_id: string
          _meet_url?: string
          _redemption_id: string
          _start_at: string
        }
        Returns: Json
      }
      reconcile_single_session_calendar_deletion: {
        Args: { _booking_id: string; _google_event_id: string }
        Returns: Json
      }
      record_booking_worker_heartbeat: {
        Args: {
          _error?: string
          _metadata?: Json
          _phase: string
          _worker_name: string
        }
        Returns: {
          last_error: string | null
          last_error_at: string | null
          last_start_at: string | null
          last_success_at: string | null
          metadata: Json
          updated_at: string
          worker_name: string
        }
        SetofOptions: {
          from: "*"
          to: "booking_worker_heartbeats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_single_session_refund_status: {
        Args: {
          _booking_id: string
          _provider_status: string
          _stripe_refund_id: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_booking_pass: {
        Args: {
          _end_at: string
          _google_event_id: string
          _idempotency_key: string
          _pass_id: string
          _schedule_event_id: string
          _start_at: string
          _student_email: string
          _student_name: string
        }
        Returns: {
          redemption_id: string
          status: string
          total_credits: number
          used_credits: number
          was_existing: boolean
        }[]
      }
      redeem_booking_pass_v2: {
        Args: {
          _idempotency_key: string
          _pass_id: string
          _schedule_event_id: string
          _start_at: string
          _student_email: string
          _student_name: string
        }
        Returns: {
          end_at: string
          redemption_id: string
          start_at: string
          status: string
          total_credits: number
          used_credits: number
          was_existing: boolean
        }[]
      }
      regenerate_booking_link: {
        Args: {
          _new_slug: string
          _new_token_hash: string
          _student_id: string
        }
        Returns: string
      }
      regenerate_manual_booking_link: {
        Args: { _new_slug: string; _new_token_hash: string; _pass_id: string }
        Returns: string
      }
      release_assignment_notifications: {
        Args: { p_limit?: number }
        Returns: number
      }
      release_section_grading: {
        Args: { p_assignment_id: string; p_attempt_no: number }
        Returns: undefined
      }
      resolve_booking_link_full: {
        Args: { _slug: string }
        Returns: {
          booking_slug: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          former_student_id: string | null
          id: string
          notes: string | null
          session_length_minutes: number
          status: string
          student_email: string | null
          student_id: string | null
          student_name: string | null
          token_hash: string
          total_credits: number
          updated_at: string
          used_credits: number
        }
        SetofOptions: {
          from: "*"
          to: "booking_passes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_single_session_sweep: {
        Args: {
          _booking_id: string
          _resolution: string
          _stripe_expires_at?: string
          _stripe_session_id?: string
          _sweep_lease_token: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retire_superseded_student_work_alerts: {
        Args: {
          p_id: string
          p_issuance: number
          p_student: string
          p_table: string
        }
        Returns: undefined
      }
      retrieve_lsat_knowledge: {
        Args: {
          authority_filter?: string
          entity_key?: string
          entity_type?: string
          kinds?: string[]
          match_count?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          section_key?: string
          source_version_filter?: string
        }
        Returns: {
          body: string
          chunk_index: number
          fts_rank: number
          heading_path: Json
          id: string
          kind: string
          metadata: Json
          record_id: string
          score: number
          source_id: string
          subtitle: string
          title: string
          url: string
          vector_similarity: number
        }[]
      }
      revoke_activity_assignment: {
        Args: { p_assignment_id: string; p_student_id: string }
        Returns: Json
      }
      revoke_reading_center: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      rotate_weak_booking_slugs: {
        Args: { _apply?: boolean }
        Returns: {
          applied: boolean
          new_slug: string
          old_slug: string
          pass_id: string
          student_email: string
          student_id: string
          student_name: string
        }[]
      }
      save_rc_recall_passage_progress: {
        Args: {
          p_active_ms: number
          p_attempt_id: string
          p_completed: boolean
          p_passage_id: number
          p_passage_position: number
        }
        Returns: {
          active_ms: number
          attempt_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          passage_id: number
          passage_position: number
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rc_recall_passage_progress"
          isOneToOne: true
          isSetofReturn: false
        }
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
      set_booking_availability: {
        Args: { _ranges: Json; _timezone: string }
        Returns: Json
      }
      set_booking_availability_overrides: {
        Args: { _overrides: Json }
        Returns: Json
      }
      set_single_session_tentative_event: {
        Args: {
          _booking_id: string
          _expected_version: number
          _gcal_event_id: string
        }
        Returns: {
          amount_cents: number | null
          booker_timezone: string | null
          booking_token_expires_at: string
          booking_token_hash: string
          cancel_token_expires_at: string | null
          cancel_token_hash: string | null
          checkout_fingerprint_disposition: string
          checkout_request_fingerprint: string | null
          client_idempotency_key: string
          created_at: string
          currency: string | null
          draft_expires_at: string
          email: string | null
          end_at: string
          event_slug: string
          former_student_id: string | null
          gcal_event_id: string | null
          guests: Json
          id: string
          ip_hash: string | null
          lifecycle_version: number
          livemode: boolean | null
          meet_url: string | null
          name: string | null
          notes: string | null
          quoted_amount_cents: number | null
          quoted_currency: string | null
          start_at: string
          status: string
          status_changed_at: string
          stripe_checkout_session_id: string | null
          stripe_checkout_url: string | null
          stripe_expires_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_refund_status: string | null
          sweep_attempts: number
          sweep_lease_token: string | null
          sweep_lease_until: string | null
          sweep_worker_id: string | null
          terminal_reason: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "single_session_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      single_session_booking_window_end: {
        Args: { _event_slug?: string; _now?: string }
        Returns: string
      }
      single_session_slot_lock_key: {
        Args: { _start_at: string }
        Returns: number
      }
      start_section_attempt: {
        Args: { p_activity_id: string }
        Returns: string
      }
      start_section_focus_attempt: {
        Args: { p_assignment_id: string; p_slugs: string[] }
        Returns: string
      }
      student_work_assigned_route: { Args: { p_item: Json }; Returns: string }
      student_work_evidence_timestamp: {
        Args: { p_text: string }
        Returns: string
      }
      student_work_mirror_identity: { Args: { p_item: Json }; Returns: Json }
      student_work_native_row: {
        Args: { p_id: string; p_table: string }
        Returns: Json
      }
      student_work_native_table: { Args: { p_table: string }; Returns: boolean }
      student_work_row_active: { Args: { p_row: Json }; Returns: boolean }
      student_work_state: {
        Args: { p_id: string; p_student: string; p_table: string }
        Returns: Json
      }
      take_abandoned_booking_uploads: {
        Args: { _limit?: number; _older_than?: string }
        Returns: {
          id: string
          storage_path: string
        }[]
      }
      teacher_home_add_credits: {
        Args: {
          _actor: string
          _apply?: boolean
          _delta: number
          _operation: string
          _pass: string
          _student: string
        }
        Returns: Json
      }
      teacher_home_authorize: { Args: never; Returns: string }
      teacher_home_consultation_source: {
        Args: { _event: string; _lease: string; _owner: string; _source: Json }
        Returns: undefined
      }
      teacher_home_create_pass: {
        Args: {
          _actor: string
          _credits: number
          _expires_at?: string
          _session_minutes?: number
          _slug: string
          _student: string
          _token_hash: string
        }
        Returns: Json
      }
      teacher_home_label: {
        Args: { _event_id: string; _expected_revision?: number; _kind: string }
        Returns: Json
      }
      teacher_home_manual_tasks: {
        Args: {
          _cursor?: string
          _handled?: boolean
          _kind?: string
          _student_id?: string
        }
        Returns: Json
      }
      teacher_home_manual_update: {
        Args: {
          _action?: string
          _blocker?: string
          _expected_revision?: number
          _operation_key?: string
          _student_id?: string
          _task_id?: string
          _title?: string
        }
        Returns: Json
      }
      teacher_home_payments: { Args: { _cursor?: string }; Returns: Json }
      teacher_home_reactivate_pass: {
        Args: { _actor: string; _pass: string; _student: string }
        Returns: Json
      }
      teacher_home_results: { Args: never; Returns: Json }
      teacher_home_revoke_pass: {
        Args: { _actor: string; _pass: string; _student: string }
        Returns: Json
      }
      teacher_home_roster: { Args: { _owner: string }; Returns: Json }
      teacher_home_set_access: {
        Args: {
          _actor: string
          _expected_flags: Json
          _expected_tier: string
          _flags?: Json
          _student: string
          _tier: string
        }
        Returns: Json
      }
      teacher_home_task_counts: { Args: never; Returns: Json }
      teacher_post_session_attempt: {
        Args: { _error?: string; _owner: string; _started: string }
        Returns: undefined
      }
      teacher_post_session_claim: { Args: { _owner: string }; Returns: Json }
      teacher_post_session_finish: {
        Args: {
          _catching: boolean
          _covered: string
          _error?: string
          _expected: string
          _lease: string
          _owner: string
          _updated: string
        }
        Returns: undefined
      }
      teacher_post_session_home: { Args: never; Returns: Json }
      teacher_post_session_import_folders: {
        Args: {
          _calendar: string
          _dry_run?: boolean
          _folders: Json
          _owner: string
          _root: string
        }
        Returns: Json
      }
      teacher_post_session_page: {
        Args: { _cursor?: string; _handled?: boolean; _student_id?: string }
        Returns: Json
      }
      teacher_post_session_renew: {
        Args: { _lease: string; _owner: string }
        Returns: undefined
      }
      teacher_post_session_source: {
        Args: { _event: string; _lease: string; _owner: string; _source: Json }
        Returns: undefined
      }
      teacher_post_session_task_json: {
        Args: {
          t: Database["public"]["Tables"]["teacher_post_session_tasks"]["Row"]
        }
        Returns: Json
      }
      teacher_post_session_update: {
        Args: {
          _action: string
          _doc_id?: string
          _expected_revision: number
          _field?: string
          _student_id?: string
          _task_id: string
          _value?: boolean
        }
        Returns: Json
      }
      teacher_post_session_update_base: {
        Args: {
          _action: string
          _doc_id?: string
          _expected_revision: number
          _field?: string
          _student_id?: string
          _task_id: string
          _value?: boolean
        }
        Returns: Json
      }
      teacher_worker_consume: { Args: { _ticket: string }; Returns: string }
      timed_practice_test_capability_v1: { Args: never; Returns: Json }
      timed_pt_actor_v1: { Args: never; Returns: string }
      timed_pt_check_keys_v1: {
        Args: { p_keys: string[]; p_value: Json }
        Returns: undefined
      }
      timed_pt_checkpoint_v1: {
        Args: {
          p_run: Database["public"]["Tables"]["practice_test_runs"]["Row"]
        }
        Returns: Json
      }
      timed_pt_close_leg_v1: {
        Args: {
          p_now: string
          p_payload: Json
          p_run: Database["public"]["Tables"]["practice_test_runs"]["Row"]
        }
        Returns: Json
      }
      timed_pt_estimated_score_v1: {
        Args: { p_raw: number; p_total: number }
        Returns: number
      }
      timed_pt_leg_definitions_v1: { Args: { p_legs: Json }; Returns: Json }
      timed_pt_parent_protected_v1: { Args: { p_id: string }; Returns: boolean }
      timed_pt_require_access_v1: {
        Args: { p_owner: string; p_pt: number }
        Returns: undefined
      }
      timed_pt_response_v1: {
        Args: {
          p_receipt: Database["public"]["Tables"]["timed_pt_receipts_v1"]["Row"]
          p_replayed: boolean
          p_run: Database["public"]["Tables"]["practice_test_runs"]["Row"]
        }
        Returns: Json
      }
      timed_pt_save_checkpoint_v1: {
        Args: {
          p_now: string
          p_payload: Json
          p_run: Database["public"]["Tables"]["practice_test_runs"]["Row"]
        }
        Returns: undefined
      }
      timed_section_capability_v1: { Args: never; Returns: Json }
      timed_section_close_v1: {
        Args: {
          p_now: string
          p_payload: Json
          p_run: Database["public"]["Tables"]["timed_section_sittings_v1"]["Row"]
        }
        Returns: Json
      }
      timed_section_protected_v1: { Args: { p_id: string }; Returns: boolean }
      timed_section_require_access_v1: {
        Args: { p_owner: string }
        Returns: undefined
      }
      timed_section_response_v1: {
        Args: {
          p_receipt: Database["public"]["Tables"]["timed_section_receipts_v1"]["Row"]
          p_replayed: boolean
          p_sitting: Database["public"]["Tables"]["timed_section_sittings_v1"]["Row"]
        }
        Returns: Json
      }
      timed_section_save_checkpoint_v1: {
        Args: {
          p_now: string
          p_payload: Json
          p_run: Database["public"]["Tables"]["timed_section_sittings_v1"]["Row"]
        }
        Returns: undefined
      }
      timed_section_validate_command_v1: {
        Args: { p_command: Json; p_creation: boolean }
        Returns: undefined
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
      app_role: ["admin", "user"],
    },
  },
} as const
