import React from 'react';
import { Trash2 } from 'lucide-react';
import { useConceptStore } from '@/store/conceptStore';

interface WorkingDeleteButtonProps {
  conceptId: string;
}

export const WorkingDeleteButton: React.FC<WorkingDeleteButtonProps> = ({ conceptId }) => {
  const deleteConcept = useConceptStore(state => state.deleteConcept);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (confirm(`Delete concept ${conceptId}?`)) {
      console.log('Deleting concept:', conceptId);
      
      // Use the store's delete function which now properly tracks deletions
      deleteConcept(conceptId);
      
      console.log('Concept deleted and tracked in localStorage');
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
