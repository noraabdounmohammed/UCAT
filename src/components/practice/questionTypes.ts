// Define properly typed interfaces for the questions
export interface QuestionData {
  id: string;
  individual_question?: string;
  content?: string;
  question?: string;
  question_stem?: string;
  options: Array<{ text: string; id: string } | string>;
  correct_answer?: string;
  correctAnswer?: string | number;
  worked_solution?: string;
  explanation?: string;
  data_block?: Array<{ label: string; value: number }> | Record<string, unknown> | null;
  data_type?: string;
  // New properties for table and chart data
  table?: {
    columns?: string[];
    rows?: Array<Array<string | number>>;
  };
  chart?: {
    type?: string;
    data?: Array<{label?: string; value?: number}> | Record<string, unknown>;
  };
  // Format-specific properties
  format?: 'sba' | 'flashcard' | 'ukmla_sba' | 'mcq' | 'emq' | 'data_interpretation' | 'osce' | 'short_answer' | 'essay';
  concept_id?: string; // Link to the concept this question tests
  bloom_level?: string; // The Bloom's taxonomy level this question targets
  [key: string]: unknown; 
}
