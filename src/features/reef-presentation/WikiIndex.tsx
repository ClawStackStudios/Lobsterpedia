import React, { useState, useEffect } from 'react';
import { Box, Activity, Network, X } from 'lucide-react';
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
  const concepts = (Object.values(pages) as PolyP[]).filter(p => p.type === 'concept');
  const indexListPage = pages['index-list'];

  const [showVaultNotice, setShowVaultNotice] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('lobsterpedia_vault_notice_dismissed');
    if (isDismissed !== 'true') {
      setShowVaultNotice(true);
    }
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
      <div className="mb-10 border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight mb-2 flex items-center gap-3">
            <Box className="text-lobster" size={32}/> Article Catalog
          </h1>
          <p className="text-text-primary/50 font-medium">The synthesized manifest of all documents in the knowledge base.</p>
        </div>
        
        <button 
          onClick={() => onNavigate('graph')}
          className="flex items-center gap-2 btn-dynamic-main px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
        >
          <Network size={16} /> Explore Semantic Map
        </button>
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
          <div className="bg-card-bg p-8 rounded-xl border border-border-primary prose prose-sm max-w-none prose-neutral prose-headings:text-text-primary prose-headings:font-black">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-black mb-4 mt-8 pb-2 border-b border-border-primary" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-6 text-text-primary" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-text-primary" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1 ml-4 text-text-primary" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-border-primary border border-border-primary rounded-lg text-sm" {...props} /></div>,
                th: ({node, ...props}) => <th className="px-4 py-3 bg-bg-primary text-left text-xs font-semibold text-text-primary/50 uppercase tracking-wider border-b border-border-primary" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-text-primary border-b border-border-primary" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-lobster pl-4 italic text-text-primary/70 my-6 bg-bg-primary py-2 pr-4 rounded-r-lg" {...props} />,
                a: ({ node, href, children, ...props }) => {
                  const isInternal = href && !href.startsWith('http');
                  if (isInternal) {
                    const linkId = href!.replace(/\.md$/, '');
                    // Handle category links like "concepts" -> "concepts/concepts-index"
                    const targetId = pages[linkId] ? linkId : (pages[`${linkId}/${linkId}-index`] ? `${linkId}/${linkId}-index` : linkId);
                    
                    return (
                      <WikiLink 
                        id={targetId} 
                        pages={pages} 
                        onNavigate={onNavigate} 
                      >
                        {children}
                      </WikiLink>
                    );
                  }
                  return <a href={href} className="text-lobster hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                }
              }}
            >
              {indexListPage.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {concepts.map(page => (
          <motion.div 
            key={page.id} 
            whileHover={{ y: -2 }}
            onClick={() => onNavigate('article', page.id)}
            className="group cursor-pointer card-polished p-6 hover:border-lobster transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-bg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-text-primary group-hover:text-lobster transition-colors">{page.title}</h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-primary text-[10px] font-bold text-text-primary/40 border border-border-primary/50" title="Outbound Connectivity">
                  <Network size={10} className="text-lobster opacity-70"/> 
                  {(page.links?.length || 0) + (page.externalUrls?.length || 0)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                {page.tags?.map(tag => (
                  <span key={tag} className="bg-bg-primary px-2 py-0.5 rounded text-text-primary/60">#{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-right flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1 text-xs text-text-primary/40">
              <span className="flex items-center gap-1 font-semibold text-text-primary/50 tracking-tighter uppercase text-[9px]"><Activity size={12}/> {page.links?.length || 0} pips</span>
              <span>Updated: {page.lastUpdated}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
