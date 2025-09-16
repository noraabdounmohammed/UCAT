import React, { useState, useEffect, useRef } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { Award, BookOpen, Brain } from 'lucide-react';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  concept_id: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface Dimensions {
  width: number;
  height: number;
}

export const ConceptGraphView: React.FC = () => {
  const { filteredConcepts, onPractice } = useConceptStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  // Initialize graph data
  useEffect(() => {
    if (filteredConcepts.length === 0) return;
    
    const graphNodes: GraphNode[] = filteredConcepts.map((concept, index) => {
      const angle = (index / filteredConcepts.length) * 2 * Math.PI;
      const radius = Math.min(dimensions.width, dimensions.height) * 0.4;
      
      return {
        id: concept.concept_id,
        x: dimensions.width / 2 + Math.cos(angle) * radius * Math.random(),
        y: dimensions.height / 2 + Math.sin(angle) * radius * Math.random(),
        vx: 0,
        vy: 0,
        radius: 20,
        color: getNodeColor(concept.mastery_data?.mastery_level || 0),
        label: concept.title,
        concept_id: concept.concept_id
      };
    });
    
    const graphLinks: GraphLink[] = [];
    
    filteredConcepts.forEach(concept => {
      if (concept.relations) {
        concept.relations.forEach(relation => {
          // Check if target concept exists in our filtered list
          const targetExists = filteredConcepts.some(c => c.concept_id === relation.target_id);
          
          if (targetExists) {
            graphLinks.push({
              source: concept.concept_id,
              target: relation.target_id,
              type: relation.type
            });
          }
        });
      }
    });
    
    setNodes(graphNodes);
    setLinks(graphLinks);
  }, [filteredConcepts, dimensions.width, dimensions.height]);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    
    let animationFrameId: number;
    let iteration = 0;
    let localNodes = [...nodes];
    
    const simulate = () => {
      if (iteration > 200) return;
      
      const updatedNodes = [...localNodes];
      
      // Apply forces
      updatedNodes.forEach(node => {
        // Gravity towards center
        const dx = dimensions.width / 2 - node.x;
        const dy = dimensions.height / 2 - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const force = Math.min(0.01, 1 / distance);
          node.vx += dx * force;
          node.vy += dy * force;
        }
        
        // Node-node repulsion
        updatedNodes.forEach(otherNode => {
          if (node === otherNode) return;
          
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0 && distance < 150) {
            const force = 1 / (distance * distance);
            node.vx += dx * force * 0.2;
            node.vy += dy * force * 0.2;
          }
        });
        
        // Link forces
        links.forEach(link => {
          if (link.source === node.id || link.target === node.id) {
            const targetNode = link.source === node.id 
              ? updatedNodes.find(n => n.id === link.target)
              : updatedNodes.find(n => n.id === link.source);
            
            if (targetNode) {
              const dx = node.x - targetNode.x;
              const dy = node.y - targetNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0) {
                const force = (distance - 100) / distance * 0.05;
                node.vx -= dx * force;
                node.vy -= dy * force;
              }
            }
          }
        });
        
        // Apply velocity
        if (!(isDragging && draggedNode === node.id)) {
          node.x += node.vx;
          node.y += node.vy;
          
          // Damping
          node.vx *= 0.9;
          node.vy *= 0.9;
        } else if (draggedNode === node.id && mousePos) {
          node.x = mousePos.x;
          node.y = mousePos.y;
          node.vx = 0;
          node.vy = 0;
        }
        
        // Boundary constraints
        const padding = 50;
        if (node.x < padding) {
          node.x = padding;
          node.vx = -node.vx * 0.5;
        }
        if (node.x > dimensions.width - padding) {
          node.x = dimensions.width - padding;
          node.vx = -node.vx * 0.5;
        }
        if (node.y < padding) {
          node.y = padding;
          node.vy = -node.vy * 0.5;
        }
        if (node.y > dimensions.height - padding) {
          node.y = dimensions.height - padding;
          node.vy = -node.vy * 0.5;
        }
      });
      
      // Only update state occasionally to avoid infinite loops
      if (iteration % 5 === 0 || iteration === 200) {
        setNodes(updatedNodes);
      }
      
      localNodes = updatedNodes;
      iteration++;
      
      if (iteration <= 200) {
        animationFrameId = requestAnimationFrame(simulate);
      }
    };
    
    simulate();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps
  
  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw links
    ctx.lineWidth = 1;
    links.forEach(link => {
      const sourceNode = nodes.find(node => node.id === link.source);
      const targetNode = nodes.find(node => node.id === link.target);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        // Set link color based on type
        switch (link.type) {
          case 'prerequisite_of':
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'; // Blue
            break;
          case 'part_of':
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'; // Green
            break;
          case 'contrasts_with':
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Red
            break;
          case 'analogous_to':
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)'; // Purple
            break;
          case 'misconception_of':
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'; // Amber
            break;
          default:
            ctx.strokeStyle = 'rgba(156, 163, 175, 0.6)'; // Gray
        }
        
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Truncate label if too long
      let label = node.label;
      if (label.length > 15) {
        label = label.substring(0, 12) + '...';
      }
      
      ctx.fillText(label, node.x, node.y);
    });
    
    // Draw hovered node info
    if (hoveredNode) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(hoveredNode.x + 10, hoveredNode.y + 10, 200, 60);
      
      ctx.font = '14px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(hoveredNode.label, hoveredNode.x + 20, hoveredNode.y + 20);
      
      // Find related concepts
      const relatedLinks = links.filter(link => 
        link.source === hoveredNode.id || link.target === hoveredNode.id
      );
      
      ctx.font = '12px Arial';
      ctx.fillText(`Related: ${relatedLinks.length}`, hoveredNode.x + 20, hoveredNode.y + 40);
    }
  }, [nodes, links, dimensions, hoveredNode]);
  
  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    // Check if hovering over a node
    const hovered = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    setHoveredNode(hovered || null);
    
    // Update dragged node position
    if (isDragging && draggedNode) {
      // No need to update state here as it's handled in the simulation
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    if (clickedNode) {
      setIsDragging(true);
      setDraggedNode(clickedNode.id);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };
  
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if double-clicking on a node
    const clickedNode = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius;
    });
    
    if (clickedNode) {
      onPractice(clickedNode.concept_id);
    }
  };
  
  // Helper function to get node color based on mastery level
  const getNodeColor = (masteryLevel: number) => {
    switch (masteryLevel) {
      case 0: return '#E5E7EB'; // Gray - Not started
      case 1: return '#FECACA'; // Red - Novice
      case 2: return '#FDE68A'; // Yellow - Developing
      case 3: return '#A7F3D0'; // Green - Proficient
      case 4: return '#93C5FD'; // Blue - Expert
      default: return '#E5E7EB';
    }
  };
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[500px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md text-xs">
        <p>Double-click a node to practice</p>
        <p>Drag nodes to rearrange</p>
      </div>
    </div>
  );
};

