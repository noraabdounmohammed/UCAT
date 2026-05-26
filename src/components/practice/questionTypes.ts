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
  format?: 'sba' | 'flashcard' | 'ukmla_sba' | 'mcq' | 'emq' | 'data_interpretation' | 'osce' | 'short_answer' | 'essay' | 'mindmap' | 'true_false' | 'ranking';
  concept_id?: string; // Link to the concept this question tests
  concept_title?: string; // The title of the concept this question tests
  bloom_level?: string; // The Bloom's taxonomy level this question targets
  // Mind map specific properties
  title?: string; // Concept title for mind maps
  custom_filters?: string[]; // Custom filter tags for mind maps
  allConcepts?: any[]; // All concepts for unified mind map
  // Guideline/Citation fields for reliable sources
  guideline?: string; // e.g. "NICE CG181: Heart Failure"
  guideline_url?: string; // e.g. "https://www.nice.org.uk/guidance/cg181"
  guideline_section?: string; // e.g. "Section 1.3.2 - Diagnosis"
  source_type?: 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'SIGN' | 'RCP' | 'concept' | 'ai-generated';
  [key: string]: unknown; 
}
