import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Activity, Copy, CheckCircle2, Edit3, Save, X, Plus, Trash2, Library, ExternalLink, ArrowRight, Bot, AlertTriangle, AlertCircle, Network, Grip, ChevronDown, Search, Eye } from 'lucide-react';
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
import { WikiLink } from '../../components/WikiLink';
import { MarkdownEditorToolbar } from '../../components/MarkdownEditorToolbar';
import { EditorPreviewModal } from '../../components/EditorPreviewModal';

interface ArticleViewProps {
  article: PolyP;
  pages: Reef;
  issues: any[];
  onRefreshIssues: () => void;
  onRefresh: () => void;
  onNavigate: (view: any, id?: string) => void;
  onHoverNode?: (id: string | null) => void;
  externalHoveredId?: string | null;
  aiProvider: AIProvider;
  openRouterModel: string;
  isManualMode?: boolean;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, pages, issues, onRefreshIssues, onRefresh, onNavigate, onHoverNode, externalHoveredId, aiProvider, openRouterModel, isManualMode }) => {
  const [copied, setCopied] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const [lintReport, setLintReport] = useState<string | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

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

  // Editor Enhancement State
  const [showPreview, setShowPreview] = useState(false);
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Summarization State
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Deletion State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Citation State
  const [showCitations, setShowCitations] = useState(false);
  const [showCrossReferences, setShowCrossReferences] = useState(false);

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
      setShowActionsDropdown(false);
    }
  }, [article?.id]);

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
        onRefresh();
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

  const insertAtCursor = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selection = text.substring(start, end);
    const beforeSelection = text.substring(0, start);
    const afterSelection = text.substring(end);

    const newText = beforeSelection + before + selection + after + afterSelection;
    setEditContent(newText);

    // Focus back and set cursor position after re-render
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + before.length + selection.length + after.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <motion.article 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <div className="mb-10 border-b border-border-primary pb-8 relative z-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-text-primary/40 font-medium uppercase tracking-wider">
            <button onClick={() => onNavigate('index')} className="hover:underline cursor-pointer">wiki</button>
            <span>/</span>
            <span className="text-text-primary/70 font-bold">{article.id}.md</span>
            <div className="flex flex-col gap-1 min-w-[100px] ml-4">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-text-primary/30">
                <span>Confidence</span>
                <span className="text-lobster">
                  {article.confidence !== undefined ? `${Math.round(article.confidence * 100)}%` : 'No Score'}
                </span>
              </div>
              <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: article.confidence !== undefined ? `${article.confidence * 100}%` : '0%' }}
                  className="h-full bg-lobster shadow-[0_0_8px_rgba(230,57,70,0.4)]"
                />
              </div>
            </div>
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
            <span className="mx-2 opacity-20">|</span>
            <div className="relative">
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="group flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-text-primary/40 hover:text-lobster transition-colors"
              >
                <Grip size={12} className="group-hover:rotate-90 transition-transform" />
                Actions
                <ChevronDown size={10} className={`transition-transform ${showActionsDropdown ? 'rotate-180' : ''}`} />
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
                        onClick={() => { handleCopy(); setShowActionsDropdown(false); }}
                        className="w-full p-3 rounded-lg hover:bg-lobster/10 border border-transparent hover:border-lobster/20 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-text-primary/50 group-hover:text-lobster">
                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-black uppercase tracking-widest text-text-primary">Copy Content</div>
                            <div className="text-[9px] text-text-primary/40 font-mono">Clipboard Buffer</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setIsEditing(true); setShowActionsDropdown(false); }}
                        className="w-full p-3 rounded-lg hover:bg-lobster/10 border border-transparent hover:border-lobster/20 transition-all flex items-center justify-between group"
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

                      <button
                        onClick={() => { handleSummarize(); setShowActionsDropdown(false); }}
                        disabled={isSummarizing || isManualMode}
                        className="w-full p-3 rounded-lg hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all flex items-center justify-between group disabled:opacity-40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-blue-500">
                            {isSummarizing ? <RefreshCw size={16} className="animate-spin" /> : <Activity size={16} />}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-black uppercase tracking-widest text-text-primary">AI Summarize</div>
                            <div className="text-[9px] text-text-primary/40 font-mono">{isManualMode ? 'Locked: Manual Mode' : 'Synthesis Pass'}</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowCitations(!showCitations); setShowActionsDropdown(false); }}
                        className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between group ${showCitations ? 'bg-lobster text-white border-lobster shadow-lg shadow-lobster/20' : 'hover:bg-lobster/10 border-transparent hover:border-lobster/20'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showCitations ? 'bg-white/20' : 'bg-bg-primary text-text-primary/50 group-hover:text-lobster'}`}>
                            <Library size={16} />
                          </div>
                          <div className="text-left">
                            <div className={`text-xs font-black uppercase tracking-widest ${showCitations ? 'text-white' : 'text-text-primary'}`}>Citations</div>
                            <div className={`text-[9px] font-mono ${showCitations ? 'text-white/60' : 'text-text-primary/40'}`}>{showCitations ? 'Visible' : 'Hidden'}</div>
                          </div>
                        </div>
                        {showCitations && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                      </button>

                      <button
                        onClick={() => { setShowFrontmatter(!showFrontmatter); setShowActionsDropdown(false); }}
                        className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between group ${showFrontmatter ? 'bg-lobster text-white border-lobster shadow-lg shadow-lobster/20' : 'hover:bg-lobster/10 border-transparent hover:border-lobster/20'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showFrontmatter ? 'bg-white/20' : 'bg-bg-primary text-text-primary/50 group-hover:text-lobster'}`}>
                            <Library size={16} />
                          </div>
                          <div className="text-left">
                            <div className={`text-xs font-black uppercase tracking-widest ${showFrontmatter ? 'text-white' : 'text-text-primary'}`}>Frontmatter</div>
                            <div className={`text-[9px] font-mono ${showFrontmatter ? 'text-white/60' : 'text-text-primary/40'}`}>{showFrontmatter ? 'Visible' : 'Hidden'}</div>
                          </div>
                        </div>
                        {showFrontmatter && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                      </button>

                      {article.id !== 'index' && article.id !== 'index-list' && (
                        <>
                          {!confirmDelete ? (
                            <button
                              onClick={() => setConfirmDelete(true)}
                              className="w-full p-3 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-text-primary/40 group-hover:text-red-500">
                                  <Trash2 size={16} />
                                </div>
                                <div className="text-left">
                                  <div className="text-xs font-black uppercase tracking-widest text-text-primary">Delete Page</div>
                                  <div className="text-[9px] text-text-primary/40 font-mono">Irreversible Purge</div>
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                              <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 text-center">Confirm Deletion?</div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleDelete}
                                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setConfirmDelete(false); setShowActionsDropdown(false); }}
                                  className="flex-1 py-2 border border-red-500 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing && (
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

        <AnimatePresence>
          {showFrontmatter && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-10 p-8 bg-card-bg border border-border-primary rounded-xl shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-lobster/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-lobster flex items-center gap-2">
                  <Grip size={14} /> Artifact Frontmatter
                </h3>
                <button onClick={() => setShowFrontmatter(false)} className="text-text-primary/20 hover:text-lobster transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-1">Type</div>
                  <div className="text-xs font-mono font-bold text-text-primary/70">{article.type}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-1">Author</div>
                  <div className="text-xs font-mono font-bold text-text-primary/70">{article.author}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-1">Last Updated</div>
                  <div className="text-xs font-mono font-bold text-text-primary/70">{article.lastUpdated}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-1">Confidence</div>
                  <div className="text-xs font-mono font-bold text-lobster">{article.confidence ? `${Math.round(article.confidence * 100)}%` : 'N/A'}</div>
                </div>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border-primary/50 relative z-10">
                  <div className="text-[8px] font-black uppercase tracking-widest text-text-primary/30 mb-3">Semantic Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-bg-primary border border-border-primary rounded text-[9px] font-bold text-text-primary/50 uppercase tracking-tighter">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCitations && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 overflow-hidden"
            >
              <div className="p-8 bg-card-bg text-text-primary rounded-xl shadow-xl border border-border-primary relative overflow-hidden">
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
                              className="flex items-center justify-between p-3 rounded bg-bg-primary/40 border border-border-primary hover:border-lobster/50 hover:bg-bg-primary transition-all text-left group cursor-pointer"
                            >
                              <div>
                                <div className="text-xs font-bold text-text-primary group-hover:text-lobster transition-colors">{linked?.title || linkId}</div>
                                <div className="text-[9px] text-text-primary/40 uppercase font-mono mt-0.5">{linked?.type || 'unknown substrate'}</div>
                              </div>
                              <ArrowRight size={14} className="text-text-primary/10 group-hover:text-lobster transition-all" />
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
                            className="flex items-center justify-between p-3 rounded bg-bg-primary/40 border border-border-primary hover:border-blue-500 hover:bg-bg-primary transition-all text-left group cursor-pointer"
                          >
                            <div className="overflow-hidden flex-1 pr-4">
                              <div className="text-xs font-bold text-text-primary group-hover:text-blue-500 transition-colors truncate">{url}</div>
                              <div className="text-[9px] text-text-primary/40 uppercase font-mono mt-0.5 italic">External Verification</div>
                            </div>
                            <ExternalLink size={14} className="text-text-primary/10 group-hover:text-blue-500 transition-all" />
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
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-primary/40">
                Markdown & KaTeX Supported
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-lobster/10 text-lobster border border-lobster/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-lobster/20 transition-all"
              >
                <Eye size={14} />
                Preview
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">
                Content
              </label>

              <MarkdownEditorToolbar
                onInsert={insertAtCursor}
                showWikiLink={true}
                showLinkSearch={true}
                onToggleLinkSearch={() => setIsSearchingLinks(!isSearchingLinks)}
              />

              {/* Tagging System Restoration */}
              <div className="flex flex-wrap items-center gap-2 pt-2 mb-4">
                {editTags.map(tag => (
                  <span key={tag} className="bg-lobster/10 text-lobster px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-600 transition-colors">
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

              {/* External URL System Restoration */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {editExternalUrls.map(url => (
                  <span key={url} className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    {url}
                    <button onClick={() => removeUrl(url)} className="hover:text-red-600 transition-colors">
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

              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[60vh] p-4 border border-border-primary rounded-b-lg font-mono text-sm leading-relaxed outline-none focus:border-lobster transition-all bg-bg-primary text-text-primary/70 shadow-sm resize-none"
                placeholder="Molt transition markdown content..."
              />

              {isSearchingLinks && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-habitat-dark/20 border border-border-primary rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Network size={14} className="text-lobster" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/60">Semantic Connectors</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSearchingLinks(false)}
                      className="text-[9px] font-bold text-lobster uppercase tracking-tighter hover:underline"
                    >
                      Close Connectors
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/20" />
                    <input
                      type="text"
                      value={linkSearchQuery}
                      onChange={e => setLinkSearchQuery(e.target.value)}
                      placeholder="Search the knowledge reef for related nodes..."
                      className="w-full pl-8 pr-4 py-2 bg-bg-primary border border-border-primary rounded-lg text-[10px] font-bold text-text-primary focus:border-lobster outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2 mt-3">
                    {Object.values(pages)
                      .filter(p => !p.id.includes('-index') && (p.title.toLowerCase().includes(linkSearchQuery.toLowerCase()) || p.id.toLowerCase().includes(linkSearchQuery.toLowerCase())))
                      .slice(0, 10)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const linkStr = `\n\n## References\n- [[${p.id}]]`;
                            // If References already exists, just add the list item
                            if (editContent.includes('## References')) {
                              setEditContent(editContent + `\n- [[${p.id}]]`);
                            } else {
                              setEditContent(editContent + linkStr);
                            }
                            setIsSearchingLinks(false);
                          }}
                          className="flex items-center justify-between p-2 bg-bg-primary border border-border-primary rounded hover:border-lobster transition-all group"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black text-text-primary/80 group-hover:text-lobster truncate max-w-[150px]">{p.title}</span>
                            <span className="text-[8px] font-mono text-text-primary/20">{p.id}</span>
                          </div>
                          <ArrowRight size={14} className="text-text-primary/10 group-hover:text-lobster transition-all" />
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>

            <EditorPreviewModal
              isOpen={showPreview}
              onClose={() => setShowPreview(false)}
              onSave={handleSave}
              title={editTitle}
              content={editContent}
              tags={editTags}
              isSaving={isSaving}
            />
          </div>
        ) : (
          <div className="mb-12">
            {/* Article Header Restoration */}
            <h1 className="text-5xl font-extrabold text-text-primary tracking-tight mb-6 leading-tight">
              {article.title}
            </h1>

            {/* Tags Restoration */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {article.tags?.map(tag => (
                <span key={tag} className="bg-bg-primary text-text-primary/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Status Restoration */}
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-primary/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-text-primary text-bg-primary flex items-center justify-center text-[10px]">
                  {(article.author || 'LA').substring(0, 2).toUpperCase()}
                </div>
                <span className="text-text-primary/60">{article.author || 'System'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <button 
                  onClick={() => onNavigate('maintenance')}
                  className={`${isHealthy ? 'text-green-500' : 'text-amber-500 hover:underline'} font-bold cursor-pointer transition-colors`}
                >
                  Status: {isHealthy ? 'Healthy' : 'Maintenance Required'}
                </button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span>Last Synced: {article.lastUpdated}</span>
              </div>
            </div>

            <div className="h-[1px] w-full bg-border-primary/30 mt-8 mb-4" />

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
                        currentPageId={article.id}
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
          </div>
        )}

        {summary && !isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 p-8 bg-habitat-dark/10 border border-border-primary rounded-2xl relative overflow-hidden group shadow-lg"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-30 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 mb-4">
              <Bot size={20} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-primary/60">Knowledge Synthesis Summary</h3>
            </div>
            <p className="text-sm leading-relaxed text-text-primary/80 italic font-medium">"{summary}"</p>
          </motion.div>
        )}

        {!isHealthy && !isEditing && (
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

        {article.links && article.links.length > 0 && !isEditing && (
          <div className="my-10">
            <button 
              type="button"
              onClick={() => setShowCrossReferences(!showCrossReferences)}
              className="group flex items-center gap-3 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-text-primary/30 hover:text-lobster transition-all cursor-pointer w-full text-left"
            >
              <Network size={14} className={showCrossReferences ? 'text-lobster' : 'text-text-primary/20 group-hover:text-lobster'} />
              <span>Semantic Topology Meta-Index</span>
              <div className="h-[1px] flex-1 bg-border-primary/50 group-hover:bg-lobster/30 transition-all" />
              <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                 {showCrossReferences ? '[ Collapse ]' : '[ Expand ]'}
              </span>
            </button>

            <AnimatePresence>
              {showCrossReferences && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-8 bg-card-bg text-text-primary rounded-xl shadow-xl border border-border-primary relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-lobster/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                      {article.links.map(linkId => {
                        const linked = pages[linkId];
                        return (
                          <button 
                            key={linkId} 
                            type="button"
                            onClick={() => onNavigate('article', linkId)}
                            className="flex items-center justify-between p-4 rounded-lg bg-bg-primary/40 border border-border-primary hover:border-lobster hover:bg-bg-primary transition-all text-left group cursor-pointer"
                          >
                            <div className="overflow-hidden flex-1 pr-4">
                              <div className="text-xs font-black text-text-primary group-hover:text-lobster transition-colors truncate">{linked?.title || linkId}</div>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[8px] font-mono text-text-primary/40 truncate">{linkId}</span>
                              </div>
                            </div>

                            <ArrowRight size={14} className="text-text-primary/10 group-hover:text-lobster transition-all transform group-hover:translate-x-1 shrink-0" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-border-primary/30 pt-6">
                       <div className="flex items-center gap-4 text-[9px] font-bold text-text-primary/30 uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-lobster" />
                             <span>{article.links.length} Identified Connections</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                             <span>Auto-Reflexive Index</span>
                          </div>
                       </div>
                       <p className="text-[9px] italic text-text-primary/20">Synthesized topology mapping active.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isEditing && (
          <div className="bg-card-bg border border-border-primary p-8 mt-20 rounded-xl shadow-sm border-t-4 border-lobster">
              <h3 className="text-lg font-extrabold text-text-primary mb-2 tracking-tight">Context Rot Detected?</h3>
              <p className="text-sm text-text-primary/50 mb-6 font-medium">Trigger an agentic lint pass to automatically resolve contradictions across synthesized documents.</p>
              <button 
                onClick={handleLintAgent}
                disabled={isLinting || isManualMode}
                className="bg-lobster text-white px-6 py-3 rounded-lg font-bold text-xs hover:opacity-90 transition-all flex items-center gap-3 uppercase tracking-widest shadow-lg shadow-lobster/20 disabled:opacity-50 cursor-pointer"
                title={isManualMode ? "Linting is locked in manual mode." : "Trigger Health Check"}
              >
                {isLinting ? <RefreshCw className="animate-spin" size={16} /> : (isManualMode ? <Save size={16} className="opacity-40" /> : <Activity size={16} />)} 
                {isLinting ? 'Scuttling the reef...' : (isManualMode ? 'Lint Health Check (Locked)' : 'Trigger Lint Health Check')}
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
      </div>
    </motion.article>
  );
};