// Concept list item component
interface ConceptListItemProps {
  concept: any;
  onPractice: (id: string) => void;
}

export const ConceptListItem: React.FC<ConceptListItemProps> = ({ concept, onPractice }) => {
  // Helper function to get mastery color
  const getMasteryColor = (level: number) => {
    switch (level) {
      case 0: return 'border-gray-200 dark:border-gray-700';
      case 1: return 'border-red-200 dark:border-red-900';
      case 2: return 'border-yellow-200 dark:border-yellow-900';
      case 3: return 'border-green-200 dark:border-green-900';
      case 4: return 'border-blue-200 dark:border-blue-900';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };
  
  // Helper function to get mastery name
  const getMasteryName = (level: number) => {
    switch (level) {
      case 0: return 'Not Started';
      case 1: return 'Novice';
      case 2: return 'Developing';
      case 3: return 'Competent';
      case 4: return 'Mastered';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className={`rounded-lg border ${getMasteryColor(concept.mastery_data.mastery_level)} p-3 hover:shadow-md transition-shadow flex justify-between items-center`}>
      <div className="flex-grow">
        <div className="flex items-center">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mr-2">{concept.title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {concept.difficulty}
          </span>
        </div>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          <span className="mr-2">{concept.dimensions?.exam_specific?.ukmla?.systems?.join(', ') || 'Unknown'}</span>
          <Brain className="h-3.5 w-3.5 mr-1" />
          <span className="truncate max-w-[150px]">{concept.dimensions?.exam_specific?.ukmla?.conditions?.[0] || 'Unknown'}</span>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="flex items-center mr-4">
          <Award className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {getMasteryName(concept.mastery_data.mastery_level)}
          </span>
        </div>
        
        <button
          className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          onClick={() => onPractice(concept.concept_id)}
        >
          Practice
        </button>
      </div>
    </div>
  );
};
