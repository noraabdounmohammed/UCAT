export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string
          section: string
          main_topic: string
          micro_skill: string
          difficulty: 'Easy' | 'Medium' | 'Hard'
          question_stem: string | null
          individual_question: string
          options: string[]
          correct_answer: string
          worked_solution: string | null
          data_type: string | null
          data_block: Json | null
          explanation_audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          section: string
          main_topic: string
          micro_skill: string
          difficulty: 'Easy' | 'Medium' | 'Hard'
          question_stem?: string | null
          individual_question: string
          options: string[]
          correct_answer: string
          worked_solution?: string | null
          data_type?: string | null
          data_block?: Json | null
          explanation_audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          section?: string
          main_topic?: string
          micro_skill?: string
          difficulty?: 'Easy' | 'Medium' | 'Hard'
          question_stem?: string | null
          individual_question?: string
          options?: string[]
          correct_answer?: string
          worked_solution?: string | null
          data_type?: string | null
          data_block?: Json | null
          explanation_audio_url?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          target_score: number | null
          current_score: number | null
          streak: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          target_score?: number | null
          current_score?: number | null
          streak?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          target_score?: number | null
          current_score?: number | null
          streak?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      practice_sessions: {
        Row: {
          id: string
          user_id: string
          section: string
          score: number
          accuracy: number
          time_taken: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          section: string
          score: number
          accuracy: number
          time_taken: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          section?: string
          score?: number
          accuracy?: number
          time_taken?: number
          created_at?: string | null
        }
      }
      mock_exams: {
        Row: {
          id: string
          user_id: string
          score: number
          type: string
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          score: number
          type: string
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          score?: number
          type?: string
          completed_at?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}