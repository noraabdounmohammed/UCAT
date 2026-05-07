/**
 * JSON Concept Loader
 * 
 * Loads concepts from JSON files in public/concepts/ directory.
 * Maps to your granular filtering system.
 */

export interface JsonConcept {
  title: string;
  content: string;
  custom_filters: string[];
  filter_categories: {
    name: string;
    color: string;
    filters: string[];
  }[];
}

export interface CurriculumData {
  name: string;
  file: string;
  concepts: JsonConcept[];
}

// Map of JSON files to curriculum names
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

export const jsonConceptLoader = {
  /**
   * Load all curriculums from JSON files
   */
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
        
        // Validate and normalize concepts
        const normalizedConcepts = concepts.map((c, idx) => this.normalizeConcept(c, `${file}_${idx}`));
        
        curriculums.push({
          name,
          file,
          concepts: normalizedConcepts
        });
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }
    
    return curriculums;
  },

  /**
   * Load a single curriculum by name
   */
  async loadCurriculum(name: string): Promise<CurriculumData | null> {
    const entry = Object.entries(CURRICULUM_FILES).find(([_, n]) => n === name);
    if (!entry) return null;
    
    const [file, curriculumName] = entry;
    
    try {
      const response = await fetch(`/concepts/${file}`);
      if (!response.ok) return null;
      
      const concepts: JsonConcept[] = await response.json();
      const normalizedConcepts = concepts.map((c, idx) => this.normalizeConcept(c, `${file}_${idx}`));
      
      return {
        name: curriculumName,
        file,
        concepts: normalizedConcepts
      };
    } catch (error) {
      console.error(`Error loading ${name}:`, error);
      return null;
    }
  },

  /**
   * Get all available specialties from all curriculums
   */
  async getAllSpecialties(): Promise<string[]> {
    const curriculums = await this.loadAllCurriculums();
    const specialties = new Set<string>();
    
    curriculums.forEach(c => {
      specialties.add(c.name);
      
      // Also extract from filters
      c.concepts.forEach(concept => {
        concept.custom_filters.forEach(filter => {
          // First filter is usually the specialty
          if (!specialties.has(filter)) {
            specialties.add(filter);
          }
        });
      });
    });
    
    return [...specialties].sort();
  },

  /**
   * Get all unique filters across all curriculums
   */
  async getAllFilters(): Promise<{ category: string; filters: string[] }[]> {
    const curriculums = await this.loadAllCurriculums();
    
    // Group filters by category
    const categories: Record<string, Set<string>> = {
      'Systems': new Set(),
      'Conditions': new Set(),
      'Presentations': new Set(),
      'Other': new Set()
    };
    
    curriculums.forEach(c => {
      c.concepts.forEach(concept => {
        concept.filter_categories.forEach(cat => {
          if (categories[cat.name]) {
            cat.filters.forEach(f => categories[cat.name].add(f));
          }
        });
      });
    });
    
    return Object.entries(categories).map(([category, filters]) => ({
      category,
      filters: [...filters].sort()
    }));
  },

  /**
   * Search concepts across all curriculums
   */
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
          results.push({
            ...concept,
            curriculum: curr.name,
            concept_id: `${curr.file}_${idx}`
          });
        }
      });
    });
    
    return results;
  },

  /**
   * Get concepts by filter
   */
  async getConceptsByFilter(filterName: string): Promise<(JsonConcept & { curriculum: string; concept_id: string })[]> {
    const curriculums = await this.loadAllCurriculums();
    const results: (JsonConcept & { curriculum: string; concept_id: string })[] = [];
    
    curriculums.forEach(curr => {
      curr.concepts.forEach((concept, idx) => {
        if (concept.custom_filters.includes(filterName)) {
          results.push({
            ...concept,
            curriculum: curr.name,
            concept_id: `${curr.file}_${idx}`
          });
        }
      });
    });
    
    return results;
  },

  /**
   * Normalize a concept to ensure all required fields exist
   */
  normalizeConcept(concept: JsonConcept, id: string): JsonConcept {
    return {
      title: concept.title || 'Untitled Concept',
      content: concept.content || 'No content available',
      custom_filters: concept.custom_filters || [],
      filter_categories: concept.filter_categories || [
        { name: 'Systems', color: '#3B82F6', filters: [] },
        { name: 'Conditions', color: '#8B5CF6', filters: [] },
        { name: 'Presentations', color: '#F59E0B', filters: [] },
        { name: 'Other', color: '#10B981', filters: [] }
      ]
    };
  },

  /**
   * Get concept by ID
   */
  async getConceptById(conceptId: string): Promise<(JsonConcept & { curriculum: string }) | null> {
    const [file, idxStr] = conceptId.split('_');
    const idx = parseInt(idxStr, 10);
    
    const curriculumName = CURRICULUM_FILES[file];
    if (!curriculumName) return null;
    
    const curriculum = await this.loadCurriculum(curriculumName);
    if (!curriculum || !curriculum.concepts[idx]) return null;
    
    return {
      ...curriculum.concepts[idx],
      curriculum: curriculumName
    };
  },

  /**
   * Get total concept count across all curriculums
   */
  async getTotalConceptCount(): Promise<number> {
    const curriculums = await this.loadAllCurriculums();
    return curriculums.reduce((sum, c) => sum + c.concepts.length, 0);
  }
};

export default jsonConceptLoader;
