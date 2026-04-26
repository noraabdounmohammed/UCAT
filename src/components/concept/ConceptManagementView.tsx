import { useState } from 'react';
import { ConceptSimpleView } from './ConceptSimpleView';
import { ConceptGridView } from './ConceptGridView';

type ViewMode = 'simple' | 'grid';

interface ConceptManagementViewProps {
  onStartPractice?: () => void;
  onAddConcepts?: () => void;
}

export function ConceptManagementView({ onStartPractice, onAddConcepts }: ConceptManagementViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  const handleSwitchToGrid = () => {
    setViewMode('grid');
  };

  const handleSwitchToSimple = () => {
    setViewMode('simple');
  };

  const handleStartPractice = () => {
    if (onStartPractice) {
      onStartPractice();
    } else {
      // Default behavior - could navigate to practice page
      console.log('Starting practice session...');
    }
  };

  if (viewMode === 'grid') {
    return (
      <div>
        {/* Add a switch back button to the grid view */}
        <div className="mb-4">
          <button
            onClick={handleSwitchToSimple}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <span>← Back to Simple View</span>
          </button>
        </div>
        <ConceptGridView />
      </div>
    );
  }

  return (
    <ConceptSimpleView 
      onSwitchToGrid={handleSwitchToGrid}
      onStartPractice={handleStartPractice}
      onAddConcepts={onAddConcepts}
    />
  );
}
