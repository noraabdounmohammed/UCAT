export type DifficultyOption = 'easy' | 'medium' | 'hard' | 'adaptive';
export type Difficulty = DifficultyOption | DifficultyOption[];

export type MainTopic = 
  // Original UCAT topics
  | 'Percentages'
  | 'Ratios'
  | 'Rates & Speed'
  | 'Unit Conversions'
  | 'Data Interpretation'
  | 'Averages & Statistics'
  | 'Measurement & Geometry'
  | 'Trend Extrapolation'
  // UKMLA AKT topics
  | 'Cardiovascular System'
  | 'Respiratory System'
  | 'Gastrointestinal System'
  | 'Neurology'
  | 'Endocrinology'
  | 'Hematology'
  | 'Nephrology'
  | 'Infectious Diseases'
  | 'Psychiatry'
  | 'Pharmacology';

export interface MicroSkill {
  id: string;
  name: string;
  topic: MainTopic;
  description?: string;
}

export interface TopicStructure {
  topic: MainTopic;
  skills: MicroSkill[];
}

export const TOPICS_STRUCTURE: TopicStructure[] = [
  // Original UCAT topics
  {
    topic: 'Percentages',
    skills: [
      { id: 'percent-change', name: 'Percentage Increase / Decrease', topic: 'Percentages' },
      { id: 'percent-value', name: 'Calculate a Percentage of a Value', topic: 'Percentages' },
      { id: 'reverse-percent', name: 'Reverse Percentages', topic: 'Percentages' },
      { id: 'compound-percent', name: 'Compound Percentage Change', topic: 'Percentages' }
    ]
  },
  {
    topic: 'Ratios',
    skills: [
      { id: 'simplify-ratio', name: 'Simplify Ratios', topic: 'Ratios' },
      { id: 'ratio-conversion', name: 'Part-to-Part and Part-to-Whole Conversions', topic: 'Ratios' },
      { id: 'ratio-word', name: 'Ratio Word Problems', topic: 'Ratios' },
      { id: 'ratio-fraction', name: 'Converting Ratios to Fractions', topic: 'Ratios' }
    ]
  },
  {
    topic: 'Rates & Speed',
    skills: [
      { id: 'speed-calc', name: 'Speed = Distance ÷ Time', topic: 'Rates & Speed' },
      { id: 'work-rate', name: 'Work Rate Problems', topic: 'Rates & Speed' },
      { id: 'price-unit', name: 'Price per Unit', topic: 'Rates & Speed' },
      { id: 'efficiency-compare', name: 'Comparing Efficiency or Time', topic: 'Rates & Speed' }
    ]
  },
  {
    topic: 'Unit Conversions',
    skills: [
      { id: 'metric-convert', name: 'Convert Between Metric Units', topic: 'Unit Conversions' },
      { id: 'mixed-convert', name: 'Mixed Unit Conversions', topic: 'Unit Conversions' },
      { id: 'conversion-factors', name: 'Using Conversion Factors', topic: 'Unit Conversions' }
    ]
  },
  {
    topic: 'Data Interpretation',
    skills: [
      { id: 'read-tables', name: 'Read Tables and Text Passages', topic: 'Data Interpretation' },
      { id: 'bar-charts', name: 'Interpret Bar Charts', topic: 'Data Interpretation' },
      { id: 'line-graphs', name: 'Interpret Line Graphs', topic: 'Data Interpretation' },
      { id: 'pie-charts', name: 'Interpret Pie Charts', topic: 'Data Interpretation' },
      { id: 'multi-step', name: 'Multi-step Calculations from Graphs', topic: 'Data Interpretation' }
    ]
  },
  {
    topic: 'Averages & Statistics',
    skills: [
      { id: 'mean-calc', name: 'Mean Calculation', topic: 'Averages & Statistics' },
      { id: 'weighted-mean', name: 'Weighted Mean', topic: 'Averages & Statistics' },
      { id: 'mean-groups', name: 'Estimating Mean from Groups', topic: 'Averages & Statistics' },
      { id: 'outliers', name: 'Identify Outliers', topic: 'Averages & Statistics' }
    ]
  },
  {
    topic: 'Measurement & Geometry',
    skills: [
      { id: 'area-perimeter', name: 'Area and Perimeter', topic: 'Measurement & Geometry' },
      { id: 'volume', name: 'Volume of Cubes/Prisms', topic: 'Measurement & Geometry' },
      { id: 'scaling', name: 'Scaling Up or Down Dimensions', topic: 'Measurement & Geometry' }
    ]
  },
  {
    topic: 'Trend Extrapolation',
    skills: [
      { id: 'pattern-recog', name: 'Recognize Growth or Decline Patterns', topic: 'Trend Extrapolation' },
      { id: 'future-values', name: 'Estimate Future Values from Trends', topic: 'Trend Extrapolation' },
      { id: 'compare-estimates', name: 'Compare Past and Future Estimates', topic: 'Trend Extrapolation' }
    ]
  },
  
  // UKMLA AKT topics
  {
    topic: 'Cardiovascular System',
    skills: [
      { id: 'cv-diagnosis', name: 'Diagnosis of Cardiovascular Conditions', topic: 'Cardiovascular System' },
      { id: 'cv-management', name: 'Management of Cardiovascular Conditions', topic: 'Cardiovascular System' },
      { id: 'cv-investigation', name: 'Investigation of Cardiovascular Conditions', topic: 'Cardiovascular System' },
      { id: 'cv-pharmacology', name: 'Cardiovascular Pharmacology', topic: 'Cardiovascular System' }
    ]
  },
  {
    topic: 'Respiratory System',
    skills: [
      { id: 'resp-diagnosis', name: 'Diagnosis of Respiratory Conditions', topic: 'Respiratory System' },
      { id: 'resp-management', name: 'Management of Respiratory Conditions', topic: 'Respiratory System' },
      { id: 'resp-investigation', name: 'Investigation of Respiratory Conditions', topic: 'Respiratory System' },
      { id: 'resp-pharmacology', name: 'Respiratory Pharmacology', topic: 'Respiratory System' }
    ]
  },
  {
    topic: 'Gastrointestinal System',
    skills: [
      { id: 'gi-diagnosis', name: 'Diagnosis of GI Conditions', topic: 'Gastrointestinal System' },
      { id: 'gi-management', name: 'Management of GI Conditions', topic: 'Gastrointestinal System' },
      { id: 'gi-investigation', name: 'Investigation of GI Conditions', topic: 'Gastrointestinal System' },
      { id: 'gi-pharmacology', name: 'GI Pharmacology', topic: 'Gastrointestinal System' }
    ]
  },
  {
    topic: 'Neurology',
    skills: [
      { id: 'neuro-diagnosis', name: 'Diagnosis of Neurological Conditions', topic: 'Neurology' },
      { id: 'neuro-management', name: 'Management of Neurological Conditions', topic: 'Neurology' },
      { id: 'neuro-investigation', name: 'Investigation of Neurological Conditions', topic: 'Neurology' },
      { id: 'neuro-pharmacology', name: 'Neurological Pharmacology', topic: 'Neurology' }
    ]
  },
  {
    topic: 'Endocrinology',
    skills: [
      { id: 'endo-diagnosis', name: 'Diagnosis of Endocrine Conditions', topic: 'Endocrinology' },
      { id: 'endo-management', name: 'Management of Endocrine Conditions', topic: 'Endocrinology' },
      { id: 'endo-investigation', name: 'Investigation of Endocrine Conditions', topic: 'Endocrinology' },
      { id: 'endo-pharmacology', name: 'Endocrine Pharmacology', topic: 'Endocrinology' }
    ]
  }
];

export type InteractionStatus = 'incorrect' | 'unseen' | 'skipped' | 'correct' | 'flagged';

export interface PracticeFilterOptions {
  section?: string;
  topics: MainTopic[];
  microSkills: string[];
  difficulty: DifficultyOption[];
  interactionStatus: InteractionStatus[];
}

export interface ConceptNodeFilterOptions {
  system?: string;
  conditions: string[];
  presentations: string[];
  competencies: string[];
  difficulty: DifficultyOption[];
  interactionStatus: InteractionStatus[];
}

export interface ProgressData {
  correct: number;
  incorrect: number;
  total: number;
}

export interface Question {
  id: string;
  topic: MainTopic;
  microSkill: string;
  difficulty: Exclude<Difficulty, 'adaptive'>;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  timeLimit: number; // in seconds
}