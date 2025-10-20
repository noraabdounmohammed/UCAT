import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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
    console.log(`ConceptStoreProvider: Creating store for curriculum ${curriculumId}`);
    console.log(`ConceptStoreProvider: isEmpty flag before store creation:`, localStorage.getItem(`${curriculumId}_is_empty`));
    const newStore = createConceptStore(curriculumId);
    console.log(`ConceptStoreProvider: isEmpty flag after store creation:`, localStorage.getItem(`${curriculumId}_is_empty`));
    return newStore;
  }, [curriculumId]);
  
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
