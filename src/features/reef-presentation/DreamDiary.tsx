import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, RefreshCw, Zap, Brain, BookOpen, Settings, AlertTriangle, FileText } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DreamStatus {
  hatched: boolean;
  running: boolean;
  lastSweepId: string | null;
  lastSweepTime: string | null;
  lastPhase: string | null;
  carapacePath: string;
  stats: { pearl_count: number; link_count: number; molt_count: number; dream_count: number } | null;
}

interface DreamCandidate {
  id: number;
  sweep_id: string;
  page_id: string;
  signal_type: string;
  score: number;
  metadata: string;
  created_at: string;
}

interface DreamReflection {
  id: number;
  sweep_id: string;
  theme: string;
  summary: string;
  related_ids: string;
  created_at: string;
}

interface DreamPromotion {
  id: number;
  sweep_id: string;
  source_ids: string;
  insight_path: string;
  score: number;
  promoted_at: string;
}

interface DiaryEntry {
  date: string;
  body: string;
}

interface WikiPagePreview {
  title: string;
  path: string;
  content: string;
  updatedAt: string;
  totalLines: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDiaryEntries(raw: string): DiaryEntry[] {
  if (!raw) return [];
  
  // Split the markdown on HRs or date headers. 
  // We limit the number of blocks to avoid memory issues with massive files.
  const blocks = raw.split(/\n---\n|\n# /).filter(b => b.trim().length > 0);
  
  // Only process the last 100 blocks to find the latest 50 valid entries
  const recentBlocks = blocks.slice(-100);
  const entries: DiaryEntry[] = [];
  
  for (const block of recentBlocks) {
    const lines = block.split('\n');
    let dateStr = "Unknown Date";
    const bodyLines = [];
    
    // Check if the first line is a date
    const firstLine = lines[0].trim();
    if (firstLine.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/) || firstLine.startsWith('**') || firstLine.startsWith('##')) {
      dateStr = firstLine.replace(/#/g, '').replace(/\*/g, '').trim();
      bodyLines.push(...lines.slice(1));
    } else {
      bodyLines.push(...lines);
    }
    
    // Safety: truncate extremely long entries
    let body = bodyLines.join('\n').trim();
    if (body.length > 5000) {
      body = body.substring(0, 5000) + "\n\n... [Entry Truncated for Performance] ...";
    }
    
    entries.push({ date: dateStr, body });
  }
  
  return entries.reverse().slice(0, 50); // Newest first, limit to 50
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DreamDiary: React.FC = () => {
  // State
  const [status, setStatus] = useState<DreamStatus | null>(null);
  const [candidates, setCandidates] = useState<DreamCandidate[]>([]);
  const [reflections, setReflections] = useState<DreamReflection[]>([]);
  const [promotions, setPromotions] = useState<DreamPromotion[]>([]);
  const [journalEntries, setJournalEntries] = useState<DiaryEntry[]>([]);
  
  const [isDreaming, setIsDreaming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'scene' | 'diary' | 'advanced'>('scene');
  const [diarySubTab, setDiarySubTab] = useState<'dreams' | 'insights' | 'palace'>('dreams');
  
  // Preview
  const [previewPage, setPreviewPage] = useState<WikiPagePreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/carapace/status?_t=${Date.now()}`);
      if (res.ok) setStatus(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/candidates');
      if (res.ok) setCandidates((await res.json()).candidates || []);
    } catch { /* silent */ }
  }, []);

  const fetchReflections = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/reflections');
      if (res.ok) setReflections((await res.json()).reflections || []);
    } catch { /* silent */ }
  }, []);

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/insights');
      if (res.ok) setPromotions((await res.json()).promotions || []);
    } catch { /* silent */ }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/journal');
      if (res.ok) {
        const raw = (await res.json()).content || '';
        setJournalEntries(parseDiaryEntries(raw));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchCandidates();
    fetchReflections();
    fetchPromotions();
    fetchJournal();
  }, [fetchStatus, fetchCandidates, fetchReflections, fetchPromotions, fetchJournal]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const triggerDream = async () => {
    setIsDreaming(true);
    try {
      const res = await fetch('/api/carapace/dream', { method: 'POST' });
      if (res.ok) {
        showToast('Dream sweep completed.');
        await Promise.all([fetchStatus(), fetchCandidates(), fetchReflections(), fetchPromotions(), fetchJournal()]);
      } else {
        showToast('Dream sweep failed.');
      }
    } catch {
      showToast('Error triggering dream.');
    }
    setIsDreaming(false);
  };

  const triggerAction = async (endpoint: string) => {
    try {
      const res = await fetch(`/api/carapace/action/${endpoint}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
      }
    } catch {
      showToast(`Error triggering ${endpoint}`);
    }
  };

  const openWikiPreview = async (path: string) => {
    setIsPreviewLoading(true);
    setPreviewPage(null);
    try {
      const res = await fetch(`/api/carapace/page?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        setPreviewPage(await res.json());
      } else {
        showToast('Failed to load wiki page');
      }
    } catch {
      showToast('Error loading wiki page');
    }
    setIsPreviewLoading(false);
  };

  // ─── Renders ────────────────────────────────────────────────────────────────

  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <RefreshCw className="animate-spin" size={24} />
        <span>Loading Carapace Mind...</span>
      </div>
    );
  }

  if (!status.hatched) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Moon size={48} className="mb-4 text-gray-600" />
        <h3 className="text-xl font-bold text-gray-300 mb-2">Carapace Dormant</h3>
        <p className="text-sm">Set HATCH_CARAPACE=true and HATCH_DATABASE=true to activate the subconscious.</p>
      </div>
    );
  }

  const renderScene = () => (
    <div className={`dreams h-full ${!status.running ? 'dreams--idle' : ''}`}>
      {/* Background Ambience */}
      <div className="dreams__glow"></div>
      
      {/* Floating Lobster - Large & SVG */}
      <div className="dreams__lobster dreams__lobster--large">
        <img 
          src="/assets/sleeping-lobster.svg" 
          alt="Sleeping Lobster" 
          className="w-full h-full drop-shadow-[0_20px_50px_rgba(230,57,70,0.3)] transition-all duration-1000" 
        />
      </div>

      <span className="dreams__z" style={{ animationDelay: '0s' }}>z</span>
      <span className="dreams__z" style={{ animationDelay: '1.3s', fontSize: '1.5rem', top: '30%', left: '60%' }}>z</span>
      <span className="dreams__z" style={{ animationDelay: '2.6s', fontSize: '2rem', top: '20%', left: '65%' }}>Z</span>

      {status.running && (
        <>
          <div className="dreams__bubble">
            <span className="dreams__bubble-text">Synthesizing the reef narrative...</span>
          </div>
          <div className="dreams__bubble-dot" style={{ top: 'calc(50% - 240px)', left: 'calc(50% - 180px)', width: '12px', height: '12px', animationDelay: '0.2s' }}></div>
        </>
      )}

      {/* Status Bar */}
      <div className="dreams__status bg-black/40 backdrop-blur-md p-4 rounded-tr-2xl border-t border-r border-white/10">
        <span className="dreams__status-label text-white/40">Mind State</span>
        <div className="dreams__status-detail flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${status.running ? 'bg-lobster animate-pulse shadow-[0_0_10px_#E63946]' : 'bg-white/20'}`}></div>
          <span className="text-white font-black uppercase tracking-widest text-[10px]">
            {status.running ? 'ACTIVE DREAMING' : 'IDLE (GATHERING SIGNAL)'}
          </span>
        </div>
        <p className="text-[10px] text-white/40 mt-1 font-mono uppercase">
          {promotions.length} Promoted · Next Sweep {status.lastSweepTime ? 'Scheduled' : 'Dormant'}
        </p>
      </div>

      {/* Phases */}
      <div className="dreams__phases bg-black/40 backdrop-blur-md p-4 rounded-tl-2xl border-t border-l border-white/10">
        <div className={`dreams__phase ${!status.running ? 'dreams__phase--off' : ''}`}>
          <div className={`dreams__phase-dot ${status.running ? 'dreams__phase-dot--on' : ''}`}></div>
          <span className="dreams__phase-name">Light</span>
        </div>
        <div className={`dreams__phase ${!status.running ? 'dreams__phase--off' : ''}`}>
          <div className={`dreams__phase-dot ${status.running ? 'dreams__phase-dot--on' : ''}`}></div>
          <span className="dreams__phase-name">REM</span>
        </div>
        <div className={`dreams__phase ${!status.running ? 'dreams__phase--off' : ''}`}>
          <div className={`dreams__phase-dot ${status.running ? 'dreams__phase-dot--on' : ''}`}></div>
          <span className="dreams__phase-name">Deep</span>
        </div>
      </div>
    </div>
  );

  const renderDiary = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Diary Sub-Tabs */}
      <div className="flex gap-1 p-1 bg-bg-primary border border-border-primary rounded-lg w-fit">
        <button onClick={() => setDiarySubTab('dreams')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${diarySubTab === 'dreams' ? 'bg-lobster text-white shadow-sm' : 'text-text-primary/50 hover:text-text-primary'}`}>Dreams (Log)</button>
        <button onClick={() => setDiarySubTab('insights')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${diarySubTab === 'insights' ? 'bg-lobster text-white shadow-sm' : 'text-text-primary/50 hover:text-text-primary'}`}>Insights (Promoted)</button>
        <button onClick={() => setDiarySubTab('palace')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all ${diarySubTab === 'palace' ? 'bg-lobster text-white shadow-sm' : 'text-text-primary/50 hover:text-text-primary'}`}>Palace (Wiki)</button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
        {diarySubTab === 'dreams' && (
          <div className="space-y-4">
            {journalEntries.length === 0 ? (
              <p className="text-text-primary/30 italic text-center py-12">No dreams recorded in the log.</p>
            ) : (
              journalEntries.map((entry, idx) => (
                <div key={idx} className="bg-bg-primary border border-border-primary rounded-xl p-5 hover:border-lobster/30 transition-all group">
                  <span className="text-[10px] font-black text-lobster uppercase tracking-widest mb-3 block border-b border-border-primary pb-2">{entry.date}</span>
                  <pre className="text-text-primary/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">{entry.body}</pre>
                </div>
              ))
            )}
          </div>
        )}

        {diarySubTab === 'insights' && (
          <div className="space-y-3">
            {promotions.length === 0 ? <p className="text-text-primary/30 italic text-center py-12">No insights promoted yet.</p> :
              promotions.map(p => (
                <div key={p.id} className="bg-bg-primary border border-border-primary p-4 rounded-xl flex justify-between items-center hover:border-lobster/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-lobster/10 flex items-center justify-center">
                      <Brain className="text-lobster" size={18} />
                    </div>
                    <div>
                      <span className="text-text-primary font-bold block">{p.insight_path}</span>
                      <span className="text-[9px] font-mono text-text-primary/40 uppercase tracking-tighter">Promoted {new Date(p.promoted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1 min-w-[80px]">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-lobster/40">
                        <span>Score</span>
                        <span>{(p.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                        <div className="h-full bg-lobster" style={{ width: `${p.score * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => { setDiarySubTab('palace'); openWikiPreview('insights/' + p.insight_path); }} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-lobster text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all">
                      Witness
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {diarySubTab === 'palace' && (
          <div className="h-full flex flex-col gap-4">
            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-primary/40">
                <RefreshCw className="animate-spin" size={24} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Traversing Palace Halls...</span>
              </div>
            ) : previewPage ? (
              <div className="bg-bg-primary border border-border-primary rounded-xl overflow-hidden shadow-inner flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-border-primary bg-card-bg">
                  <div>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{previewPage.title}</h3>
                    <p className="text-[9px] text-text-primary/40 font-mono">{previewPage.path} · {previewPage.totalLines} lines</p>
                  </div>
                  <button onClick={() => setPreviewPage(null)} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-border-primary/50 hover:bg-border-primary rounded transition-colors">Dismiss</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar bg-bg-primary">
                  <pre className="text-sm text-text-primary/80 whitespace-pre-wrap font-sans prose-lobster prose-invert max-w-none">{previewPage.content}</pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <BookOpen size={48} className="text-border-primary" />
                <p className="text-text-primary/40 font-black uppercase tracking-widest text-[10px] text-center max-w-xs">Select an insight to view its markdown representation in the machine wiki.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-bg-primary border border-border-primary rounded-xl p-5 mb-6 shadow-inner">
        <div className="flex justify-between items-start mb-6 border-b border-border-primary pb-4">
          <div>
            <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Daily Log Review</h3>
            <p className="text-sm text-text-primary/50 mt-1 font-medium">Review candidates waiting for promotion and maintain the Dream Cache.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={() => triggerAction('dedupe')} className="px-3 py-1.5 bg-border-primary/50 hover:bg-border-primary text-text-primary rounded text-[10px] font-black uppercase tracking-widest transition-all">Dedupe Diary</button>
            <button onClick={() => triggerAction('repair')} className="px-3 py-1.5 bg-border-primary/50 hover:bg-border-primary text-text-primary rounded text-[10px] font-black uppercase tracking-widest transition-all">Repair Cache</button>
            <button onClick={() => triggerAction('backfill')} className="px-3 py-1.5 bg-border-primary/50 hover:bg-border-primary text-text-primary rounded text-[10px] font-black uppercase tracking-widest transition-all">Backfill</button>
            <button onClick={() => triggerAction('reset')} className="px-3 py-1.5 border border-lobster/30 text-lobster hover:bg-lobster/5 rounded text-[10px] font-black uppercase tracking-widest transition-all">Reset State</button>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-text-primary/40 mb-3 uppercase tracking-[0.2em]">Candidates Waiting ({candidates.length})</h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {candidates.length === 0 ? <p className="text-text-primary/30 italic text-sm">No candidates currently staged.</p> :
              candidates.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 bg-bg-primary border border-border-primary rounded-lg hover:border-lobster/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <Zap size={14} className={c.signal_type === 'hot_pearl' ? 'text-lobster' : 'text-yellow-500'} />
                    <span className="text-sm font-bold text-text-primary font-mono">{c.page_id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-primary/40">
                    <span className="px-2 py-0.5 bg-border-primary/30 rounded">{c.signal_type.replace('_', ' ')}</span>
                  <div className="flex flex-col gap-1 min-w-[60px] text-right">
                    <span className="text-[9px] font-mono text-lobster/70 font-black">{(c.score * 100).toFixed(0)}%</span>
                    <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                      <div className="h-full bg-lobster" style={{ width: `${c.score * 100}%` }} />
                    </div>
                  </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dreams-page p-6 max-w-6xl mx-auto h-full flex flex-col gap-6 relative">
      
      {/* Top Header */}
      <div className="flex justify-between items-center shrink-0 relative z-50">
        <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
          <Moon className="text-lobster" size={32} /> carapace_dreamer.mind
        </h1>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {toastMessage && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[10px] font-black uppercase tracking-widest bg-lobster/10 text-lobster px-3 py-1.5 rounded border border-lobster/20"
              >
                {toastMessage}
              </motion.span>
            )}
          </AnimatePresence>
          <button 
            onClick={triggerDream} 
            disabled={isDreaming || status.running}
            className="flex items-center gap-2 px-4 py-2 bg-lobster hover:bg-lobster/90 disabled:bg-border-primary disabled:text-text-primary/30 text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
          >
            {isDreaming ? <RefreshCw className="animate-spin" size={14} /> : <Moon size={14} />}
            {isDreaming ? 'Sleeping...' : 'Force Dream'}
          </button>
        </div>
      </div>

      {/* Tabs - Red Theme consistent with Timeline */}
      <nav className="flex gap-1 p-1 bg-bg-primary border border-border-primary rounded-lg w-fit shrink-0 relative z-50">
        <button 
          className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'scene' ? 'bg-lobster text-white shadow-md' : 'text-text-primary/50 hover:text-text-primary'}`} 
          onClick={() => setActiveTab('scene')}
        >
          Scene
        </button>
        <button 
          className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'diary' ? 'bg-lobster text-white shadow-md' : 'text-text-primary/50 hover:text-text-primary'}`} 
          onClick={() => setActiveTab('diary')}
        >
          Diary
        </button>
        <button 
          className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'advanced' ? 'bg-lobster text-white shadow-md' : 'text-text-primary/50 hover:text-text-primary'}`} 
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </nav>

      {/* Content Area */}
      <div className={`flex-1 min-h-0 rounded-2xl overflow-hidden transition-all duration-500 ${activeTab === 'scene' ? 'p-0 shadow-2xl' : 'bg-card-bg border border-border-primary p-6 shadow-xl'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full"
          >
            {activeTab === 'scene' && renderScene()}
            {activeTab === 'diary' && renderDiary()}
            {activeTab === 'advanced' && renderAdvanced()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};
