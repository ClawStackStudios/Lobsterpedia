import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Copy, CheckCircle2, Edit3, Save, X, Plus, Trash2, Library, ExternalLink, ArrowRight, Bot, AlertTriangle, AlertCircle } from 'lucide-react';
import { PolyP, Reef, AIProvider } from '../shell-core/types';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { aiService } from '../../services/aiService';

interface ArticleViewProps {
  article: PolyP;
  pages: Reef;
  issues: any[];
  onRefreshIssues: () => void;
  onNavigate: (view: any, id?: string) => void;
  onHoverNode?: (id: string | null) => void;
  externalHoveredId?: string | null;
  aiProvider: AIProvider;
  openRouterModel: string;
}

interface WikiLinkProps {
  id: string;
  children?: React.ReactNode;
  pages: Reef;
  onNavigate: (view: any, id?: string) => void;
  onHoverNode?: (id: string | null) => void;
  hoveredLink: string | null;
  setHoveredLink: (id: string | null) => void;
}

const WikiLink: React.FC<WikiLinkProps> = ({ id, children, pages, onNavigate, onHoverNode, hoveredLink, setHoveredLink }) => {
  const targetPage = pages[id];
  const isHovered = hoveredLink === id;

  if (targetPage) {
    return (
      <span 
        className="relative inline-block group"
        onMouseEnter={() => {
          setHoveredLink(id);
          onHoverNode?.(id);
        }}
        onMouseLeave={() => {
          setHoveredLink(null);
          onHoverNode?.(null);
        }}
      >
        <button 
          onClick={() => onNavigate('article', id)} 
          className={`font-semibold transition-all px-1 rounded flex items-center gap-1 ${isHovered ? 'bg-lobster text-white shadow-sm' : 'text-lobster hover:bg-lobster/10'}`}
          style={{ cursor: 'pointer' }}
        >
          {children || targetPage.title}
          <ArrowRight size={10} className={`text-current transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
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
      <Plus size={10} className="text-red-500 opacity-60" />
    </button>
  );
};

export const ArticleView: React.FC<ArticleViewProps> = ({ article, pages, issues, onRefreshIssues, onNavigate, onHoverNode, externalHoveredId, aiProvider, openRouterModel }) => {
  const [copied, setCopied] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [lintReport, setLintReport] = useState<string | null>(null);

  const articleIssues = issues.filter(i => i.sourceId === article.id);
  const isHealthy = articleIssues.length === 0;

  const { strippedContent, wikiProcessedContent } = React.useMemo(() => {
    const match = article.content.match(/^---\n([\s\S]*?)\n---\n/);
    const stripped = match ? article.content.replace(match[0], '') : article.content;
    
    // Wiki Link Processing: [[id]] or [[id|text]] -> [text](id.md)
    const processed = stripped.replace(/\[\[(.*?)(?:\|(.*?))?\]\]/g, (_, id, text) => {
      const linkText = text || id;
      const cleanId = id.trim().replace(/\.md$/, '');
      return `[${linkText}](${cleanId}.md)`;
    });

    return {
      strippedContent: stripped,
      wikiProcessedContent: processed
    };
  }, [article.content]);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(article?.title || '');
  const [editContent, setEditContent] = useState(article?.content || '');
  const [editTags, setEditTags] = useState<string[]>(article?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [editExternalUrls, setEditExternalUrls] = useState<string[]>(article?.externalUrls || []);
  const [newUrl, setNewUrl] = useState('');
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Summarization State
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Deletion State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Citation State
  const [showCitations, setShowCitations] = useState(false);

  // History State
  const [activeTab, setActiveTab] = useState<'content' | 'history'>('content');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewingHistoricalCommit, setViewingHistoricalCommit] = useState<any>(null);
  const [historicalContent, setHistoricalContent] = useState<string | null>(null);

  // Frontmatter State
  const [showFrontmatter, setShowFrontmatter] = useState(false);

  // Reset edit/delete/summary state when article changes
  useEffect(() => {
    if (article) {
      setEditTitle(article.title);
      setEditContent(article.content);
      setEditTags(article.tags || []);
      setEditExternalUrls(article.externalUrls || []);
      setIsEditing(false);
      setConfirmDelete(false);
      setSummary(null);
      setShowCitations(false);
      setActiveTab('content');
      setViewingHistoricalCommit(null);
      setHistoricalContent(null);
    }
  }, [article?.id]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/git/history?file=${article.id}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.history || []);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, article?.id]);

  const viewHistoricalVersion = async (commit: any) => {
    setViewingHistoricalCommit(commit);
    setHistoricalContent(null);
    try {
      const res = await fetch(`/api/git/file/${commit.hash}/${article.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricalContent(data.content);
      } else {
        setHistoricalContent("Failed to load historical content.");
      }
    } catch (err) {
      console.error("Failed to fetch historical version", err);
      setHistoricalContent("Error loading content.");
    }
  };

  const revertToHistorical = () => {
    if (historicalContent) {
      setEditContent(historicalContent);
      setActiveTab('content');
      setIsEditing(true);
      setViewingHistoricalCommit(null);
      setHistoricalContent(null);
    }
  };

  if (!article) return <div className="p-10 text-center font-medium text-text-primary/50">PolyP not found in this reef.</div>;

  const handleCopy = () => {
    navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary(null);
    try {
      const prompt = `Communicate with rigorous epistemic discipline: prefer measured confidence, deep reasoning and parsimonious explanations, avoiding unnecessary complexity or overextension.

Provide a concise, professional executive summary (max 3-4 sentences) for the following wiki article titled "${article.title}". Focus on the core semantic value. Do not use intro phrases like "This article is about...". Direct synthesis only.
      
      Content: ${article.content}`;

      const text = await aiService.generateContent(prompt, aiProvider, openRouterModel);
      setSummary(text || "Summary scuttle failed.");
    } catch (err) {
      console.error(err);
      setSummary(`IsCracked: Synthesis failure in summary layer. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleLintAgent = async () => {
    setIsLinting(true);
    setLintReport(null);
    try {
      const prompt = `Communicate with rigorous epistemic discipline: prefer measured confidence, deep reasoning and parsimonious explanations, avoiding unnecessary complexity or overextension.

LLM WIKI PATTERN v1: COMPOUNDING REEF
- Goal: Build a persistent, compounding artifact.
- Method: Synthesize new documents relative to existing context.
- Cross-linking: Mandatory internal links [[id]] or [title](id) are the tendons of the reef.

LLM WIKI PATTERN v2: ACTIVE SHELL
- Directory Sovereignty: Group articles into folder directories: concepts/, entities/, events/, patterns/, references/, insights/, meetings/, projects/, log/.
- Metadata Integrity: Rigorous frontmatter including: title, type, author, lastUpdated, tags, links, confidence, supersededBy.

You are a CrustAgent performing a 'lint' operation on a semantic wiki reef.
Analyze the following registry of wiki pages:
${JSON.stringify(Object.values(pages).map(p => ({ id: p.id, title: p.title, path: p.path, tags: p.tags })))}

Identify:
1. Orphaned pages (no incoming links).
2. Broken links (pointing to non-existent IDs).
3. Semantic Gaps: Identify concepts that should be linked but aren't.
4. Directory Misalignment: Identify files that might be in the wrong Pattern v2 directory.
5. Lifecycle Stale Claims: Identify pages that might be superseded.

Summarize your findings with epistemic rigor.`;

      const text = await aiService.generateContent(prompt, aiProvider, openRouterModel);
      setLintReport(text || "No anomalies observed. Shell is hardened.");
      onRefreshIssues();
    } catch (err) {
      console.error(err);
      setLintReport(`IsCracked: Sub-system failure during linting process. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsLinting(false);
    }
  };

  const handleDelete = async () => {
    if (article.id === 'index') return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/wiki/delete/${article.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onNavigate('index', '');
      } else {
        console.error("Failed to delete article");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          title: editTitle,
          content: editContent,
          tags: editTags,
          author: article.author,
          links: article.links,
          externalUrls: editExternalUrls,
          type: article.type,
          confidence: article.confidence,
          supersededBy: article.supersededBy
        })
      });
      
      if (res.ok) {
        setIsEditing(false);
      } else {
        console.error("Failed to save article");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag && !editTags.includes(newTag)) {
      setEditTags([...editTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  const addUrl = () => {
    if (newUrl && !editExternalUrls.includes(newUrl)) {
      setEditExternalUrls([...editExternalUrls, newUrl]);
      setNewUrl('');
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setEditExternalUrls(editExternalUrls.filter(u => u !== urlToRemove));
  };

  return (
    <motion.article 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <div className="mb-10 border-b border-border-primary pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-text-primary/40 font-medium uppercase tracking-wider">
            <button onClick={() => onNavigate('index')} className="hover:underline cursor-pointer">wiki</button>
            <span>/</span>
            <span className="text-text-primary/70 font-bold">{article.id}.md</span>
            {article.confidence !== undefined && (
              <div className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${article.confidence > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {Math.round(article.confidence * 100)}% Confidence
              </div>
            )}
            {article.supersededBy && (
              <button 
                onClick={() => onNavigate('article', article.supersededBy!)}
                className="ml-2 animate-pulse bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter hover:bg-red-200 transition-colors"
              >
                Stale: Superseded By {article.supersededBy}
              </button>
            )}
            <span className="mx-2 opacity-20">|</span>
            <button 
              onClick={() => onNavigate('graph')}
              className="text-lobster hover:underline flex items-center gap-1 font-black"
            >
              <Activity size={10} /> View in Graph
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {!isEditing ? (
              <>
                <button 
                  onClick={handleCopy}
                  className="p-2 hover:bg-border-primary/50 rounded-md transition-colors flex items-center gap-2 text-xs font-bold text-text-primary/50 uppercase tracking-widest cursor-pointer"
                >
                  {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copy' : 'Copy'}
                </button>
                <button 
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="p-2 hover:bg-border-primary/50 rounded-md transition-colors flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest cursor-pointer disabled:opacity-50"
                >
                  {isSummarizing ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                  {isSummarizing ? 'Summarizing...' : 'Summarize'}
                </button>
                <button 
                  onClick={() => setShowCitations(!showCitations)}
                  className={`p-2 rounded-md transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer ${showCitations ? 'bg-lobster text-white' : 'hover:bg-border-primary/50 text-text-primary/50'}`}
                  title="Cite Sources"
                >
                  <Library size={14} /> Cite
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-border-primary/50 rounded-md transition-colors flex items-center gap-2 text-xs font-bold text-lobster uppercase tracking-widest cursor-pointer"
                >
                  <Edit3 size={14} /> Edit
                </button>

                {article.id !== 'index' && (
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border-primary">
                    {!confirmDelete ? (
                      <button 
                        onClick={() => setConfirmDelete(true)}
                        className="p-2 hover:bg-red-500/10 rounded-md transition-colors flex items-center gap-2 text-xs font-bold text-text-primary/40 hover:text-red-500 uppercase tracking-widest cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-500/10 p-1 rounded-md border border-red-500/20">
                        <button 
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-1 min-w-[100px] justify-center"
                        >
                          {isDeleting ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" /> 
                              <span>Purging...</span>
                            </>
                          ) : (
                            'Confirm Purge'
                          )}
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(false)}
                          className="px-2 py-1 text-text-primary/50 text-[9px] font-black uppercase tracking-widest hover:bg-bg-primary rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-2 px-4 bg-lobster text-white rounded-md transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50 min-w-[90px]"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Locking...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(article.title);
                    setEditContent(article.content);
                    setEditTags(article.tags || []);
                    setEditExternalUrls(article.externalUrls || []);
                  }}
                  className="p-2 px-4 border border-border-primary rounded-md transition-colors flex items-center gap-2 text-xs font-bold text-text-primary/50 uppercase tracking-widest cursor-pointer hover:bg-border-primary/50"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <input 
              type="text" 
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-5xl font-extrabold text-text-primary tracking-tight w-full outline-none border-b-2 border-transparent focus:border-lobster transition-all bg-transparent"
              placeholder="Article Title"
            />
            
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {editTags.map(tag => (
                <span key={tag} className="bg-lobster/10 text-lobster px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-600">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input 
                  type="text" 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="New tag..."
                  className="text-[10px] uppercase font-bold tracking-widest border-b border-border-primary outline-none focus:border-lobster bg-transparent text-text-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button onClick={addTag} className="text-lobster hover:scale-110 transition-transform">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {editExternalUrls.map(url => (
                <span key={url} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-2">
                  {url}
                  <button onClick={() => removeUrl(url)} className="hover:text-red-600">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input 
                  type="text" 
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Add external URL..."
                  className="text-[10px] uppercase font-bold tracking-widest border-b border-border-primary outline-none focus:border-indigo-500 w-48 bg-transparent text-text-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                />
                <button onClick={addUrl} className="text-indigo-500 hover:scale-110 transition-transform">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-5xl font-extrabold text-text-primary tracking-tight mb-6 leading-tight">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {article.tags?.map(tag => (
                <span key={tag} className="bg-bg-primary text-text-primary/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  #{tag}
                </span>
              ))}
              {article.externalUrls?.map(url => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider hover:bg-indigo-100 flex items-center gap-1 transition-colors">
                  <Activity size={10} />
                  External Link
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-text-primary text-bg-primary flex items-center justify-center text-[10px]">LA</div>
                <span className="text-text-primary/60">{article.author || 'Synthesized by Agent'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <button 
                  onClick={() => onNavigate('maintenance')}
                  className={`${isHealthy ? 'text-green-500' : 'text-amber-500 hover:underline'} font-bold cursor-pointer`}
                >
                  Status: {isHealthy ? 'Healthy' : `${articleIssues.length} Maintenance Required`}
                </button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span>Last Synced: {article.lastUpdated}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex border-b border-border-primary mb-8">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === 'content' ? 'text-lobster border-b-2 border-lobster' : 'text-text-primary/40 hover:text-text-primary/60'}`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === 'history' ? 'text-lobster border-b-2 border-lobster' : 'text-text-primary/40 hover:text-text-primary/60'}`}
          >
            Version History
          </button>
        </div>
      )}

      <div className="prose prose-neutral max-w-none 
        prose-headings:text-text-primary prose-headings:font-extrabold prose-headings:tracking-tight
        prose-p:text-text-primary/70 prose-p:leading-relaxed prose-p:mb-6 
        prose-strong:text-text-primary prose-strong:font-bold
        prose-li:text-text-primary/70 prose-ul:my-6 prose-ol:my-6">
        <AnimatePresence>
          {summary && !isEditing && activeTab === 'content' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl shadow-sm italic text-blue-500 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                 <Bot size={16} />
              </div>
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                <Activity size={12} />
                Flash Synthesis Pass
              </h4>
              <p className="text-sm leading-relaxed">{summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frontmatter Detection & Display */}
        {(() => {
          const match = article.content.match(/^---\n([\s\S]*?)\n---\n/);
          if (match && !isEditing && activeTab === 'content') {
            const raw = match[1];
            return (
              <div className="mb-10">
                <button 
                  onClick={() => setShowFrontmatter(!showFrontmatter)}
                  className="mb-2 text-[9px] font-black uppercase tracking-widest text-text-primary/30 hover:text-lobster transition-colors flex items-center gap-2"
                >
                  <Activity size={10} />
                  {showFrontmatter ? 'Hide Raw Metadata' : 'Show Raw Metadata'}
                </button>
                
                <AnimatePresence>
                  {showFrontmatter && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <pre className="p-4 bg-bg-primary text-text-primary/70 rounded-lg text-[10px] font-mono border border-border-primary shadow-inner overflow-x-auto">
                        {raw}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                   {raw.split('\n').map((line, i) => {
                     const [key, ...vals] = line.split(':');
                     if (!key || vals.length === 0) return null;
                     const val = vals.join(':').trim();
                     return (
                       <div key={i} className="bg-card-bg border border-border-primary p-2 rounded-md hover:border-lobster/30 transition-colors group">
                          <div className="text-[8px] font-black text-text-primary/30 uppercase tracking-tighter group-hover:text-lobster transition-colors">{key.trim()}</div>
                          <div className="text-[10px] font-bold text-text-primary/70 truncate" title={val}>{val}</div>
                       </div>
                     );
                   })}
                </div>
              </div>
            );
          }
          return null;
        })()}

        <AnimatePresence>
          {showCitations && !isEditing && activeTab === 'content' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 overflow-hidden"
            >
              <div className="p-8 bg-card-bg text-text-primary rounded-xl shadow-xl border border-border-primary relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lobster/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                    <Library size={20} className="text-lobster" /> 
                    <span>Cited Knowledge Sources</span>
                  </h3>
                  <button 
                    onClick={() => setShowCitations(false)} 
                    className="text-text-primary/40 hover:text-lobster transition-colors p-1"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 relative z-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-text-primary/30 uppercase tracking-widest border-b border-border-primary pb-2">Internal References</h4>
                    {article.links && article.links.length > 0 ? (
                      <div className="grid gap-2">
                        {article.links.map(linkId => {
                          const linked = pages[linkId];
                          return (
                            <button 
                              key={linkId} 
                              onClick={() => onNavigate('article', linkId)}
                              className="flex items-center justify-between p-3 rounded bg-bg-primary/40 border border-border-primary hover:border-lobster/50 hover:bg-bg-primary transition-all text-left"
                            >
                              <div>
                                <div className="text-xs font-bold text-text-primary">{linked?.title || linkId}</div>
                                <div className="text-[9px] text-text-primary/40 uppercase">{linked?.type || 'unknown'}</div>
                              </div>
                              <ArrowRight size={14} className="text-text-primary/20" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-primary/30 italic">No internal pips detected.</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-text-primary/30 uppercase tracking-widest border-b border-border-primary pb-2">External Substantiation</h4>
                    {article.externalUrls && article.externalUrls.length > 0 ? (
                      <div className="grid gap-2">
                        {article.externalUrls.map(url => (
                          <a 
                            key={url} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded bg-bg-primary/40 border border-border-primary hover:border-blue-500/50 hover:bg-bg-primary transition-all text-left group"
                          >
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold text-text-primary truncate pr-4">{url}</div>
                              <div className="text-[9px] text-text-primary/40 uppercase italic">External Verification</div>
                            </div>
                            <ExternalLink size={14} className="text-text-primary/20 group-hover:text-blue-500 transition-colors" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-primary/30 italic">No external URLs provided.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isEditing ? (
          <textarea 
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-[60vh] p-8 border border-border-primary rounded-xl bg-bg-primary font-mono text-sm leading-relaxed outline-none focus:border-lobster transition-all text-text-primary"
            placeholder="Molt transition markdown content..."
          />
        ) : activeTab === 'history' ? (
           <div className="space-y-6 not-prose">
             {isLoadingHistory ? (
                <div className="flex items-center gap-2 text-text-primary/50 text-sm font-bold"><RefreshCw size={14} className="animate-spin" /> Loading history...</div>
             ) : viewingHistoricalCommit ? (
                <div className="border border-border-primary rounded-xl p-6 bg-bg-primary">
                   <div className="flex justify-between items-center mb-6">
                     <div>
                       <h3 className="font-bold text-text-primary">Commit: {viewingHistoricalCommit.hash.substring(0, 8)}</h3>
                       <p className="text-xs text-text-primary/50">{viewingHistoricalCommit.date}</p>
                       <p className="text-sm mt-1 font-mono text-text-primary/70">{viewingHistoricalCommit.message}</p>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={revertToHistorical} className="bg-lobster text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:opacity-90 transition-opacity">Revert to this version</button>
                       <button onClick={() => setViewingHistoricalCommit(null)} className="border border-border-primary text-text-primary/60 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-card-bg transition-colors">Back</button>
                     </div>
                   </div>
                   <div className="bg-card-bg p-6 border border-border-primary rounded-lg max-h-[500px] overflow-y-auto w-full prose prose-sm max-w-none">
                     {historicalContent ? (
                       <ReactMarkdown 
                         remarkPlugins={[remarkGfm, remarkMath]}
                         rehypePlugins={[rehypeKatex]}
                         components={{
                           h1: ({node, ...props}) => <h1 className="text-3xl font-black mb-6 mt-10 text-text-primary border-b border-border-primary pb-2" {...props} />,
                           h2: ({node, ...props}) => <h2 className="text-2xl font-black mb-4 mt-8 text-text-primary/80" {...props} />,
                           h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-3 mt-6 text-text-primary/80" {...props} />,
                           p: ({node, ...props}) => <p className="mb-6 leading-relaxed text-text-primary/70" {...props} />,
                           ul: ({node, ...props}) => <ul className="list-disc list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
                           ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
                           li: ({node, ...props}) => <li className="mb-1" {...props} />,
                           code({ node, className, children, ...props }) {
                             const match = /language-(\w+)/.exec(className || '');
                             return match ? (
                               // @ts-ignore
                               <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props}>
                                 {String(children).replace(/\n$/, '')}
                               </SyntaxHighlighter>
                             ) : (
                               <code className="bg-border-primary text-lobster px-1 py-0.5 rounded" {...props}>{children}</code>
                             );
                           }
                         }}
                       >
                         {historicalContent}
                       </ReactMarkdown>
                     ) : (
                       <div className="flex items-center gap-2 text-text-primary/50 text-sm"><RefreshCw size={14} className="animate-spin" /> Loading content...</div>
                     )}
                   </div>
                </div>
             ) : (
               <div className="space-y-4">
                 {historyLogs.length === 0 && <p className="text-text-primary/50 text-sm">No history found for this file.</p>}
                 {historyLogs.map(log => (
                   <div key={log.hash} className="flex justify-between items-center p-4 border-border-primary rounded-xl hover:border-lobster transition-colors group cursor-pointer" onClick={() => viewHistoricalVersion(log)}>
                     <div>
                       <div className="font-mono text-xs text-gray-500 flex items-center gap-2">
                         <span className="font-bold text-gray-700">{log.hash.substring(0, 8)}</span>
                         <span>•</span>
                         <span>{new Date(log.date).toLocaleString()}</span>
                       </div>
                       <div className="font-medium text-gray-900 mt-1">{log.message}</div>
                       <div className="text-xs text-gray-400 mt-1">{log.author_name}</div>
                     </div>
                     <Activity size={16} className="text-gray-300 group-hover:text-lobster transition-colors" />
                   </div>
                 ))}
               </div>
             )}
           </div>
        ) : (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-black mb-6 mt-10 text-text-primary border-b border-border-primary pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-black mb-4 mt-8 text-text-primary/80" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-3 mt-6 text-text-primary/80" {...props} />,
              p: ({node, ...props}) => <p className="mb-6 leading-relaxed text-text-primary/70" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  // @ts-ignore
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={`${className} bg-bg-primary text-lobster px-1.5 py-0.5 rounded text-sm font-mono border border-border-primary`} {...props}>
                    {children}
                  </code>
                );
              },
              table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-border-primary border border-border-primary rounded-lg" {...props} /></div>,
              th: ({node, ...props}) => <th className="px-4 py-3 bg-bg-primary text-left text-xs font-semibold text-text-primary/50 uppercase tracking-wider border-b border-border-primary" {...props} />,
              td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-text-primary/80 border-b border-border-primary" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-lobster pl-4 italic text-text-primary/70 my-6 bg-bg-primary py-2 pr-4 rounded-r-lg" {...props} />,
              a: ({ node, href, children, ...props }) => {
                const isInternal = href && !href.startsWith('http');
                if (isInternal) {
                  const linkId = href!.replace(/\.md$/, '');
                  return (
                    <WikiLink 
                      id={linkId} 
                      pages={pages} 
                      onNavigate={onNavigate} 
                      onHoverNode={onHoverNode}
                      hoveredLink={hoveredLink}
                      setHoveredLink={setHoveredLink}
                    >
                      {children}
                    </WikiLink>
                  );
                }
                return (
                  <a 
                    href={href} 
                    className="text-blue-500 hover:underline inline-flex items-center gap-1 group" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {children}
                    <ExternalLink size={10} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </a>
                )
              }
            }}
          >
            {wikiProcessedContent}
          </ReactMarkdown>
        )}
      </div>

      {!isHealthy && !isEditing && activeTab === 'content' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="my-10 p-6 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle size={14}/> Artifact Integrity Alerts
            </h3>
            <button 
              onClick={() => onNavigate('maintenance')}
              className="text-[10px] font-black text-amber-500 hover:bg-amber-500 hover:text-white px-2 py-1 rounded border border-amber-500 transition-all uppercase tracking-widest"
            >
              Open Shipyard
            </button>
          </div>
          <div className="space-y-3">
            {articleIssues.map(issue => (
              <div key={issue.id} className="text-sm text-text-primary/70 flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {article.links && article.links.length > 0 && !isEditing && activeTab === 'content' && (
        <div className="my-10 bg-lobster/10 border-l-4 border-lobster p-8 rounded-r-lg shadow-sm">
          <h3 className="text-[10px] font-black text-lobster uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <RefreshCw size={14}/> Semantic Cross-References
          </h3>
          <div className="flex flex-wrap gap-3">
            {article.links.map(linkId => {
              const linkedPage = pages[linkId];
              const isHovered = hoveredLink === linkId;
              
              if (!linkedPage) {
                return (
                  <button 
                    key={linkId}
                    onClick={() => onNavigate('ingest', linkId)}
                    className="bg-red-500/10 border border-red-500/20 border-dashed px-4 py-2 rounded text-sm font-semibold text-red-500 hover:bg-red-500/20 cursor-pointer transition-all flex items-center gap-2 group"
                    title={`The pearl '${linkId}' is missing from the reef. Click to synthesize.`}
                  >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                    <span>{linkId}.md (Draft)</span>
                  </button>
                );
              }

              return (
                <button 
                  key={linkId}
                  onClick={() => onNavigate('article', linkId)}
                  onMouseEnter={() => {
                    setHoveredLink(linkId);
                    onHoverNode?.(linkId);
                  }}
                  onMouseLeave={() => {
                    setHoveredLink(null);
                    onHoverNode?.(null);
                  }}
                  className={`border px-4 py-2 rounded text-sm font-semibold cursor-pointer transition-all shadow-sm ${
                    isHovered 
                      ? 'bg-lobster border-lobster text-white shadow-md transform scale-105' 
                      : 'bg-card-bg border-border-primary text-text-primary/70 hover:border-lobster'
                  }`}
                >
                  {linkedPage.id}.md
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="bg-card-bg border border-border-primary p-8 mt-20 rounded-xl shadow-sm border-t-4 border-lobster">
            <h3 className="text-lg font-extrabold text-text-primary mb-2 tracking-tight">Context Rot Detected?</h3>
            <p className="text-sm text-text-primary/50 mb-6 font-medium">Trigger an agentic lint pass to automatically resolve contradictions across synthesized documents.</p>
            <button 
              onClick={handleLintAgent}
              disabled={isLinting}
              className="bg-lobster text-white px-6 py-3 rounded-lg font-bold text-xs hover:opacity-90 transition-all flex items-center gap-3 uppercase tracking-widest shadow-lg shadow-lobster/20 disabled:opacity-50 cursor-pointer"
            >
              {isLinting ? <RefreshCw className="animate-spin" size={16} /> : <Activity size={16} />} 
              {isLinting ? 'Scuttling the reef...' : 'Trigger Lint Health Check'}
            </button>

            <AnimatePresence>
              {lintReport && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 p-4 bg-bg-primary border border-border-primary rounded text-sm font-mono whitespace-pre-wrap text-text-primary/70 shadow-inner overflow-hidden"
                >
                  <span className="font-bold text-lobster block mb-2 uppercase tracking-widest text-[10px]">[CrustAgent Lint Report]</span>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return match ? (
                          // @ts-ignore
                          <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-border-primary px-1 py-0.5 rounded text-lobster font-mono" {...props}>{children}</code>
                        );
                      }
                    }}
                  >
                    {lintReport}
                  </ReactMarkdown>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      )}
    </motion.article>
  );
};
