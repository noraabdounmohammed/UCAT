// Dashboard Types

// Section types
export type SectionType = 'QR' | 'VR' | 'DM' | 'SJ';

export interface SectionData {
  name: string;
  abbr: SectionType;
  description: string;
  progress: number;
  score: number;
  totalQuestions: number;
  completedQuestions: number;
  iconName: string;
}

// Insight types
export interface AccuracyInsight {
  overall: number;
  bySection: Record<SectionType, number>;
  trend: Array<{ date: string; value: number }>;
}

export interface TimeInsight {
  averagePerQuestion: Record<SectionType, number>;
  trend: Array<{ date: string; value: number }>;
  timeManagementScore: number;
}

export interface SkillInsight {
  name: string;
  score: number;
  section: SectionType;
}

export interface WeakAreaInsight {
  name: string;
  score: number;
  section: SectionType;
  recommendedActions: string[];
}

export interface SectionInsights {
  accuracy: AccuracyInsight;
  time: TimeInsight;
  topSkills: SkillInsight[];
  weakAreas: WeakAreaInsight[];
}

// Mock exam types
export interface MockData {
  lastScore: number;
  lastDate: string;
  history: Array<{ date: string; score: number; type: 'timed' | 'untimed' }>;
  averageScore: number;
}

// Recommendation types
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  section: SectionType;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  type: 'practice' | 'review' | 'learn';
}

// Dashboard props
export interface DashboardProps {
  userData: {
    name: string;
    targetScore: number;
    currentScore: number;
    streak: number;
    sectionProgress: Record<string, number>;
    insights: SectionInsights;
    recommendations: Recommendation[];
    lastMockData: MockData;
  };
  onPracticeStart: (section: string) => void;
  onMockStart: (type: 'timed' | 'untimed') => void;
  onRecommendationAction: (id: string, action: string) => void;
  isLoading?: boolean;
}