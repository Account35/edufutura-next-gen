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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string | null
          email: string
          failure_count: number | null
          id: string
          locked_at: string | null
          unlock_at: string
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_count?: number | null
          id?: string
          locked_at?: string | null
          unlock_at: string
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_count?: number | null
          id?: string
          locked_at?: string | null
          unlock_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_description: string | null
          badge_id: string
          badge_name: string
          badge_type: string
          created_at: string | null
          earned_at: string | null
          icon_url: string | null
          id: string
          subject_name: string | null
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_id: string
          badge_name: string
          badge_type: string
          created_at?: string | null
          earned_at?: string | null
          icon_url?: string | null
          id?: string
          subject_name?: string | null
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_id?: string
          badge_name?: string
          badge_type?: string
          created_at?: string | null
          earned_at?: string | null
          icon_url?: string | null
          id?: string
          subject_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          activity_description: string
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          subject_name: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          activity_description: string
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          subject_name?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          activity_description?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          subject_name?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_ab_tests: {
        Row: {
          created_by: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          metrics_version_a: Json | null
          metrics_version_b: Json | null
          rollout_percentage: number
          started_at: string | null
          template_name: string
          test_name: string
          version_a: number
          version_b: number
          winner_version: number | null
        }
        Insert: {
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          metrics_version_a?: Json | null
          metrics_version_b?: Json | null
          rollout_percentage?: number
          started_at?: string | null
          template_name: string
          test_name: string
          version_a: number
          version_b: number
          winner_version?: number | null
        }
        Update: {
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          metrics_version_a?: Json | null
          metrics_version_b?: Json | null
          rollout_percentage?: number
          started_at?: string | null
          template_name?: string
          test_name?: string
          version_a?: number
          version_b?: number
          winner_version?: number | null
        }
        Relationships: []
      }
      ai_cache_metrics: {
        Row: {
          avg_cached_latency_ms: number | null
          avg_fresh_latency_ms: number | null
          cache_hits: number
          cache_misses: number
          created_at: string
          estimated_cost_saved_cents: number | null
          id: string
          metric_date: string
          miss_reasons: Json | null
          template_name: string | null
          total_requests: number
        }
        Insert: {
          avg_cached_latency_ms?: number | null
          avg_fresh_latency_ms?: number | null
          cache_hits?: number
          cache_misses?: number
          created_at?: string
          estimated_cost_saved_cents?: number | null
          id?: string
          metric_date?: string
          miss_reasons?: Json | null
          template_name?: string | null
          total_requests?: number
        }
        Update: {
          avg_cached_latency_ms?: number | null
          avg_fresh_latency_ms?: number | null
          cache_hits?: number
          cache_misses?: number
          created_at?: string
          estimated_cost_saved_cents?: number | null
          id?: string
          metric_date?: string
          miss_reasons?: Json | null
          template_name?: string | null
          total_requests?: number
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          chapter_id: string | null
          conversation_title: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          message_count: number | null
          started_at: string | null
          subject_name: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          started_at?: string | null
          subject_name?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          conversation_title?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          started_at?: string | null
          subject_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          message_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          ai_model: string | null
          audio_url: string | null
          context_data: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          message_text: string
          response_time_ms: number | null
          role: string
          tokens_used: number | null
          voice_enabled: boolean | null
        }
        Insert: {
          ai_model?: string | null
          audio_url?: string | null
          context_data?: Json | null
          conversation_id: string
          created_at?: string | null
          id?: string
          message_text: string
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
          voice_enabled?: boolean | null
        }
        Update: {
          ai_model?: string | null
          audio_url?: string | null
          context_data?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_text?: string
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
          voice_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          max_tokens: number
          model_name: string
          performance_metrics: Json | null
          prompt_text: string
          response_format: string | null
          system_context: string | null
          temperature: number
          template_name: string
          template_version: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model_name?: string
          performance_metrics?: Json | null
          prompt_text: string
          response_format?: string | null
          system_context?: string | null
          temperature?: number
          template_name: string
          template_version?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model_name?: string
          performance_metrics?: Json | null
          prompt_text?: string
          response_format?: string | null
          system_context?: string | null
          temperature?: number
          template_name?: string
          template_version?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          cache_tags: string[] | null
          context_hash: string | null
          created_at: string
          generation_cost_cents: number | null
          grade_level: number | null
          hit_count: number
          id: string
          last_accessed: string
          model_used: string
          normalized_query: string
          query_hash: string
          query_text: string
          response_json: Json
          response_time_ms: number | null
          subject_name: string | null
          template_name: string | null
          ttl_seconds: number
        }
        Insert: {
          cache_tags?: string[] | null
          context_hash?: string | null
          created_at?: string
          generation_cost_cents?: number | null
          grade_level?: number | null
          hit_count?: number
          id?: string
          last_accessed?: string
          model_used: string
          normalized_query: string
          query_hash: string
          query_text: string
          response_json: Json
          response_time_ms?: number | null
          subject_name?: string | null
          template_name?: string | null
          ttl_seconds?: number
        }
        Update: {
          cache_tags?: string[] | null
          context_hash?: string | null
          created_at?: string
          generation_cost_cents?: number | null
          grade_level?: number | null
          hit_count?: number
          id?: string
          last_accessed?: string
          model_used?: string
          normalized_query?: string
          query_hash?: string
          query_text?: string
          response_json?: Json
          response_time_ms?: number | null
          subject_name?: string | null
          template_name?: string | null
          ttl_seconds?: number
        }
        Relationships: []
      }
      ai_safety_logs: {
        Row: {
          ai_response: string | null
          created_at: string | null
          flagged_content: string | null
          id: string
          incident_type: string
          reviewed: boolean | null
          severity: string | null
          user_id: string
          user_message: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          flagged_content?: string | null
          id?: string
          incident_type: string
          reviewed?: boolean | null
          severity?: string | null
          user_id: string
          user_message?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          flagged_content?: string | null
          id?: string
          incident_type?: string
          reviewed?: boolean | null
          severity?: string | null
          user_id?: string
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_safety_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_template_changelog: {
        Row: {
          actual_improvement: string | null
          changed_by: string | null
          changes_made: string
          created_at: string | null
          expected_improvement: string | null
          id: string
          reason_for_change: string
          template_name: string
          version_number: number
        }
        Insert: {
          actual_improvement?: string | null
          changed_by?: string | null
          changes_made: string
          created_at?: string | null
          expected_improvement?: string | null
          id?: string
          reason_for_change: string
          template_name: string
          version_number: number
        }
        Update: {
          actual_improvement?: string | null
          changed_by?: string | null
          changes_made?: string
          created_at?: string | null
          expected_improvement?: string | null
          id?: string
          reason_for_change?: string
          template_name?: string
          version_number?: number
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          account_type: string | null
          created_at: string | null
          id: string
          questions_asked: number | null
          usage_date: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          id?: string
          questions_asked?: number | null
          usage_date: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          id?: string
          questions_asked?: number | null
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_log: {
        Row: {
          duration_ms: number
          endpoint: string
          error_message: string | null
          id: string
          method: string
          parameters: Json | null
          status: number
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          duration_ms: number
          endpoint: string
          error_message?: string | null
          id?: string
          method: string
          parameters?: Json | null
          status: number
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          duration_ms?: number
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          parameters?: Json | null
          status?: number
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage_log: {
        Row: {
          created_at: string | null
          fallback_used: boolean | null
          id: string
          model_version: string
          response_time_ms: number
          service: string
          success: boolean
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fallback_used?: boolean | null
          id?: string
          model_version: string
          response_time_ms: number
          service: string
          success: boolean
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fallback_used?: boolean | null
          id?: string
          model_version?: string
          response_time_ms?: number
          service?: string
          success?: boolean
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      background_jobs: {
        Row: {
          attempts_count: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
          worker_id: string | null
        }
        Insert: {
          attempts_count?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          payload?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          worker_id?: string | null
        }
        Update: {
          attempts_count?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          payload?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_chat_messages: {
        Row: {
          buddy_connection_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_content: string
          moderation_status: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          buddy_connection_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_content: string
          moderation_status?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          buddy_connection_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_content?: string
          moderation_status?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_chat_messages_buddy_connection_id_fkey"
            columns: ["buddy_connection_id"]
            isOneToOne: false
            referencedRelation: "study_buddies"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_study_sessions: {
        Row: {
          buddy_connection_id: string
          created_at: string | null
          created_by: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          subject_name: string
          title: string
        }
        Insert: {
          buddy_connection_id: string
          created_at?: string | null
          created_by: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          subject_name: string
          title: string
        }
        Update: {
          buddy_connection_id?: string
          created_at?: string | null
          created_by?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          subject_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_study_sessions_buddy_connection_id_fkey"
            columns: ["buddy_connection_id"]
            isOneToOne: false
            referencedRelation: "study_buddies"
            referencedColumns: ["id"]
          },
        ]
      }
      career_assessments: {
        Row: {
          assessment_data: Json | null
          assessment_type: string
          completed_at: string | null
          id: string
          results: Json | null
          user_id: string
          validity_period: string | null
        }
        Insert: {
          assessment_data?: Json | null
          assessment_type: string
          completed_at?: string | null
          id?: string
          results?: Json | null
          user_id: string
          validity_period?: string | null
        }
        Update: {
          assessment_data?: Json | null
          assessment_type?: string
          completed_at?: string | null
          id?: string
          results?: Json | null
          user_id?: string
          validity_period?: string | null
        }
        Relationships: []
      }
      career_paths: {
        Row: {
          average_salary_zar: number | null
          career_category: string
          career_description: string | null
          career_name: string
          career_progression: string | null
          created_at: string | null
          education_level: string | null
          growth_rate: number | null
          id: string
          job_outlook: string | null
          related_careers: string[] | null
          sa_specific_info: Json | null
          skills_required: string[] | null
          subjects_alignment: Json | null
          typical_workplaces: string[] | null
          updated_at: string | null
        }
        Insert: {
          average_salary_zar?: number | null
          career_category: string
          career_description?: string | null
          career_name: string
          career_progression?: string | null
          created_at?: string | null
          education_level?: string | null
          growth_rate?: number | null
          id?: string
          job_outlook?: string | null
          related_careers?: string[] | null
          sa_specific_info?: Json | null
          skills_required?: string[] | null
          subjects_alignment?: Json | null
          typical_workplaces?: string[] | null
          updated_at?: string | null
        }
        Update: {
          average_salary_zar?: number | null
          career_category?: string
          career_description?: string | null
          career_name?: string
          career_progression?: string | null
          created_at?: string | null
          education_level?: string | null
          growth_rate?: number | null
          id?: string
          job_outlook?: string | null
          related_careers?: string[] | null
          sa_specific_info?: Json | null
          skills_required?: string[] | null
          subjects_alignment?: Json | null
          typical_workplaces?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      career_recommendations: {
        Row: {
          based_on: Json | null
          career_path_id: string | null
          generated_at: string | null
          id: string
          interested: boolean | null
          notes: string | null
          recommendation_reason: string | null
          recommendation_score: number | null
          user_id: string
          viewed: boolean | null
        }
        Insert: {
          based_on?: Json | null
          career_path_id?: string | null
          generated_at?: string | null
          id?: string
          interested?: boolean | null
          notes?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          user_id: string
          viewed?: boolean | null
        }
        Update: {
          based_on?: Json | null
          career_path_id?: string | null
          generated_at?: string | null
          id?: string
          interested?: boolean | null
          notes?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          user_id?: string
          viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "career_recommendations_career_path_id_fkey"
            columns: ["career_path_id"]
            isOneToOne: false
            referencedRelation: "career_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_queue: {
        Row: {
          certificate_url: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          queued_at: string | null
          status: string
          subject_name: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          queued_at?: string | null
          status?: string
          subject_name: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          queued_at?: string | null
          status?: string
          subject_name?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_prerequisites: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          id: string
          is_required: boolean
          prerequisite_chapter_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean
          prerequisite_chapter_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean
          prerequisite_chapter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_prerequisites_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_prerequisites_prerequisite_chapter_id_fkey"
            columns: ["prerequisite_chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          action_taken: string | null
          created_at: string | null
          id: string
          report_description: string | null
          report_reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          report_description?: string | null
          report_reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          report_description?: string | null
          report_reason?: string
          reported_content_id?: string
          reported_content_type?: string
          reporter_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      content_moderation_log: {
        Row: {
          ai_confidence: number | null
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          issues_detected: string[] | null
          moderation_decision: string
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          issues_detected?: string[] | null
          moderation_decision: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          issues_detected?: string[] | null
          moderation_decision?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      curriculum_chapters: {
        Row: {
          caps_code: string | null
          caps_description: string | null
          chapter_description: string | null
          chapter_number: number
          chapter_title: string
          content_markdown: string | null
          content_type: string | null
          content_url: string | null
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          estimated_duration_minutes: number | null
          glossary_terms: Json | null
          id: string
          is_published: boolean | null
          key_concepts: string[] | null
          learning_outcomes: string[] | null
          subject_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          caps_code?: string | null
          caps_description?: string | null
          chapter_description?: string | null
          chapter_number: number
          chapter_title: string
          content_markdown?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          glossary_terms?: Json | null
          id?: string
          is_published?: boolean | null
          key_concepts?: string[] | null
          learning_outcomes?: string[] | null
          subject_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          caps_code?: string | null
          caps_description?: string | null
          chapter_description?: string | null
          chapter_number?: number
          chapter_title?: string
          content_markdown?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          estimated_duration_minutes?: number | null
          glossary_terms?: Json | null
          id?: string
          is_published?: boolean | null
          key_concepts?: string[] | null
          learning_outcomes?: string[] | null
          subject_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "curriculum_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_subjects: {
        Row: {
          caps_aligned: boolean | null
          color_scheme: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          grade_level: number
          icon_name: string | null
          id: string
          is_published: boolean | null
          learning_objectives: string[] | null
          subject_code: string | null
          subject_name: string
          total_chapters: number | null
          updated_at: string | null
        }
        Insert: {
          caps_aligned?: boolean | null
          color_scheme?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          grade_level: number
          icon_name?: string | null
          id?: string
          is_published?: boolean | null
          learning_objectives?: string[] | null
          subject_code?: string | null
          subject_name: string
          total_chapters?: number | null
          updated_at?: string | null
        }
        Update: {
          caps_aligned?: boolean | null
          color_scheme?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          grade_level?: number
          icon_name?: string | null
          id?: string
          is_published?: boolean | null
          learning_objectives?: string[] | null
          subject_code?: string | null
          subject_name?: string
          total_chapters?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      curriculum_topics: {
        Row: {
          chapter_id: string | null
          content_markdown: string | null
          created_at: string | null
          examples: Json | null
          id: string
          practice_questions: Json | null
          topic_number: number
          topic_title: string
        }
        Insert: {
          chapter_id?: string | null
          content_markdown?: string | null
          created_at?: string | null
          examples?: Json | null
          id?: string
          practice_questions?: Json | null
          topic_number: number
          topic_title: string
        }
        Update: {
          chapter_id?: string | null
          content_markdown?: string | null
          created_at?: string | null
          examples?: Json | null
          id?: string
          practice_questions?: Json | null
          topic_number?: number
          topic_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_content_metrics: {
        Row: {
          avg_post_upvotes: number | null
          avg_resource_rating: number | null
          created_at: string | null
          engagement_rate: number | null
          forum_posts_created: number | null
          group_messages_sent: number | null
          id: string
          metric_date: string
          moderation_actions: number | null
          resources_shared: number | null
        }
        Insert: {
          avg_post_upvotes?: number | null
          avg_resource_rating?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          forum_posts_created?: number | null
          group_messages_sent?: number | null
          id?: string
          metric_date: string
          moderation_actions?: number | null
          resources_shared?: number | null
        }
        Update: {
          avg_post_upvotes?: number | null
          avg_resource_rating?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          forum_posts_created?: number | null
          group_messages_sent?: number | null
          id?: string
          metric_date?: string
          moderation_actions?: number | null
          resources_shared?: number | null
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          expires_at: string | null
          export_url: string | null
          id: string
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_ai_responses: {
        Row: {
          ai_response: string | null
          created_at: string | null
          failure_reason: string
          human_corrected_response: string | null
          id: string
          input_data: Json
          model_name: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          template_name: string
          template_version: number | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          failure_reason: string
          human_corrected_response?: string | null
          id?: string
          input_data: Json
          model_name?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          template_name: string
          template_version?: number | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          failure_reason?: string
          human_corrected_response?: string | null
          id?: string
          input_data?: Json
          model_name?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          template_name?: string
          template_version?: number | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          flagged_reason: string | null
          forum_id: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity: string | null
          moderation_status: string | null
          post_content: string
          post_title: string
          reply_count: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          flagged_reason?: string | null
          forum_id: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity?: string | null
          moderation_status?: string | null
          post_content: string
          post_title: string
          reply_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          flagged_reason?: string | null
          forum_id?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity?: string | null
          moderation_status?: string | null
          post_content?: string
          post_title?: string
          reply_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          color_theme: string | null
          created_at: string | null
          created_by: string | null
          forum_description: string | null
          forum_rules: string | null
          forum_title: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          member_count: number | null
          moderators: string[] | null
          post_count: number | null
          subject_name: string
          updated_at: string | null
        }
        Insert: {
          color_theme?: string | null
          created_at?: string | null
          created_by?: string | null
          forum_description?: string | null
          forum_rules?: string | null
          forum_title: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          moderators?: string[] | null
          post_count?: number | null
          subject_name: string
          updated_at?: string | null
        }
        Update: {
          color_theme?: string | null
          created_at?: string | null
          created_by?: string | null
          forum_description?: string | null
          forum_rules?: string | null
          forum_title?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          moderators?: string[] | null
          post_count?: number | null
          subject_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grading_log: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          is_correct: boolean
          question_text: string
          score: number
          student_answer: string
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct: boolean
          question_text: string
          score: number
          student_answer: string
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          question_text?: string
          score?: number
          student_answer?: string
          user_id?: string | null
        }
        Relationships: []
      }
      group_chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          edited_at: string | null
          group_id: string
          id: string
          is_edited: boolean | null
          message_content: string
          message_type: string | null
          moderation_status: string | null
          read_by: string[] | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          edited_at?: string | null
          group_id: string
          id?: string
          is_edited?: boolean | null
          message_content: string
          message_type?: string | null
          moderation_status?: string | null
          read_by?: string[] | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          edited_at?: string | null
          group_id?: string
          id?: string
          is_edited?: boolean | null
          message_content?: string
          message_type?: string | null
          moderation_status?: string | null
          read_by?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number
          group_id: string
          id: string
          meeting_link: string | null
          recurrence_pattern: string | null
          recurring: boolean | null
          scheduled_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number
          group_id: string
          id?: string
          meeting_link?: string | null
          recurrence_pattern?: string | null
          recurring?: boolean | null
          scheduled_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number
          group_id?: string
          id?: string
          meeting_link?: string | null
          recurrence_pattern?: string | null
          recurring?: boolean | null
          scheduled_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          last_active: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          last_active?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          last_active?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_quiz_attempts: {
        Row: {
          average_score: number | null
          completed_at: string | null
          created_at: string | null
          group_id: string
          id: string
          individual_scores: Json | null
          initiated_by: string | null
          participant_ids: string[] | null
          quiz_id: string
          started_at: string | null
        }
        Insert: {
          average_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          individual_scores?: Json | null
          initiated_by?: string | null
          participant_ids?: string[] | null
          quiz_id: string
          started_at?: string | null
        }
        Update: {
          average_score?: number | null
          completed_at?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          individual_scores?: Json | null
          initiated_by?: string | null
          participant_ids?: string[] | null
          quiz_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_quiz_attempts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_active_users: {
        Row: {
          account_type: string | null
          active_count: number
          created_at: string | null
          grade_level: number | null
          hour_timestamp: string
          id: string
        }
        Insert: {
          account_type?: string | null
          active_count?: number
          created_at?: string | null
          grade_level?: number | null
          hour_timestamp: string
          id?: string
        }
        Update: {
          account_type?: string | null
          active_count?: number
          created_at?: string | null
          grade_level?: number | null
          hour_timestamp?: string
          id?: string
        }
        Relationships: []
      }
      institution_recommendations: {
        Row: {
          admission_probability: string | null
          application_status: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          match_factors: Json | null
          match_score: number | null
          notes: string | null
          program_name: string | null
          saved: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admission_probability?: string | null
          application_status?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          match_factors?: Json | null
          match_score?: number | null
          notes?: string | null
          program_name?: string | null
          saved?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admission_probability?: string | null
          application_status?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          match_factors?: Json | null
          match_score?: number | null
          notes?: string | null
          program_name?: string | null
          saved?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_recommendations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "tertiary_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          goal_description: string | null
          goal_title: string
          goal_type: string
          id: string
          metadata: Json | null
          status: string | null
          subject_name: string | null
          target_date: string | null
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          goal_description?: string | null
          goal_title: string
          goal_type: string
          id?: string
          metadata?: Json | null
          status?: string | null
          subject_name?: string | null
          target_date?: string | null
          target_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          goal_description?: string | null
          goal_title?: string
          goal_type?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          subject_name?: string | null
          target_date?: string | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_recommendations: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_completed: boolean | null
          is_dismissed: boolean | null
          metadata: Json | null
          priority_score: number | null
          reason: string | null
          recommendation_type: string
          subject_name: string | null
          target_id: string | null
          target_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority_score?: number | null
          reason?: string | null
          recommendation_type: string
          subject_name?: string | null
          target_id?: string | null
          target_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          priority_score?: number | null
          reason?: string | null
          recommendation_type?: string
          subject_name?: string | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_style_profiles: {
        Row: {
          auditory_score: number | null
          content_preferences: Json | null
          created_at: string | null
          dominant_style: string | null
          effectiveness_data: Json | null
          id: string
          kinesthetic_score: number | null
          last_analyzed_at: string | null
          reading_writing_score: number | null
          updated_at: string | null
          user_id: string
          visual_score: number | null
        }
        Insert: {
          auditory_score?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          dominant_style?: string | null
          effectiveness_data?: Json | null
          id?: string
          kinesthetic_score?: number | null
          last_analyzed_at?: string | null
          reading_writing_score?: number | null
          updated_at?: string | null
          user_id: string
          visual_score?: number | null
        }
        Update: {
          auditory_score?: number | null
          content_preferences?: Json | null
          created_at?: string | null
          dominant_style?: string | null
          effectiveness_data?: Json | null
          id?: string
          kinesthetic_score?: number | null
          last_analyzed_at?: string | null
          reading_writing_score?: number | null
          updated_at?: string | null
          user_id?: string
          visual_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_style_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digests: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          digest_type: string
          id: string
          notification_ids: string[]
          opened_at: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          digest_type: string
          id?: string
          notification_ids: string[]
          opened_at?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          digest_type?: string
          id?: string
          notification_ids?: string[]
          opened_at?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          device_type: string
          id: string
          metric_name: string
          page: string
          timestamp: string | null
          user_id: string | null
          value_ms: number
        }
        Insert: {
          device_type: string
          id?: string
          metric_name: string
          page: string
          timestamp?: string | null
          user_id?: string | null
          value_ms: number
        }
        Update: {
          device_type?: string
          id?: string
          metric_name?: string
          page?: string
          timestamp?: string | null
          user_id?: string | null
          value_ms?: number
        }
        Relationships: []
      }
      post_replies: {
        Row: {
          created_at: string | null
          depth_level: number | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_solution: boolean | null
          moderation_status: string | null
          parent_reply_id: string | null
          post_id: string
          reply_content: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          depth_level?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_solution?: boolean | null
          moderation_status?: string | null
          parent_reply_id?: string | null
          post_id: string
          reply_content: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          depth_level?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_solution?: boolean | null
          moderation_status?: string | null
          parent_reply_id?: string | null
          post_id?: string
          reply_content?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisite_gaps: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          gap_severity: string | null
          id: string
          is_resolved: boolean | null
          prerequisite_chapter_id: string | null
          quiz_score: number | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          gap_severity?: string | null
          id?: string
          is_resolved?: boolean | null
          prerequisite_chapter_id?: string | null
          quiz_score?: number | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          gap_severity?: string | null
          id?: string
          is_resolved?: boolean | null
          prerequisite_chapter_id?: string | null
          quiz_score?: number | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prerequisite_gaps_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisite_gaps_prerequisite_chapter_id_fkey"
            columns: ["prerequisite_chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisite_gaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          created_at: string | null
          id: string
          is_completed: boolean | null
          passed: boolean | null
          quiz_id: string | null
          score_percentage: number | null
          started_at: string | null
          submitted_at: string | null
          time_spent_seconds: number | null
          total_correct: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers: Json
          attempt_number: number
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          passed?: boolean | null
          quiz_id?: string | null
          score_percentage?: number | null
          started_at?: string | null
          submitted_at?: string | null
          time_spent_seconds?: number | null
          total_correct?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          passed?: boolean | null
          quiz_id?: string | null
          score_percentage?: number | null
          started_at?: string | null
          submitted_at?: string | null
          time_spent_seconds?: number | null
          total_correct?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_cooldowns: {
        Row: {
          created_at: string | null
          id: string
          last_attempt_at: string
          next_available_at: string
          quiz_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_attempt_at: string
          next_available_at: string
          quiz_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_attempt_at?: string
          next_available_at?: string
          quiz_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_cooldowns_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_performance: {
        Row: {
          average_score: number | null
          best_score: number | null
          chapter_id: string | null
          created_at: string | null
          id: string
          last_attempt_date: string | null
          passed_attempts: number | null
          quiz_id: string | null
          strong_topics: string[] | null
          subject_name: string
          total_attempts: number | null
          updated_at: string | null
          user_id: string
          weak_topics: string[] | null
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          last_attempt_date?: string | null
          passed_attempts?: number | null
          quiz_id?: string | null
          strong_topics?: string[] | null
          subject_name: string
          total_attempts?: number | null
          updated_at?: string | null
          user_id: string
          weak_topics?: string[] | null
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          chapter_id?: string | null
          created_at?: string | null
          id?: string
          last_attempt_date?: string | null
          passed_attempts?: number | null
          quiz_id?: string | null
          strong_topics?: string[] | null
          subject_name?: string
          total_attempts?: number | null
          updated_at?: string | null
          user_id?: string
          weak_topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_performance_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_performance_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_performance_history: {
        Row: {
          average_score: number | null
          created_at: string | null
          id: string
          quizzes_completed: number | null
          snapshot_date: string
          subject_name: string
          total_time_minutes: number | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          id?: string
          quizzes_completed?: number | null
          snapshot_date: string
          subject_name: string
          total_time_minutes?: number | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          id?: string
          quizzes_completed?: number | null
          snapshot_date?: string
          subject_name?: string
          total_time_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty_level: string | null
          explanation: string | null
          id: string
          options: Json | null
          points: number | null
          question_number: number
          question_text: string
          question_type: string
          quiz_id: string | null
          reference_section: string | null
          requires_working: boolean | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty_level?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_number: number
          question_text: string
          question_type: string
          quiz_id?: string | null
          reference_section?: string | null
          requires_working?: boolean | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty_level?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_number?: number
          question_text?: string
          question_type?: string
          quiz_id?: string | null
          reference_section?: string | null
          requires_working?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          id: string
          instant_feedback: boolean | null
          is_published: boolean | null
          option_shuffle: boolean | null
          passing_score_percentage: number | null
          question_shuffle: boolean | null
          quiz_description: string | null
          quiz_title: string
          subject_name: string
          time_limit_minutes: number | null
          total_questions: number
          updated_at: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          instant_feedback?: boolean | null
          is_published?: boolean | null
          option_shuffle?: boolean | null
          passing_score_percentage?: number | null
          question_shuffle?: boolean | null
          quiz_description?: string | null
          quiz_title: string
          subject_name: string
          time_limit_minutes?: number | null
          total_questions: number
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          instant_feedback?: boolean | null
          is_published?: boolean | null
          option_shuffle?: boolean | null
          passing_score_percentage?: number | null
          question_shuffle?: boolean | null
          quiz_description?: string | null
          quiz_title?: string
          subject_name?: string
          time_limit_minutes?: number | null
          total_questions?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          limit_hit: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          limit_hit: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          limit_hit?: number
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number
          created_at: string | null
          id: string
          reset_time: string
          user_id: string
        }
        Insert: {
          action_type: string
          count?: number
          created_at?: string | null
          id?: string
          reset_time: string
          user_id: string
        }
        Update: {
          action_type?: string
          count?: number
          created_at?: string | null
          id?: string
          reset_time?: string
          user_id?: string
        }
        Relationships: []
      }
      reply_upvotes: {
        Row: {
          created_at: string | null
          id: string
          reply_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_upvotes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_changes: {
        Row: {
          change_type: string
          created_at: string | null
          description: string
          id: string
          points_change: number
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          description: string
          id?: string
          points_change: number
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          description?: string
          id?: string
          points_change?: number
          user_id?: string
        }
        Relationships: []
      }
      resource_ratings: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          rating: number
          resource_id: string
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating: number
          resource_id: string
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number
          resource_id?: string
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_ratings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "shared_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          district: string
          grades_offered: number[]
          id: string
          province: string
          school_name: string
          school_type: string
          subjects_per_grade: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          district: string
          grades_offered: number[]
          id?: string
          province: string
          school_name: string
          school_type: string
          subjects_per_grade?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          district?: string
          grades_offered?: number[]
          id?: string
          province?: string
          school_name?: string
          school_type?: string
          subjects_per_grade?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      security_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_resources: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          download_count: number | null
          file_size_mb: number | null
          file_type: string
          file_url: string
          id: string
          moderation_status: string | null
          rating_average: number | null
          rating_count: number | null
          resource_description: string | null
          resource_title: string
          resource_type: string
          subject_name: string
          tags: string[] | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          download_count?: number | null
          file_size_mb?: number | null
          file_type: string
          file_url: string
          id?: string
          moderation_status?: string | null
          rating_average?: number | null
          rating_count?: number | null
          resource_description?: string | null
          resource_title: string
          resource_type: string
          subject_name: string
          tags?: string[] | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          download_count?: number | null
          file_size_mb?: number | null
          file_type?: string
          file_url?: string
          id?: string
          moderation_status?: string | null
          rating_average?: number | null
          rating_count?: number | null
          resource_description?: string | null
          resource_title?: string
          resource_type?: string
          subject_name?: string
          tags?: string[] | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      spaced_repetition_items: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_quality: number | null
          last_review_date: string | null
          next_review_date: string
          repetition_count: number | null
          topic_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_quality?: number | null
          last_review_date?: string | null
          next_review_date: string
          repetition_count?: number | null
          topic_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_quality?: number | null
          last_review_date?: string | null
          next_review_date?: string
          repetition_count?: number | null
          topic_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_repetition_items_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaced_repetition_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      study_buddies: {
        Row: {
          common_subjects: string[] | null
          created_at: string | null
          id: string
          match_score: number | null
          message: string | null
          recipient_id: string
          requester_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          common_subjects?: string[] | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          message?: string | null
          recipient_id: string
          requester_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          common_subjects?: string[] | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          message?: string | null
          recipient_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          created_at: string | null
          created_by: string
          grade_level: number | null
          group_avatar_url: string | null
          group_description: string | null
          group_name: string
          id: string
          is_active: boolean | null
          max_members: number | null
          meeting_schedule: Json | null
          member_count: number | null
          privacy_level: string | null
          subject_names: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          grade_level?: number | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name: string
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          meeting_schedule?: Json | null
          member_count?: number | null
          privacy_level?: string | null
          subject_names?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          grade_level?: number | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name?: string
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          meeting_schedule?: Json | null
          member_count?: number | null
          privacy_level?: string | null
          subject_names?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      study_preferences: {
        Row: {
          created_at: string | null
          daily_goal_minutes: number | null
          dark_mode_enabled: boolean | null
          id: string
          learning_style: string | null
          preferred_study_time: string | null
          reading_font_size: string | null
          study_pace: string | null
          study_reminders_enabled: boolean | null
          updated_at: string | null
          user_id: string
          weekly_goal_hours: number | null
        }
        Insert: {
          created_at?: string | null
          daily_goal_minutes?: number | null
          dark_mode_enabled?: boolean | null
          id?: string
          learning_style?: string | null
          preferred_study_time?: string | null
          reading_font_size?: string | null
          study_pace?: string | null
          study_reminders_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_goal_hours?: number | null
        }
        Update: {
          created_at?: string | null
          daily_goal_minutes?: number | null
          dark_mode_enabled?: boolean | null
          id?: string
          learning_style?: string | null
          preferred_study_time?: string | null
          reading_font_size?: string | null
          study_pace?: string | null
          study_reminders_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_goal_hours?: number | null
        }
        Relationships: []
      }
      study_schedules: {
        Row: {
          created_at: string | null
          created_by_ai: boolean | null
          end_date: string
          ical_url: string | null
          id: string
          is_active: boolean | null
          schedule_data: Json
          schedule_title: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_ai?: boolean | null
          end_date: string
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          schedule_data: Json
          schedule_title: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by_ai?: boolean | null
          end_date?: string
          ical_url?: string | null
          id?: string
          is_active?: boolean | null
          schedule_data?: Json
          schedule_title?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount_zar: number | null
          created_at: string | null
          currency: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          plan_type: string
          subscription_end_date: string | null
          subscription_start_date: string | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount_zar?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          plan_type: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount_zar?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          plan_type?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      tertiary_institutions: {
        Row: {
          accreditation: string | null
          admission_requirements: Json | null
          application_deadlines: Json | null
          campus_facilities: string[] | null
          city: string | null
          contact_info: Json | null
          courses_offered: Json | null
          created_at: string | null
          fees_info: Json | null
          id: string
          institution_logo_url: string | null
          institution_name: string
          institution_type: string
          province: string
          rankings: Json | null
          student_support: string | null
          updated_at: string | null
        }
        Insert: {
          accreditation?: string | null
          admission_requirements?: Json | null
          application_deadlines?: Json | null
          campus_facilities?: string[] | null
          city?: string | null
          contact_info?: Json | null
          courses_offered?: Json | null
          created_at?: string | null
          fees_info?: Json | null
          id?: string
          institution_logo_url?: string | null
          institution_name: string
          institution_type: string
          province: string
          rankings?: Json | null
          student_support?: string | null
          updated_at?: string | null
        }
        Update: {
          accreditation?: string | null
          admission_requirements?: Json | null
          application_deadlines?: Json | null
          campus_facilities?: string[] | null
          city?: string | null
          contact_info?: Json | null
          courses_offered?: Json | null
          created_at?: string | null
          fees_info?: Json | null
          id?: string
          institution_logo_url?: string | null
          institution_name?: string
          institution_type?: string
          province?: string
          rankings?: Json | null
          student_support?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          browser: string | null
          device_type: string | null
          id: string
          session_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          browser?: string | null
          device_type?: string | null
          id?: string
          session_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          browser?: string | null
          device_type?: string | null
          id?: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          appeal_status: string | null
          appeal_text: string | null
          ban_duration_days: number
          ban_reason: string
          banned_by: string
          created_at: string | null
          expires_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          appeal_status?: string | null
          appeal_text?: string | null
          ban_duration_days: number
          ban_reason: string
          banned_by: string
          created_at?: string | null
          expires_at: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          appeal_status?: string | null
          appeal_text?: string | null
          ban_duration_days?: number
          ban_reason?: string
          banned_by?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_chapter_progress: {
        Row: {
          chapter_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_accessed: string | null
          last_quiz_attempt: string | null
          progress_percentage: number | null
          quiz_attempts: number | null
          quiz_passed: boolean | null
          quiz_score: number | null
          started_at: string | null
          status: string | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          last_quiz_attempt?: string | null
          progress_percentage?: number | null
          quiz_attempts?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          last_quiz_attempt?: string | null
          progress_percentage?: number | null
          quiz_attempts?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "curriculum_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          average_quiz_score: number | null
          chapters_completed: number | null
          created_at: string | null
          current_chapter: string | null
          current_chapter_number: number | null
          id: string
          last_accessed: string | null
          next_topic: string | null
          progress_percentage: number | null
          subject_name: string
          total_chapters: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_quiz_score?: number | null
          chapters_completed?: number | null
          created_at?: string | null
          current_chapter?: string | null
          current_chapter_number?: number | null
          id?: string
          last_accessed?: string | null
          next_topic?: string | null
          progress_percentage?: number | null
          subject_name: string
          total_chapters?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_quiz_score?: number | null
          chapters_completed?: number | null
          created_at?: string | null
          current_chapter?: string | null
          current_chapter_number?: number | null
          id?: string
          last_accessed?: string | null
          next_topic?: string | null
          progress_percentage?: number | null
          subject_name?: string
          total_chapters?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reputation: {
        Row: {
          helpful_posts: number | null
          id: string
          positive_ratings: number | null
          quality_resources: number | null
          reputation_level: string | null
          reputation_score: number | null
          updated_at: string | null
          user_id: string
          warnings_received: number | null
        }
        Insert: {
          helpful_posts?: number | null
          id?: string
          positive_ratings?: number | null
          quality_resources?: number | null
          reputation_level?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          user_id: string
          warnings_received?: number | null
        }
        Update: {
          helpful_posts?: number | null
          id?: string
          positive_ratings?: number | null
          quality_resources?: number | null
          reputation_level?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          user_id?: string
          warnings_received?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          user_id: string
          warned_by: string
          warning_reason: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          user_id: string
          warned_by: string
          warning_reason: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
          warned_by?: string
          warning_reason?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          city: string | null
          comm_assessment_reminders: boolean | null
          comm_content_updates: boolean | null
          comm_progress_reports: boolean | null
          comm_study_tips: boolean | null
          created_at: string | null
          date_of_birth: string | null
          district: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string
          grade_level: number | null
          guardian_email: string | null
          id: string
          last_dashboard_visit: string | null
          last_login: string | null
          last_login_at: string | null
          last_payment_date: string | null
          last_study_date: string | null
          location_lat: number | null
          location_lng: number | null
          next_payment_date: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          payfast_subscription_token: string | null
          payment_method: string | null
          phone_number: string | null
          phone_verified: boolean | null
          platform_language: string | null
          profile_picture_url: string | null
          province: string | null
          school_id: string | null
          study_streak_days: number | null
          subjects_studying: Json | null
          subscription_auto_renew: boolean | null
          subscription_cancelled_at: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          total_study_hours: number | null
          updated_at: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          city?: string | null
          comm_assessment_reminders?: boolean | null
          comm_content_updates?: boolean | null
          comm_progress_reports?: boolean | null
          comm_study_tips?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name: string
          grade_level?: number | null
          guardian_email?: string | null
          id: string
          last_dashboard_visit?: string | null
          last_login?: string | null
          last_login_at?: string | null
          last_payment_date?: string | null
          last_study_date?: string | null
          location_lat?: number | null
          location_lng?: number | null
          next_payment_date?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          payfast_subscription_token?: string | null
          payment_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          platform_language?: string | null
          profile_picture_url?: string | null
          province?: string | null
          school_id?: string | null
          study_streak_days?: number | null
          subjects_studying?: Json | null
          subscription_auto_renew?: boolean | null
          subscription_cancelled_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          total_study_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          city?: string | null
          comm_assessment_reminders?: boolean | null
          comm_content_updates?: boolean | null
          comm_progress_reports?: boolean | null
          comm_study_tips?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string
          grade_level?: number | null
          guardian_email?: string | null
          id?: string
          last_dashboard_visit?: string | null
          last_login?: string | null
          last_login_at?: string | null
          last_payment_date?: string | null
          last_study_date?: string | null
          location_lat?: number | null
          location_lng?: number | null
          next_payment_date?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          payfast_subscription_token?: string | null
          payment_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          platform_language?: string | null
          profile_picture_url?: string | null
          province?: string | null
          school_id?: string | null
          study_streak_days?: number | null
          subjects_studying?: Json | null
          subscription_auto_renew?: boolean | null
          subscription_cancelled_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          total_study_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      year_end_reports: {
        Row: {
          academic_year: number
          ai_analysis: Json | null
          created_at: string | null
          file_type: string
          grade_level: number
          id: string
          overall_percentage: number | null
          pass_status: string | null
          report_file_url: string
          subject_grades: Json | null
          upload_date: string | null
          user_id: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          academic_year: number
          ai_analysis?: Json | null
          created_at?: string | null
          file_type: string
          grade_level: number
          id?: string
          overall_percentage?: number | null
          pass_status?: string | null
          report_file_url: string
          subject_grades?: Json | null
          upload_date?: string | null
          user_id: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: number
          ai_analysis?: Json | null
          created_at?: string | null
          file_type?: string
          grade_level?: number
          id?: string
          overall_percentage?: number | null
          pass_status?: string | null
          report_file_url?: string
          subject_grades?: Json | null
          upload_date?: string | null
          user_id?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      community_activity_summary: {
        Row: {
          active_users: number | null
          activity_date: string | null
          messages_sent: number | null
          posts_created: number | null
          resources_shared: number | null
        }
        Relationships: []
      }
      quiz_statistics: {
        Row: {
          average_score: number | null
          fastest_completion: number | null
          last_attempted: string | null
          median_score: number | null
          pass_count: number | null
          quiz_id: string | null
          slowest_completion: number | null
          total_attempts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_performance_summary: {
        Row: {
          average_score: number | null
          best_score: number | null
          first_attempt: string | null
          last_attempt: string | null
          quiz_id: string | null
          quizzes_passed: number | null
          quizzes_taken: number | null
          total_study_time: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_next_review: {
        Args: {
          p_ease_factor: number
          p_interval: number
          p_quality: number
          p_repetition: number
        }
        Returns: {
          new_ease_factor: number
          new_interval: number
          new_repetition: number
        }[]
      }
      calculate_reputation_level: { Args: { score: number }; Returns: string }
      check_subscription_status: { Args: never; Returns: undefined }
      cleanup_expired_cache: { Args: never; Returns: number }
      evict_lru_cache: { Args: { max_entries?: number }; Returns: number }
      get_active_template: {
        Args: { p_template_name: string }
        Returns: {
          id: string
          max_tokens: number
          model_name: string
          prompt_text: string
          response_format: string
          system_context: string
          temperature: number
          template_name: string
          template_version: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_cache_by_tags: { Args: { tags: string[] }; Returns: number }
      refresh_materialized_views: { Args: never; Returns: undefined }
      update_template_metrics: {
        Args: {
          p_cost?: number
          p_rating?: number
          p_success: boolean
          p_template_name: string
          p_template_version: number
        }
        Returns: undefined
      }
      update_user_reputation: {
        Args: {
          p_change_type: string
          p_description: string
          p_points_change: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "free" | "premium"
      app_role: "student" | "admin" | "educator" | "moderator"
      subscription_status: "inactive" | "active" | "cancelled" | "expired"
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
      account_type: ["free", "premium"],
      app_role: ["student", "admin", "educator", "moderator"],
      subscription_status: ["inactive", "active", "cancelled", "expired"],
    },
  },
} as const
