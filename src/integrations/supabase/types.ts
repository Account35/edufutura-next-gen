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
      [_ in never]: never
    }
    Functions: {
      check_subscription_status: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "free" | "premium"
      app_role: "student" | "admin" | "educator"
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
      app_role: ["student", "admin", "educator"],
      subscription_status: ["inactive", "active", "cancelled", "expired"],
    },
  },
} as const
