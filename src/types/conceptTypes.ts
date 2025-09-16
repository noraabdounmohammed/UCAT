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

// Main concept node interface
export interface ConceptNode {
  concept_id: string;
  title: string;
  description: string;
  tags: string[];
  bloom_levels?: BloomLevel[];
  bloom_level?: BloomLevel; // Single bloom level for simplified editing
  dimensions?: ConceptDimensions;
  taxonomy?: GenericTaxonomy; // Direct taxonomy access for editing
  knowledge?: ConceptKnowledge;
  relations?: ConceptRelation[];
  relationships?: ConceptRelation[]; // Alternative name for relations
  templates?: Record<BloomLevel, Record<QuestionFormat, TemplateSpec>>;
  media?: MediaAsset[];
  references?: Reference[];
  authoring?: AuthoringMetadata;
  mastery_data: ConceptMasteryData;
  
  // New fields for domain-agnostic model
  question_formats?: QuestionFormat[]; // Supported question formats
  scope_note?: string; // Clarifies what's included/excluded (keeps MECE)
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
  // UKMLA-specific filters
  systems: string[];
  conditions: string[];
  presentations: string[];
  competencies: string[];
  
  // Generic filters
  domain?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficulty: string[];
  mastery_levels: number[];
  tags: string[];
  
  // New filters
  bloom_levels?: BloomLevel[];
  question_formats?: QuestionFormat[];
  due_for_review?: boolean; // Filter for concepts due for review (spaced repetition)
  
  searchQuery: string;
}

export interface ConceptFilterOptions {
  // UKMLA-specific options
  systems: string[];
  conditions: string[];
  presentations: string[];
  competencies: string[];
  
  // Generic options
  domains: string[];
  subjects: string[];
  topics: string[];
  subtopics: string[];
  difficulty: string[];
  mastery_levels: Array<{level: number; name: string}>;
  tags: string[];
  
  // New options
  bloom_levels: BloomLevel[];
  question_formats: QuestionFormat[];
}

export interface ConceptStats {
  total: number;
  
  // UKMLA-specific stats
  by_system: Record<string, number>;
  by_condition: Record<string, number>;
  by_presentation: Record<string, number>;
  by_competency: Record<string, number>;
  
  // Generic stats
  by_domain: Record<string, number>;
  by_subject: Record<string, number>;
  by_topic: Record<string, number>;
  by_mastery: Record<number, number>;
  by_difficulty: Record<string, number>;
  
  // New stats
  by_bloom_level?: Record<BloomLevel, number>;
  by_question_format?: Record<QuestionFormat, number>;
  due_for_review?: number; // Count of concepts due for review
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
  isPracticing: boolean;
  practiceConfig?: PracticeConfig;
  practiceQuestions: any[]; // Will be replaced with QuestionData type
  activeView: 'grid' | 'matrix' | 'tree' | 'graph' | 'mastery';
  
  // Actions
  loadConcepts: () => Promise<void>;
  updateFilter: (filterUpdates: Partial<ConceptFilterState>) => void;
  resetFilter: () => void;
  startPractice: (config?: PracticeConfig) => void;
  endPractice: () => void;
  updateMastery: (conceptId: string, isCorrect: boolean) => void;
  setActiveView: (view: 'grid' | 'matrix' | 'tree' | 'graph' | 'mastery') => void;
  addConcept: (concept: Partial<ConceptNode>) => void;
  updateConcept: (conceptId: string, updates: Partial<ConceptNode>) => void;
  deleteConcept: (conceptId: string) => void;
}
