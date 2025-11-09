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
      study_preferences: {
        Row: {
          created_at: string | null
          daily_goal_minutes: number | null
          id: string
          learning_style: string | null
          preferred_study_time: string | null
          study_pace: string | null
          study_reminders_enabled: boolean | null
          updated_at: string | null
          user_id: string
          weekly_goal_hours: number | null
        }
        Insert: {
          created_at?: string | null
          daily_goal_minutes?: number | null
          id?: string
          learning_style?: string | null
          preferred_study_time?: string | null
          study_pace?: string | null
          study_reminders_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_goal_hours?: number | null
        }
        Update: {
          created_at?: string | null
          daily_goal_minutes?: number | null
          id?: string
          learning_style?: string | null
          preferred_study_time?: string | null
          study_pace?: string | null
          study_reminders_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_goal_hours?: number | null
        }
        Relationships: []
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
      app_role: "student" | "admin"
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
      app_role: ["student", "admin"],
      subscription_status: ["inactive", "active", "cancelled", "expired"],
    },
  },
} as const
