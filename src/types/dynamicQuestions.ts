// Dynamic Question Template Interface
export interface QuestionTemplate {
  templateId: string;
  section: string;
  topic: string;
  microSkill: string;
  difficulty: "easy" | "medium" | "hard";
  
  // Guideline information for evidence-based questions
  guideline?: {
    name: string;
    title: string;
    year: number;
    keyRecommendation: string;
    url?: string;
  };
  
  // Optional style controls for stem/explanation generation
  templateStyle?: {
    maxWords?: number;
    boldKeys?: string[]; // e.g. ["BP_READING", "POTASSIUM"]
  };
  
  // Optional narrative pools to compose a story-like stem
  narrative?: {
    settingPool?: string[]; // e.g. ["GP clinic", "pre-op assessment"]
    timePool?: string[]; // e.g. ["this morning", "yesterday"]
    reasonForAttendancePool?: string[]; // e.g. ["medication review", "poor BP control"]
  };
  
  // Optional clinical detail pools
  clinical?: {
    symptomsPool?: string[];
    redFlagsPool?: string[]; // injected rarely
    examPool?: string[];
  };
  
  // Optional language variability (synonyms)
  variability?: {
    synonymSets?: Record<string, string[]>; // key phrase -> alternatives
  };
  
  // Base template with placeholders
  template: {
    stem: string;
    options: string[];
    questionText?: string; // Optional explicit question text
  };
  
  // Variable pools for randomization
  variables: Record<string, string[]>;
  
  // Logic for determining correct answer
  correctAnswerLogic: {
    type: "fixed" | "conditional" | "calculation";
    value?: number; // For fixed correct answer index
    conditions?: Array<{
      variableKey: string;
      values: string[];
      resultIndex: number;
    }>;
    calculationFn?: string; // Function name to be called for complex logic
  };
  
  // Template for explanation with placeholders
  explanationTemplate: string;
  
  // Time limit in seconds
  timeLimit: number;
  
  // Optional AI enhancement settings
  aiEnhancement?: {
    enabled: boolean;
    stemPrompt?: string;
    explanationPrompt?: string;
  };
}

// Interface matching the existing question format
export interface UkmlaQuestion {
  id: string;
  section: string;
  topic: string;
  microSkill: string;
  difficulty: string;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  timeLimit: number;
}
