import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

// Define the tree node structure
interface TreeNode {
  id: string;
  name: string;
  type: 'system' | 'condition' | 'presentation' | 'competency';
  children?: TreeNode[];
  count?: number;
  selected?: boolean;
}

interface ConceptNodeTreeViewProps {
  data: TreeNode;
  onNodeSelect?: (node: TreeNode) => void;
}

export const ConceptNodeTreeView: React.FC<ConceptNodeTreeViewProps> = ({ 
  data, 
  onNodeSelect 
}) => {
  return (
    <div className="concept-tree-view">
      <TreeNodeComponent 
        node={data} 
        level={0} 
        onNodeSelect={onNodeSelect} 
      />
    </div>
  );
};

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onNodeSelect?: (node: TreeNode) => void;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ 
  node, 
  level, 
  onNodeSelect 
}) => {
  const [expanded, setExpanded] = useState(level < 1);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  const handleSelect = () => {
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };
  
  // Determine styling based on node type and selection state
  const getNodeStyle = () => {
    const baseClasses = "flex items-center px-3 py-2 rounded-lg transition-colors";
    
    if (node.selected) {
      return `${baseClasses} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`;
    }
    
    switch (node.type) {
      case 'system':
        return `${baseClasses} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`;
      case 'condition':
        return `${baseClasses} bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700`;
      case 'presentation':
        return `${baseClasses} bg-white dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-700/80`;
      case 'competency':
        return `${baseClasses} bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-700/60`;
      default:
        return baseClasses;
    }
  };
  
  return (
    <div className="tree-node" style={{ paddingLeft: `${level * 16}px` }}>
      <div 
        className={getNodeStyle()}
        onClick={handleSelect}
      >
        {node.children && node.children.length > 0 ? (
          <button 
            onClick={handleToggle}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <div className="w-6 h-6 mr-2"></div>
        )}
        
        <span className="flex-grow text-sm font-medium">{node.name}</span>
        
        {node.count !== undefined && (
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {node.count}
          </span>
        )}
      </div>
      
      {expanded && node.children && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to build tree from concept nodes
export const buildConceptNodeTree = (
  systems: string[],
  conditions: { condition: string; competencies: Array<{id: string; name: string}> }[],
  presentations: string[],
  selectedConditions: string[] = [],
  selectedPresentations: string[] = [],
  selectedCompetencies: string[] = []
): TreeNode => {
  // Create root node
  const root: TreeNode = {
    id: 'root',
    name: 'All Systems',
    type: 'system',
    children: []
  };
  
  // Add system nodes
  systems.forEach(system => {
    const systemNode: TreeNode = {
      id: `system-${system}`,
      name: system,
      type: 'system',
      children: []
    };
    
    // Add condition nodes for this system
    conditions.forEach(conditionData => {
      const condition = conditionData.condition;
      const isConditionSelected = selectedConditions.includes(condition);
      
      const conditionNode: TreeNode = {
        id: `condition-${condition}`,
        name: condition,
        type: 'condition',
        selected: isConditionSelected,
        children: []
      };
      
      // Add presentation nodes for this condition
      const relevantPresentations = presentations.filter(p => 
        // In a real implementation, you'd filter by presentations that belong to this condition
        // For now, we'll just include all presentations
        true
      );
      
      relevantPresentations.forEach(presentation => {
        const isPresentationSelected = selectedPresentations.includes(presentation);
        
        const presentationNode: TreeNode = {
          id: `presentation-${presentation}`,
          name: presentation,
          type: 'presentation',
          selected: isPresentationSelected,
          children: []
        };
        
        // Add competency nodes for this presentation
        conditionData.competencies.forEach(competency => {
          const isCompetencySelected = selectedCompetencies.includes(competency.id);
          
          const competencyNode: TreeNode = {
            id: `competency-${competency.id}`,
            name: competency.name,
            type: 'competency',
            selected: isCompetencySelected,
            // Competencies are leaf nodes, so no children
          };
          
          presentationNode.children?.push(competencyNode);
        });
        
        conditionNode.children?.push(presentationNode);
      });
      
      systemNode.children?.push(conditionNode);
    });
    
    root.children?.push(systemNode);
  });
  
  return root;
};
