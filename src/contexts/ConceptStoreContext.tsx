import React, { createContext, useContext, ReactNode } from 'react';
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
  // Create curriculum-specific store
  const store = createConceptStore(curriculumId);
  
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
  return store();
};
