import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useConceptStore } from '@/store/conceptStore';

interface DeleteButtonProps {
  conceptId: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ conceptId }) => {
  const { deleteConcept, loadConcepts } = useConceptStore();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async (e: React.MouseEvent) => {
    // Prevent event bubbling
    e.stopPropagation();
    e.preventDefault();
    
    if (confirm('Are you sure you want to delete this concept?')) {
      setIsDeleting(true);
      
      try {
        // 1. Delete from localStorage
        const storedConcepts = localStorage.getItem('user_concepts');
        if (storedConcepts) {
          try {
            const concepts = JSON.parse(storedConcepts);
            const updatedConcepts = concepts.filter((c: any) => c.concept_id !== conceptId);
            localStorage.setItem('user_concepts', JSON.stringify(updatedConcepts));
          } catch (e) {
            console.error('Error updating localStorage:', e);
          }
        }
        
        // 2. Delete from store
        deleteConcept(conceptId);
        
        // 3. Delete from conceptModel.json via API
        try {
          const response = await fetch(`http://localhost:3001/api/concepts/${conceptId}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            console.log('Concept deleted from JSON file successfully');
          } else {
            console.warn('Failed to delete concept from JSON file:', await response.text());
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          // Continue even if API fails - the concept will still be deleted from the UI
        }
        
        // 4. Force reload concepts
        loadConcepts();
        
        // 5. Show success message
        alert('Concept deleted successfully!');
      } catch (error) {
        console.error('Error deleting concept:', error);
        alert('Error deleting concept. See console for details.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors p-1 relative"
      aria-label="Delete concept"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
};
