import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Reef, PolyP } from '../shell-core/types';
import { motion, AnimatePresence } from 'motion/react';
import { Network, ArrowLeft, X, ExternalLink, Activity, Info, Search, Filter } from 'lucide-react';

interface SystemicGraphProps {
  reef: Reef;
  onNavigate: (view: any, id?: string) => void;
  theme: 'light' | 'dark';
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  sig: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

const CATEGORY_COLORS: Record<string, string> = {
  concept: '#E63946', // Lobster
  system: '#17a2b8',  // Info Blue
  entity: '#10b981',  // Emerald
  insight: '#6366f1', // Indigo
  project: '#f43f5e', // Rose
  meeting: '#0ea5e9', // Sky
  reference: '#84cc16' // Lime
};

export const SystemicGraph: React.FC<SystemicGraphProps> = ({ reef, onNavigate, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodeRef = useRef<d3.Selection<any, Node, any, any> | null>(null);
  const linkRef = useRef<d3.Selection<any, Link, any, any> | null>(null);
  const adjListRef = useRef<Record<string, Set<string>>>({});

  const selectedNode = useMemo(() => selectedNodeId ? reef[selectedNodeId] : null, [selectedNodeId, reef]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    svg.on('click', () => {
      setSelectedNodeId(null);
    });

    // Background Technical Grid
    const grid = g.append('g').attr('class', 'grid-layer');
    const gridStep = 50;
    const gridBound = 5000;
    
    for (let x = -gridBound; x < gridBound; x += gridStep) {
      grid.append('line')
        .attr('x1', x).attr('y1', -gridBound)
        .attr('x2', x).attr('y2', gridBound)
        .attr('stroke', theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')
        .attr('stroke-width', 1);
    }
    
    for (let y = -gridBound; y < gridBound; y += gridStep) {
      grid.append('line')
        .attr('x1', -gridBound).attr('y1', y)
        .attr('x2', gridBound).attr('y2', y)
        .attr('stroke', theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')
        .attr('stroke-width', 1);
    }

    const reefArray = Object.values(reef) as PolyP[];
    const nodes: Node[] = reefArray.map(p => ({ 
      id: p.id, 
      title: p.title, 
      type: p.type,
      sig: p.confidence || (p.type === 'system' ? 1.0 : 0.8)
    }));
    
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

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius(d => (d.sig * 32) + 20));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', theme === 'dark' ? '#2D2D2F' : '#E5E7EB')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('class', 'transition-all duration-300');
    
    linkRef.current = link as any;

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on('drag', (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on('end', (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; }) as any);

    nodeRef.current = node as any;

    node.append('circle')
      .attr('r', d => Math.max(12, d.sig * 30))
      .attr('fill', d => CATEGORY_COLORS[d.type] || '#9ca3af')
      .attr('stroke', theme === 'dark' ? '#0F0F10' : '#FFFFFF')
      .attr('stroke-width', 3)
      .attr('class', 'node-circle transition-all duration-500');

    const text = node.append('text')
      .text(d => `[${d.type.substring(0, 3).toUpperCase()}] ${d.title.toUpperCase()}`)
      .attr('dx', d => Math.max(16, (d.sig * 30) + 12))
      .attr('dy', 4)
      .style('font-family', '"JetBrains Mono", monospace')
      .style('font-size', '10px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.05em')
      .style('fill', theme === 'dark' ? '#9CA3AF' : '#4B5563')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .attr('class', 'node-label transition-all duration-300');

    node.on('mouseover', (event, d) => setHoveredNodeId(d.id))
        .on('mouseout', () => setHoveredNodeId(null))
        .on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNodeId(d.id);
    });

    simulation.on('tick', () => {
      link.attr('x1', d => (d.source as any).x).attr('y1', d => (d.source as any).y)
          .attr('x2', d => (d.target as any).x).attr('y2', d => (d.target as any).y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [reef, dimensions, theme]);

  // Handle Highlighting
  useEffect(() => {
    if (!nodeRef.current || !linkRef.current) return;

    const node = nodeRef.current;
    const link = linkRef.current;
    const text = node.selectAll('text');
    const adjList = adjListRef.current;

    if (selectedNodeId) {
      const neighbors = adjList[selectedNodeId] || new Set([selectedNodeId]);
      
      node.style('opacity', (n: any) => neighbors.has(n.id) ? 1 : 0.15);
      
      node.selectAll('circle')
          .style('fill', (n: any) => n.id === selectedNodeId ? '#E63946' : (CATEGORY_COLORS[n.type] || '#9ca3af'))
          .style('stroke', (n: any) => n.id === selectedNodeId ? '#F59E0B' : (theme === 'dark' ? '#0F0F10' : '#FFFFFF'))
          .style('stroke-width', (n: any) => n.id === selectedNodeId ? 6 : 3)
          .attr('class', (n: any) => n.id === selectedNodeId ? 'node-circle animate-pulse-slow' : 'node-circle');
      
      text.style('opacity', (n: any) => n.id === selectedNodeId ? 1 : (neighbors.has(n.id) ? 0.3 : 0))
          .style('fill', (n: any) => n.id === selectedNodeId ? '#F59E0B' : (theme === 'dark' ? '#9CA3AF' : '#4B5563'))
          .style('font-weight', (n: any) => n.id === selectedNodeId ? '900' : '700');
      
      link.style('stroke', (l: any) => {
        const s = l.source.id || l.source;
        const t = l.target.id || l.target;
        return (s === selectedNodeId || t === selectedNodeId) ? '#E63946' : (theme === 'dark' ? '#2D2D2F' : '#E5E7EB');
      }).style('stroke-opacity', (l: any) => {
        const s = l.source.id || l.source;
        const t = l.target.id || l.target;
        return (s === selectedNodeId || t === selectedNodeId) ? 1 : 0.05;
      }).style('stroke-width', (l: any) => {
        const s = l.source.id || l.source;
        const t = l.target.id || l.target;
        return (s === selectedNodeId || t === selectedNodeId) ? 3 : 1.5;
      }).style('stroke-dasharray', (l: any) => {
        const s = l.source.id || l.source;
        const t = l.target.id || l.target;
        return (s === selectedNodeId || t === selectedNodeId) ? 'none' : '4,4';
      });
    } else if (hoveredNodeId) {
      node.style('opacity', 1);
      node.selectAll('circle')
          .style('fill', (n: any) => CATEGORY_COLORS[n.type] || '#9ca3af')
          .style('stroke', (theme === 'dark' ? '#0F0F10' : '#FFFFFF'))
          .style('stroke-width', 3)
          .attr('class', 'node-circle');
      text.style('opacity', (n: any) => n.id === hoveredNodeId ? 1 : 0)
          .style('fill', theme === 'dark' ? '#9CA3AF' : '#4B5563')
          .style('font-weight', '700');
      link.style('stroke', (theme === 'dark' ? '#2D2D2F' : '#E5E7EB'))
          .style('stroke-opacity', 0.6)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', 'none');
    } else {
      node.style('opacity', 1);
      node.selectAll('circle')
          .style('fill', (n: any) => CATEGORY_COLORS[n.type] || '#9ca3af')
          .style('stroke', (theme === 'dark' ? '#0F0F10' : '#FFFFFF'))
          .style('stroke-width', 3)
          .attr('class', 'node-circle');
      text.style('opacity', 0)
          .style('fill', theme === 'dark' ? '#9CA3AF' : '#4B5563')
          .style('font-weight', '700');
      link.style('stroke', (theme === 'dark' ? '#2D2D2F' : '#E5E7EB'))
          .style('stroke-opacity', 0.6)
          .style('stroke-width', 1.5)
          .style('stroke-dasharray', 'none');
    }
  }, [selectedNodeId, hoveredNodeId]);

  return (
    <div className="h-screen w-screen bg-bg-primary relative overflow-hidden flex flex-col">
      {/* Top Navigation Pill */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-card-bg/90 backdrop-blur-md border border-border-primary shadow-2xl rounded-full p-1 pl-6 transition-all">
        <div className="flex items-center gap-4 text-[10px] font-black text-text-primary/40 tracking-widest uppercase font-mono">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-lobster animate-pulse"></div> 
              {Object.keys(reef).length} Nodes
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <Activity size={12} className="text-info" /> Immersive Topology
            </span>
        </div>
        <div className="w-px h-4 bg-border-primary"></div>
        <button 
          onClick={() => onNavigate('index')}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-text-primary hover:text-lobster transition-colors rounded-full"
        >
          <ArrowLeft size={14} /> Back to Habitat
        </button>
      </div>

      {/* Main Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <svg ref={svgRef} className="w-full h-full outline-none" />
      </div>

      {/* Node Details Side Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-24 right-8 w-96 z-50 bg-card-bg/95 backdrop-blur-xl border border-border-primary shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl flex flex-col max-h-[calc(100vh-8rem)] overflow-hidden"
          >
            <div className="p-8 border-b border-border-primary flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-lobster uppercase tracking-[0.2em] mb-2 block">{selectedNode.type}</span>
                <h2 className="text-2xl font-black text-text-primary leading-tight">{selectedNode.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedNodeId(null)}
                className="p-2 hover:bg-border-primary/30 rounded-xl text-text-primary/40 hover:text-text-primary transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex flex-col gap-1 min-w-[120px] mb-6">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-text-primary/30">
                  <div className="flex items-center gap-1.5"><Info size={10} /> Reef Signature</div>
                  <span className="text-lobster">{(selectedNode.confidence || 1.0) * 100}%</span>
                </div>
                <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                  <div className="h-full bg-lobster" style={{ width: `${(selectedNode.confidence || 1.0) * 100}%` }} />
                </div>
              </div>

              <p className="text-sm text-text-primary/70 leading-relaxed mb-8 italic border-l-2 border-lobster/30 pl-4">
                {selectedNode.content.replace(/[#*`]/g, '').substring(0, 300)}...
              </p>
              
              <button 
                onClick={() => onNavigate('article', selectedNode.id)}
                className="w-full py-4 btn-dynamic-main text-center rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-8"
              >
                Open Article <ExternalLink size={14} />
              </button>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-[0.2em] flex items-center justify-between">
                  <span>Topology Connections</span>
                  <span className="bg-border-primary/50 px-2 py-0.5 rounded text-[10px]">{selectedNode.links?.length || 0}</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {selectedNode.links?.filter(l => reef[l]).map(linkId => (
                    <button 
                      key={linkId}
                      onClick={() => setSelectedNodeId(linkId)}
                      className="flex items-center gap-3 text-xs font-bold text-text-primary/60 hover:text-lobster hover:bg-border-primary/20 transition-all p-3 rounded-xl border border-transparent hover:border-border-primary/50"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[reef[linkId].type] || '#9ca3af' }}></div>
                      {reef[linkId].title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend (Bottom Left) */}
      <div className="fixed bottom-8 left-8 z-50 bg-card-bg/80 backdrop-blur p-5 rounded-2xl border border-border-primary shadow-xl pointer-events-none">
        <div className="text-[9px] font-black text-text-primary/30 uppercase tracking-widest mb-4 border-b border-border-primary pb-2">Reef Legend</div>
        <div className="space-y-3">
          {Object.entries(CATEGORY_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-3 text-[10px] font-bold text-text-primary/60 uppercase tracking-wider">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }}></div> {type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
