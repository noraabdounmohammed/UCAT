import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { createConceptStore } from '@/store/conceptStore';

// Create context for the concept store
const ConceptStoreContext = createContext<ReturnType<typeof createConceptStore> | null>(null);

interface ConceptStoreProviderProps {
  children: ReactNode;
  curriculumId: string;
}

export const ConceptStoreProvider: React.FC<ConceptStoreProviderProps> = ({ 
  children, 
  curriculumId 
}) => {
  // Memoize store creation to prevent unnecessary re-creation
  const store = useMemo(() => {
    const newStore = createConceptStore(curriculumId);
    return newStore;
  }, [curriculumId]);
  
  // Load concepts when store is created or curriculum changes
  useEffect(() => {
    console.log('🔄 Loading concepts for curriculum:', curriculumId);
    store.getState().loadConcepts();
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
