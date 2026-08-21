/**
 * JSON Concept Loader
 *
 * Loads concepts from JSON files in public/concepts/ directory.
 * Maps to the granular filtering system while preserving optional
 * curriculum-level importance metadata for recommendation ranking.
 *
 * IMPORTANT: the UI still uses legacy `filename_index` IDs, while the
 * canonical audited curriculum in Supabase uses `ukmla-N` IDs. Generation
 * resolves the legacy ID to its canonical row so corrected clinical truth
 * is used without forcing a risky pre-launch ID migration across mastery/UI.
 */

import { supabase } from '@/lib/supabase';

export interface ConceptImportance {
  exam_weight?: number;
  safety_critical?: boolean;
  core?: boolean;
}

export interface JsonConcept {
  title: string;
  content: string;
  custom_filters: string[];
  filter_categories: {
    name: string;
    color: string;
    filters: string[];
  }[];
  importance?: ConceptImportance;
  exam_weight?: number;
  safety_critical?: boolean;
  core?: boolean;
}

export interface CurriculumData {
  name: string;
  file: string;
  concepts: JsonConcept[];
}

export interface ResolvedJsonConcept extends JsonConcept {
  curriculum: string;
  canonical_concept_id?: string;
  source_truth: 'canonical' | 'legacy';
}

const CURRICULUM_FILES: Record<string, string> = {
  'cardiovascular_concepts_clean.json': 'Cardiovascular',
  'endocrinology_concepts.json': 'Endocrinology',
  'endocrinology_concepts (1).json': 'Endocrinology 2',
  'final_respiratory_concepts.json': 'Respiratory',
  'gastroenterology_concepts.json': 'Gastroenterology',
  'haematology_concepts_FINAL.json': 'Haematology',
  'infectious_diseases_concepts.json': 'Infectious Diseases',
  'Neurosciences_Complete.json': 'Neurosciences',
  'obstetrics_gynaecology_concepts.json': 'Obstetrics & Gynaecology',
  'oncology_concepts.json': 'Oncology',
  'ophthalmology_concepts.json': 'Ophthalmology',
  'paediatrics_concepts.json': 'Paediatrics',
  'psychiatry_concepts.json': 'Psychiatry',
  'renal_urology_concepts.json': 'Renal & Urology',
  'ENT_concepts_FINAL.json': 'ENT',
};

/**
 * Canonical ukmla-N start for index 0 of each legacy file.
 * These anchors were verified against exact title/content matches in the
 * canonical curriculum. Both endocrinology files overlap the same canonical
 * range, so they intentionally share the same start.
 */
const CANONICAL_FILE_START: Record<string, number> = {
  'cardiovascular_concepts_clean.json': 1,
  'endocrinology_concepts.json': 1274,
  'endocrinology_concepts (1).json': 1274,
  'ENT_concepts_FINAL.json': 1692,
  'final_respiratory_concepts.json': 1895,
  'gastroenterology_concepts.json': 2376,
  'haematology_concepts_FINAL.json': 3189,
  'infectious_diseases_concepts.json': 4059,
  'Neurosciences_Complete.json': 4651,
  'obstetrics_gynaecology_concepts.json': 4905,
  'oncology_concepts.json': 5100,
  'ophthalmology_concepts.json': 5152,
  'paediatrics_concepts.json': 5364,
  'psychiatry_concepts.json': 6335,
  'renal_urology_concepts.json': 6520,
};

function parseLegacyConceptId(conceptId: string): { file: string; index: number } | null {
  const separator = conceptId.lastIndexOf('_');
  if (separator <= 0 || separator === conceptId.length - 1) return null;

  const file = conceptId.slice(0, separator);
  const index = Number.parseInt(conceptId.slice(separator + 1), 10);
  if (!Number.isInteger(index) || index < 0 || !CURRICULUM_FILES[file]) return null;

  return { file, index };
}

function canonicalIdFor(file: string, index: number): string | null {
  const start = CANONICAL_FILE_START[file];
  return Number.isInteger(start) ? `ukmla-${start + index}` : null;
}

