import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Activity, Filter, User, Tag, Calendar, X, Network } from 'lucide-react';
import { Reef, PolyP } from '../shell-core/types';

interface SearchResultsProps {
  query: string;
  reef: Reef;
  onNavigate: (view: any, id?: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, reef, onNavigate }) => {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'relevance'>('relevance');

  const searchQuery = query.toLowerCase();
  
  // Base keyword filtering
  const baseResults = useMemo(() => {
    return Object.values(reef).filter((page: PolyP) => {
      if (page.id === 'index') return false;
      return page.title.toLowerCase().includes(searchQuery) ||
             page.content.toLowerCase().includes(searchQuery) ||
             page.tags?.some(tag => tag.toLowerCase().includes(searchQuery));
    }) as PolyP[];
  }, [reef, searchQuery]);

  // Extract all available tags and authors from the base search results for filters
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    baseResults.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [baseResults]);

  const availableAuthors = useMemo(() => {
    const authors = new Set<string>();
    baseResults.forEach(p => {
      if (p.author) authors.add(p.author);
    });
    return Array.from(authors).sort();
  }, [baseResults]);

  // Apply advanced filters
  const filteredResults = useMemo(() => {
    let results = [...baseResults];

    if (activeTags.length > 0) {
      results = results.filter(p => activeTags.every(t => p.tags?.includes(t)));
    }

    if (selectedAuthor) {
      results = results.filter(p => p.author === selectedAuthor);
    }

    if (startDate) {
      results = results.filter(p => p.lastUpdated >= startDate);
    }

    if (endDate) {
      results = results.filter(p => p.lastUpdated <= endDate);
    }

    // Sorting
    if (sortBy === 'newest') {
      results.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    } else if (sortBy === 'oldest') {
      results.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
    }

    return results;
  }, [baseResults, activeTags, selectedAuthor, startDate, endDate, sortBy]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const clearFilters = () => {
    setActiveTags([]);
    setSelectedAuthor(null);
    setStartDate('');
    setEndDate('');
    setSortBy('relevance');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-12 px-6"
    >
      <div className="mb-10 border-b border-border-primary pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight mb-2 flex items-center gap-3">
            <Search className="text-lobster" size={32}/> Search Results
          </h1>
          <p className="text-text-primary/50 font-medium">
            Found <span className="font-bold text-text-primary">{filteredResults.length}</span> matching pearls for "<span className="text-lobster">{query}</span>"
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-bg-primary border border-border-primary text-xs font-bold uppercase tracking-widest p-2 rounded outline-none focus:border-lobster transition-all text-text-primary"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          {(activeTags.length > 0 || selectedAuthor || startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="text-[10px] font-black uppercase text-lobster hover:underline flex items-center gap-1"
            >
              <X size={10}/> Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Advanced Filters Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar size={12}/> Temporal Range
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-text-primary/50 uppercase mb-1">From</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary p-2 rounded text-xs font-bold text-text-primary/70 outline-none focus:border-lobster transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-text-primary/50 uppercase mb-1">To</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary p-2 rounded text-xs font-bold text-text-primary/70 outline-none focus:border-lobster transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Tag size={12}/> Filter by Tags
            </h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {availableTags.length === 0 ? (
                <span className="text-xs text-text-primary/40 italic">No tags in selection</span>
              ) : (
                availableTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all text-left ${
                      activeTags.includes(tag) 
                        ? 'bg-lobster border-lobster text-white' 
                        : 'bg-bg-primary border-border-primary text-text-primary/50 hover:border-lobster/50'
                    }`}
                  >
                    #{tag}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={12}/> Filter by Agent
            </h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {availableAuthors.length === 0 ? (
                <span className="text-xs text-text-primary/40 italic">No agents identified</span>
              ) : (
                availableAuthors.map(author => (
                  <button 
                    key={author}
                    onClick={() => setSelectedAuthor(selectedAuthor === author ? null : author)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all text-left ${
                      selectedAuthor === author 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-bg-primary border-border-primary text-text-primary/50 hover:border-blue-300'
                    }`}
                  >
                    {author}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Results List */}
        <div className="flex-1 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredResults.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-text-primary/40 font-medium card-polished"
              >
                No knowledge pearls match your refined scuttle. Try adjusting your filters.
              </motion.div>
            ) : (
              filteredResults.map(page => (
                <motion.div 
                  layout
                  key={page.id} 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  whileHover={{ y: -2 }}
                  onClick={() => onNavigate('article', page.id)}
                  className="group cursor-pointer card-polished p-6 hover:border-lobster transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase text-lobster/60">{page.type}</span>
                      {page.author && (
                        <span className="text-[9px] font-black uppercase text-blue-500/60">• {page.author}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-text-primary group-hover:text-lobster transition-colors">{page.title}</h3>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-primary text-[10px] font-bold text-text-primary/40 border border-border-primary/50" title="Outbound Connectivity">
                        <Network size={10} className="text-lobster opacity-70"/> 
                        {(page.links?.length || 0) + (page.externalUrls?.length || 0)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary/50 line-clamp-2 leading-relaxed mb-3">
                       {page.content.substring(0, 150).replace(/#/g, '')}...
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                      {page.tags?.map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded ${activeTags.includes(tag) ? 'bg-lobster/10 text-lobster' : 'bg-bg-primary border border-border-primary'}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1 text-xs text-text-primary/40 flex-shrink-0">
                    <span className="flex items-center gap-1 font-semibold text-text-primary/50"><Activity size={12}/> {page.links?.length || 0} pips</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {page.lastUpdated}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
