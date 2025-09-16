/**
 * Interface for structured explanation data
 */
export interface QuestionData {
  // Core question data
  correctAnswer: string;
  condition: string;
  bp: string;
  medications: string[];
  
  // Guideline information
  guidelineName: string;
  guidelineYear: string;
  primaryReason: string;
  
  // Incorrect options with reasons
  distractors: { 
    name: string; 
    reason: string 
  }[];
  
  // Clinical values
  potassium?: number;
  otherValues?: Record<string, string | number>;
  
  // Monitoring information
  monitoringTimeframe?: string;
  monitoringRisk: string;
  sideEffects: string[];
  
  // Key takeaway
  keyPoint: string;
}
