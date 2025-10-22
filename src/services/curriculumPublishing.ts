import { ConceptNode } from '@/types/conceptTypes';
import { supabase } from '@/lib/supabase';

export async function canPublishToExpert(): Promise<boolean> {
  // Allow anyone to publish to Expert (no authentication required)
  return true;
}

export interface PublishedCurriculum {
  id: string;
  name: string;
  description: string;
  category: string;
  country: string;
  color: string;
  imageUrl?: string; // Optional custom image URL for carousel display
  author: string;
  version: string;
  publishedAt: Date;
  downloadCount: number;
  rating: number;
  tags: string[];
  // Full curriculum data
  concepts: ConceptNode[];
  customFilters: string[];
  filterCategories: any[]; // FilterCategory objects
  filterAssignments: Record<string, string>; // filter name -> category id mapping
  practiceTemplates?: {
    ukmla_templates?: any[];
    flashcard_templates?: any[];
  };
  // Metadata
  conceptCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  isLocked?: boolean; // New field to indicate if curriculum is locked/coming soon
}

export interface CurriculumExportData {
  curriculum: {
    id: string;
    name: string;
    description: string;
    category: string;
    color: string;
  };
  concepts: ConceptNode[];
  customFilters: string[];
  filterCategories: any[]; // FilterCategory objects
  filterAssignments: Record<string, string>; // filter name -> category id mapping
  practiceTemplates: {
    ukmla_templates: any[];
    flashcard_templates: any[];
  };
  exportedAt: Date;
  version: string;
}

