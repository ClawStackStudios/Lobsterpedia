import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wrench, CheckCircle2, AlertTriangle, Link2, SearchX, Tag, Bot, Cpu } from 'lucide-react';
import { AIProvider } from '../shell-core/types';

interface MaintenanceZoneProps {
  issues: LintIssue[];
  onRefresh: () => void;
  onNavigate: (view: any, id?: string) => void;
  aiProvider: AIProvider;
  openRouterModel: string;
  isManualMode: boolean;
  onToggleManualMode: () => void;
  isModal?: boolean;
}

interface LintIssue {
  id: string;
  type: string;
  sourceId: string;
  targetId?: string;
  description: string;
}

export const MaintenanceZone: React.FC<MaintenanceZoneProps> = ({ 
  issues, onRefresh, onNavigate, openRouterModel, isManualMode, onToggleManualMode, isModal = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const stopFixingRef = React.useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({ scanInterval: '5m', autoIngest: false });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/wiki/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (e) {}
  };

  const saveSettings = async (newSettings: any) => {
    setIsSavingSettings(true);
    setSettings(newSettings);
    try {
      await fetch('/api/wiki/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch(e) {}
    setIsSavingSettings(false);
  };

  const handleFixIssue = async (issue: LintIssue, skipRefresh: boolean = false) => {
    setIsFixing(issue.id);
    try {
      const res = await fetch('/api/ai/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, model: openRouterModel })
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Fix applied but failed.';
        const debugInfo = data.debug ? ` | ${data.debug.message}` : '';
        throw new Error(errorMsg + debugInfo);
      }
      
      // Refresh global list if not skipping
      if (!skipRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setError(`Failed to fix ${issue.id}: ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsFixing(null);
    }
  };

  const handleFixAll = async () => {
    setIsFixingAll(true);
    setIsStopping(false);
    stopFixingRef.current = false;
    setError(null);
    try {
      // Process sequentially with a delay to respect OpenRouter rate limits
      for (const issue of issues) {
        if (stopFixingRef.current) {
          console.log("[CrustAgent] Maintenance fix-all sequence aborted by user.");
          break;
        }
        await handleFixIssue(issue, true);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
      }
      onRefresh(); // Single refresh after all fixes are complete
    } catch (err) {
      console.error(err);
    } finally {
      setIsFixingAll(false);
      setIsStopping(false);
      stopFixingRef.current = false;
    }
  };

  const handleStopFixing = () => {
    setIsStopping(true);
    stopFixingRef.current = true;
  };

  const handleRescan = async () => {
    setIsLoading(true);
    await onRefresh();
    setIsLoading(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'broken_link': return <Link2 size={16} className="text-red-500" />;
      case 'orphan': return <SearchX size={16} className="text-amber-500" />;
      case 'missing_tags': return <Tag size={16} className="text-blue-500" />;
      default: return <AlertTriangle size={16} className="text-orange-500" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${isModal ? 'p-6' : 'max-w-4xl mx-auto p-8'}`}
    >
      {!isModal && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
              <Wrench className="text-lobster" size={32} />
              Shipyard Maintenance
            </h1>
            <p className="text-text-primary/50 font-medium mt-2">
              Automated LLM linting and wiki self-healing.
            </p>
          </div>
        </div>
      )}

      {/* Control Bar (Moved into issue section if modal) */}
      <div className={`flex items-center justify-between mb-6 ${isModal ? 'bg-bg-primary p-4 rounded-2xl border border-border-primary sticky top-0 z-10 shadow-sm' : ''}`}>
        <div className="text-xs font-black uppercase tracking-widest text-text-primary/40">
           Structural integrity: <span className={issues.length > 0 ? 'text-amber-500' : 'text-green-500'}>{issues.length > 0 ? `${issues.length} Issues` : 'Optimal'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); handleRescan(); }}
            disabled={isFixingAll || isFixing !== null}
            className="px-4 py-2 bg-text-primary text-bg-primary border border-border-primary rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-colors disabled:opacity-50"
          >
            Rescan Hull
          </button>
          
          {issues.length > 0 && !isManualMode && (
            <div className="flex items-center gap-2">
              {isFixingAll ? (
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleStopFixing(); }}
                  disabled={isStopping}
                  className="px-4 py-2 bg-habitat-dark text-lobster border border-lobster/50 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-lobster/10 transition-colors flex items-center gap-2"
                >
                  {isStopping ? 'Stopping...' : 'Stop Fixing'}
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleFixAll(); }}
                  disabled={isFixing !== null}
                  className="px-4 py-2 bg-lobster text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-colors flex items-center gap-2"
                >
                  Apply All Fixes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md mb-6 font-medium text-sm">
          {error}
        </div>
      )}

      {!isModal && (
        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Master Control Panel */}
          <div className="bg-habitat-dark border border-lobster/30 rounded-lg shadow-xl p-6 text-white overflow-hidden relative group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-lobster/10 rounded-full blur-3xl group-hover:bg-lobster/20 transition-colors" />
             <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                <Cpu size={24} className="text-lobster" />
                Master System Protocol
             </h2>
             
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 relative">
                 <div>
                   <div className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                     Manual Mode Enforcement
                     {isManualMode && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-lobster"><CheckCircle2 size={14} /></motion.span>}
                   </div>
                   <div className="text-[10px] text-white/40 uppercase font-mono tracking-tighter">
                      Disable all automated LLM features (Synthesis, Self-Healing, Auto-Linking)
                   </div>
                 </div>
                 <button
                   disabled={isManualMode} // 🛡️ ENFORCED BLOCKER
                   onClick={onToggleManualMode}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-2 ring-white/10 ${isManualMode ? 'bg-lobster/50 cursor-not-allowed opacity-80' : 'bg-white/10'}`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isManualMode ? 'translate-x-6' : 'translate-x-1'}`} />
                   {isManualMode && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <Wrench size={10} className="text-lobster mix-blend-difference" />
                     </div>
                   )}
                 </button>
              </div>
              
              {isManualMode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-lobster/10 border border-lobster/20 rounded-lg flex items-center justify-between"
                >
                   <div className="text-[9px] font-black uppercase text-lobster tracking-[0.2em] animate-pulse">
                      // PROTOCOL: MANUAL_ONLY_ENFORCED
                   </div>
                   <div className="text-[8px] font-medium text-white/30 uppercase tracking-widest italic">
                      Contact Maintenance to unlock
                   </div>
                </motion.div>
              )}
          </div>

          {/* Settings Panel */}
          <div className={`bg-card-bg border border-border-primary rounded-lg shadow-sm p-6 transition-opacity ${isManualMode ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
               <Bot className="text-blue-500" size={20} />
               Automated System Settings
            </h2>
            <div className="flex items-center justify-between mb-4">
               <div>
                  <div className="font-bold text-text-primary/80 text-sm">Background File Scanning Interval</div>
                  <div className="text-xs text-text-primary/40">How frequently to scan the wiki/ dir for new files (PDF, docx, raw folders)</div>
               </div>
               <select 
                 value={settings.scanInterval} 
                 onChange={(e) => saveSettings({ ...settings, scanInterval: e.target.value })}
                 disabled={isSavingSettings}
                 className="bg-bg-primary border border-border-primary text-text-primary/70 text-sm rounded px-3 py-1.5 focus:border-lobster outline-none"
               >
                 <option value="off">Disabled</option>
                 <option value="30s">Every 30 seconds</option>
                 <option value="5m">Every 5 minutes</option>
                 <option value="30m">Every 30 minutes</option>
                 <option value="1h">Every hour</option>
               </select>
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <div className="font-bold text-text-primary/80 text-sm">LLM Auto-Ingest Pipeline</div>
                  <div className="text-xs text-text-primary/40">If enabled, the LLM will automatically parse and synthesize detected raw files into Markdown.</div>
               </div>
               <button
                  onClick={() => saveSettings({ ...settings, autoIngest: !settings.autoIngest })}
                  disabled={isSavingSettings}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoIngest ? 'bg-lobster' : 'bg-border-primary'}`}
               >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoIngest ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-text-primary/40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lobster"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-20 bg-card-bg rounded-xl border border-dashed border-border-primary">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-bold text-text-primary">Hull is sound.</h3>
          <p className="text-text-primary/50">No lint issues found across the wiki architecture.</p>
        </div>
      ) : isManualMode ? (
        <div className="text-center py-20 bg-card-bg rounded-xl border border-dashed border-border-primary flex flex-col items-center">
          <Wrench size={48} className="text-text-primary/10 mb-4" />
          <h3 className="text-lg font-bold text-text-primary/30 uppercase tracking-widest">Manual Maintenance Required</h3>
          <p className="text-text-primary/20 text-xs mt-2 uppercase tracking-tighter">LLM self-healing is currently offline per master protocol.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-md mb-6 flex gap-3 text-blue-400 text-sm">
             <Bot className="shrink-0 mt-0.5" size={18} />
             <p>The backend AI agent can automatically resolve these structurally problematic markdown files. The agent reads the context and rewrites pages independently.</p>
          </div>
          
          {issues.map(issue => (
            <div key={issue.id} className="p-4 bg-card-bg border border-border-primary rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-2 bg-bg-primary rounded-md">
                  {getIcon(issue.type)}
                </div>
                <div>
                  <h4 className="font-bold text-text-primary flex items-center gap-2">
                    {issue.type.replace('_', ' ').toUpperCase()}
                    <span className="text-xs bg-bg-primary text-text-primary/40 px-2 py-0.5 rounded cursor-pointer hover:bg-border-primary/50" onClick={() => onNavigate('article', issue.sourceId)}>
                      {issue.sourceId}.md
                    </span>
                  </h4>
                  <p className="text-sm text-text-primary/60 mt-1">{issue.description}</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); handleFixIssue(issue); }}
                disabled={isFixing === issue.id || isFixingAll}
                className="shrink-0 px-4 py-1.5 border border-lobster text-lobster hover:bg-lobster hover:text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center"
              >
                {isFixing === issue.id ? 'Fixing...' : 'Fix'}
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
