import React, { useEffect, useRef, useState } from 'react';

// Define the graph node and edge structures
interface GraphNode {
  id: string;
  label: string;
  type: 'system' | 'condition' | 'presentation' | 'competency';
  selected?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ConceptNodeGraphViewProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeSelect?: (node: GraphNode) => void;
}

export const ConceptNodeGraphView: React.FC<ConceptNodeGraphViewProps> = ({
  data,
  width = 600,
  height = 400,
  onNodeSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<(GraphNode & { x: number; y: number })[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Initialize the graph layout
  useEffect(() => {
    if (!data.nodes.length) return;
    
    // Simple force-directed layout
    const initialNodes = data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.35;
      
      return {
        ...node,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      };
    });
    
    setNodes(initialNodes);
    setEdges(data.edges);
    
    // Run simple force simulation
    let iteration = 0;
    const maxIterations = 100;
    
    const simulationStep = () => {
      if (iteration >= maxIterations) return;
      
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        
        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          // Repulsive force between nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue;
            
            const dx = newNodes[i].x - newNodes[j].x;
            const dy = newNodes[i].y - newNodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) continue;
            
            // Repulsion force (inverse square)
            const force = 500 / (distance * distance);
            const forceX = dx / distance * force;
            const forceY = dy / distance * force;
            
            newNodes[i].x += forceX;
            newNodes[i].y += forceY;
          }
          
          // Attractive force for connected nodes
          data.edges.forEach(edge => {
            if (edge.source === newNodes[i].id) {
              const target = newNodes.find(n => n.id === edge.target);
              if (target) {
                const dx = target.x - newNodes[i].x;
                const dy = target.y - newNodes[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance === 0) return;
                
                // Attraction force (linear)
                const force = distance * 0.05;
                const forceX = dx / distance * force;
                const forceY = dy / distance * force;
                
                newNodes[i].x += forceX;
                newNodes[i].y += forceY;
              }
            }
          });
          
          // Center gravity
          const centerX = width / 2;
          const centerY = height / 2;
          const dx = centerX - newNodes[i].x;
          const dy = centerY - newNodes[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance === 0) continue;
          
          // Gravity force (linear)
          const force = distance * 0.01;
          const forceX = dx / distance * force;
          const forceY = dy / distance * force;
          
          newNodes[i].x += forceX;
          newNodes[i].y += forceY;
          
          // Boundary constraints
          const padding = 30;
          newNodes[i].x = Math.max(padding, Math.min(width - padding, newNodes[i].x));
          newNodes[i].y = Math.max(padding, Math.min(height - padding, newNodes[i].y));
        }
        
        return newNodes;
      });
      
      iteration++;
      if (iteration < maxIterations) {
        requestAnimationFrame(simulationStep);
      }
    };
    
    simulationStep();
  }, [data, width, height]);
  
  // Handle node dragging
  const handleMouseDown = (nodeId: string) => {
    setDragging(nodeId);
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    
    const svgPoint = point.matrixTransform(ctm.inverse());
    
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === dragging 
          ? { ...node, x: svgPoint.x, y: svgPoint.y } 
          : node
      )
    );
  };
  
  const handleMouseUp = () => {
    setDragging(null);
  };
  
  // Handle zoom and pan
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(3, transform.scale + delta));
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  };
  
  // Get node color based on type and selection state
  const getNodeColor = (node: GraphNode) => {
    if (node.selected) {
      return '#3b82f6'; // Blue for selected nodes
    }
    
    switch (node.type) {
      case 'system':
        return '#ef4444'; // Red for systems
      case 'condition':
        return '#f59e0b'; // Amber for conditions
      case 'presentation':
        return '#10b981'; // Green for presentations
      case 'competency':
        return '#6366f1'; // Indigo for competencies
      default:
        return '#9ca3af'; // Gray default
    }
  };
  
  // Get node radius based on type
  const getNodeRadius = (node: GraphNode) => {
    switch (node.type) {
      case 'system':
        return 12;
      case 'condition':
        return 10;
      case 'presentation':
        return 8;
      case 'competency':
        return 6;
      default:
        return 8;
    }
  };
  
  return (
    <div className="concept-graph-view">
      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          background: 'transparent',
          cursor: dragging ? 'grabbing' : 'default'
        }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Draw edges first so they appear behind nodes */}
          {edges.map(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            
            if (!source || !target) return null;
            
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
            );
          })}
          
          {/* Draw nodes */}
          {nodes.map(node => (
            <g 
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(node.id);
              }}
              onClick={() => onNodeSelect && onNodeSelect(node)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={getNodeRadius(node)}
                fill={getNodeColor(node)}
                stroke={node.selected ? '#2563eb' : '#ffffff'}
                strokeWidth={node.selected ? 2 : 1}
              />
              <title>{node.label}</title>
            </g>
          ))}
        </g>
      </svg>
      
      {/* Legend */}
      <div className="graph-legend flex flex-wrap gap-4 mt-2 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span>System</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
          <span>Condition</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span>Presentation</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-indigo-500 mr-1"></div>
          <span>Competency</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to build graph data from concept nodes
export const buildConceptNodeGraph = (
  systems: string[],
  conditions: { condition: string; competencies: Array<{id: string; name: string}> }[],
  presentations: string[],
  selectedConditions: string[] = [],
  selectedPresentations: string[] = [],
  selectedCompetencies: string[] = []
): GraphData => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Add system nodes
  systems.forEach(system => {
    nodes.push({
      id: `system-${system}`,
      label: system,
      type: 'system'
    });
  });
  
  // Add condition nodes and connect to systems
  conditions.forEach(conditionData => {
    const condition = conditionData.condition;
    const isSelected = selectedConditions.includes(condition);
    
    nodes.push({
      id: `condition-${condition}`,
      label: condition,
      type: 'condition',
      selected: isSelected
    });
    
    // Connect condition to its system (assuming first system for now)
    edges.push({
      source: `system-${systems[0]}`,
      target: `condition-${condition}`,
      type: 'has_condition'
    });
    
    // Add competency nodes and connect to conditions
    conditionData.competencies.forEach(competency => {
      const isCompetencySelected = selectedCompetencies.includes(competency.id);
      
      nodes.push({
        id: `competency-${competency.id}`,
        label: competency.name,
        type: 'competency',
        selected: isCompetencySelected
      });
      
      edges.push({
        source: `condition-${condition}`,
        target: `competency-${competency.id}`,
        type: 'has_competency'
      });
    });
  });
  
  // Add presentation nodes and connect to conditions
  presentations.forEach(presentation => {
    const isPresentationSelected = selectedPresentations.includes(presentation);
    
    nodes.push({
      id: `presentation-${presentation}`,
      label: presentation,
      type: 'presentation',
      selected: isPresentationSelected
    });
    
    // Connect to first condition (in a real implementation, you'd connect to relevant conditions)
    if (conditions.length > 0) {
      edges.push({
        source: `condition-${conditions[0].condition}`,
        target: `presentation-${presentation}`,
        type: 'presents_as'
      });
    }
  });
  
  return { nodes, edges };
};