export const jsonConceptLoader = {
  async loadAllCurriculums(): Promise<CurriculumData[]> {
    const curriculums: CurriculumData[] = [];

    for (const [file, name] of Object.entries(CURRICULUM_FILES)) {
      try {
        const response = await fetch(`/concepts/${file}`);
        if (!response.ok) {
          console.warn(`Failed to load ${file}: ${response.status}`);
          continue;
        }

        const concepts: JsonConcept[] = await response.json();
        const normalizedConcepts = concepts.map((c, idx) => this.normalizeConcept(c, `${file}_${idx}`));

        curriculums.push({ name, file, concepts: normalizedConcepts });
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }

    return curriculums;
  },

  async loadCurriculum(name: string): Promise<CurriculumData | null> {
    const entry = Object.entries(CURRICULUM_FILES).find(([_, n]) => n === name);
    if (!entry) return null;

    const [file, curriculumName] = entry;

    try {
      const response = await fetch(`/concepts/${file}`);
      if (!response.ok) return null;

      const concepts: JsonConcept[] = await response.json();
      const normalizedConcepts = concepts.map((c, idx) => this.normalizeConcept(c, `${file}_${idx}`));

      return { name: curriculumName, file, concepts: normalizedConcepts };
    } catch (error) {
      console.error(`Error loading ${name}:`, error);
      return null;
    }
  },

  async getAllSpecialties(): Promise<string[]> {
    const curriculums = await this.loadAllCurriculums();
    const specialties = new Set<string>();

    curriculums.forEach(c => {
      specialties.add(c.name);
      c.concepts.forEach(concept => {
        concept.custom_filters.forEach(filter => {
          if (!specialties.has(filter)) specialties.add(filter);
        });
      });
    });

    return [...specialties].sort();
  },

  async getAllFilters(): Promise<{ category: string; filters: string[] }[]> {
    const curriculums = await this.loadAllCurriculums();
    const categories: Record<string, Set<string>> = {
      'Systems': new Set(),
      'Conditions': new Set(),
      'Presentations': new Set(),
      'Other': new Set()
    };

    curriculums.forEach(c => {
      c.concepts.forEach(concept => {
        concept.filter_categories.forEach(cat => {
          if (categories[cat.name]) cat.filters.forEach(f => categories[cat.name].add(f));
        });
      });
    });

    return Object.entries(categories).map(([category, filters]) => ({
      category,
      filters: [...filters].sort()
    }));
  },

  async searchConcepts(query: string): Promise<(JsonConcept & { curriculum: string; concept_id: string })[]> {
    const curriculums = await this.loadAllCurriculums();
    const results: (JsonConcept & { curriculum: string; concept_id: string })[] = [];
    const lowerQuery = query.toLowerCase();

    curriculums.forEach(curr => {
      curr.concepts.forEach((concept, idx) => {
        if (
          concept.title.toLowerCase().includes(lowerQuery) ||
          concept.content.toLowerCase().includes(lowerQuery) ||
          concept.custom_filters.some(f => f.toLowerCase().includes(lowerQuery))
        ) {
          results.push({ ...concept, curriculum: curr.name, concept_id: `${curr.file}_${idx}` });
        }
      });
    });

    return results;
  },

  async getConceptsByFilter(filterName: string): Promise<(JsonConcept & { curriculum: string; concept_id: string })[]> {
    const curriculums = await this.loadAllCurriculums();
    const results: (JsonConcept & { curriculum: string; concept_id: string })[] = [];

    curriculums.forEach(curr => {
      curr.concepts.forEach((concept, idx) => {
        if (concept.custom_filters.includes(filterName)) {
          results.push({ ...concept, curriculum: curr.name, concept_id: `${curr.file}_${idx}` });
        }
      });
    });

    return results;
  },

  normalizeConcept(concept: JsonConcept, _id: string): JsonConcept {
    return {
      title: concept.title || 'Untitled Concept',
      content: concept.content || 'No content available',
      custom_filters: concept.custom_filters || [],
      filter_categories: concept.filter_categories || [
        { name: 'Systems', color: '#3B82F6', filters: [] },
        { name: 'Conditions', color: '#8B5CF6', filters: [] },
        { name: 'Presentations', color: '#F59E0B', filters: [] },
        { name: 'Other', color: '#10B981', filters: [] }
      ],
      importance: concept.importance,
      exam_weight: concept.exam_weight,
      safety_critical: concept.safety_critical,
      core: concept.core,
    };
  },

  async getConceptById(conceptId: string): Promise<ResolvedJsonConcept | null> {
    const parsed = parseLegacyConceptId(conceptId);
    if (!parsed) {
      console.warn('Unable to parse legacy concept ID', conceptId);
      return null;
    }

    const { file, index } = parsed;
    const curriculumName = CURRICULUM_FILES[file];
    const curriculum = await this.loadCurriculum(curriculumName);
    if (!curriculum || !curriculum.concepts[index]) return null;

    const legacyConcept = curriculum.concepts[index];
    const canonicalId = canonicalIdFor(file, index);
    if (!canonicalId) {
      return { ...legacyConcept, curriculum: curriculumName, source_truth: 'legacy' };
    }

    try {
      const { data, error } = await supabase
        .from('curriculum_concepts')
        .select('concept_id,title,content,custom_filters')
        .eq('concept_id', canonicalId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          ...legacyConcept,
          title: data.title || legacyConcept.title,
          content: data.content || legacyConcept.content,
          custom_filters: Array.isArray(data.custom_filters) && data.custom_filters.length
            ? data.custom_filters
            : legacyConcept.custom_filters,
          curriculum: curriculumName,
          canonical_concept_id: data.concept_id,
          source_truth: 'canonical'
        };
      }
    } catch (error) {
      console.warn('Canonical concept lookup failed; using legacy content.', { conceptId, canonicalId, error });
    }

    return {
      ...legacyConcept,
      curriculum: curriculumName,
      canonical_concept_id: canonicalId,
      source_truth: 'legacy'
    };
  },

  async getTotalConceptCount(): Promise<number> {
    const curriculums = await this.loadAllCurriculums();
    return curriculums.reduce((sum, c) => sum + c.concepts.length, 0);
  }
};

export default jsonConceptLoader;