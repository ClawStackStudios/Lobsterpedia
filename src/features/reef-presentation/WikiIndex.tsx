import React, { useState, useEffect, useRef } from 'react';
import { Box, Activity, Network, X, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, BarChart3, Database, Edit3 } from 'lucide-react';
import { Reef, PolyP } from '../shell-core/types';
import { motion, AnimatePresence } from 'motion/react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WikiLink } from '../../components/WikiLink';

interface WikiIndexProps {
  pages: Reef;
  onNavigate: (view: any, id?: string) => void;
}

export const WikiIndex: React.FC<WikiIndexProps> = ({ pages, onNavigate }) => {
  const allArticles = React.useMemo(() =>
    (Object.values(pages) as PolyP[]).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
    [pages]
  );

  const indexListPage = pages['index-list'];
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  const [showVaultNotice, setShowVaultNotice] = useState(false);
  const [showDatabaseIndex, setShowDatabaseIndex] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem('lobsterpedia_vault_notice_dismissed');
    if (isDismissed !== 'true') {
      setShowVaultNotice(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dismissVaultNotice = () => {
    setShowVaultNotice(false);
    localStorage.setItem('lobsterpedia_vault_notice_dismissed', 'true');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <div className="mb-10 border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-50">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight mb-2 flex items-center gap-3">
            <Box className="text-lobster" size={32}/> Article Catalog
          </h1>
          <p className="text-text-primary/50 font-medium">The synthesized manifest of all documents in the knowledge base.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-2 btn-dynamic-main px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
            >
              Actions
              <ChevronDown size={14} className={`transition-transform ${showActionsDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showActionsDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-card-bg border border-border-primary rounded-lg shadow-xl overflow-hidden z-[100]"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { onNavigate('article', 'index-list'); setShowActionsDropdown(false); }}
                      className="w-full p-3 rounded-lg hover:bg-lobster/10 border border-transparent hover:border-lobster/20 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-text-primary/50 group-hover:text-lobster">
                          <Edit3 size={16} />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black uppercase tracking-widest text-text-primary">Edit Article List</div>
                          <div className="text-[9px] text-text-primary/40 font-mono">Manual Revision</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Obsidian Vault Integration Notice */}
      <AnimatePresence>
        {showVaultNotice && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto', marginBottom: 48 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
            className="bg-lobster/10 border-2 border-lobster/20 p-8 rounded-2xl relative overflow-hidden group hover:border-lobster/40 transition-all shadow-xl"
          >
            <button 
              onClick={dismissVaultNotice}
              className="absolute top-4 right-4 p-2 z-10 text-lobster/50 hover:text-lobster hover:bg-lobster/10 rounded-full transition-colors"
              title="Dismiss notice"
            >
              <X size={20} />
            </button>
            <div className="absolute -right-8 -top-8 text-lobster opacity-5 rotate-12 group-hover:rotate-6 transition-transform">
              <Box size={160} />
            </div>
            
            <h2 className="text-lg font-black text-text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-lobster" /> 
              EXTERNAL VAULT ECOSYSTEM
            </h2>
            
            <blockquote className="border-l-4 border-lobster pl-6 italic text-text-primary/80 text-lg leading-relaxed mb-6 font-medium">
              "Lobsterpedia natively supports external <strong>Obsidian Vaults</strong> located within the <code>/wiki</code> directory. You can drop pre-structured Obsidian LLM Wikis directly into the reef to instantly deploy a high-fidelity UI layer on top of your existing LLM Wiki Pattern."
            </blockquote>

            <p className="text-sm text-text-primary/60 font-medium max-w-2xl leading-relaxed">
              Maintain your sovereignty. Your Obsidian metadata, internal links, and directory structures are respected and scuttled into the Graph Topology automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {indexListPage && indexListPage.content && (
        <div className="mb-12">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-text-primary">Article List</h2>
            <button
              onClick={() => onNavigate('article', 'index-list')}
              className="w-full p-4 rounded-xl hover:bg-lobster/10 border border-transparent hover:border-lobster/20 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-text-primary/50 group-hover:text-lobster">
                  <Edit3 size={16} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-widest text-text-primary">Edit Article</div>
                  <div className="text-[9px] text-text-primary/40 font-mono">Manual Revision</div>
                </div>
              </div>
            </button>
          </div>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-black mb-4 mt-8 pb-2 border-b border-border-primary" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-6 text-text-primary" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-text-primary/70" {...props} />,
              ul: ({node, ...props}) => <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 list-none p-0" {...props} />,
              li: ({node, children, ...props}) => (
                  <li className="m-0 p-0" {...props}>
                    {children}
                  </li>
              ),
              table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-border-primary border border-border-primary rounded-lg text-sm" {...props} /></div>,
              th: ({node, ...props}) => <th className="px-4 py-3 bg-bg-primary text-left text-xs font-semibold text-text-primary/50 uppercase tracking-wider border-b border-border-primary" {...props} />,
              td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-text-primary border-b border-border-primary" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-lobster pl-4 italic text-text-primary/70 my-6 bg-bg-primary py-2 pr-4 rounded-r-lg" {...props} />,
              a: ({ node, href, children, ...props }) => {
                const isInternal = href && !href.startsWith('http');
                if (isInternal) {
                  const linkId = href!.replace(/\.md$/, '');
                  const targetId = pages[linkId] ? linkId : (pages[`${linkId}/${linkId}-index`] ? `${linkId}/${linkId}-index` : linkId);
                  const targetPage = pages[targetId];

                  return (
                    <button 
                      onClick={() => onNavigate('article', targetId)}
                      className="flex items-center justify-between w-full p-4 rounded-xl bg-card-bg border border-border-primary hover:border-lobster hover:shadow-lg hover:shadow-lobster/5 transition-all text-left group"
                    >
                      <div className="overflow-hidden flex-1 pr-4">
                        <div className="text-sm font-black text-text-primary group-hover:text-lobster transition-colors truncate">{targetPage?.title || children}</div>
                        <div className="text-[10px] font-mono text-text-primary/30 mt-1 uppercase tracking-widest">{targetId}</div>
                      </div>
                      <Activity size={14} className="text-text-primary/10 group-hover:text-lobster transition-colors shrink-0" />
                    </button>
                  );
                }
                return <a href={href} className="text-lobster hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
              }
            }}
          >
            {indexListPage.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Habitat Database Index (Collapsible) */}
      <div className="mt-8">
        <button 
          onClick={() => setShowDatabaseIndex(!showDatabaseIndex)}
          className="w-full flex items-center justify-between p-4 px-6 bg-bg-primary border border-border-primary rounded-xl hover:border-lobster/40 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg transition-colors ${showDatabaseIndex ? 'bg-lobster text-white' : 'bg-lobster/10 text-lobster'}`}>
              <Database size={18} />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-primary">Habitat Database Index</h3>
              <p className="text-[9px] font-bold text-text-primary/30 uppercase tracking-widest mt-0.5">Machine Diagnostics • {allArticles.length} Known Pearls</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!showDatabaseIndex && (
               <div className="hidden md:flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-text-primary/20">
                  <div className="flex items-center gap-1.5"><ShieldCheck size={12}/> Verified</div>
                  <div className="flex items-center gap-1.5"><BarChart3 size={12}/> {allArticles.length} Entries</div>
               </div>
            )}
            <div className="text-text-primary/20 group-hover:text-lobster transition-colors">
              {showDatabaseIndex ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {showDatabaseIndex && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 grid gap-3">
                {allArticles.map(page => (
                  <motion.div 
                    key={page.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onNavigate('article', page.id)}
                    className="group cursor-pointer p-4 rounded-xl border border-border-primary/50 hover:border-lobster/30 hover:bg-lobster/[0.02] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-bg/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h4 className="text-sm font-black text-text-primary group-hover:text-lobster transition-colors truncate">{page.title}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-bg-primary text-[8px] font-black text-text-primary/40 border border-border-primary/50 uppercase tracking-tighter" title="Node Type">
                          {page.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-text-primary/30">
                        <span className="flex items-center gap-1"><Activity size={10}/> {page.links?.length || 0} connections</span>
                        <span className="truncate max-w-[200px]">Path: {page.id}.md</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-right">
                      <div className="hidden lg:block w-32">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-1">
                          <span>Confidence</span>
                          <span className={page.confidence && page.confidence >= 0.8 ? 'text-green-500' : 'text-amber-500'}>
                            {page.confidence !== undefined ? `${Math.round(page.confidence * 100)}%` : '??%'}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-border-primary rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${page.confidence && page.confidence >= 0.8 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: page.confidence !== undefined ? `${page.confidence * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 min-w-[80px]">
                        <div className="text-[9px] font-black text-lobster tracking-tighter">REL: {(page.relevanceScore || 0).toFixed(4)}</div>
                        <div className="text-[8px] font-bold text-text-primary/20 uppercase tracking-widest">{page.lastUpdated}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
