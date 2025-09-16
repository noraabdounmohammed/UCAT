import React from 'react';
import { Trash2 } from 'lucide-react';
import { useConceptStore } from '@/store/conceptStore';

interface SimpleDeleteButtonProps {
  conceptId: string;
}

export const SimpleDeleteButton: React.FC<SimpleDeleteButtonProps> = ({ conceptId }) => {
  // Get the store functions directly
  const deleteConcept = useConceptStore(state => state.deleteConcept);
  const loadConcepts = useConceptStore(state => state.loadConcepts);
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this concept?')) {
      try {
        console.log('Deleting concept ID:', conceptId);
        
        // 1. Delete from localStorage first
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          const concepts = JSON.parse(storedConcepts);
          const updatedConcepts = concepts.filter((c: any) => c.concept_id !== conceptId);
          localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts));
          console.log('Removed from localStorage');
        }
        
        // 2. Delete from conceptModel.json if it exists there
        const storedModelConcepts = localStorage.getItem('concept_model');
        if (storedModelConcepts) {
          try {
            const modelData = JSON.parse(storedModelConcepts);
            if (modelData.concepts) {
              modelData.concepts = modelData.concepts.filter((c: any) => c.concept_id !== conceptId);
              localStorage.setItem('concept_model', JSON.stringify(modelData));
              console.log('Removed from concept_model in localStorage');
            }
          } catch (e) {
            console.error('Error updating concept_model in localStorage:', e);
          }
        }
        
        // 3. Delete from store
        deleteConcept(conceptId);
        console.log('Deleted from store');
        
        // 4. Force reload concepts
        setTimeout(() => {
          loadConcepts();
          console.log('Reloaded concepts');
          
          // 5. Force page refresh to ensure UI updates
          window.location.reload();
        }, 100);
      } catch (error) {
        console.error('Error deleting concept:', error);
        alert('Error deleting concept. See console for details.');
      }
    }
  };
  
  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors p-1"
      aria-label="Delete concept"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
};
