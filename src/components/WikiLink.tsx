import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, AlertCircle, Plus } from 'lucide-react';
import { Reef } from '../features/shell-core/types';

export interface WikiLinkProps {
  id: string;
  children?: React.ReactNode;
  pages: Reef;
  onNavigate: (view: any, id?: string) => void;
  onHoverNode?: (id: string | null) => void;
  hoveredLink?: string | null;
  setHoveredLink?: (id: string | null) => void;
  variant?: 'inline' | 'button';
}

export const WikiLink: React.FC<WikiLinkProps> = ({ 
  id, 
  children, 
  pages, 
  onNavigate, 
  onHoverNode, 
  hoveredLink, 
  setHoveredLink,
  variant = 'inline'
}) => {
  const [localHovered, setLocalHovered] = useState(false);
  const targetPage = pages[id];
  const isHovered = hoveredLink !== undefined ? hoveredLink === id : localHovered;

  const handleMouseEnter = () => {
    if (setHoveredLink) setHoveredLink(id);
    else setLocalHovered(true);
    onHoverNode?.(id);
  };

  const handleMouseLeave = () => {
    if (setHoveredLink) setHoveredLink(null);
    else setLocalHovered(false);
    onHoverNode?.(null);
  };

  const buttonClass = variant === 'button' 
    ? `border px-4 py-2 rounded text-sm font-semibold cursor-pointer transition-all shadow-sm flex items-center gap-2 ${
        isHovered 
          ? 'bg-lobster border-lobster text-white shadow-md transform scale-105' 
          : 'bg-card-bg border-border-primary text-text-primary/70 hover:border-lobster'
      }`
    : `font-semibold transition-all px-1 rounded flex items-center gap-1 ${
        isHovered ? 'bg-lobster text-white shadow-sm' : 'text-lobster hover:bg-lobster/10'
      }`;

  if (targetPage) {
    return (
      <span 
        className="relative inline-block group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button 
          onClick={() => onNavigate('article', id)} 
          className={buttonClass}
          style={{ cursor: 'pointer' }}
        >
          {children || (variant === 'button' ? `${id}.md` : targetPage.title)}
          <ArrowRight size={variant === 'button' ? 14 : 10} className={`text-current transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        </button>
        
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-card-bg border border-border-primary shadow-2xl rounded-xl z-[100] text-left pointer-events-none origin-bottom"
            >
              <h4 className="font-extrabold text-sm text-lobster mb-1 underline decoration-2 underline-offset-4">{targetPage.title}</h4>
              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-bg-primary text-text-primary/70 mb-2 border border-border-primary/50">
                {targetPage.type}
              </span>
              <p className="text-xs text-text-primary/70 line-clamp-3 leading-relaxed">
                {targetPage.content.replace(/[#*`]/g, '').substring(0, 150)}...
              </p>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card-bg border-b border-r border-border-primary transform rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    );
  }

  return (
    <button 
      onClick={() => onNavigate('ingest', id)}
      className="text-red-500 font-bold border-b border-dashed border-red-500/30 hover:bg-red-500/10 px-1 rounded inline-flex items-center gap-1 group"
      title="This page does not exist yet. Click to create it."
    >
      <AlertCircle size={12} className="text-red-500" />
      {children || id}
      <Plus size={10} className="text-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
