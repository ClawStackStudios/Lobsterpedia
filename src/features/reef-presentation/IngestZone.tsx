import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, RefreshCw, Box, UploadCloud, XCircle, Tag, Plus, X } from 'lucide-react';

interface IngestZoneProps {
  onIngest: (title: string, text: string, tags?: string[]) => Promise<string>;
  suggestedTitle?: string;
  aiProvider?: string;
  openRouterModel?: string;
}

const LOCAL_STORAGE_KEY_TITLE = 'crustagent:draft_title';
const LOCAL_STORAGE_KEY_TEXT = 'crustagent:draft_text';
const LOCAL_STORAGE_KEY_TAGS = 'crustagent:draft_tags';

export const IngestZone: React.FC<IngestZoneProps> = ({ onIngest, suggestedTitle, aiProvider, openRouterModel }) => {
  const [sourceTitle, setSourceTitle] = useState(suggestedTitle || '');
  const [rawText, setRawText] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isMolting, setIsMolting] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [moltStatus, setMoltStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePinch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTitle || !rawText) return;

    setIsMolting(true);
    setMoltStatus('Agent scuttling through source material...');
    
    try {
      await onIngest(sourceTitle, rawText, suggestedTags);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TITLE);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TEXT);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TAGS);
      setSourceTitle('');
      setRawText('');
      setSuggestedTags([]);
    } finally {
      setIsMolting(false);
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
      className="max-w-[1000px] mx-auto py-16 px-6"
    >
      <div className="mb-12 text-center relative">
        <div className="w-16 h-16 bg-lobster/10 rounded-full flex items-center justify-center mx-auto mb-6 text-lobster border border-lobster/20 shadow-inner">
          <FileText size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight">Ingest Source DNA</h1>
        <p className="text-text-primary/50 font-medium leading-relaxed">Deposit raw text transcripts, or directly drop .pdf / .docx files. The agent will parse, extract, and integrate them into the reef metadata.</p>
        
        <AnimatePresence>
          {saveStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className={`absolute top-0 right-0 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded ${saveStatus.includes('IsCracked') ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'}`}
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

          <form onSubmit={handlePinch} className="space-y-6 bg-card-bg p-8 rounded-xl border border-border-primary shadow-sm relative">
            <div className="flex justify-between items-end">
              <div className="flex-1 mr-4">
                <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Pearl Identifier</label>
                <input 
                  type="text" 
                  required
                  disabled={isMolting}
                  value={sourceTitle}
                  onChange={e => setSourceTitle(e.target.value)}
                  placeholder="e.g. 'Karpathy AI OS Mental Model'" 
                  className="w-full p-4 border border-border-primary bg-bg-primary rounded-lg focus:border-lobster outline-none disabled:bg-bg-primary transition-all font-bold text-text-primary shadow-sm"
                />
              </div>
              { (sourceTitle || rawText) && (
                <button 
                  type="button" 
                  onClick={() => { setSourceTitle(''); setRawText(''); setSuggestedTags([]); localStorage.removeItem(LOCAL_STORAGE_KEY_TITLE); localStorage.removeItem(LOCAL_STORAGE_KEY_TEXT); localStorage.removeItem(LOCAL_STORAGE_KEY_TAGS); }}
                  className="h-[58px] px-4 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  <XCircle size={14} className="mr-2" /> Clear
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Raw Payload</label>
              <textarea 
                required
                disabled={isMolting}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste raw text or drop a file above for synthesis..." 
                className="w-full p-4 border border-border-primary rounded-lg h-[400px] font-mono text-sm focus:border-lobster outline-none resize-none disabled:bg-bg-primary transition-all bg-bg-primary text-text-primary/70 shadow-sm"
              />
            </div>

                <button 
                  type="submit" 
                  disabled={isMolting || !sourceTitle || !rawText}
                  className="w-full btn-dynamic-main py-5 rounded-lg font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl active:scale-[0.98]"
                >
              {isMolting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Box size={18} />
                  Synthesize Into Reef
                </>
              )}
            </button>
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
