// Concept node types for the domain-agnostic concept practice system

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type QuestionFormat = 'mcq' | 'sba' | 'emq' | 'true_false' | 'ranking' | 'data_interpretation' | 'osce' | 'short_answer' | 'flashcard' | 'essay' | 'ukmla_sba' | 'mindmap';
export type RelationshipType = 'prerequisite_of' | 'part_of' | 'contrasts_with' | 'analogous_to' | 'misconception_of';

export interface BloomMasteryStats {
  attempts: number;
  correct: number;
}

export interface ConceptMasteryData {
  attempts: number;
  correct: number;
  incorrect: number;
  mastery_level: number;
  last_practiced: string | null;
  last_practiced_at?: Date;
  practice_count?: number;
  correct_count?: number;
  bloom_stats?: Record<BloomLevel, BloomMasteryStats>;
  fsrs_stability?: number;
  fsrs_difficulty?: number;
  fsrs_due_at?: string;
  fsrs_last_review?: string;
  fsrs_reps?: number;
  fsrs_lapses?: number;
  stability?: number;
  next_review_at?: string;
}

export type MindMapCategory =
  | 'central' | 'risk' | 'investigation' | 'management' | 'differential'
  | 'complication' | 'definition' | 'mechanism' | 'application' | 'example';

export interface MindMapNode {
  id: string;
  label: string;
  category: MindMapCategory;
  full?: string;
}

export type MindMapEdge = [string, string];

export interface MindMapData {
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface UKMLADimensions {
  systems: string[];
  conditions: string[];
  presentations: string[];
  competencies: string[];
}

export interface GenericTaxonomy {
  domain: string;
  subject: string;
  topic?: string;
  subtopic?: string;
}

export interface ExamSpecific {
  ukmla?: UKMLADimensions;
}

export interface ConceptDimensions extends GenericTaxonomy {
  exam_specific?: ExamSpecific;
}

export interface ConceptKnowledge {
  decision_rule: string;
  guideline_ref?: { name: string; year: number; key_line: string };
  misconceptions?: string[];
  key_facts?: string[];
}

export interface ConceptRelation {
  type: RelationshipType;
  target_id: string;
}

export interface TemplateSpec {
  prompt: string;
  hints?: string[];
  answer_template?: string;
}

export interface MediaAsset {
  type: 'image' | 'chart' | 'audio' | 'video' | 'dataset' | 'code';
  uri: string;
  caption?: string;
}

export interface Reference {
  label: string;
  url?: string;
  citation?: string;
}

export interface AuthoringMetadata {
  created_at: string;
  updated_at: string;
  version: string;
  author?: string;
}

export interface ConceptImportance {
  exam_weight?: number;
  safety_critical?: boolean;
  core?: boolean;
}

export interface ConceptNode {
  concept_id: string;
  title: string;
  content: string;
  custom_filters: string[];
  prerequisites: string[];
  mastery_data: ConceptMasteryData;
  importance?: ConceptImportance;
  exam_weight?: number;
  safety_critical?: boolean;
  core?: boolean;
  created_at?: Date;
  updated_at?: Date;
  mindmap?: MindMapData;
}

export interface ConceptModel {
  concepts: ConceptNode[];
  dimensions: {
    systems: string[];
    competencies: string[];
    difficulty_levels: string[];
    mastery_levels: Array<{ level: number; name: string; description: string }>;
  };
}

export interface ConceptFilterState {
  searchQuery: string;
  mastery_levels: number[];
  custom_filters: string[];
  cascading_mode?: boolean;
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

export type StudyMode = 'smart' | 'new_only' | 'review_weak' | 'custom';

export interface PracticeConfig {
  target_bloom_levels?: BloomLevel[];
  target_formats?: QuestionFormat[];
  use_spaced_repetition?: boolean;
  question_count?: number;
  custom_prompt?: string;
  custom_flashcard_prompt?: string;
  study_mode?: StudyMode;
  target_mastery_levels?: number[];
}

export interface ConceptPracticeState {
  curriculumId: string;
  getCurriculumId: () => string;
  getDueConcepts: () => ConceptNode[];
  isLoading: boolean;
  filterState: ConceptFilterState;
  filterOptions: ConceptFilterOptions;
  concepts: ConceptNode[];
  filteredConcepts: ConceptNode[];
  stats: ConceptStats;
  activeView: 'simple' | 'grid' | 'mastery' | 'dashboard';
  customFilters: CustomFilter[];
  filterCategories: FilterCategory[];
  practiceSelection: string[] | null;
  isPracticing: boolean;
  practiceQuestions: any[];
  generatingQuestionCount: number;
  practiceError: string | null;
  practiceConfig: PracticeConfig;
  currentSessionAnswers: any[];
  sessionStartTime: number | null;
  loadConcepts: () => Promise<void>;
  migrateFilterState: () => void;
  setFilterState: (filterState: ConceptFilterState) => void;
  setPracticeSelection: (conceptIds: string[] | null) => void;
  startPractice: (config?: PracticeConfig) => Promise<void>;
  endPractice: () => void;
  updateMastery: (conceptId: string, isCorrect: boolean) => void;
  getConceptById?: (conceptId: string) => ConceptNode | undefined;
  [key: string]: any;
}
