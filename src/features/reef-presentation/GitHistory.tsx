import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Clock, Send, CheckCircle2, RefreshCw, Feather, Plus, Minus, FileText, AlertCircle, XCircle } from 'lucide-react';

interface Commit {
  hash: string;
  date: string;
  message: string;
  author_name: string;
}

interface GitFileStatus {
  path: string;
  index: string;
  working_dir: string;
}

interface GitStatus {
  not_added: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: any[];
  staged: string[];
  files: GitFileStatus[];
}

export const GitHistory: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme }) => {
  const [history, setHistory] = useState<Commit[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isGitInitialized, setIsGitInitialized] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/git/history?_t=${Date.now()}`);
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (err) {
      console.error("Failed to scuttle git history");
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/git/status-details');
      const data = await res.json();
      setGitStatus(data);
    } catch (err) {
      console.error("Failed to fetch git status details");
    }
  };

  const checkGitStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      setIsGitInitialized(data.initialized);
      if (data.initialized) {
        fetchHistory();
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to check git status");
    }
  }, []);

  useEffect(() => {
    checkGitStatus();
  }, [checkGitStatus]);

  const handleInitGit = async () => {
    setIsInitializing(true);
    try {
      const res = await fetch('/api/git/init', { method: 'POST' });
      if (res.ok) {
        setIsGitInitialized(true);
        fetchHistory();
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to init git");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStage = async (file?: string) => {
    try {
      const res = await fetch('/api/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error("Failed to stage file", err);
    }
  };

  const handleUnstage = async (file?: string) => {
    try {
      const res = await fetch('/api/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error("Failed to unstage file", err);
    }
  };

  const handleCommit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!isGitInitialized) {
      await handleInitGit();
      return;
    }

    if (!commitMessage) {
      setStatus('error');
      setErrorMessage('Commit message is required.');
      return;
    }

    const stagedCount = (gitStatus?.files || []).filter(f => f.index !== ' ' && f.index !== '?').length;
    if (stagedCount === 0) {
      setStatus('error');
      setErrorMessage('No files staged for commit.');
      return;
    }

    setIsCommitting(true);
    setStatus('idle');
    setErrorMessage('');
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage, autoStage: false })
      });
      if (res.ok) {
        setStatus('success');
        setCommitMessage('');
        fetchHistory();
        fetchStatus();
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const errorData = await res.json();
        setStatus('error');
        setErrorMessage(errorData.error || 'Commit failed.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('A network error occurred.');
    } finally {
      setIsCommitting(false);
    }
  };

  const generateCommitMessage = async () => {
    setIsGenerating(true);
    try {
      // Provide context of staged files
      const stagedFilesName = (gitStatus?.files || [])
        .filter(f => f.index !== ' ' && f.index !== '?')
        .map(f => f.path)
        .join(', ') || 'various files';

      const res = await fetch('/api/ai/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Please generate a concise, professional Git commit message for these staged changes: ${stagedFilesName}. Focus on semantic evolution and knowledge synthesis. Output ONLY the text.`,
          model: "openai/gpt-4o-mini"
        })
      });
      const data = await res.json();
      if (data.text) {
        setCommitMessage(data.text.trim());
      }
    } catch (err) {
      console.error("Failed to generate commit message", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHistory(), fetchStatus()]);
    setIsRefreshing(false);
  };

  if (isGitInitialized === null) {
    return <div className="p-12 text-center text-text-primary/40 flex items-center justify-center gap-2"><RefreshCw className="animate-spin" size={16}/> Checking workspace...</div>;
  }

  const stagedFiles = (gitStatus?.files || []).filter(f => f.index !== ' ' && f.index !== '?');
  const unstagedFiles = (gitStatus?.files || []).filter(f => f.working_dir !== ' ' || f.index === '?');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto py-12 px-6"
    >
      <div className="mb-10 border-b border-border-primary pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            <GitBranch className="text-lobster" size={32}/> reef_versioning.git
          </h1>
          <p className="text-text-primary/50 font-medium mt-1">Sovereign audit trail of the knowledge ecosystem.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className={`p-2 hover:bg-border-primary/50 rounded-full transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
          title="Refresh Git State"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Staging Area */}
          {isGitInitialized && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card-bg border border-border-primary rounded-xl overflow-hidden shadow-sm">
                <div className="bg-bg-primary px-4 py-2 border-b border-border-primary flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest">Unstaged Changes</h3>
                  <button 
                    onClick={() => handleStage()}
                    className="text-[9px] font-bold text-lobster hover:underline uppercase"
                  >
                    Stage All
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                  {unstagedFiles.length === 0 ? (
                    <p className="text-[10px] text-text-primary/30 italic p-4 text-center">Reef is calm. No unstaged changes.</p>
                  ) : (
                    <div className="space-y-1">
                      {unstagedFiles.map((f) => (
                        <div key={f.path} className="flex items-center justify-between p-2 rounded hover:bg-bg-primary group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-1.5 h-1.5 rounded-full ${f.index === '?' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                            <span className="text-xs text-text-primary/70 truncate font-mono">{f.path}</span>
                          </div>
                          <button 
                            onClick={() => handleStage(f.path)}
                            className="p-1 text-lobster opacity-0 group-hover:opacity-100 transition-opacity hover:bg-lobster/10 rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card-bg border border-border-primary rounded-xl overflow-hidden shadow-sm">
                <div className="bg-bg-primary px-4 py-2 border-b border-border-primary flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest">Staged Changes</h3>
                  <button 
                    onClick={() => handleUnstage()}
                    className="text-[9px] font-bold text-text-primary/40 hover:text-lobster hover:underline uppercase"
                  >
                    Unstage All
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                  {stagedFiles.length === 0 ? (
                    <p className="text-[10px] text-text-primary/30 italic p-4 text-center">Shell is open. No files staged.</p>
                  ) : (
                    <div className="space-y-1">
                      {stagedFiles.map((f) => (
                        <div key={f.path} className="flex items-center justify-between p-2 rounded hover:bg-bg-primary group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-text-primary font-mono truncate">{f.path}</span>
                          </div>
                          <button 
                            onClick={() => handleUnstage(f.path)}
                            className="p-1 text-text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-border-primary rounded"
                          >
                            <Minus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest px-1">Commit Log</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
              {!isGitInitialized ? (
                <div className="text-text-primary/40 italic text-sm p-4 bg-bg-primary rounded-lg border border-dashed border-border-primary">Git repository not hatched yet. Click "Hatch Your Wiki" to initialize the exoskeleton.</div>
              ) : history.length === 0 ? (
                <div className="text-text-primary/40 italic text-sm p-4 bg-bg-primary rounded-lg border border-dashed border-border-primary">No MOLT history detected yet.</div>
              ) : (
                history.map(commit => (
                  <div key={commit.hash} className="bg-card-bg border border-border-primary rounded-lg p-5 shadow-sm hover:border-lobster transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono text-lobster bg-lobster/10 px-2 py-0.5 rounded uppercase font-bold">{commit.hash.substring(0, 7)}</span>
                      <span className="text-[10px] text-text-primary/40 flex items-center gap-1 font-bold"><Clock size={10}/> {new Date(commit.date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-bold text-text-primary group-hover:text-lobster transition-colors">{commit.message}</p>
                    <div className="mt-3 text-[10px] text-text-primary/40 font-medium italic">by {commit.author_name}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card-bg p-6 rounded-xl border border-border-primary shadow-sm sticky top-6">
            <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4">Finalize Molt</h3>
            <form onSubmit={handleCommit} className="space-y-4">
              {isGitInitialized && (
                <>
                  <div className="relative">
                    <textarea 
                      value={commitMessage}
                      onChange={e => setCommitMessage(e.target.value)}
                      placeholder="Describe this repository state transition..."
                      className="w-full p-4 border border-border-primary bg-bg-primary text-text-primary rounded-lg text-sm focus:border-lobster outline-none resize-none h-32 font-medium"
                    />
                    <button
                      type="button"
                      onClick={generateCommitMessage}
                      disabled={isGenerating || stagedFiles.length === 0}
                      className="absolute bottom-3 right-3 p-1.5 bg-border-primary hover:bg-border-primary/80 rounded text-text-primary/50 transition-colors disabled:opacity-30"
                      title="AI Generate Commit Message"
                    >
                      {isGenerating ? <RefreshCw size={14} className="animate-spin"/> : <Feather size={14}/>}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-text-primary/40 mb-1">
                    <span>Staged Payload</span>
                    <span className={stagedFiles.length > 0 ? 'text-green-500' : ''}>{stagedFiles.length} files</span>
                  </div>
                </>
              )}
              
              {!isGitInitialized ? (
                <button 
                  type="button"
                  onClick={handleLoadInit}
                  disabled={isInitializing}
                  className="w-full bg-lobster text-white py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isInitializing ? <RefreshCw size={14} className="animate-spin" /> : <><GitBranch size={14}/> Hatch Your Wiki</>}
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={isCommitting || !commitMessage || stagedFiles.length === 0}
                  className="w-full btn-dynamic-main py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCommitting ? 'Committing...' : <><Send size={14}/> Lock The Claw</>}
                </button>
              )}

              <AnimatePresence>
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-2 p-3 rounded-md text-[10px] font-bold uppercase tracking-widest ${status === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
                  >
                    {status === 'success' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                    <span className="flex-1">{status === 'success' ? 'Shell hardened and committed.' : errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="bg-bg-primary p-6 rounded-xl border border-dashed border-border-primary opacity-60">
             <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-2">Remote Scuttle</h3>
             <p className="text-[10px] font-medium text-text-primary/50 mb-4 italic">Remote git operations (push/pull) require ClawKeys©™ signed in shell variables.</p>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase text-text-primary/40">
                  <span>Branch</span>
                  <span className="text-lobster">main</span>
                </div>
                <button disabled className="w-full border border-border-primary text-text-primary/20 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-not-allowed">
                  Push To Origin
                </button>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  function handleLoadInit() {
    handleInitGit();
  }
};
