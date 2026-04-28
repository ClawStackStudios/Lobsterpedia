import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Reef, PolyP } from '../shell-core/types';
import { motion, AnimatePresence } from 'motion/react';
import { Network, Code, Activity, Copy, CheckCircle2 } from 'lucide-react';

interface GraphViewProps {
  reef: Reef;
  onNavigate: (view: any, id?: string) => void;
  theme: 'light' | 'dark';
  hoveredNodeId?: string | null;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export const GraphView: React.FC<GraphViewProps> = ({ reef, onNavigate, theme, hoveredNodeId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [copied, setCopied] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number, y: number, id: string } | null>(null);

  // D3 selections for updates without simulation resets
  const nodeRef = useRef<d3.Selection<any, Node, any, any> | null>(null);
  const linkRef = useRef<d3.Selection<any, Link, any, any> | null>(null);
  const circleRef = useRef<d3.Selection<any, any, any, any> | null>(null);
  const textRef = useRef<d3.Selection<any, any, any, any> | null>(null);
  const adjListRef = useRef<Record<string, Set<string>>>({});
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Generate LLM Graph Encoding for context injection
  const encodingText = useMemo(() => {
    const nodes = Object.values(reef) as PolyP[];
    const nodeDict = nodes.map(n => `- ${n.id}: "${n.title}" (${n.type})`).join('\n');
    const edgeList = nodes.flatMap(n => 
      (n.links || []).filter(l => reef[l]).map(l => `${n.id} -> ${l}`)
    ).join('\n');
    
    return `[NODE_DICTIONARY]\n${nodeDict}\n\n[EDGE_LIST]\n${edgeList}`;
  }, [reef]);

  const handleCopyEncoding = () => {
    navigator.clipboard.writeText(encodingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observeExoskeleton = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observeExoskeleton.observe(containerRef.current);
    return () => observeExoskeleton.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    svg.on('click', () => {
      setFocusedNodeId(null);
    });

    const reefArray = Object.values(reef) as PolyP[];
    const nodes: Node[] = reefArray.map(p => ({ id: p.id, title: p.title, type: p.type }));
    const links: Link[] = [];
    const adjList: Record<string, Set<string>> = {};

    reefArray.forEach(p => {
      adjList[p.id] = new Set([p.id]);
      p.links?.forEach(linkId => {
        if (reef[linkId]) {
          links.push({ source: p.id, target: linkId });
          adjList[p.id].add(linkId);
          if (!adjList[linkId]) adjList[linkId] = new Set([linkId]);
          adjList[linkId].add(p.id);
        }
      });
    });

    adjListRef.current = adjList;
    zoomRef.current = zoom;

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border-primary)')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('class', 'transition-all duration-300');
    
    linkRef.current = link as any;

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', pinchStart)
        .on('drag', pinchDrag)
        .on('end', pinchEnd) as any);

    nodeRef.current = node as any;

    const circle = node.append('circle')
      .attr('r', d => d.type === 'system' ? 12 : 20)
      .attr('fill', d => d.type === 'system' ? '#17a2b8' : '#e63946')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('class', 'transition-all duration-300 shadow-md');
    
    circleRef.current = circle as any;

    const text = node.append('text')
      .text(d => d.title)
      .attr('x', d => d.type === 'system' ? 18 : 28)
      .attr('y', 4)
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('fill', 'var(--text-primary)')
      .style('pointer-events', 'none')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.05em')
      .attr('class', 'transition-all duration-300');
    
    textRef.current = text as any;

    // Interactivity: Highlight and Mute
    node.on('mouseover', (event, d) => {
      setLocalHoveredId(d.id);
      setTooltipData({ x: event.pageX, y: event.pageY, id: d.id });
      if (focusedNodeId || hoveredNodeId) return; // Ignore style updates if we have active highlight layers
      const neighbors = adjList[d.id];
      
      node.style('opacity', n => neighbors.has(n.id) ? 1 : 0.1);
      circle.attr('stroke', n => n.id === d.id ? '#1e293b' : '#fff')
            .attr('stroke-width', n => n.id === d.id ? 5 : 3);
      
      link.style('stroke-opacity', l => {
        const s = (l.source as any).id || l.source;
        const t = (l.target as any).id || l.target;
        return (s === d.id || t === d.id) ? 1 : 0.05;
      }).style('stroke', l => {
        const s = (l.source as any).id || l.source;
        const t = (l.target as any).id || l.target;
        return (s === d.id || t === d.id) ? '#e63946' : 'var(--border-primary)';
      });

      text.style('opacity', n => neighbors.has(n.id) ? 1 : 0.1)
          .style('font-weight', n => n.id === d.id ? '900' : '700');
    });

    node.on('mousemove', (event) => {
      setTooltipData(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
    });

    node.on('mouseout', () => {
      setLocalHoveredId(null);
      setTooltipData(null);
      if (focusedNodeId || hoveredNodeId) return;
      node.style('opacity', 1);
      circle.attr('stroke', '#fff').attr('stroke-width', 3);
      link.style('stroke-opacity', 0.4).style('stroke', 'var(--border-primary)');
      text.style('opacity', 1).style('font-weight', '700');
    });

    node.on('click', (event, d) => {
      event.stopPropagation();
      if (focusedNodeId === d.id) {
        onNavigate('article', d.id);
      } else {
        setFocusedNodeId(d.id);
      }
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function pinchStart(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function pinchDrag(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function pinchEnd(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [reef, dimensions, onNavigate]);

  // Handle graph focusing and focal zoom when focusedNodeId or hoveredNodeId changes
  useEffect(() => {
    if (!svgRef.current || !nodeRef.current || !linkRef.current || !circleRef.current || !textRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const activeHighlightId = hoveredNodeId || focusedNodeId;
    const neighbors = activeHighlightId ? adjListRef.current[activeHighlightId] : null;

    if (activeHighlightId) {
      if (focusedNodeId) {
        // Find the node datum to get its coordinates
        const targetNode = nodeRef.current.data().find(n => n.id === focusedNodeId);
        
        if (targetNode && zoomRef.current) {
          const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(1.5)
            .translate(-(targetNode.x || 0), -(targetNode.y || 0));

          svg.transition()
            .duration(750)
            .ease(d3.easeCubicInOut)
            .call(zoomRef.current.transform, transform);
        }
      }

      // Update Styles
      nodeRef.current.transition().duration(200).style('opacity', n => neighbors?.has(n.id) ? 1 : 0.05);
      circleRef.current.transition().duration(200)
        .attr('stroke', n => n.id === activeHighlightId ? '#00ffc3' : '#fff')
        .attr('stroke-width', n => n.id === activeHighlightId ? 8 : 3)
        .attr('r', n => {
           const base = n.type === 'system' ? 12 : 20;
           return n.id === activeHighlightId ? base + 8 : base;
        });

      linkRef.current.transition().duration(200)
        .style('stroke-opacity', l => {
          const s = (l.source as any).id || l.source;
          const t = (l.target as any).id || l.target;
          return (s === activeHighlightId || t === activeHighlightId) ? 1 : 0.02;
        })
        .style('stroke', l => {
          const s = (l.source as any).id || l.source;
          const t = (l.target as any).id || l.target;
          return (s === activeHighlightId || t === activeHighlightId) ? '#00ffc3' : 'var(--border-primary)';
        });

      textRef.current.transition().duration(200)
        .style('opacity', n => neighbors?.has(n.id) ? 1 : 0.05)
        .style('font-weight', n => n.id === activeHighlightId ? '900' : '700')
        .attr('x', n => {
           const base = n.type === 'system' ? 18 : 28;
           return n.id === activeHighlightId ? base + 10 : base;
        });
    } else {
      // Reset View
      if (zoomRef.current && !hoveredNodeId) {
        svg.transition()
          .duration(750)
          .call(zoomRef.current.transform, d3.zoomIdentity);
      }

      nodeRef.current.transition().duration(200).style('opacity', 1);
      circleRef.current.transition().duration(200)
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        .attr('r', d => d.type === 'system' ? 12 : 20);
      
      linkRef.current.transition().duration(200)
        .style('stroke-opacity', 0.4)
        .style('stroke', 'var(--border-primary)');

      textRef.current.transition().duration(200)
        .style('opacity', 1)
        .style('font-weight', '700')
        .attr('x', d => d.type === 'system' ? 18 : 28);
    }
  }, [focusedNodeId, hoveredNodeId, dimensions]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col p-8 bg-bg-primary overflow-hidden"
    >
      <div className="mb-8 border-b border-border-primary pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            <Network className="text-lobster" size={32}/> reef_topology.md
          </h1>
          <p className="text-text-primary/50 font-medium mt-1">Dual-representation: Spatial for humans, textual for agents.</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* Spatial Discovery */}
        <div className="flex-[2] flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-lobster" /> Human Cognition Layer
            </h3>
          </div>
          <div ref={containerRef} className="flex-1 bg-card-bg rounded-2xl border border-border-primary relative shadow-inner overflow-hidden">
             <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" />
             
             {/* Hover Preview Tooltip */}
             <AnimatePresence>
                {tooltipData && reef[tooltipData.id] && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ 
                      position: 'fixed', 
                      left: tooltipData.x + 20, 
                      top: tooltipData.y + 20,
                      zIndex: 1000,
                      pointerEvents: 'none'
                    }}
                    className="w-72 bg-card-bg border-border-primary border shadow-2xl rounded-2xl overflow-hidden p-5 backdrop-blur-md"
                  >
                     <div className="flex items-center justify-between mb-3 border-b border-border-primary pb-2">
                        <span className="text-[10px] font-black text-lobster uppercase tracking-widest">{reef[tooltipData.id].type}</span>
                        <span className="text-[8px] font-mono text-text-primary/30 uppercase">{tooltipData.id}</span>
                     </div>
                     <h4 className="text-sm font-black text-text-primary mb-2 leading-tight">{reef[tooltipData.id].title}</h4>
                     <p className="text-[11px] text-text-primary/60 line-clamp-3 leading-relaxed mb-3 italic">
                        {reef[tooltipData.id].content.replace(/[#*`]/g, '').substring(0, 150)}...
                     </p>
                     <div className="flex flex-wrap gap-1">
                        {reef[tooltipData.id].tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[8px] font-black text-text-primary/20 uppercase tracking-tighter">#{tag}</span>
                        ))}
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>

             <div className="absolute bottom-6 left-6 bg-card-bg/90 backdrop-blur p-4 rounded-xl border border-border-primary text-[10px] font-black text-text-primary/40 space-y-3 pointer-events-none uppercase tracking-widest shadow-lg font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-lobster ring-2 ring-lobster/20" /> Concept PolyP
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#17a2b8] ring-2 ring-[#17a2b8]/20" /> System Hub
                </div>
                <div className="pt-2 border-t border-border-primary text-[8px] opacity-60">
                   Scroll to zoom | Hover to trace connections
                </div>
             </div>
          </div>
        </div>

        {/* Semantic Encoding */}
        <div className="flex-1 min-w-[320px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest flex items-center gap-2">
              <Code size={14} className="text-blue-500" /> LLM Context Encoding
            </h3>
            <button 
              onClick={handleCopyEncoding}
              className="p-1.5 hover:bg-bg-primary rounded transition-colors text-text-primary/40 hover:text-lobster flex items-center gap-2"
            >
              {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
              <span className="text-[10px] font-bold uppercase">{copied ? 'In Clipboard' : 'Copy'}</span>
            </button>
          </div>
          <div className="flex-1 bg-habitat-dark rounded-2xl p-6 shadow-xl border border-border-primary text-left flex flex-col">
             <div className="mb-4">
                <p className="text-[10px] text-gray-400 leading-relaxed font-medium uppercase tracking-wider mb-2 border-b border-white/10 pb-2">
                   Topology Synthesis
                </p>
                <p className="text-[9px] text-gray-500 italic">
                   Mirroring Google's "Talk Like a Graph" research, this textual representation allows LLMs to reason about global wiki structures via edge-list injection.
                </p>
             </div>
             <div className="flex-1 bg-black/40 rounded-xl p-4 overflow-y-auto custom-scrollbar border border-white/5 font-mono text-[10px] text-[#00ffc3]/80 leading-relaxed whitespace-pre-wrap">
                {encodingText}
             </div>
             <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Context State: Synced</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
