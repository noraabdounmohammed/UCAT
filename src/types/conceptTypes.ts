// Concept node types for the domain-agnostic concept practice system

// Bloom's taxonomy levels
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

// Question formats
export type QuestionFormat = 'mcq' | 'emq' | 'data_interpretation' | 'osce' | 'short_answer' | 'flashcard' | 'essay' | 'ukmla_sba';

// Relationship types between concepts
export type RelationshipType = 'prerequisite_of' | 'part_of' | 'contrasts_with' | 'analogous_to' | 'misconception_of';

// Per-Bloom level mastery statistics
export interface BloomMasteryStats {
  attempts: number;
  correct: number;
}

export interface ConceptMasteryData {
  attempts: number;
  correct: number;
  incorrect: number;
  mastery_level: number; // 0-4 scale
  last_practiced: string | null; // ISO date string
  last_practiced_at?: Date; // For compatibility
  practice_count?: number; // Total practice attempts
  correct_count?: number; // Total correct answers
  bloom_stats?: Record<BloomLevel, BloomMasteryStats>; // Per-Bloom level stats
  stability?: number; // Memory stability parameter for spaced repetition
  next_review_at?: string; // ISO date string for next review
}

// UKMLA-specific dimensions
export interface UKMLADimensions {
  systems: string[];
  conditions: string[];
  presentations: string[];
  competencies: string[];
}

// Generic taxonomy dimensions for any domain
export interface GenericTaxonomy {
  domain: string; // e.g., "Medicine", "Mathematics", "Language"
  subject: string; // e.g., "Cardiology", "Algebra", "Spanish"
  topic?: string; // e.g., "Acute Coronary Syndrome", "Quadratic Equations", "Past Tense"
  subtopic?: string; // e.g., "STEMI", "Completing the Square", "Irregular Verbs"
}

// Exam-specific dimensions container
export interface ExamSpecific {
  ukmla?: UKMLADimensions;
  // Future: gmat?: GMATDimensions, gcse_math?: GCSEMathDimensions, etc.
}

// Combined dimensions interface
export interface ConceptDimensions extends GenericTaxonomy {
  exam_specific?: ExamSpecific;
}

export interface ConceptKnowledge {
  decision_rule: string;
  guideline_ref?: {
    name: string;
    year: number;
    key_line: string;
  };
  misconceptions?: string[];
  key_facts?: string[];
}

// Concept relationship
export interface ConceptRelation {
  type: RelationshipType;
  target_id: string;
}

// Template for generating questions at specific Bloom levels and formats
export interface TemplateSpec {
  prompt: string;
  hints?: string[];
  answer_template?: string;
}

// Media asset for a concept
export interface MediaAsset {
  type: 'image' | 'chart' | 'audio' | 'video' | 'dataset' | 'code';
  uri: string;
  caption?: string;
}

// Reference for a concept
export interface Reference {
  label: string;
  url?: string;
  citation?: string;
}

// Authoring metadata
export interface AuthoringMetadata {
  created_at: string;
  updated_at: string;
  version: string;
  author?: string;
}

// Ultra-simple concept node interface
export interface ConceptNode {
  concept_id: string;
  title: string;
  content: string; // Single field for all concept content
  custom_filters: string[]; // User-defined filter tags
  prerequisites: string[]; // Concept dependencies
  mastery_data: ConceptMasteryData;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConceptModel {
  concepts: ConceptNode[];
  dimensions: {
    systems: string[];
    competencies: string[];
    difficulty_levels: string[];
    mastery_levels: Array<{
      level: number;
      name: string;
      description: string;
    }>;
  };
}

export interface ConceptFilterState {
  searchQuery: string;
  mastery_levels: number[];
  custom_filters: string[];
}

export interface ConceptFilterOptions {
  mastery_levels: Array<{level: number; name: string}>;
  custom_filters: string[];
}

export interface ConceptStats {
  total: number;
  by_mastery: Record<number, number>;
  by_custom_filter: Record<string, number>;
}

// Custom filter types
export interface CustomFilter {
  id: string;
  name: string;
  description?: string;
  color?: string;
  category_id?: string;
  created_at: Date;
}

export interface FilterCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parent_id?: string;
  created_at: Date;
}

// Practice configuration
export interface PracticeConfig {
  target_bloom_levels?: BloomLevel[];
  target_formats?: QuestionFormat[];
  use_spaced_repetition?: boolean;
  question_count?: number;
  custom_prompt?: string;
  custom_flashcard_prompt?: string;
}

export interface ConceptPracticeState {
  isLoading: boolean;
  filterState: ConceptFilterState;
  filterOptions: ConceptFilterOptions;
  concepts: ConceptNode[];
  filteredConcepts: ConceptNode[];
  stats: ConceptStats;
  activeView: 'grid' | 'list';
  customFilters: CustomFilter[];
  filterCategories: FilterCategory[];
  
  // Practice state
  isPracticing: boolean;
  practiceQuestions: any[]; // Will be typed properly later
  practiceConfig: PracticeConfig;
  
  // Actions
  loadConcepts: () => Promise<void>;
  updateFilterState: (filterUpdates: Partial<ConceptFilterState>) => void;
  resetFilters: () => void;
  setActiveView: (view: 'grid' | 'list') => void;
  addConcept: (concept: Omit<ConceptNode, 'concept_id'>) => void;
  updateConcept: (conceptId: string, updates: Partial<ConceptNode>) => void;
  deleteConcept: (conceptId: string) => void;
  
  // Practice actions
  startPractice: (config?: PracticeConfig) => Promise<void>;
  endPractice: () => void;
  updateMastery: (conceptId: string, isCorrect: boolean) => void;
  
  // Custom filter management
  createCustomFilter: (filter: Omit<CustomFilter, 'id' | 'created_at'>) => void;
  updateCustomFilter: (filterId: string, updates: Partial<CustomFilter>) => void;
  deleteCustomFilter: (filterId: string) => void;
  
  // Filter category management
  createFilterCategory: (category: Omit<FilterCategory, 'id' | 'created_at'>) => void;
}
