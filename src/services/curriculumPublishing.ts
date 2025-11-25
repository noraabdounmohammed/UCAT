import { ConceptNode } from '@/types/conceptTypes';
import { StorageManager } from '@/utils/storageManager';
import { createClient } from '@supabase/supabase-js';

// Local cache key for published curriculums metadata (no concepts)
const PUBLISHED_CACHE_KEY = 'expert_published_curriculums_cache_v1';

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
    imageUrl?: string;
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

// Mock published curriculums removed - now using only real published curriculums from Supabase
export const MOCK_PUBLISHED_CURRICULUMS: PublishedCurriculum[] = [];

/*
// OLD MOCK DATA - REMOVED
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
*/

export class CurriculumPublishingService {
  
  // Get all published curriculums (metadata only for speed) with local cache
  static async getPublishedCurriculums(options?: { useCache?: boolean; cacheMaxAgeMs?: number }): Promise<PublishedCurriculum[]> {
    const useCache = options?.useCache !== false; // default true
    const cacheMaxAgeMs = options?.cacheMaxAgeMs ?? 5 * 60 * 1000; // 5 minutes

    try {
      // Use a stateless client for reads to avoid any auth/session overhead
      const supabaseRead = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: undefined,
            storageKey: 'medicu-read-only-v2'
          }
        }
      );
      // Try cache first for instant render
      if (useCache) {
        const cachedStr = localStorage.getItem(PUBLISHED_CACHE_KEY);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as { timestamp: number; data: PublishedCurriculum[] };
            if (Array.isArray(cached?.data)) {
              const age = Date.now() - (cached.timestamp || 0);
              if (age < cacheMaxAgeMs) {
                return cached.data;
              }
            }
          } catch {}
        }
      }

      // Fetch metadata only (no concepts) from Supabase
      const { data: curriculums, error } = await supabaseRead
        .from('published_curriculums')
        .select('id,name,description,category,country,color,image_url,author,version,published_at,download_count,rating,tags,custom_filters,filter_categories,filter_assignments,practice_templates,concept_count,difficulty,estimated_hours,is_locked')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching published curriculums:', error);
        // Fall back to stale cache if available
        const cachedStr = localStorage.getItem(PUBLISHED_CACHE_KEY);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as { timestamp: number; data: PublishedCurriculum[] };
            if (Array.isArray(cached?.data)) return cached.data;
          } catch {}
        }
        return [];
      }

      const mapped: PublishedCurriculum[] = (curriculums || []).map((curriculum: any) => ({
        id: curriculum.id,
        name: curriculum.name,
        description: curriculum.description,
        category: curriculum.category,
        country: curriculum.country,
        color: curriculum.color,
        imageUrl: curriculum.image_url || curriculum.imageUrl || curriculum.image,
        author: curriculum.author,
        version: curriculum.version,
        publishedAt: new Date(curriculum.published_at),
        downloadCount: curriculum.download_count || 0,
        rating: curriculum.rating || 0,
        tags: curriculum.tags || [],
        concepts: [], // defer heavy payload until import
        customFilters: curriculum.custom_filters || [],
        filterCategories: curriculum.filter_categories || [],
        filterAssignments: curriculum.filter_assignments || {},
        practiceTemplates: curriculum.practice_templates || { ukmla_templates: [], flashcard_templates: [] },
        conceptCount: curriculum.concept_count || 0,
        difficulty: curriculum.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        estimatedHours: curriculum.estimated_hours || 0,
        isLocked: curriculum.is_locked || false
      }));

      // Save to cache
      try {
        localStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: mapped }));
      } catch {}

      return mapped;
    } catch (error) {
      console.error('Error in getPublishedCurriculums:', error);
      // Attempt stale cache fallback
      if (useCache) {
        const cachedStr = localStorage.getItem(PUBLISHED_CACHE_KEY);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as { timestamp: number; data: PublishedCurriculum[] };
            if (Array.isArray(cached?.data)) return cached.data;
          } catch {}
        }
      }
      return [];
    }
  }

  // Return cached published curriculums synchronously (metadata only)
  static getCachedPublishedCurriculums(): PublishedCurriculum[] {
    try {
      const cachedStr = localStorage.getItem(PUBLISHED_CACHE_KEY);
      if (!cachedStr) return [];
      const cached = JSON.parse(cachedStr) as { timestamp: number; data: PublishedCurriculum[] };
      return Array.isArray(cached?.data) ? cached.data : [];
    } catch {
      return [];
    }
  }

  // Helper to fetch concepts for a specific published curriculum
  static async getPublishedCurriculumConcepts(curriculumId: string): Promise<ConceptNode[]> {
    try {
      // Use stateless client to avoid conflicts
      const supabaseConcepts = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: undefined,
            storageKey: 'medicu-concepts-v2'
          }
        }
      );

      const { data: concepts, error } = await supabaseConcepts
        .from('curriculum_concepts')
        .select('*')
        .eq('curriculum_id', curriculumId);

      if (error) {
        console.error(`Error fetching concepts for ${curriculumId}:`, error);
        return [];
      }

      return (concepts || []).map((c: any) => ({
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
    } catch (e) {
      console.error('Unexpected error fetching curriculum concepts:', e);
      return [];
    }
  }

  // Export curriculum data for publishing
  static async exportCurriculum(curriculumId: string): Promise<CurriculumExportData | null> {
    try {
      console.log(`📤 [EXPORT] Starting export for ${curriculumId}...`);
      const exportStartTime = Date.now();
      
      // Get curriculum metadata - try user-specific key first, then global
      let storedCurriculums = null;
      
      // Try to get user ID from Supabase auth with timeout
      try {
        console.log('📤 [EXPORT] Attempting to get user session...');
        // Use stateless client to avoid conflicts
        const supabaseExport = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storage: undefined,
              storageKey: 'medicu-export-v2'
            }
          }
        );
        const userPromise = supabaseExport.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 2000)
        );
        
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any;
        console.log(`📤 [EXPORT] Got user session: ${user ? user.id : 'none'}`);
        
        if (user) {
          const userKey = `user_${user.id}_curriculums`;
          storedCurriculums = localStorage.getItem(userKey);
          console.log(`📤 [EXPORT] Checked user-specific key: ${userKey}, found: ${!!storedCurriculums}`);
        }
      } catch (e) {
        console.log(`📤 [EXPORT] Auth check failed or timed out: ${e}, searching all localStorage keys`);
      }
      
      // If not found, search for any user-specific curriculum key
      if (!storedCurriculums) {
        console.log('📤 [EXPORT] Searching for user-specific curriculum keys...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.match(/^user_[a-f0-9-]+_curriculums$/)) {
            storedCurriculums = localStorage.getItem(key);
            if (storedCurriculums) {
              console.log(`📤 [EXPORT] Found curriculums in key: ${key}`);
              break;
            }
          }
        }
      }
      
      // Final fallback to global key
      if (!storedCurriculums) {
        storedCurriculums = localStorage.getItem('curriculums');
        console.log(`📤 [EXPORT] Checked global key, found: ${!!storedCurriculums}`);
      }
      
      if (!storedCurriculums) {
        console.error('❌ [EXPORT] No curriculums found in localStorage');
        return null;
      }
      
      const curriculums = JSON.parse(storedCurriculums);
      const curriculum = curriculums.find((c: any) => c.id === curriculumId);
      if (!curriculum) {
        console.error(`❌ [EXPORT] Curriculum ${curriculumId} not found`);
        return null;
      }
      console.log(`✅ [EXPORT] Found curriculum: ${curriculum.name}`);

      // Get ALL concepts for this curriculum directly from localStorage
      let concepts: ConceptNode[] = [];
      
      console.log(`📦 [EXPORT] Reading concepts from localStorage...`);
      const conceptsReadStart = Date.now();
      
      // Try to get concepts directly from localStorage first
      const conceptsKey = `${curriculumId}_user_concepts`;
      const storedConcepts = localStorage.getItem(conceptsKey);
      
      if (storedConcepts) {
        console.log(`📦 [EXPORT] localStorage read took ${Date.now() - conceptsReadStart}ms`);
        console.log(`📦 [EXPORT] Parsing ${Math.round(storedConcepts.length / 1024)}KB of concept data...`);
        
        const parseStart = Date.now();
        const parsedConcepts = JSON.parse(storedConcepts);
        console.log(`📦 [EXPORT] JSON parse took ${Date.now() - parseStart}ms for ${parsedConcepts.length} concepts`);
        
        // Optimized normalization - only process what's needed
        const defaultMastery = {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          mastery_level: 0,
          last_practiced: null
        };
        
        const normalizeStart = Date.now();
        concepts = parsedConcepts.map((c: any) => ({
          concept_id: c.concept_id,
          title: c.title,
          content: c.content || c.description || c.knowledge || 'No content available',
          custom_filters: c.custom_filters || c.tags || [],
          prerequisites: c.prerequisites || [],
          mastery_data: c.mastery_data || defaultMastery,
          created_at: c.created_at,
          updated_at: c.updated_at
        }));
        console.log(`📦 [EXPORT] Normalization took ${Date.now() - normalizeStart}ms`);
      } else {
        console.log(`⚠️ [EXPORT] No concepts found in localStorage for ${curriculumId}`);
      }
      
      console.log(`✅ [EXPORT] Processed ${concepts.length} concepts in ${Date.now() - exportStartTime}ms`);

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
          color: curriculum.color,
          imageUrl: curriculum.imageUrl
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
  static async importCurriculum(publishedCurriculum: PublishedCurriculum, userId?: string): Promise<string> {
    try {
      // Use a stable ID based on the published curriculum ID (without timestamp)
      // This ensures re-importing the same curriculum uses the same ID
      const newCurriculumId = `imported-${publishedCurriculum.id}`;
      
      // Determine which localStorage key to use
      const storageKey = userId ? `user_${userId}_curriculums` : 'curriculums';
      console.log(`CurriculumPublishing: Using storage key: ${storageKey}`);
      
      // Check if this curriculum was already imported
      const storedCurriculums = localStorage.getItem(storageKey);
      const curriculums = storedCurriculums ? JSON.parse(storedCurriculums) : [];
      const existingCurriculum = curriculums.find((c: any) => c.id === newCurriculumId);
      
      if (existingCurriculum) {
        // Update last accessed time
        existingCurriculum.lastAccessed = new Date();
        localStorage.setItem(storageKey, JSON.stringify(curriculums));
        console.log(`CurriculumPublishing: Curriculum ${newCurriculumId} already exists, updating last accessed`);
        return newCurriculumId;
      }

      // Fetch concepts first to estimate size
      let conceptsToImport: ConceptNode[] = Array.isArray(publishedCurriculum.concepts) ? publishedCurriculum.concepts : [];
      if (!conceptsToImport || conceptsToImport.length === 0) {
        conceptsToImport = await this.getPublishedCurriculumConcepts(publishedCurriculum.id);
      }
      console.log(`CurriculumPublishing: Importing ${conceptsToImport.length} concepts for ${newCurriculumId}`);

      // Estimate size and check storage before importing
      const estimatedSize = JSON.stringify(conceptsToImport).length * 2; // UTF-16 encoding
      const canSave = await StorageManager.checkBeforeSave(estimatedSize);
      
      if (!canSave) {
        throw new Error('Unable to free enough storage space for import');
      }
      
      // Create curriculum metadata
      const newCurriculum = {
        id: newCurriculumId,
        name: publishedCurriculum.name,
        description: publishedCurriculum.description,
        category: publishedCurriculum.category,
        color: publishedCurriculum.color,
        imageUrl: publishedCurriculum.imageUrl, // Include image URL
        conceptCount: publishedCurriculum.conceptCount,
        lastAccessed: new Date(),
        progress: 0,
        createdBy: userId // Track who imported this curriculum
      };

      // Add to curriculums list
      curriculums.push(newCurriculum);
      localStorage.setItem(storageKey, JSON.stringify(curriculums));
      console.log(`CurriculumPublishing: Saved curriculum to ${storageKey}`);

      // Import concepts
      const conceptsKey = `${newCurriculumId}_user_concepts`;
      localStorage.setItem(conceptsKey, JSON.stringify(conceptsToImport));

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
    const startTime = Date.now();
    console.log('🚀 [PUBLISH START] Beginning curriculum publish process...');
    
    try {
      const supabaseStateless = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: undefined,
            storageKey: 'medicu-publish-v2'
          }
        }
      );
      console.log('📤 [STEP 1/4] Exporting curriculum data...');
      const exportData = await this.exportCurriculum(curriculumId);
      if (!exportData) {
        console.error('❌ [STEP 1/4] Export failed - no data returned');
        return false;
      }
      console.log(`✅ [STEP 1/4] Export complete - ${exportData.concepts.length} concepts (${Date.now() - startTime}ms)`);

      const newPubId = `pub-${curriculumId}-${Date.now()}`;
      console.log(`🆔 Generated publish ID: ${newPubId}`);

      // Insert metadata into Supabase (public access enabled)
      console.log('📝 [STEP 2/4] Inserting curriculum metadata...');
      const metaStartTime = Date.now();
      
      // Build the insert object, only include image_url if it exists
      const insertData: any = {
        id: newPubId,
        name: exportData.curriculum.name,
        description: exportData.curriculum.description,
        category: exportData.curriculum.category,
        country: publishData.country || 'International',
        color: exportData.curriculum.color || 'blue', // Default to blue if no color
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
      };
      
      // Only add image_url if it exists (in case column doesn't exist in DB yet)
      if (exportData.curriculum.imageUrl) {
        insertData.image_url = exportData.curriculum.imageUrl;
      }
      
      console.log('🔍 [STEP 2/4] Insert data prepared:', {
        id: insertData.id,
        name: insertData.name,
        concept_count: insertData.concept_count,
        has_image: !!insertData.image_url
      });
      
      console.log('⏳ [STEP 2/4] Calling Supabase insert...');
      console.log('📊 [DEBUG] Insert data keys:', Object.keys(insertData));
      console.log('📊 [DEBUG] Concept count:', exportData.concepts.length);
      
      // Direct insert (connection test removed - it was hanging)
      console.log('🚀 [STEP 2/4] Starting insert directly...');
      const insertPromise = supabaseStateless
        .from('published_curriculums')
        .insert([insertData]);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Insert timeout after 60s - Supabase may be slow or down')), 60000)
      );
      
      let insertResult;
      try {
        insertResult = await Promise.race([insertPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.error('❌ [STEP 2/4] Timeout waiting for Supabase:', timeoutError);
        console.error('💡 Supabase unavailable - falling back to localStorage-only publishing');
        
        // Fallback: Save to localStorage instead
        const publishedCurriculum: PublishedCurriculum = {
          id: newPubId,
          name: exportData.curriculum.name,
          description: exportData.curriculum.description,
          category: exportData.curriculum.category,
          country: publishData.country || 'International',
          color: exportData.curriculum.color || 'blue',
          imageUrl: exportData.curriculum.imageUrl,
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
          estimatedHours: publishData.estimatedHours
        };
        
        // Save to localStorage
        const existingPublished = JSON.parse(localStorage.getItem('published_curriculums') || '[]');
        existingPublished.push(publishedCurriculum);
        localStorage.setItem('published_curriculums', JSON.stringify(existingPublished));
        
        console.log('✅ [FALLBACK] Curriculum saved to localStorage successfully');
        console.log('⚠️ Note: This curriculum is only available locally until Supabase is accessible');
        return true;
      }
      
      const { error: insertMetaError } = insertResult as any;

      if (insertMetaError) {
        console.error('❌ [STEP 2/4] Failed to insert metadata:', insertMetaError);
        console.error('❌ [STEP 2/4] Error details:', JSON.stringify(insertMetaError, null, 2));
        return false;
      }
      console.log(`✅ [STEP 2/4] Metadata inserted (${Date.now() - metaStartTime}ms)`);
      console.log(`⏱️ Progress: ${Math.round((2/4) * 100)}% complete (${Date.now() - startTime}ms elapsed)`);


      // Insert concepts in controlled parallel batches to avoid overwhelming Supabase
      console.log('📦 [STEP 3/4] Starting concept upload...');
      const conceptsStartTime = Date.now();
      
      if (exportData.concepts.length > 0) {
        // Adaptive batch sizing based on curriculum size
        let BATCH_SIZE = 200;
        let PARALLEL_LIMIT = 3;
        
        // For larger curriculums, use smaller batches to avoid timeouts
        if (exportData.concepts.length > 500) {
          BATCH_SIZE = 150;
          PARALLEL_LIMIT = 2;
          console.log('📦 [STEP 3/4] Large curriculum detected, using conservative settings (150/batch, 2 parallel)');
        } else if (exportData.concepts.length > 300) {
          BATCH_SIZE = 175;
          PARALLEL_LIMIT = 2;
          console.log('📦 [STEP 3/4] Medium curriculum detected, using balanced settings (175/batch, 2 parallel)');
        }
        
        const batches: any[][] = [];
        
        // Split into batches
        for (let i = 0; i < exportData.concepts.length; i += BATCH_SIZE) {
          batches.push(exportData.concepts.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`📦 [STEP 3/4] Uploading ${exportData.concepts.length} concepts in ${batches.length} batches (max ${PARALLEL_LIMIT} parallel)...`);
        
        let completedBatches = 0;
        const totalBatches = batches.length;
        
        // Upload batches with controlled parallelism
        for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
          const batchGroup = batches.slice(i, i + PARALLEL_LIMIT);
          const startIndex = i;
          const groupStartTime = Date.now();
          
          console.log(`🔄 [BATCH GROUP ${Math.floor(i / PARALLEL_LIMIT) + 1}] Starting upload of ${batchGroup.length} batches in parallel...`);
          
          const uploadPromises = batchGroup.map((batch, groupIndex) => {
            const batchIndex = startIndex + groupIndex;
            const batchStartTime = Date.now();
            
            const conceptRows = batch.map(c => ({
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

            console.log(`⬆️ [BATCH ${batchIndex + 1}/${totalBatches}] Uploading ${batch.length} concepts...`);
            
            return supabaseStateless
              .from('curriculum_concepts')
              .insert(conceptRows)
              .then(({ error }) => {
                if (error) {
                  console.error(`❌ [BATCH ${batchIndex + 1}/${totalBatches}] Failed:`, error);
                  throw error;
                }
                completedBatches++;
                const batchTime = Date.now() - batchStartTime;
                const progress = Math.round(50 + (completedBatches / totalBatches) * 45); // 50-95%
                console.log(`✅ [BATCH ${batchIndex + 1}/${totalBatches}] Uploaded successfully (${batchTime}ms)`);
                console.log(`⏱️ Progress: ${progress}% complete (${completedBatches}/${totalBatches} batches, ${Date.now() - startTime}ms elapsed)`);
              });
          });

          // Wait for this group to complete before starting next group
          try {
            await Promise.all(uploadPromises);
            const groupTime = Date.now() - groupStartTime;
            console.log(`✅ [BATCH GROUP ${Math.floor(i / PARALLEL_LIMIT) + 1}] Completed in ${groupTime}ms`);
          } catch (error) {
            console.error(`❌ [STEP 3/4] Failed to upload concepts:`, error);
            console.log('🧹 Cleaning up: deleting metadata...');
            // Best-effort cleanup: delete the metadata row if concept insert fails
            await supabaseStateless.from('published_curriculums').delete().eq('id', newPubId);
            console.log('❌ [PUBLISH FAILED] Total time: ' + (Date.now() - startTime) + 'ms');
            return false;
          }
        }
        
        const conceptsTime = Date.now() - conceptsStartTime;
        console.log(`✅ [STEP 3/4] All concepts uploaded (${conceptsTime}ms, avg ${Math.round(conceptsTime / totalBatches)}ms per batch)`);
      } else {
        console.log('⚠️ [STEP 3/4] No concepts to upload');
      }
      
      console.log(`⏱️ Progress: 95% complete (${Date.now() - startTime}ms elapsed)`);


      // Invalidate cache so new curriculum appears immediately
      console.log('🗑️ [STEP 4/4] Invalidating cache...');
      try {
        localStorage.removeItem(PUBLISHED_CACHE_KEY);
        console.log('✅ [STEP 4/4] Cache invalidated');
        // Dispatch custom event to notify all components to refresh
        window.dispatchEvent(new CustomEvent('published-curriculums-updated'));
        console.log('📢 [STEP 4/4] Dispatched refresh event');
      } catch (cacheError) {
        console.warn('⚠️ [STEP 4/4] Failed to invalidate cache:', cacheError);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Progress: 100% complete (${totalTime}ms total)`);
      console.log(`🎉 [PUBLISH SUCCESS] Curriculum published: "${exportData.curriculum.name}"`);
      console.log(`📊 Stats: ${exportData.concepts.length} concepts in ${totalTime}ms (avg ${Math.round(totalTime / exportData.concepts.length)}ms per concept)`);
      return true;
    } catch (error) {
      console.error('❌ [PUBLISH ERROR] Unexpected error:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      return false;
    }
  }

  // Delete published curriculum
  static async deletePublishedCurriculum(curriculumId: string): Promise<boolean> {
    try {

      // If admin (allowlisted), attempt Supabase deletion first (cascades to concepts)
      const allowed = await canPublishToExpert();
      if (allowed) {
        // Use stateless client to avoid conflicts
        const supabaseDelete = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storage: undefined,
              storageKey: 'medicu-delete-v2'
            }
          }
        );
        const { error: delErr, count } = await supabaseDelete
          .from('published_curriculums')
          .delete({ count: 'exact' })
          .eq('id', curriculumId);

        if (delErr) {
          console.error('Error deleting from Supabase:', delErr);
          return false;
        } else if ((count ?? 0) > 0) {
          // Invalidate cache so deletion reflects immediately
          try {
            localStorage.removeItem(PUBLISHED_CACHE_KEY);
            console.log('🗑️ Cache invalidated after delete');
          } catch {}
          console.log('✅ Deleted published curriculum from Supabase:', curriculumId);
          return true;
        }
      }

      console.warn('Curriculum not found for deletion in Supabase or local:', curriculumId);
      return false;
    } catch (error) {
      console.error('Error deleting published curriculum:', error);
      return false;
    }
  }

  // Check if a curriculum can be deleted
  static canDeleteCurriculum(_curriculumId: string): boolean {
    // All published curriculums can be deleted (no more mock protection)
    return true;
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
