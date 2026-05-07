import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Zap, Brain, RefreshCw, ChevronDown, ChevronUp, Activity } from 'lucide-react';

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

interface SweepResult {
  sweepId: string;
  candidates: number;
  reflections: number;
  promotions: number;
  duration: number;
}

// ─── Signal Type Styling ──────────────────────────────────────────────────────

const SIGNAL_STYLE: Record<string, { color: string; icon: string; label: string }> = {
  hot_pearl:       { color: 'bg-red-500',    icon: '🔥', label: 'Hot Pearl' },
  ghost_link:      { color: 'bg-purple-500', icon: '👻', label: 'Ghost Link' },
  island:          { color: 'bg-yellow-500', icon: '🏝️', label: 'Island' },
  stale:           { color: 'bg-gray-500',   icon: '🧊', label: 'Stale' },
  low_confidence:  { color: 'bg-orange-500', icon: '⚠️', label: 'Low Confidence' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DreamDiary: React.FC = () => {
  const [status, setStatus]             = useState<DreamStatus | null>(null);
  const [candidates, setCandidates]     = useState<DreamCandidate[]>([]);
  const [reflections, setReflections]   = useState<DreamReflection[]>([]);
  const [journal, setJournal]           = useState<string>('');
  const [isDreaming, setIsDreaming]     = useState(false);
  const [lastResult, setLastResult]     = useState<SweepResult | null>(null);
  const [activeTab, setActiveTab]       = useState<'status' | 'candidates' | 'journal' | 'reflections'>('status');
  const [expandedCandidate, setExpanded] = useState<number | null>(null);

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
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchReflections = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/reflections');
      if (res.ok) {
        const data = await res.json();
        setReflections(data.reflections || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchJournal = useCallback(async () => {
    try {
      const res = await fetch('/api/carapace/journal');
      if (res.ok) {
        const data = await res.json();
        setJournal(data.content || '');
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchCandidates();
    fetchReflections();
    fetchJournal();
  }, [fetchStatus, fetchCandidates, fetchReflections, fetchJournal]);

  // ─── Dream Trigger ──────────────────────────────────────────────────────────

  const triggerDream = async () => {
    setIsDreaming(true);
    try {
      const res = await fetch('/api/carapace/dream', { method: 'POST' });
      if (res.ok) {
        const result: SweepResult = await res.json();
        setLastResult(result);
        // Refresh all data after dream
        await Promise.all([fetchStatus(), fetchCandidates(), fetchReflections(), fetchJournal()]);
      }
    } catch { /* silent */ }
    setIsDreaming(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!status) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <RefreshCw className="animate-spin mr-2" size={16} /> Loading Carapace...
      </div>
    );
  }

  if (!status.hatched) {
    return (
      <div className="p-6 text-center">
        <Moon size={48} className="mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Carapace Not Hatched</h3>
        <p className="text-gray-500 text-sm">
          Set <code className="bg-gray-800 px-2 py-0.5 rounded text-lobster">HATCH_CARAPACE=true</code> and{' '}
          <code className="bg-gray-800 px-2 py-0.5 rounded text-lobster">HATCH_DATABASE=true</code> to activate.
        </p>
      </div>
    );
  }

  const tabs = [
    { key: 'status' as const,     label: 'Status',      icon: Activity },
    { key: 'candidates' as const, label: 'Candidates',  icon: Zap },
    { key: 'reflections' as const,label: 'Reflections', icon: Brain },
    { key: 'journal' as const,    label: 'Journal',     icon: Moon },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Moon size={20} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-200">Carapace Dreamer</h2>
          {status.running && (
            <span className="text-xs px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-full animate-pulse">
              Dreaming...
            </span>
          )}
        </div>
        <button
          onClick={triggerDream}
          disabled={isDreaming || status.running}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isDreaming ? <RefreshCw className="animate-spin" size={14} /> : <Moon size={14} />}
          {isDreaming ? 'Dreaming...' : 'Dream Now'}
        </button>
      </div>

      {/* Last Result Flash */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg text-sm"
          >
            <span className="text-indigo-300">
              💤 Sweep <code className="text-indigo-200">{lastResult.sweepId}</code>:{' '}
              {lastResult.candidates} candidates, {lastResult.reflections} reflections, {lastResult.promotions} promotions ({lastResult.duration}ms)
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Last Sweep" value={status.lastSweepId || 'Never'} />
          <StatCard label="Last Time" value={status.lastSweepTime ? new Date(status.lastSweepTime).toLocaleString() : 'Never'} />
          <StatCard label="Pearls" value={status.stats?.pearl_count?.toString() || '0'} />
          <StatCard label="Dreams" value={status.stats?.dream_count?.toString() || '0'} />
          <StatCard label="Molts" value={status.stats?.molt_count?.toString() || '0'} />
          <StatCard label="Links" value={status.stats?.link_count?.toString() || '0'} />
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No candidates yet. Trigger a dream sweep.</p>
          ) : (
            candidates.map(c => {
              const style = SIGNAL_STYLE[c.signal_type] || SIGNAL_STYLE.hot_pearl;
              const isExpanded = expandedCandidate === c.id;
              let meta: Record<string, any> = {};
              try { meta = JSON.parse(c.metadata); } catch {}

              return (
                <motion.div
                  key={c.id}
                  layout
                  className="bg-gray-800/50 rounded-lg p-3 cursor-pointer hover:bg-gray-800/80 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${style.color}`} />
                      <span className="text-sm text-gray-200 font-mono">{c.page_id}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                        {style.icon} {style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-mono">{c.score.toFixed(3)}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && meta.components && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-400 grid grid-cols-3 gap-1"
                      >
                        {Object.entries(meta.components).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-gray-500">{key}:</span>{' '}
                            <span className="text-gray-300">{(val as number).toFixed(3)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'reflections' && (
        <div className="space-y-3">
          {reflections.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No reflections yet. REM phase requires an OpenRouter API key.</p>
          ) : (
            reflections.map(r => (
              <div key={r.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">{r.theme}</span>
                </div>
                <p className="text-sm text-gray-300">{r.summary}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="bg-gray-800/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
          {journal ? (
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{journal}</pre>
          ) : (
            <p className="text-gray-500 text-sm text-center">No journal entries yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gray-800/50 rounded-lg p-3">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="text-sm text-gray-200 font-mono truncate">{value}</div>
  </div>
);
