import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Clock, RefreshCw, Database, Package, Link, Activity, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoltEvent {
  id: number;
  page_id: string;
  action: string;
  summary: string;
  author: string;
  timestamp: string;
}

interface PearlRecord {
  page_id: string;
  title: string;
  type: string;
  author: string;
  confidence: number;
  relevance_score: number;
  last_updated: string;
  tags: string;
}

interface LedgerStats {
  pearl_count: number;
  link_count: number;
  molt_count: number;
  hatched: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  created:  'bg-green-500',
  updated:  'bg-blue-500',
  linted:   'bg-yellow-500',
  witnessed:'bg-purple-500',
  external: 'bg-orange-500',
  genesis:  'bg-lobster',
};

const AUTHOR_ICON: Record<string, string> = {
  Human:    '👤',
  LLM:      '🤖',
  System:   '⚙️',
  External: '🌊',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const GitHistory: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme: _theme }) => {
  const [history, setHistory]           = useState<MoltEvent[]>([]);
  const [pearls, setPearls]             = useState<PearlRecord[]>([]);
  const [stats, setStats]               = useState<LedgerStats | null>(null);
  const [isHatched, setIsHatched]       = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab]       = useState<'history' | 'registry'>('history');

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, historyRes, statsRes] = await Promise.all([
        fetch(`/api/ledger/status?_t=${Date.now()}`),
        fetch('/api/ledger/history'),
        fetch('/api/ledger/stats'),
      ]);

      const statusData = await statusRes.json();
      setIsHatched(statusData.hatched);

      if (statusData.hatched) {
        const historyData = await historyRes.json();
        const statsData   = await statsRes.json();
        setHistory(historyData.history || []);
        setStats(statsData);

        // Load pearls for registry tab
        const pearlsRes  = await fetch('/api/ledger/pearls');
        const pearlsData = await pearlsRes.json();
        setPearls(pearlsData.pearls || []);
      }
    } catch (err) {
      console.error('[MoltTimeline] Failed to fetch ledger data');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isHatched === null) {
    return (
      <div className="p-12 text-center text-text-primary/40 flex items-center justify-center gap-2">
        <RefreshCw className="animate-spin" size={16} /> Probing the reef geometry...
      </div>
    );
  }

  // ─── Unhatched State ───────────────────────────────────────────────────────

  if (!isHatched) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto py-24 px-6 text-center"
      >
        <Database className="mx-auto mb-6 text-text-primary/20" size={56} />
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight mb-3">
          No Database Hatched
        </h1>
        <p className="text-text-primary/50 font-medium mb-6 leading-relaxed">
          This is a <strong className="text-text-primary">Manually Molted Wiki</strong>. The Sovereign Ledger is dormant.<br />
          The filesystem is your source of truth. The knowledge lives in the files.
        </p>
        <div className="bg-bg-primary border border-dashed border-border-primary rounded-xl p-6 text-left space-y-3">
          <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-2">To Activate The Ledger</p>
          <p className="text-xs font-mono text-text-primary/70">Set in your <code className="bg-border-primary/50 px-1 rounded">.env</code> file:</p>
          <code className="block text-sm font-mono text-lobster bg-lobster/5 border border-lobster/20 rounded-lg p-4">
            HATCH_DATABASE=true
          </code>
          <p className="text-xs text-text-primary/50 italic">Then restart the reef. The Parity Guardian will perform a Genesis Molt on first run.</p>
        </div>
        <div className="mt-6 flex items-center gap-2 justify-center text-[10px] font-bold uppercase tracking-widest text-text-primary/30">
          <AlertCircle size={12} />
          <span>Manual git versioning in wiki/ is supported and ignored by the ledger.</span>
        </div>
      </motion.div>
    );
  }

  // ─── Active Ledger State ───────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-12 px-6"
    >
      {/* Header */}
      <div className="mb-8 border-b border-border-primary pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            <Database className="text-lobster" size={32} /> sovereign_ledger.db
          </h1>
          <p className="text-text-primary/50 font-medium mt-1">Geometric topology of the knowledge reef.</p>
        </div>
        <button
          onClick={handleRefresh}
          className={`p-2 hover:bg-border-primary/50 rounded-full transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
          title="Refresh Ledger State"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pearls', value: stats.pearl_count, icon: Package,  color: 'text-blue-500' },
            { label: 'Links',  value: stats.link_count,  icon: Link,     color: 'text-green-500' },
            { label: 'Molts',  value: stats.molt_count,  icon: Activity, color: 'text-lobster' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card-bg border border-border-primary rounded-xl p-5 flex items-center gap-4">
              <Icon className={color} size={24} />
              <div>
                <p className="text-2xl font-black text-text-primary">{value}</p>
                <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 bg-bg-primary border border-border-primary rounded-lg w-fit">
        {(['history', 'registry'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-lobster text-white'
                : 'text-text-primary/50 hover:text-text-primary'
            }`}
          >
            {tab === 'history' ? '⛓ Molt Log' : '🗺 Pearl Registry'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Molt History Tab ─────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2"
          >
            {history.length === 0 ? (
              <div className="text-text-primary/40 italic text-sm p-4 bg-bg-primary rounded-lg border border-dashed border-border-primary">
                No molts recorded yet. Modify a page to witness the first entry.
              </div>
            ) : history.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card-bg border border-border-primary rounded-lg p-4 flex items-start gap-4 hover:border-lobster/50 transition-all group"
              >
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className={`w-2 h-2 rounded-full ${ACTION_COLORS[event.action] || 'bg-gray-400'}`} />
                  <span className="text-lg leading-none">{AUTHOR_ICON[event.author] || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-black text-lobster bg-lobster/10 px-2 py-0.5 rounded uppercase tracking-widest">
                      {event.action}
                    </span>
                    <span className="text-[9px] text-text-primary/30 font-mono flex items-center gap-1">
                      <Clock size={9} /> {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text-primary group-hover:text-lobster transition-colors truncate">
                    {event.summary || event.page_id}
                  </p>
                  <p className="text-[10px] text-text-primary/40 font-mono mt-0.5">{event.page_id}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Pearl Registry Tab ───────────────────────────────────────────── */}
        {activeTab === 'registry' && (
          <motion.div
            key="registry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2"
          >
            {pearls.length === 0 ? (
              <div className="text-text-primary/40 italic text-sm p-4 bg-bg-primary rounded-lg border border-dashed border-border-primary">
                Registry is empty. The Genesis Molt will populate it on next scan.
              </div>
            ) : pearls.map(pearl => {
              const relevancePct = Math.round(pearl.relevance_score * 100);
              const tags: string[] = (() => { try { return JSON.parse(pearl.tags); } catch { return []; } })();
              return (
                <div
                  key={pearl.page_id}
                  className="bg-card-bg border border-border-primary rounded-lg p-4 hover:border-lobster/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{pearl.title}</p>
                      <p className="text-[10px] font-mono text-text-primary/40 mt-0.5">{pearl.page_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-black bg-border-primary/60 text-text-primary/50 px-2 py-0.5 rounded uppercase">
                        {pearl.type}
                      </span>
                      <div className="flex flex-col gap-1 min-w-[60px] text-right">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-lobster/40">
                          <span>Rel</span>
                          <span>{relevancePct}%</span>
                        </div>
                        <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                          <div className="h-full bg-lobster" style={{ width: `${relevancePct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((t: string) => (
                        <span key={t} className="text-[9px] bg-lobster/10 text-lobster/80 px-1.5 py-0.5 rounded font-bold">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/30">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-text-primary/30">
                          <span>Conf</span>
                          <span>{(pearl.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-0.5 w-full bg-border-primary/50 rounded-full overflow-hidden">
                          <div className="h-full bg-lobster/60" style={{ width: `${pearl.confidence * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-[9px] text-text-primary/30 font-bold uppercase tracking-tighter">
                        by {pearl.author}
                      </span>
                    </div>
                    <span className="text-[9px] text-text-primary/30 flex items-center gap-1 font-mono">
                      <Clock size={8} /> {pearl.last_updated}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer note */}
      <div className="mt-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-text-primary/20">
        <GitBranch size={10} />
        <span>Manual git in wiki/ is detected and ignored. Use it freely for external versioning.</span>
      </div>
    </motion.div>
  );
};
