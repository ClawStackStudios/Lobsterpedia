import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, RefreshCw, Box, UploadCloud, XCircle, Tag, Plus, X, Monitor, Cpu, Folder, PlusCircle, Check, Eye, Save,
  Heading1, Heading2, Heading3, Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Code, Sigma, Type,
  Network, Search, ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { Reef } from '../shell-core/types';

interface IngestZoneProps {
  reef: Reef;
  onIngest: (title: string, text: string, tags?: string[]) => Promise<string>;
  suggestedTitle?: string;
  aiProvider?: string;
  openRouterModel?: string;
  onRefresh?: () => void;
}

const LOCAL_STORAGE_KEY_TITLE = 'crustagent:draft_title';
const LOCAL_STORAGE_KEY_TEXT = 'crustagent:draft_text';
const LOCAL_STORAGE_KEY_TAGS = 'crustagent:draft_tags';
const LOCAL_STORAGE_KEY_MANUAL = 'crustagent:ingest_manual_mode';

export const IngestZone: React.FC<IngestZoneProps> = ({ reef, onIngest, suggestedTitle, aiProvider, openRouterModel }) => {
  const [sourceTitle, setSourceTitle] = useState(suggestedTitle || '');
  const [rawText, setRawText] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isMolting, setIsMolting] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [moltStatus, setMoltStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Manual Mode State
  const [isManualMode, setIsManualMode] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MANUAL);
    return saved === null ? true : saved === 'true'; // Default to ON for release
  });
  const [selectedCategory, setSelectedCategory] = useState('root');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setRawText(newText);
    
    // Focus back and set cursor position after re-render
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + before.length + selection.length + after.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Restore draft from local storage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem(LOCAL_STORAGE_KEY_TITLE);
    const savedText = localStorage.getItem(LOCAL_STORAGE_KEY_TEXT);
    const savedTags = localStorage.getItem(LOCAL_STORAGE_KEY_TAGS);
    
    if (savedTitle) setSourceTitle(savedTitle);
    else if (suggestedTitle) setSourceTitle(suggestedTitle);
    
    if (savedText) setRawText(savedText);
    if (savedTags) {
      try {
        const parsed = JSON.parse(savedTags);
        if (Array.isArray(parsed)) setSuggestedTags(parsed);
      } catch (e) {}
    }
  }, [suggestedTitle]);

  // Auto-save draft changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceTitle || rawText || (suggestedTags && suggestedTags.length > 0)) {
        localStorage.setItem(LOCAL_STORAGE_KEY_TITLE, sourceTitle);
        localStorage.setItem(LOCAL_STORAGE_KEY_TEXT, rawText);
        localStorage.setItem(LOCAL_STORAGE_KEY_TAGS, JSON.stringify(suggestedTags || []));
        setSaveStatus('Draft secured in local habitat.');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [sourceTitle, rawText, suggestedTags]);

  // Persist manual mode preference
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MANUAL, String(isManualMode));
  }, [isManualMode]);

  const handlePinch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTitle || !rawText) return;

    if (isManualMode) {
      handleManualSave();
      return;
    }

    setIsMolting(true);
    setMoltStatus('Agent scuttling through source material...');
    
    try {
      await onIngest(sourceTitle, rawText, suggestedTags);
      clearDraft();
    } finally {
      setIsMolting(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_TITLE);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TEXT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TAGS);
    setSourceTitle('');
    setRawText('');
    setSuggestedTags([]);
    setSaveStatus('Draft purged.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleManualSave = async () => {
    if (!sourceTitle || !rawText) return;
    setIsMolting(true);
    setMoltStatus('Manually securing document into reef...');
    
    const slug = sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = isCreatingCategory ? newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : selectedCategory;
    const finalId = category === 'root' ? slug : `${category}/${slug}`;

    try {
      // If new category, we need to ensure folder and index exist
      if (isCreatingCategory && newCategoryName) {
         await fetch('/api/wiki/mkdir', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ path: category })
         });
         
         // Create a simple sub-index for the new category
         await fetch('/api/wiki/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             id: `${category}/${category}-index`,
             title: `${newCategoryName} Index`,
             type: 'system',
             content: `# ${newCategoryName} Index\n\nAutomatically generated for manual category expansion.\n\n## Articles\n- [[${slug}]]`,
             tags: [category, 'index']
           })
         });
      }

      const res = await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalId,
          title: sourceTitle,
          content: rawText,
          tags: suggestedTags,
          author: 'Manual User',
          links: ['index'], // Default link to root index
          type: category === 'root' ? 'concept' : category
        })
      });

      if (!res.ok) throw new Error("Manual save failed at the bridge.");
      
      clearDraft();
      setSaveStatus(`Sovereign file secured: ${finalId}.md`);
      // Trigger navigation or refresh? App.tsx handles navigation if we use onIngest, 
      // but here we are doing a direct save for full control.
      // Let's call onIngest anyway but with a flag? 
      // Or just let the user see the success and navigate themselves.
      // Better: we refresh the reef. 
      onRefresh?.();
    } catch (err) {
      console.error(err);
      setSaveStatus("IsCracked: Manual save failed.");
    } finally {
      setIsMolting(false);
      setMoltStatus('');
    }
  };

  const suggestTags = async () => {
    if (!rawText) return;
    setIsSuggestingTags(true);
    try {
      const res = await fetch('/api/ai/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the following text and suggest 5-8 relevant, professional tags for a knowledge base. Output ONLY a comma-separated list of tags.\n\nTEXT:\n${rawText.substring(0, 5000)}`,
          model: openRouterModel || "google/gemini-2.0-flash-exp"
        })
      });
      const data = await res.json();
      const content = data.choices && data.choices.length > 0 ? data.choices[0].message.content : data.text;
      if (content) {
        const tags = content.split(',').map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '')).filter(Boolean);
        // Deduplicate with existing
        setSuggestedTags(prev => Array.from(new Set([...prev, ...tags])));
      }
    } catch (err) {
      console.error("Failed to suggest tags", err);
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const addTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
    if (tag && !suggestedTags.includes(tag)) {
      setSuggestedTags([...suggestedTags, tag]);
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setSuggestedTags((suggestedTags || []).filter(t => t !== tag));
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.rtf'];
    const fileName = file.name.toLowerCase();
    const isSupported = supportedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isSupported) {
      setSaveStatus('IsCracked: Unsupported file type. Please use .pdf, .docx, .txt, .md, or .rtf.');
      setTimeout(() => setSaveStatus(''), 5000);
      return;
    }

    setIsMolting(true);
    setMoltStatus(`Extracting DNA from ${file.name}...`);
    setSaveStatus('');
    
    if (!sourceTitle) {
      setSourceTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/wiki/parse', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error("Failed to parse pearl.");
      const data = await res.json();
      
      if (data.text) {
        setRawText(prev => prev ? prev + '\n\n' + data.text : data.text);
        setSaveStatus(`Successfully parsed ${file.name}`);
        setTimeout(() => setSaveStatus(''), 4000);
        // Automatically trigger tag suggestion after parsing if text is long enough
        if (data.text.length > 100) {
          // Wrap in a tiny delay to ensure UI reflects new rawText? or just use data.text directly if I were to pass it.
          // For now, let's just let the user click the button to avoid excessive AI cost.
        }
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("IsCracked: Exoskeleton cracked while parsing file.");
      setTimeout(() => setSaveStatus(''), 4000);
    } finally {
      setIsMolting(false);
      setMoltStatus('');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1200px] mx-auto py-12 px-6"
    >
      {/* Immersive Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-habitat-dark/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full h-full max-w-5xl bg-bg-primary rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-primary bg-card-bg flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-lobster/10 rounded-xl flex items-center justify-center text-lobster">
                      <Eye size={20} />
                   </div>
                   <div>
                      <h3 className="text-lg font-black uppercase tracking-widest text-text-primary leading-tight">Synthesis Preview</h3>
                      <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-tighter">Reviewing: {sourceTitle || 'Untitled Draft'}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-lobster/10 text-text-primary/40 hover:text-lobster rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar bg-bg-primary">
                <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
                  <h1 className="text-4xl font-extrabold text-text-primary mb-8 tracking-tight border-b border-border-primary pb-4">{sourceTitle}</h1>
                  
                  {suggestedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                       {suggestedTags.map(tag => (
                         <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-bg-primary border border-border-primary text-text-primary/40 rounded">#{tag}</span>
                       ))}
                    </div>
                  )}

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
                    {rawText}
                  </ReactMarkdown>
                </div>
              </div>
              
              <div className="p-6 bg-card-bg border-t border-border-primary flex justify-end gap-4">
                 <button 
                  onClick={() => setShowPreview(false)}
                  className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-text-primary/50 hover:text-text-primary transition-colors"
                >
                  Return to Editor
                </button>
                <button 
                  onClick={() => { setShowPreview(false); handleManualSave(); }}
                  disabled={isMolting}
                  className="px-8 py-3 bg-lobster text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-lobster/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <Save size={16} />
                  {isMolting ? 'Securing...' : 'Commit to Reef'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-lobster/10 rounded-2xl flex items-center justify-center text-lobster border border-lobster/20 shadow-inner">
               <FileText size={24} />
             </div>
             <div>
                <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Ingest Source DNA</h1>
                <p className="text-text-primary/50 font-medium text-sm">Deposit raw materials and integrate them into the knowledge reef.</p>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-habitat-dark p-1 rounded-xl border border-white/5 flex gap-1 shadow-2xl relative">
            <button 
              onClick={() => setIsManualMode(true)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isManualMode ? 'bg-lobster text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
                <Monitor size={14} /> Manual Mode
            </button>
            <button 
              disabled={true}
              title="AI Synthesis is locked for release hardening."
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-white/10 cursor-not-allowed grayscale"
            >
                <Cpu size={14} /> AI Synthesis (Locked)
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-black text-amber-500 uppercase tracking-tighter">
             <Save size={10} /> Safe Protocol: Manual-Only Active
          </div>
        </div>
        
        <AnimatePresence>
          {saveStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className={`absolute -top-12 right-0 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded shadow-xl ${saveStatus.includes('IsCracked') ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}
            >
              {saveStatus}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative overflow-hidden cursor-pointer ${isDragging ? 'border-lobster bg-lobster/5 scale-[1.02]' : 'border-border-primary bg-bg-primary hover:border-lobster/50 hover:bg-lobster/[0.02]'}`}
          >
            {isMolting ? (
              <div className="flex flex-col items-center justify-center h-full text-lobster py-4">
                 <RefreshCw className="animate-spin mb-3" size={32} />
                 <div className="text-sm font-bold tracking-tight">{moltStatus}</div>
                 <div className="w-48 h-1 bg-lobster/20 rounded-full mt-4 overflow-hidden">
                   <div className="h-full bg-lobster animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '60%' }} />
                 </div>
              </div>
            ) : (
              <>
                <UploadCloud className={`mx-auto mb-3 ${isDragging ? 'text-lobster' : 'text-text-primary/40'}`} size={32} />
                <p className="text-sm font-bold text-text-primary/60 mb-2">Drag and drop file to extract pearl</p>
                <p className="text-xs text-text-primary/40 font-medium mb-4">Supports .pdf, .docx, .txt, .md, .rtf</p>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-card-bg border border-border-primary px-4 py-2 rounded text-xs font-bold text-text-primary/60 shadow-sm hover:border-lobster cursor-pointer transition-colors"
                >
                  Browse Files
                </button>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.docx,.txt,.md,.rtf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {isManualMode && (
            <div className="bg-card-bg p-8 rounded-xl border border-border-primary shadow-sm space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Folder size={12} /> Reef Destination
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button 
                    type="button"
                    onClick={() => { setSelectedCategory('root'); setIsCreatingCategory(false); }}
                    className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'root' && !isCreatingCategory ? 'bg-lobster text-white border-lobster shadow-lg shadow-lobster/20' : 'text-text-primary/40 border-border-primary hover:border-lobster/50'}`}
                  >
                    / root
                  </button>
                  {/* Dynamically extract categories from reef */}
                  {Array.from(new Set(Object.values(reef).map(p => p.type))).filter(t => t && t !== 'system' && t !== 'concepts' && t !== 'concept').concat(['concepts']).sort().map(cat => (
                    <button 
                      key={cat}
                      type="button"
                      onClick={() => { setSelectedCategory(cat); setIsCreatingCategory(false); }}
                      className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat && !isCreatingCategory ? 'bg-lobster text-white border-lobster shadow-lg shadow-lobster/20' : 'text-text-primary/40 border-border-primary hover:border-lobster/50'}`}
                    >
                      {cat}/
                    </button>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isCreatingCategory ? 'bg-habitat-dark text-lobster border-lobster' : 'text-text-primary/20 border-dashed border-border-primary hover:border-lobster/50'}`}
                  >
                    <PlusCircle size={12} /> New
                  </button>
                </div>

                {isCreatingCategory && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4"
                  >
                    <input 
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name..."
                      className="w-full p-3 bg-bg-primary border border-border-primary rounded-lg text-xs font-bold text-text-primary focus:border-lobster outline-none"
                    />
                    <p className="text-[9px] text-text-primary/30 mt-2 italic px-1">A new directory and index catalyst will be synthesized upon commit.</p>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handlePinch} className="space-y-6 bg-card-bg p-8 rounded-xl border border-border-primary shadow-sm relative">
            <div className="flex justify-between items-end">
              <div className="flex-1 mr-4">
                <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Pearl Identifier</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    disabled={isMolting}
                    value={sourceTitle}
                    onChange={e => setSourceTitle(e.target.value)}
                    placeholder="e.g. 'Karpathy AI OS Mental Model'" 
                    className="w-full p-4 border border-border-primary bg-bg-primary rounded-lg focus:border-lobster outline-none disabled:bg-bg-primary transition-all font-bold text-text-primary shadow-sm"
                  />
                  {sourceTitle && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-text-primary/20 uppercase">
                       {sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md
                    </div>
                  )}
                </div>
              </div>
              { (sourceTitle || rawText) && (
                <button 
                  type="button" 
                  onClick={clearDraft}
                  className="h-[58px] px-4 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  <XCircle size={14} className="mr-2" /> Clear
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Raw Payload</span>
                {isManualMode && (
                  <span className="text-[8px] font-medium text-lobster lowercase italic">Markdown & KaTeX supported</span>
                )}
              </label>

              {/* Editor Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-habitat-dark/50 border border-border-primary border-b-0 rounded-t-lg backdrop-blur-sm">
                <button type="button" onClick={() => insertAtCursor('# ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Heading 1"><Heading1 size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('## ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Heading 2"><Heading2 size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('### ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Heading 3"><Heading3 size={14}/></button>
                <div className="w-px h-4 bg-border-primary mx-1" />
                <button type="button" onClick={() => insertAtCursor('**', '**')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Bold"><Bold size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('_', '_')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Italic"><Italic size={14}/></button>
                <div className="w-px h-4 bg-border-primary mx-1" />
                <button type="button" onClick={() => insertAtCursor('[[', ']]')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Wiki Link"><LinkIcon size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('[', '](url)')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="External Link"><LinkIcon size={12}/></button>
                <div className="w-px h-4 bg-border-primary mx-1" />
                <button type="button" onClick={() => insertAtCursor('- ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Bullet List"><List size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('1. ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Ordered List"><ListOrdered size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('> ', '')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Quote"><Quote size={14}/></button>
                <div className="w-px h-4 bg-border-primary mx-1" />
                <button type="button" onClick={() => insertAtCursor('```\n', '\n```')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="Code Block"><Code size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('$$ ', ' $$')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="KaTeX Block"><Sigma size={14}/></button>
                <button type="button" onClick={() => insertAtCursor('$', '$')} className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors" title="KaTeX Inline"><Sigma size={10}/></button>
              </div>

              <textarea 
                ref={textareaRef}
                required
                disabled={isMolting}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={isManualMode ? "Write your sovereign document here..." : "Paste raw text or drop a file above for synthesis..."} 
                className="w-full p-4 border border-border-primary rounded-b-lg h-[400px] font-mono text-sm focus:border-lobster outline-none resize-none disabled:bg-bg-primary transition-all bg-bg-primary text-text-primary/70 shadow-sm"
              />

              {isManualMode && (
                <div className="mt-4 p-4 bg-habitat-dark/20 border border-border-primary rounded-xl overflow-hidden">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <Network size={14} className="text-lobster" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-text-primary/60">Semantic Connectors</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsSearchingLinks(!isSearchingLinks)}
                        className="text-[9px] font-bold text-lobster uppercase tracking-tighter hover:underline"
                      >
                        {isSearchingLinks ? 'Close Connectors' : 'Add Cross-Reference'}
                      </button>
                   </div>

                   {isSearchingLinks && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       className="space-y-3"
                     >
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                           {Object.values(reef)
                             .filter(p => !p.id.includes('-index') && (p.title.toLowerCase().includes(linkSearchQuery.toLowerCase()) || p.id.toLowerCase().includes(linkSearchQuery.toLowerCase())))
                             .slice(0, 10)
                             .map(p => (
                               <button 
                                 key={p.id}
                                 type="button"
                                 onClick={() => {
                                   const linkStr = `\n\n## References\n- [[${p.id}]]`;
                                   // If References already exists, just add the list item
                                   if (rawText.includes('## References')) {
                                     setRawText(rawText + `\n- [[${p.id}]]`);
                                   } else {
                                     setRawText(rawText + linkStr);
                                   }
                                   setIsSearchingLinks(false);
                                 }}
                                 className="flex items-center justify-between p-2 bg-bg-primary border border-border-primary rounded hover:border-lobster transition-all group"
                               >
                                 <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black text-text-primary/80 group-hover:text-lobster truncate max-w-[150px]">{p.title}</span>
                                    <span className="text-[8px] font-mono text-text-primary/20">{p.id}</span>
                                 </div>
                                 <ArrowRight size={10} className="text-text-primary/20 group-hover:text-lobster" />
                               </button>
                             ))}
                        </div>
                     </motion.div>
                   )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {isManualMode && (
                <button 
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={!rawText}
                  className="flex-1 py-5 border border-lobster text-lobster rounded-lg font-black text-xs uppercase tracking-[0.2em] hover:bg-lobster/5 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-30"
                >
                  <Eye size={18} /> Preview
                </button>
              )}
              
              <button 
                type="submit" 
                disabled={isMolting || !sourceTitle || !rawText}
                className={`flex-[2] py-5 rounded-lg font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] transition-all ${isManualMode ? 'bg-lobster text-white hover:bg-lobster/90' : 'btn-dynamic-main'}`}
              >
                {isMolting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    {isManualMode ? 'Securing...' : 'Synthesizing...'}
                  </>
                ) : (
                  <>
                    {isManualMode ? <Check size={18} /> : <Box size={18} />}
                    {isManualMode ? 'Commit to Reef' : 'Synthesize Into Reef'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-card-bg p-6 rounded-xl border border-border-primary shadow-sm h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest flex items-center gap-2">
                <Tag size={12}/> Semantic Labels
              </h3>
              <button 
                onClick={suggestTags}
                disabled={isSuggestingTags || !rawText}
                className="text-[9px] font-bold text-lobster hover:underline uppercase tracking-tighter disabled:opacity-30 flex items-center gap-1"
              >
                {isSuggestingTags ? <RefreshCw size={10} className="animate-spin"/> : <RefreshCw size={10}/>}
                Suggest
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {suggestedTags.length === 0 ? (
                  <p className="text-[10px] text-text-primary/30 italic">No tags assigned yet.</p>
                ) : (
                  suggestedTags.map(tag => (
                    <span key={tag} className="bg-bg-primary border border-border-primary px-2 py-1 rounded-md text-[10px] font-bold text-text-primary/70 flex items-center gap-1 hover:border-lobster transition-colors group">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <form onSubmit={addTag} className="flex gap-2">
                <input 
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Add manual tag..."
                  className="flex-1 bg-bg-primary border border-border-primary rounded px-3 py-2 text-[10px] font-bold text-text-primary outline-none focus:border-lobster"
                />
                <button type="submit" className="p-2 bg-border-primary hover:bg-lobster hover:text-white rounded text-text-primary/50 transition-all">
                  <Plus size={14} />
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-border-primary">
              <p className="text-[9px] font-medium text-text-primary/30 leading-relaxed italic">
                Tags help the agent build a semantic map. Suggested tags are derived from LLM analysis of the raw payload before synthesis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
