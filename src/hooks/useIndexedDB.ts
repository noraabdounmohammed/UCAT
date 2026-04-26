import { useEffect, useState } from 'react';
import { indexedDB } from '@/utils/indexedDBManager';

/**
 * Hook to use IndexedDB for curriculum data storage
 * Automatically migrates from localStorage on first use
 */
export function useIndexedDB() {
  const [isReady, setIsReady] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await indexedDB.init();
        setIsReady(true);
        
        // Check if we need to migrate
        const needsMigration = !localStorage.getItem('indexeddb_migration_complete');
        if (needsMigration) {
          setIsMigrating(true);
          console.log('🔄 Starting IndexedDB migration...');
          const result = await indexedDB.migrateAllCurriculums();
          console.log(`✅ Migration complete: ${result.success} curriculums migrated`);
          localStorage.setItem('indexeddb_migration_complete', 'true');
          setIsMigrating(false);
        }
      } catch (error) {
        console.error('IndexedDB initialization failed:', error);
        setIsReady(false);
      }
    };

    initDB();
  }, []);

  return { isReady, isMigrating, db: indexedDB };
}

/**
 * Hook to get/set concepts for a curriculum using IndexedDB
 */
export function useConcepts(curriculumId: string) {
  const { isReady, db } = useIndexedDB();
  const [concepts, setConcepts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !curriculumId) return;

    const loadConcepts = async () => {
      try {
        setIsLoading(true);
        const data = await db.getConcepts(curriculumId);
        setConcepts(data || []);
      } catch (error) {
        console.error('Failed to load concepts:', error);
        // Fallback to localStorage
        const fallback = localStorage.getItem(`${curriculumId}_user_concepts`);
        if (fallback) {
          setConcepts(JSON.parse(fallback));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadConcepts();
  }, [isReady, curriculumId, db]);

  const saveConcepts = async (newConcepts: any[]) => {
    try {
      await db.saveConcepts(curriculumId, newConcepts);
      setConcepts(newConcepts);
    } catch (error) {
      console.error('Failed to save concepts:', error);
      // Fallback to localStorage
      localStorage.setItem(`${curriculumId}_user_concepts`, JSON.stringify(newConcepts));
      setConcepts(newConcepts);
    }
  };

  return { concepts, saveConcepts, isLoading };
}