// World countries list with flags for filtering
export const WORLD_COUNTRIES = [
  { name: 'International', flag: '🌍' },
  { name: 'Afghanistan', flag: '🇦🇫' },
  { name: 'Albania', flag: '🇦🇱' },
  { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Armenia', flag: '🇦🇲' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Azerbaijan', flag: '🇦🇿' },
  { name: 'Bahrain', flag: '🇧🇭' },
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Belarus', flag: '🇧🇾' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Bolivia', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Bulgaria', flag: '🇧🇬' },
  { name: 'Cambodia', flag: '🇰🇭' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Chile', flag: '🇨🇱' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Czech Republic', flag: '🇨🇿' },
  { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Dominican Republic', flag: '🇩🇴' },
  { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'Estonia', flag: '🇪🇪' },
  { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Finland', flag: '🇫🇮' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Georgia', flag: '🇬🇪' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Greece', flag: '🇬🇷' },
  { name: 'Guatemala', flag: '🇬🇹' },
  { name: 'Hungary', flag: '🇭🇺' },
  { name: 'Iceland', flag: '🇮🇸' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Iran', flag: '🇮🇷' },
  { name: 'Iraq', flag: '🇮🇶' },
  { name: 'Ireland', flag: '🇮🇪' },
  { name: 'Israel', flag: '🇮🇱' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Kuwait', flag: '🇰🇼' },
  { name: 'Latvia', flag: '🇱🇻' },
  { name: 'Lebanon', flag: '🇱🇧' },
  { name: 'Lithuania', flag: '🇱🇹' },
  { name: 'Luxembourg', flag: '🇱🇺' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Morocco', flag: '🇲🇦' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Norway', flag: '🇳🇴' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Peru', flag: '🇵🇪' },
  { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Romania', flag: '🇷🇴' },
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Slovakia', flag: '🇸🇰' },
  { name: 'Slovenia', flag: '🇸🇮' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'Venezuela', flag: '🇻🇪' },
  { name: 'Vietnam', flag: '🇻🇳' }
];

// Exam categories with icons and colors
export const EXAM_CATEGORIES = [
  { name: 'Certification', icon: '📜', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { name: 'Government', icon: '🏛️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { name: 'Law', icon: '⚖️', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { name: 'Medical', icon: '🏥', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { name: 'Permit', icon: '📋', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { name: 'School', icon: '🎓', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { name: 'University', icon: '🏫', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' }
];

// Mock published curriculums for demonstration
const MOCK_PUBLISHED_CURRICULUMS: PublishedCurriculum[] = [
  {
    id: 'pub-ukmla-cardiology-v1',
    name: 'UKMLA Cardiology Complete',
    description: 'Comprehensive cardiology curriculum covering all UKMLA requirements including acute coronary syndromes, heart failure, arrhythmias, and interventional procedures.',
    category: 'Medical',
    country: 'United Kingdom',
    color: 'bg-red-500',
    imageUrl: '/cardiology-heart.png',
    author: 'Dr. Sarah Johnson',
    version: '1.2.0',
    publishedAt: new Date('2024-01-15'),
    downloadCount: 1247,
    rating: 4.8,
    tags: ['UKMLA', 'Cardiology', 'Clinical', 'Evidence-Based'],
    isLocked: true,
    concepts: [
      {
        concept_id: 'ukmla-cardio-acs',
        title: 'Acute Coronary Syndrome',
        content: 'Acute coronary syndrome (ACS) encompasses unstable angina, NSTEMI, and STEMI. It results from rupture or erosion of atherosclerotic plaque leading to thrombosis and reduced coronary blood flow. Key facts: STEMI involves complete coronary occlusion with ST elevation on ECG. NSTEMI shows partial occlusion with troponin rise but no ST elevation. Unstable angina presents as chest pain at rest without troponin rise. Primary PCI is gold standard for STEMI if available within 120 minutes. Dual antiplatelet therapy (aspirin + P2Y12 inhibitor) is essential.',
        prerequisites: [],
        custom_filters: ['acute-coronary-syndrome', 'cardiology'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-cardio-heart-failure',
        title: 'Heart Failure',
        content: 'Heart failure is a clinical syndrome where the heart cannot pump blood effectively to meet the body\'s metabolic demands. Can be acute or chronic, with preserved or reduced ejection fraction. HFrEF: Ejection fraction <40%, treated with ACE inhibitors, beta-blockers, diuretics. HFpEF: Ejection fraction ≥50%, focus on treating underlying causes. BNP/NT-proBNP elevated in heart failure. NYHA classification: I-IV based on functional limitation. Loop diuretics for fluid overload, ACE inhibitors for mortality benefit.',
        prerequisites: [],
        custom_filters: ['heart-failure', 'cardiology'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-cardio-arrhythmias',
        title: 'Cardiac Arrhythmias',
        content: 'Abnormal heart rhythms including atrial fibrillation, ventricular tachycardia, and heart blocks. Can be bradyarrhythmias (<60 bpm) or tachyarrhythmias (>100 bpm).',
        prerequisites: [],
        custom_filters: ['arrhythmias', 'cardiology'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-cardio-hypertension',
        title: 'Hypertension',
        content: 'Persistently elevated blood pressure ≥140/90 mmHg. Major risk factor for cardiovascular disease, stroke, and kidney disease. Often asymptomatic.',
        prerequisites: [],
        custom_filters: ['cardiology'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-cardio-valvular',
        title: 'Valvular Heart Disease',
        content: 'Disorders affecting heart valves including stenosis and regurgitation. Can affect aortic, mitral, tricuspid, or pulmonary valves.',
        prerequisites: [],
        custom_filters: ['cardiology'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      }
    ],
    customFilters: ['acute-coronary-syndrome', 'heart-failure', 'arrhythmias', 'interventional'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 5,
    difficulty: 'Advanced',
    estimatedHours: 25
  },
  {
    id: 'pub-ukmla-respiratory-v1',
    name: 'UKMLA Respiratory Medicine',
    description: 'Complete respiratory medicine curriculum including asthma, COPD, pneumonia, lung cancer, and respiratory failure management.',
    category: 'Medical',
    country: 'United Kingdom',
    color: 'bg-blue-500',
    author: 'Prof. Michael Chen',
    version: '1.0.0',
    publishedAt: new Date('2024-02-01'),
    downloadCount: 892,
    rating: 4.6,
    tags: ['UKMLA', 'Respiratory', 'Pulmonology', 'Critical Care'],
    isLocked: true,
    concepts: [
      {
        concept_id: 'ukmla-resp-asthma',
        title: 'Asthma',
        content: 'Chronic inflammatory airway disease characterized by variable airflow obstruction, bronchial hyperresponsiveness, and inflammation.',
        prerequisites: [],
        custom_filters: ['asthma'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-resp-copd',
        title: 'COPD',
        content: 'Chronic obstructive pulmonary disease - progressive airflow limitation due to emphysema and chronic bronchitis, primarily caused by smoking.',
        prerequisites: [],
        custom_filters: ['copd'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      },
      {
        concept_id: 'ukmla-resp-pneumonia',
        title: 'Pneumonia',
        content: 'Acute infection of lung parenchyma causing inflammation and consolidation. Can be community-acquired (CAP) or hospital-acquired (HAP).',
        prerequisites: [],
        custom_filters: ['pneumonia'],
        mastery_data: {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        }
      }
    ],
    customFilters: ['asthma', 'copd', 'pneumonia', 'lung-cancer'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 3,
    difficulty: 'Intermediate',
    estimatedHours: 18
  },
  {
    id: 'pub-basic-anatomy-v1',
    name: 'Human Anatomy Fundamentals',
    description: 'Essential human anatomy covering all major body systems with detailed illustrations and clinical correlations.',
    category: 'School',
    country: 'International',
    color: 'bg-green-500',
    author: 'Dr. Emily Rodriguez',
    version: '2.1.0',
    publishedAt: new Date('2024-01-20'),
    downloadCount: 2156,
    rating: 4.9,
    tags: ['Anatomy', 'Basic Sciences', 'Medical School', 'Illustrated'],
    isLocked: true,
    concepts: [],
    customFilters: ['musculoskeletal', 'cardiovascular', 'nervous-system', 'respiratory'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 134,
    difficulty: 'Beginner',
    estimatedHours: 40
  },
  {
    id: 'pub-pharmacology-v1',
    name: 'Clinical Pharmacology Essentials',
    description: 'Core pharmacology principles with drug mechanisms, interactions, and clinical applications for medical practice.',
    category: 'School',
    country: 'International',
    color: 'bg-purple-500',
    author: 'Dr. James Wilson',
    version: '1.3.0',
    publishedAt: new Date('2024-02-10'),
    downloadCount: 743,
    rating: 4.7,
    tags: ['Pharmacology', 'Drug Interactions', 'Clinical', 'Mechanisms'],
    isLocked: true,
    concepts: [],
    customFilters: ['antibiotics', 'cardiovascular-drugs', 'cns-drugs', 'endocrine-drugs'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 156,
    difficulty: 'Advanced',
    estimatedHours: 35
  },
  {
    id: 'pub-civil-service-v1',
    name: 'Civil Service Exam Preparation',
    description: 'Comprehensive preparation for government civil service examinations covering public administration, law, and current affairs.',
    category: 'Government',
    country: 'United States',
    color: 'bg-blue-600',
    author: 'Prof. Robert Wilson',
    version: '1.0.0',
    publishedAt: new Date('2024-02-15'),
    downloadCount: 1543,
    rating: 4.5,
    tags: ['Civil Service', 'Government', 'Public Administration', 'Current Affairs'],
    isLocked: true,
    concepts: [],
    customFilters: ['public-administration', 'constitutional-law', 'current-affairs', 'economics'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 89,
    difficulty: 'Intermediate',
    estimatedHours: 60
  },
  {
    id: 'pub-bar-exam-v1',
    name: 'Bar Examination Complete Guide',
    description: 'Complete bar examination preparation covering constitutional law, contracts, torts, criminal law, and professional responsibility.',
    category: 'Law',
    country: 'United States',
    color: 'bg-purple-600',
    author: 'Attorney Sarah Mitchell',
    version: '2.0.0',
    publishedAt: new Date('2024-01-10'),
    downloadCount: 2876,
    rating: 4.8,
    tags: ['Bar Exam', 'Law', 'Constitutional Law', 'Contracts', 'Torts'],
    isLocked: true,
    concepts: [],
    customFilters: ['constitutional-law', 'contracts', 'torts', 'criminal-law', 'professional-responsibility'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 156,
    difficulty: 'Advanced',
    estimatedHours: 120
  },
  {
    id: 'pub-driving-permit-v1',
    name: 'Driving License Theory Test',
    description: 'Complete preparation for driving license theory test including traffic rules, road signs, and safety regulations.',
    category: 'Permit',
    country: 'United Kingdom',
    color: 'bg-orange-600',
    author: 'Driving Instructor Mark Davis',
    version: '1.5.0',
    publishedAt: new Date('2024-02-20'),
    downloadCount: 5432,
    rating: 4.7,
    tags: ['Driving License', 'Traffic Rules', 'Road Safety', 'Theory Test'],
    isLocked: true,
    concepts: [],
    customFilters: ['traffic-rules', 'road-signs', 'safety-regulations', 'hazard-perception'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 78,
    difficulty: 'Beginner',
    estimatedHours: 25
  },
  {
    id: 'pub-aws-certification-v1',
    name: 'AWS Cloud Practitioner Certification',
    description: 'Complete preparation for AWS Cloud Practitioner certification covering cloud concepts, security, pricing, and support.',
    category: 'Certification',
    country: 'International',
    color: 'bg-amber-600',
    author: 'Cloud Expert John Smith',
    version: '1.2.0',
    publishedAt: new Date('2024-02-25'),
    downloadCount: 3421,
    rating: 4.9,
    tags: ['AWS', 'Cloud Computing', 'Certification', 'Technology'],
    isLocked: true,
    concepts: [],
    customFilters: ['cloud-concepts', 'security', 'pricing', 'support', 'architecture'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 124,
    difficulty: 'Intermediate',
    estimatedHours: 40
  },
  {
    id: 'pub-pmp-certification-v1',
    name: 'PMP Project Management Certification',
    description: 'Comprehensive PMP certification preparation covering project management processes, knowledge areas, and best practices.',
    category: 'Certification',
    country: 'International',
    color: 'bg-amber-600',
    author: 'PM Professional Lisa Chen',
    version: '2.1.0',
    publishedAt: new Date('2024-01-30'),
    downloadCount: 2156,
    rating: 4.7,
    tags: ['PMP', 'Project Management', 'Certification', 'Leadership'],
    isLocked: true,
    concepts: [],
    customFilters: ['project-lifecycle', 'risk-management', 'stakeholder-management', 'quality-management'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 98,
    difficulty: 'Advanced',
    estimatedHours: 80
  },
  {
    id: 'pub-calculus-university-v1',
    name: 'University Calculus I & II',
    description: 'Complete university-level calculus covering limits, derivatives, integrals, and applications for engineering and science students.',
    category: 'University',
    country: 'International',
    color: 'bg-indigo-600',
    author: 'Prof. Mathematics Department',
    version: '3.0.0',
    publishedAt: new Date('2024-02-10'),
    downloadCount: 4567,
    rating: 4.8,
    tags: ['Calculus', 'Mathematics', 'University', 'Engineering', 'Science'],
    isLocked: true,
    concepts: [],
    customFilters: ['limits', 'derivatives', 'integrals', 'applications', 'series'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 187,
    difficulty: 'Advanced',
    estimatedHours: 120
  },
  {
    id: 'pub-organic-chemistry-v1',
    name: 'Organic Chemistry University Course',
    description: 'Comprehensive organic chemistry for university students covering mechanisms, synthesis, and spectroscopy.',
    category: 'University',
    country: 'International',
    color: 'bg-indigo-600',
    author: 'Dr. Chemistry Department',
    version: '1.8.0',
    publishedAt: new Date('2024-01-15'),
    downloadCount: 3289,
    rating: 4.6,
    tags: ['Organic Chemistry', 'University', 'Mechanisms', 'Synthesis', 'Spectroscopy'],
    isLocked: true,
    concepts: [],
    customFilters: ['mechanisms', 'synthesis', 'spectroscopy', 'stereochemistry', 'functional-groups'],
    filterCategories: [],
    filterAssignments: {},
    practiceTemplates: {
      ukmla_templates: [],
      flashcard_templates: []
    },
    conceptCount: 156,
    difficulty: 'Advanced',
    estimatedHours: 90
  },
];

export class CurriculumPublishingService {
  
  // Get all published curriculums from Supabase
  static async getPublishedCurriculums(): Promise<PublishedCurriculum[]> {
    try {
      // Fetch curriculums from Supabase
      const { data: curriculums, error } = await supabase
        .from('published_curriculums')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching published curriculums:', error);
        // Fallback to mock data if Supabase fails
        return MOCK_PUBLISHED_CURRICULUMS;
      }

      if (!curriculums || curriculums.length === 0) {
        // If no remote curriculums, show local first, then mocks
        const localStr = localStorage.getItem('published_curriculums');
        const localList: PublishedCurriculum[] = localStr ? JSON.parse(localStr) : [];
        const localIds = new Set(localList.map(c => c.id));
        return [...localList, ...MOCK_PUBLISHED_CURRICULUMS.filter(c => !localIds.has(c.id))];
      }

      // Fetch concepts for each curriculum
      const curriculumsWithConcepts = await Promise.all(
        curriculums.map(async (curriculum) => {
          const { data: concepts, error: conceptsError } = await supabase
            .from('curriculum_concepts')
            .select('*')
            .eq('curriculum_id', curriculum.id);

          if (conceptsError) {
            console.error(`Error fetching concepts for ${curriculum.id}:`, conceptsError);
          }

          // Transform database format to PublishedCurriculum format
          return {
            id: curriculum.id,
            name: curriculum.name,
            description: curriculum.description,
            category: curriculum.category,
            country: curriculum.country,
            color: curriculum.color,
            author: curriculum.author,
            version: curriculum.version,
            publishedAt: new Date(curriculum.published_at),
            downloadCount: curriculum.download_count || 0,
            rating: curriculum.rating || 0,
            tags: curriculum.tags || [],
            concepts: (concepts || []).map(c => ({
              concept_id: c.concept_id,
              title: c.title,
              content: c.content,
              prerequisites: c.prerequisites || [],
              custom_filters: c.custom_filters || [],
              mastery_data: c.mastery_data || {
                attempts: 0,
                correct: 0,
                incorrect: 0,
                mastery_level: 0,
                last_practiced: null
              }
            })),
            customFilters: curriculum.custom_filters || [],
            filterCategories: curriculum.filter_categories || [],
            filterAssignments: curriculum.filter_assignments || {},
            practiceTemplates: curriculum.practice_templates || {
              ukmla_templates: [],
              flashcard_templates: []
            },
            conceptCount: curriculum.concept_count || 0,
            difficulty: curriculum.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
            estimatedHours: curriculum.estimated_hours || 0,
            isLocked: curriculum.is_locked || false
          } as PublishedCurriculum;
        })
      );

      // Merge in locally published curriculums (Expert tab should show user-published items)
      const localStr = localStorage.getItem('published_curriculums');
      const localList: PublishedCurriculum[] = localStr ? JSON.parse(localStr) : [];
      const existingIds = new Set(curriculumsWithConcepts.map(c => c.id));
      
      // Append mock curriculums at the end (after Supabase + local)
      const allRemote = [...curriculumsWithConcepts, ...localList.filter(c => !existingIds.has(c.id))];
      const remoteIds = new Set(allRemote.map(c => c.id));
      return [...allRemote, ...MOCK_PUBLISHED_CURRICULUMS.filter(c => !remoteIds.has(c.id))];
    } catch (error) {
      console.error('Error in getPublishedCurriculums:', error);
      // Fallback: show local first, then mocks
      try {
        const localStr = localStorage.getItem('published_curriculums');
        const localList: PublishedCurriculum[] = localStr ? JSON.parse(localStr) : [];
        const localIds = new Set(localList.map(c => c.id));
        return [...localList, ...MOCK_PUBLISHED_CURRICULUMS.filter(c => !localIds.has(c.id))];
      } catch {
        return MOCK_PUBLISHED_CURRICULUMS;
      }
    }
  }

  // Export curriculum data for publishing
  static async exportCurriculum(curriculumId: string): Promise<CurriculumExportData | null> {
    try {
      // Get curriculum metadata
      const storedCurriculums = localStorage.getItem('curriculums');
      if (!storedCurriculums) return null;
      
      const curriculums = JSON.parse(storedCurriculums);
      const curriculum = curriculums.find((c: any) => c.id === curriculumId);
      if (!curriculum) return null;

      // Get ALL concepts for this curriculum directly from localStorage
      let concepts: ConceptNode[] = [];
      
      console.log(`CurriculumPublishing: Exporting all concepts for ${curriculumId}`);
      
      // Try to get concepts directly from localStorage first
      const conceptsKey = `${curriculumId}_user_concepts`;
      const storedConcepts = localStorage.getItem(conceptsKey);
      
      if (storedConcepts) {
        const parsedConcepts = JSON.parse(storedConcepts);
        console.log(`CurriculumPublishing: Found ${parsedConcepts.length} concepts in localStorage`);
        
        // Normalize concepts for export
        concepts = parsedConcepts.map((concept: any) => ({
          concept_id: concept.concept_id,
          title: concept.title,
          content: concept.content || concept.description || concept.knowledge || 'No content available',
          custom_filters: concept.custom_filters || concept.tags || [],
          prerequisites: concept.prerequisites || [],
          mastery_data: concept.mastery_data || {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          },
          created_at: concept.created_at,
          updated_at: concept.updated_at
        }));
      } else {
        console.log(`CurriculumPublishing: No concepts found in localStorage for ${curriculumId}`);
      }
      
      console.log(`CurriculumPublishing: Exporting ${concepts.length} total concepts`);

      // Get custom filters
      const filtersKey = `${curriculumId}_custom_filters`;
      const storedFilters = localStorage.getItem(filtersKey);
      const customFilters: string[] = storedFilters ? JSON.parse(storedFilters) : [];

      // Get filter categories
      const categoriesKey = `${curriculumId}_filter_categories`;
      const storedCategories = localStorage.getItem(categoriesKey);
      const filterCategories = storedCategories ? JSON.parse(storedCategories) : [];

      // Get filter assignments
      const assignmentsKey = `${curriculumId}_filter_assignments`;
      const storedAssignments = localStorage.getItem(assignmentsKey);
      const filterAssignments = storedAssignments ? JSON.parse(storedAssignments) : {};

      // Get practice templates (if any)
      const templatesKey = `${curriculumId}_practice_templates`;
      const storedTemplates = localStorage.getItem(templatesKey);
      const practiceTemplates = storedTemplates ? JSON.parse(storedTemplates) : {
        ukmla_templates: [],
        flashcard_templates: []
      };

      const exportData: CurriculumExportData = {
        curriculum: {
          id: curriculum.id,
          name: curriculum.name,
          description: curriculum.description,
          category: curriculum.category,
          color: curriculum.color
        },
        concepts,
        customFilters,
        filterCategories,
        filterAssignments,
        practiceTemplates,
        exportedAt: new Date(),
        version: '1.0.0'
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting curriculum:', error);
      return null;
    }
  }

  // Import curriculum from exported JSON file
  static async importCurriculumFromFile(exportData: CurriculumExportData): Promise<string> {
    try {
      // Generate new curriculum ID
      const newCurriculumId = `imported-${exportData.curriculum.id}-${Date.now()}`;
      
      // Create curriculum metadata
      const newCurriculum = {
        id: newCurriculumId,
        name: exportData.curriculum.name,
        description: exportData.curriculum.description,
        category: exportData.curriculum.category,
        color: exportData.curriculum.color,
        conceptCount: exportData.concepts.length,
        lastAccessed: new Date(),
        progress: 0
      };

      // Add to curriculums list
      const storedCurriculums = localStorage.getItem('curriculums');
      const curriculums = storedCurriculums ? JSON.parse(storedCurriculums) : [];
      curriculums.push(newCurriculum);
      localStorage.setItem('curriculums', JSON.stringify(curriculums));

      // Import concepts
      const conceptsKey = `${newCurriculumId}_user_concepts`;
      console.log(`CurriculumPublishing: Importing ${exportData.concepts.length} concepts for ${newCurriculumId}`);
      localStorage.setItem(conceptsKey, JSON.stringify(exportData.concepts));

      // Import custom filters
      const filtersKey = `${newCurriculumId}_custom_filters`;
      localStorage.setItem(filtersKey, JSON.stringify(exportData.customFilters));

      // Import filter categories
      if (exportData.filterCategories && exportData.filterCategories.length > 0) {
        const categoriesKey = `${newCurriculumId}_filter_categories`;
        localStorage.setItem(categoriesKey, JSON.stringify(exportData.filterCategories));
      }

      // Import filter assignments
      if (exportData.filterAssignments && Object.keys(exportData.filterAssignments).length > 0) {
        const assignmentsKey = `${newCurriculumId}_filter_assignments`;
        localStorage.setItem(assignmentsKey, JSON.stringify(exportData.filterAssignments));
      }

      // Import practice templates
      if (exportData.practiceTemplates) {
        const templatesKey = `${newCurriculumId}_practice_templates`;
        localStorage.setItem(templatesKey, JSON.stringify(exportData.practiceTemplates));
      }

      console.log('✅ Curriculum imported successfully from file:', newCurriculum.name);
      return newCurriculumId;
    } catch (error) {
      console.error('Error importing curriculum from file:', error);
      throw new Error('Failed to import curriculum from file');
    }
  }

  // Import curriculum from published data
  static async importCurriculum(publishedCurriculum: PublishedCurriculum): Promise<string> {
    try {
      // Use a stable ID based on the published curriculum ID (without timestamp)
      // This ensures re-importing the same curriculum uses the same ID
      const newCurriculumId = `imported-${publishedCurriculum.id}`;
      
      // Check if this curriculum was already imported
      const storedCurriculums = localStorage.getItem('curriculums');
      const curriculums = storedCurriculums ? JSON.parse(storedCurriculums) : [];
      const existingCurriculum = curriculums.find((c: any) => c.id === newCurriculumId);
      
      if (existingCurriculum) {
        // Update last accessed time
        existingCurriculum.lastAccessed = new Date();
        localStorage.setItem('curriculums', JSON.stringify(curriculums));
        console.log(`CurriculumPublishing: Curriculum ${newCurriculumId} already exists, updating last accessed`);
        return newCurriculumId;
      }
      
      // Create curriculum metadata
      const newCurriculum = {
        id: newCurriculumId,
        name: publishedCurriculum.name,
        description: publishedCurriculum.description,
        category: publishedCurriculum.category,
        color: publishedCurriculum.color,
        conceptCount: publishedCurriculum.conceptCount,
        lastAccessed: new Date(),
        progress: 0
      };

      // Add to curriculums list
      curriculums.push(newCurriculum);
      localStorage.setItem('curriculums', JSON.stringify(curriculums));

      // Import concepts
      const conceptsKey = `${newCurriculumId}_user_concepts`;
      console.log(`CurriculumPublishing: Importing ${publishedCurriculum.concepts.length} concepts for ${newCurriculumId}`);
      console.log('Published curriculum concepts:', publishedCurriculum.concepts);
      
      if (!publishedCurriculum.concepts || publishedCurriculum.concepts.length === 0) {
        console.warn('⚠️ No concepts found in published curriculum!');
      }
      
      localStorage.setItem(conceptsKey, JSON.stringify(publishedCurriculum.concepts));

      // Import custom filters
      const filtersKey = `${newCurriculumId}_custom_filters`;
      localStorage.setItem(filtersKey, JSON.stringify(publishedCurriculum.customFilters));

      // Import filter categories
      if (publishedCurriculum.filterCategories && publishedCurriculum.filterCategories.length > 0) {
        const categoriesKey = `${newCurriculumId}_filter_categories`;
        localStorage.setItem(categoriesKey, JSON.stringify(publishedCurriculum.filterCategories));
      }

      // Import filter assignments
      if (publishedCurriculum.filterAssignments && Object.keys(publishedCurriculum.filterAssignments).length > 0) {
        const assignmentsKey = `${newCurriculumId}_filter_assignments`;
        localStorage.setItem(assignmentsKey, JSON.stringify(publishedCurriculum.filterAssignments));
      }

      // Import practice templates
      if (publishedCurriculum.practiceTemplates) {
        const templatesKey = `${newCurriculumId}_practice_templates`;
        localStorage.setItem(templatesKey, JSON.stringify(publishedCurriculum.practiceTemplates));
      }

      return newCurriculumId;
    } catch (error) {
      console.error('Error importing curriculum:', error);
      throw new Error('Failed to import curriculum');
    }
  }

  // Publish curriculum (adds to Supabase - public access, no auth required)
  static async publishCurriculum(
    curriculumId: string, 
    publishData: {
      author: string;
      country?: string;
      tags: string[];
      difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
      estimatedHours: number;
    }
  ): Promise<boolean> {
    try {
      const exportData = await this.exportCurriculum(curriculumId);
      if (!exportData) return false;

      const newPubId = `pub-${curriculumId}-${Date.now()}`;

      // Insert metadata into Supabase (public access enabled)
      const { error: insertMetaError } = await supabase
        .from('published_curriculums')
        .insert([
          {
            id: newPubId,
            name: exportData.curriculum.name,
            description: exportData.curriculum.description,
            category: exportData.curriculum.category,
            country: publishData.country || 'International',
            color: exportData.curriculum.color,
            author: publishData.author,
            version: exportData.version,
            published_at: new Date().toISOString(),
            download_count: 0,
            rating: 5.0,
            tags: publishData.tags,
            custom_filters: exportData.customFilters,
            filter_categories: exportData.filterCategories,
            filter_assignments: exportData.filterAssignments,
            practice_templates: exportData.practiceTemplates,
            concept_count: exportData.concepts.length,
            difficulty: publishData.difficulty,
            estimated_hours: publishData.estimatedHours,
            is_locked: false
          }
        ]);

      if (insertMetaError) {
        console.error('Failed to insert published curriculum metadata:', insertMetaError);
        return false;
      }

      // Insert concepts in batch
      if (exportData.concepts.length > 0) {
        const conceptRows = exportData.concepts.map(c => ({
          curriculum_id: newPubId,
          concept_id: c.concept_id,
          title: c.title,
          content: c.content,
          prerequisites: c.prerequisites || [],
          custom_filters: c.custom_filters || [],
          mastery_data: c.mastery_data || {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            mastery_level: 0,
            last_practiced: null
          }
        }));

        const { error: insertConceptsError } = await supabase
          .from('curriculum_concepts')
          .insert(conceptRows);

        if (insertConceptsError) {
          console.error('Failed to insert curriculum concepts:', insertConceptsError);
          // Best-effort cleanup: delete the metadata row if concept insert fails
          await supabase.from('published_curriculums').delete().eq('id', newPubId);
          return false;
        }
      }

      // Also add to localStorage for immediate visibility
      const publishedCurriculum: PublishedCurriculum = {
        id: newPubId,
        name: exportData.curriculum.name,
        description: exportData.curriculum.description,
        category: exportData.curriculum.category,
        country: publishData.country || 'International',
        color: exportData.curriculum.color,
        author: publishData.author,
        version: exportData.version,
        publishedAt: new Date(),
        downloadCount: 0,
        rating: 5.0,
        tags: publishData.tags,
        concepts: exportData.concepts,
        customFilters: exportData.customFilters,
        filterCategories: exportData.filterCategories,
        filterAssignments: exportData.filterAssignments,
        practiceTemplates: exportData.practiceTemplates,
        conceptCount: exportData.concepts.length,
        difficulty: publishData.difficulty,
        estimatedHours: publishData.estimatedHours,
        isLocked: false
      };

      const existingPublished = localStorage.getItem('published_curriculums');
      const publishedList: PublishedCurriculum[] = existingPublished ? JSON.parse(existingPublished) : [];
      publishedList.push(publishedCurriculum);
      localStorage.setItem('published_curriculums', JSON.stringify(publishedList));

      console.log('✅ Curriculum published to Expert (Supabase + localStorage) successfully:', publishedCurriculum.name);
      return true;
    } catch (error) {
      console.error('Error publishing curriculum:', error);
      return false;
    }
  }

  // Delete published curriculum (only user-published ones)
  static async deletePublishedCurriculum(curriculumId: string): Promise<boolean> {
    try {
      // Protect built-in mock items from deletion
      const mockIds = MOCK_PUBLISHED_CURRICULUMS.map(c => c.id);
      if (mockIds.includes(curriculumId)) {
        console.warn('Cannot delete mock curriculum:', curriculumId);
        return false;
      }

      // If admin (allowlisted), attempt Supabase deletion first (cascades to concepts)
      const allowed = await canPublishToExpert();
      if (allowed) {
        const { error: delErr, count } = await supabase
          .from('published_curriculums')
          .delete({ count: 'exact' })
          .eq('id', curriculumId);

        if (delErr) {
          console.error('Error deleting from Supabase:', delErr);
        } else if ((count ?? 0) > 0) {
          // Also remove from local cache if present
          const existingPublished = localStorage.getItem('published_curriculums');
          const publishedList: PublishedCurriculum[] = existingPublished ? JSON.parse(existingPublished) : [];
          const updatedList = publishedList.filter(c => c.id !== curriculumId);
          localStorage.setItem('published_curriculums', JSON.stringify(updatedList));
          console.log('✅ Deleted published curriculum from Supabase:', curriculumId);
          return true;
        }
      }

      // Fallback: delete from localStorage (user-published local-only)
      const existingPublished = localStorage.getItem('published_curriculums');
      const publishedList: PublishedCurriculum[] = existingPublished ? JSON.parse(existingPublished) : [];
      const updatedList = publishedList.filter(curriculum => curriculum.id !== curriculumId);
      if (updatedList.length !== publishedList.length) {
        localStorage.setItem('published_curriculums', JSON.stringify(updatedList));
        console.log('✅ Deleted local published curriculum:', curriculumId);
        return true;
      }

      console.warn('Curriculum not found for deletion in Supabase or local:', curriculumId);
      return false;
    } catch (error) {
      console.error('Error deleting published curriculum:', error);
      return false;
    }
  }

  // Check if a curriculum can be deleted (only user-published ones)
  static canDeleteCurriculum(curriculumId: string): boolean {
    const mockIds = MOCK_PUBLISHED_CURRICULUMS.map(c => c.id);
    return !mockIds.includes(curriculumId);
  }

  // Download curriculum as JSON file
  static downloadCurriculumFile(exportData: CurriculumExportData) {
    // Transform to simplified format with filter categories embedded in each concept
    const simplifiedFormat = exportData.concepts.map(concept => {
      // Get filter categories for this concept's filters
      const conceptFilterCategories: any[] = [];
      const categoryMap = new Map<string, { name: string; color: string; filters: string[] }>();
      
      // Build category map from filter assignments
      concept.custom_filters?.forEach(filter => {
        const categoryId = exportData.filterAssignments[filter];
        if (categoryId) {
          const category = exportData.filterCategories.find((cat: any) => cat.id === categoryId);
          if (category) {
            if (!categoryMap.has(category.name)) {
              categoryMap.set(category.name, {
                name: category.name,
                color: category.color,
                filters: []
              });
            }
            categoryMap.get(category.name)!.filters.push(filter);
          }
        }
      });
      
      // Convert map to array
      categoryMap.forEach(cat => conceptFilterCategories.push(cat));
      
      return {
        title: concept.title,
        content: concept.content,
        custom_filters: concept.custom_filters || [],
        filter_categories: conceptFilterCategories
      };
    });
    
    const dataStr = JSON.stringify(simplifiedFormat, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportData.curriculum.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_curriculum.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
