import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, ShieldAlert, Database, Trash2, Cpu, Bot, CheckCircle2, X, Settings2, Info, Search } from 'lucide-react';
import { AIProvider } from '../shell-core/types';
import { MaintenanceZone } from './MaintenanceZone';

interface ShipyardViewProps {
  issues: any[];
  onRefreshIssues: () => void;
  onNavigate: (view: any, id?: string) => void;
  aiProvider: AIProvider;
  openRouterModel: string;
  isManualMode: boolean;
  onToggleManualMode: () => void;
}

export const ShipyardView: React.FC<ShipyardViewProps> = ({ 
  issues, 
  onRefreshIssues, 
  onNavigate, 
  aiProvider, 
  openRouterModel, 
  isManualMode, 
  onToggleManualMode 
}) => {
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) setSystemStatus(await res.json());
      } catch (e) {}
    };
    fetchStatus();
  }, []);

  const handleHardReset = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/system/reset-database', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResetMessage('Database purged and LOCKED. The ledger is now a clean slate.');
        setTimeout(() => {
          setIsResetConfirmOpen(false);
          setResetMessage(null);
          window.location.reload(); // Refresh to clear all state
        }, 2000);
      } else {
        throw new Error(data.error || 'Reset failed.');
      }
    } catch (err) {
      setResetMessage(`Error: ${(err as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAuthorizeGenesis = async () => {
    try {
       const res = await fetch('/api/system/authorize-genesis', { method: 'POST' });
       if (res.ok) {
         window.location.reload();
       }
    } catch (e) {}
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-8">
      <div className="mb-10 border-b border-border-primary pb-8">
        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-4">
          <Settings2 className="text-lobster" size={36} />
          Shipyard Control Center
        </h1>
        <p className="text-text-primary/50 font-medium mt-3 text-lg">
          Master administrative protocols and habitat infrastructure management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* System Protocol Card */}
        <div className="bg-habitat-dark border border-lobster/30 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-lobster/5 rounded-full blur-3xl group-hover:bg-lobster/10 transition-colors" />
          
          <div className="flex items-center gap-4 mb-8">
             <div className="p-3 bg-lobster/10 rounded-xl text-lobster border border-lobster/20">
               <Cpu size={24} />
             </div>
             <div>
               <h2 className="text-xl font-black uppercase tracking-widest">System Protocol</h2>
               <p className="text-[10px] font-bold text-lobster/60 uppercase tracking-widest mt-1">Operational Logic Locks</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group/item">
               <div className="flex-1 pr-4">
                 <div className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                   Manual Mode
                   {isManualMode && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-lobster"><CheckCircle2 size={14} /></motion.span>}
                 </div>
                 <div className="text-[10px] text-white/40 uppercase font-mono tracking-tighter leading-relaxed">
                    Disable all automated LLM features (Synthesis, Self-Healing, Auto-Linking).
                 </div>
               </div>
                <button
                  disabled
                  title="System is hard-locked to Manual Mode"
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ring-2 ring-white/10 opacity-50 cursor-not-allowed ${isManualMode ? 'bg-lobster shadow-[0_0_15px_rgba(230,57,70,0.4)]' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${isManualMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="p-5 bg-lobster/5 border border-lobster/10 rounded-2xl flex items-start gap-4">
               <Info size={16} className="text-lobster shrink-0 mt-0.5" />
               <p className="text-[10px] font-medium text-white/50 leading-relaxed uppercase tracking-wider">
                 Manual Mode is the primary security lock for the reef. When engaged, the LLM will not attempt to mutate any documents without explicit user intervention.
               </p>
            </div>
          </div>
        </div>

        {/* Maintenance Operations Card */}
        <div className="bg-card-bg border border-border-primary rounded-2xl shadow-xl p-8 relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-8">
             <div className="p-3 bg-bg-primary rounded-xl text-text-primary/70 border border-border-primary">
               <Wrench size={24} />
             </div>
             <div>
               <h2 className="text-xl font-black uppercase tracking-widest text-text-primary">Maintenance</h2>
               <p className="text-[10px] font-bold text-text-primary/30 uppercase tracking-widest mt-1">Infrastructure & Health</p>
             </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => !isManualMode && setIsMaintenanceOpen(true)}
              disabled={isManualMode}
              className={`w-full group/btn relative flex items-center justify-between p-5 rounded-2xl border transition-all overflow-hidden ${
                isManualMode 
                ? 'opacity-60 cursor-not-allowed border-border-primary bg-bg-primary/50' 
                : 'border-border-primary bg-bg-primary hover:border-lobster'
              }`}
            >
              <div className="relative z-10 text-left">
                <div className="text-sm font-black text-text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                  Habitat Maintenance Protocol
                  {isManualMode && <ShieldAlert size={14} className="text-lobster" />}
                </div>
                <div className="text-[10px] text-text-primary/40 uppercase tracking-widest font-bold">
                  {isManualMode ? 'Locked: Requires Automatic Mode' : 'Scan for structural issues and run self-healing.'}
                </div>
              </div>
              <div className={`relative z-10 w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                isManualMode ? 'bg-bg-primary border-border-primary' : 'bg-bg-primary border-border-primary group-hover/btn:bg-lobster group-hover/btn:border-lobster'
              }`}>
                <Wrench size={18} className={`transition-colors ${isManualMode ? 'text-text-primary/30' : 'text-text-primary group-hover/btn:text-white'}`} />
              </div>
            </button>

            <button 
              onClick={onRefreshIssues}
              className="w-full group/btn relative flex items-center justify-between p-5 rounded-2xl border border-lobster/20 bg-lobster/[0.02] hover:bg-lobster/[0.05] hover:border-lobster/40 transition-all"
            >
              <div className="text-left">
                <div className="text-sm font-black text-lobster uppercase tracking-wider mb-1">Manual Habitat Scuttle</div>
                <div className="text-[10px] text-lobster/60 uppercase tracking-widest font-bold">Perform a non-destructive hull scan (Witness Layer).</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-lobster/10 border border-lobster/20 flex items-center justify-center group-hover/btn:bg-lobster group-hover/btn:border-lobster transition-colors">
                <Search size={18} className="text-lobster group-hover/btn:text-white transition-colors" />
              </div>
            </button>

            <button 
              onClick={() => !isManualMode && setIsResetConfirmOpen(true)}
              disabled={isManualMode}
              className={`w-full group/btn relative flex items-center justify-between p-5 rounded-2xl border transition-all ${
                isManualMode 
                ? 'opacity-60 cursor-not-allowed border-border-primary bg-bg-primary/50' 
                : 'border-red-500/20 bg-red-500/[0.02] hover:bg-red-500/[0.05] hover:border-red-500/40'
              }`}
            >
              <div className="text-left">
                <div className="text-sm font-black text-red-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  Hard Reset Database
                  {isManualMode && <ShieldAlert size={14} className="text-red-500" />}
                </div>
                <div className="text-[10px] text-red-500/40 uppercase tracking-widest font-bold">
                  {isManualMode ? 'Locked: Requires Automatic Mode' : 'Irreversibly purge the Sovereign Ledger (habitat.db).'}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                isManualMode ? 'bg-bg-primary border-border-primary' : 'bg-red-500/10 border-red-500/20 group-hover/btn:bg-red-500 group-hover/btn:border-red-500'
              }`}>
                <Trash2 size={18} className={`transition-colors ${isManualMode ? 'text-red-500/30' : 'text-red-500 group-hover/btn:text-white'}`} />
              </div>
            </button>

            {systemStatus?.hatch_lock && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-lobster/5 border border-lobster/20 rounded-2xl space-y-4"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-lobster shrink-0 mt-1" size={18} />
                  <div>
                    <div className="text-sm font-black text-text-primary uppercase tracking-wider">Hatch Lock Engaged</div>
                    <p className="text-[10px] text-text-primary/60 font-medium uppercase tracking-widest mt-1">
                      The database is empty. Auto-population is paused to protect your blank canvas.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleAuthorizeGenesis}
                  className="w-full py-3 bg-lobster text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-lobster/90 shadow-lg shadow-lobster/20 transition-all"
                >
                  Authorize Genesis Molt (Rescan)
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Modal */}
      <AnimatePresence>
        {isMaintenanceOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-habitat-dark/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-primary border border-border-primary w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between bg-card-bg/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-lobster/10 rounded-lg text-lobster">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-text-primary">Maintenance Protocol</h2>
                    <p className="text-[9px] font-bold text-text-primary/30 uppercase tracking-widest">Self-Healing & Structural Integrity</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMaintenanceOpen(false)}
                  className="p-2 hover:bg-border-primary/50 rounded-full text-text-primary/30 hover:text-text-primary transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <MaintenanceZone 
                  issues={issues}
                  onRefresh={onRefreshIssues}
                  onNavigate={(v, id) => { setIsMaintenanceOpen(false); onNavigate(v, id); }}
                  aiProvider={aiProvider}
                  openRouterModel={openRouterModel}
                  isManualMode={isManualMode}
                  onToggleManualMode={onToggleManualMode}
                  isModal={true}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hard Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-red-950/40 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-habitat-dark border-2 border-red-500/30 w-full max-w-md rounded-3xl shadow-[0_0_50px_rgba(230,57,70,0.2)] p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert size={40} className="text-red-500" />
              </div>
              
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Witness the Purge?</h2>
              <p className="text-red-500/60 text-xs font-black uppercase tracking-[0.2em] mb-6">Irreversible Database Deletion</p>
              
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-8 text-left">
                <p className="text-white/70 text-xs leading-relaxed mb-4">
                  By executing this protocol, you will <strong className="text-white">permanently delete</strong>:
                </p>
                <ul className="text-[10px] font-black uppercase tracking-widest text-white/40 space-y-2">
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> All Discovered Pearls</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Every Semantic Link</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> Full Molt History</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500" /> AI Insights & Dreams</li>
                </ul>
              </div>

              {resetMessage ? (
                <div className="text-sm font-black text-red-500 uppercase tracking-widest animate-pulse">
                   {resetMessage}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleHardReset}
                    disabled={isResetting}
                    className="w-full py-4 bg-red-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    {isResetting ? 'Purging Ledger...' : 'I Understand. Delete Everything.'}
                  </button>
                  <button 
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="w-full py-4 bg-white/5 text-white/50 rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-colors"
                  >
                    Abort Protocol
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
