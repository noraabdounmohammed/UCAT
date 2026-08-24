import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { createConceptStore } from '@/store/conceptStore';

type ConceptStore = ReturnType<typeof createConceptStore>;

// Keep one store per curriculum for the lifetime of the app. The Home screen already
// loads this data, so navigating to "Practise your way" can reuse it immediately
// instead of throwing it away and fetching/rebuilding the same concept model again.
const conceptStoreCache = new Map<string, ConceptStore>();

const getConceptStore = (curriculumId: string) => {
  const cached = conceptStoreCache.get(curriculumId);
  if (cached) return cached;

  const store = createConceptStore(curriculumId);
  conceptStoreCache.set(curriculumId, store);
  return store;
};

// Create context for the concept store
const ConceptStoreContext = createContext<ConceptStore | null>(null);

interface ConceptStoreProviderProps {
  children: ReactNode;
  curriculumId: string;
}

export const ConceptStoreProvider: React.FC<ConceptStoreProviderProps> = ({
  children,
  curriculumId
}) => {
  const store = useMemo(() => getConceptStore(curriculumId), [curriculumId]);

  // Only hydrate an empty store. Route changes now reuse the already-loaded Home
  // store, avoiding the visible second load when the practice builder opens.
  useEffect(() => {
    const state = store.getState();
    if (state.concepts.length > 0 || state.isLoading) return;

    console.log('🔄 Loading concepts for curriculum:', curriculumId);
    void state.loadConcepts();
  }, [store, curriculumId]);

  return (
    <ConceptStoreContext.Provider value={store}>
      {children}
    </ConceptStoreContext.Provider>
  );
};

// Hook to use the curriculum-specific concept store
export const useConceptStore = () => {
  const store = useContext(ConceptStoreContext);
  if (!store) {
    throw new Error('useConceptStore must be used within a ConceptStoreProvider');
  }

  // Return store state plus curriculumId property
  const state = store();
  return {
    ...state,
    curriculumId: (store as any).curriculumId
  };
};
