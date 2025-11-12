/**
 * IndexedDB Manager - High-performance storage for mobile and web
 * Replaces localStorage for large datasets (concepts, practice data)
 * Benefits:
 * - 50+ MB storage (vs 5-10 MB localStorage)
 * - Faster for large datasets
 * - Async operations (non-blocking)
 * - Better for mobile devices
 */

interface ConceptNode {
  concept_id: string;
  title: string;
  content: string;
  custom_filters: string[];
  prerequisites: string[];
  mastery_data: any;
  [key: string]: any;
}

class IndexedDBManager {
  private dbName = 'MedicuDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('concepts')) {
          db.createObjectStore('concepts', { keyPath: 'curriculumId' });
        }
        if (!db.objectStoreNames.contains('filters')) {
          db.createObjectStore('filters', { keyPath: 'curriculumId' });
        }
        if (!db.objectStoreNames.contains('practice')) {
          db.createObjectStore('practice', { keyPath: 'curriculumId' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Save concepts for a curriculum
   */
  async saveConcepts(curriculumId: string, concepts: ConceptNode[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['concepts'], 'readwrite');
      const store = transaction.objectStore('concepts');
      const request = store.put({ curriculumId, concepts, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get concepts for a curriculum
   */
  async getConcepts(curriculumId: string): Promise<ConceptNode[] | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['concepts'], 'readonly');
      const store = transaction.objectStore('concepts');
      const request = store.get(curriculumId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.concepts : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save custom filters
   */
  async saveFilters(curriculumId: string, filters: string[], categories: any[], assignments: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['filters'], 'readwrite');
      const store = transaction.objectStore('filters');
      const request = store.put({ 
        curriculumId, 
        filters, 
        categories, 
        assignments,
        updatedAt: Date.now() 
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get custom filters
   */
  async getFilters(curriculumId: string): Promise<{ filters: string[]; categories: any[]; assignments: any } | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['filters'], 'readonly');
      const store = transaction.objectStore('filters');
      const request = store.get(curriculumId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            filters: result.filters || [],
            categories: result.categories || [],
            assignments: result.assignments || {}
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save practice store data
   */
  async savePracticeStore(curriculumId: string, practiceData: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['practice'], 'readwrite');
      const store = transaction.objectStore('practice');
      const request = store.put({ curriculumId, practiceData, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get practice store data
   */
  async getPracticeStore(curriculumId: string): Promise<any | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['practice'], 'readonly');
      const store = transaction.objectStore('practice');
      const request = store.get(curriculumId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.practiceData : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all data for a curriculum
   */
  async deleteCurriculum(curriculumId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['concepts', 'filters', 'practice'], 'readwrite');
    
    const promises = [
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('concepts').delete(curriculumId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('filters').delete(curriculumId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('practice').delete(curriculumId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ];

    await Promise.all(promises);
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: estimate.quota ? (estimate.usage || 0) / estimate.quota : 0
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(curriculumId: string): Promise<boolean> {
    try {
      console.log(`📦 Migrating ${curriculumId} from localStorage to IndexedDB...`);

      // Migrate concepts
      const conceptsKey = `${curriculumId}_user_concepts`;
      const conceptsData = localStorage.getItem(conceptsKey);
      if (conceptsData) {
        const concepts = JSON.parse(conceptsData);
        await this.saveConcepts(curriculumId, concepts);
        localStorage.removeItem(conceptsKey);
        console.log(`✅ Migrated ${concepts.length} concepts`);
      }

      // Migrate filters
      const filtersKey = `${curriculumId}_custom_filters`;
      const categoriesKey = `${curriculumId}_filter_categories`;
      const assignmentsKey = `${curriculumId}_filter_assignments`;
      
      const filters = localStorage.getItem(filtersKey);
      const categories = localStorage.getItem(categoriesKey);
      const assignments = localStorage.getItem(assignmentsKey);

      if (filters || categories || assignments) {
        await this.saveFilters(
          curriculumId,
          filters ? JSON.parse(filters) : [],
          categories ? JSON.parse(categories) : [],
          assignments ? JSON.parse(assignments) : {}
        );
        localStorage.removeItem(filtersKey);
        localStorage.removeItem(categoriesKey);
        localStorage.removeItem(assignmentsKey);
        console.log(`✅ Migrated filters and categories`);
      }

      // Migrate practice store
      const practiceKey = `${curriculumId}_concept-practice-store`;
      const practiceData = localStorage.getItem(practiceKey);
      if (practiceData) {
        await this.savePracticeStore(curriculumId, JSON.parse(practiceData));
        localStorage.removeItem(practiceKey);
        console.log(`✅ Migrated practice data`);
      }

      // Mark as migrated
      localStorage.setItem(`${curriculumId}_migrated_to_indexeddb`, 'true');
      
      console.log(`✅ Migration complete for ${curriculumId}`);
      return true;
    } catch (error) {
      console.error(`❌ Migration failed for ${curriculumId}:`, error);
      return false;
    }
  }

  /**
   * Check if curriculum has been migrated
   */
  isMigrated(curriculumId: string): boolean {
    return localStorage.getItem(`${curriculumId}_migrated_to_indexeddb`) === 'true';
  }

  /**
   * Migrate all curriculums from localStorage
   */
  async migrateAllCurriculums(): Promise<{ success: number; failed: number }> {
    try {
      const curriculumsData = localStorage.getItem('curriculums');
      if (!curriculumsData) {
        console.log('No curriculums to migrate');
        return { success: 0, failed: 0 };
      }

      const curriculums = JSON.parse(curriculumsData);
      let success = 0;
      let failed = 0;

      for (const curriculum of curriculums) {
        if (!this.isMigrated(curriculum.id)) {
          const result = await this.migrateFromLocalStorage(curriculum.id);
          if (result) {
            success++;
          } else {
            failed++;
          }
        }
      }

      console.log(`📊 Migration complete: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Migration error:', error);
      return { success: 0, failed: 0 };
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBManager();
