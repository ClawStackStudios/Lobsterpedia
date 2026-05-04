/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './features/reef-presentation/Header';
import { WikiIndex } from './features/reef-presentation/WikiIndex';
import { ArticleView } from './features/reef-presentation/ArticleView';
import { IngestZone } from './features/reef-presentation/IngestZone';
import { Footer } from './features/reef-presentation/Footer';
import { LogTerminal } from './features/reef-presentation/LogTerminal';
import { GraphView } from './features/reef-presentation/GraphView';
import { GitHistory } from './features/reef-presentation/GitHistory';
import { SearchResults } from './features/reef-presentation/SearchResults';
import { SystemicGraph } from './features/reef-presentation/SystemicGraph';
import { MaintenanceZone } from './features/reef-presentation/MaintenanceZone';
import { WikiDirectory } from './features/reef-presentation/WikiDirectory';
import { Reef, HabitatLog, PolyP, AIProvider } from './features/shell-core/types';
import { Search, List, Share2, Terminal, Network, GitBranch, FileText, Cpu, Menu, PanelLeftClose, PanelLeftOpen, Folder, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { aiService } from './services/aiService';

export type ViewSect = 'index' | 'article' | 'ingest' | 'logs' | 'graph' | 'git' | 'search' | 'maintenance' | 'systemic-graph';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewSect>('index');
  const [activePolyPId, setActivePolyPId] = useState<string>('index');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedIngestTitle, setSuggestedIngestTitle] = useState<string | undefined>(undefined);
  const [aiProvider] = useState<AIProvider>('openrouter');
  const [openRouterModel, setOpenRouterModel] = useState(() => {
    return localStorage.getItem('lobsterpedia_model') || 'google/gemini-2.0-flash-exp:free';
  });

  useEffect(() => {
    localStorage.setItem('lobsterpedia_model', openRouterModel);
  }, [openRouterModel]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('lobsterpedia_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lobsterpedia_theme', theme);
  }, [theme]);

  const toggleTheme = (event: React.MouseEvent) => {
    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';

    // @ts-ignore
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const right = window.innerWidth - x;
      const bottom = window.innerHeight - y;
      const maxRadius = Math.hypot(
        Math.max(x, right),
        Math.max(y, bottom)
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 1200, // Slower, dramatic liquid roll
          easing: "cubic-bezier(0.4, 0, 0.2, 1)", // Smooth acceleration/deceleration
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  const [reef, setReef] = useState<Reef>({});
  const [lintIssues, setLintIssues] = useState<any[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showGraphSidebar, setShowGraphSidebar] = useState(false);
  const [graphSidebarWidth, setGraphSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isManualMode, setIsManualMode] = useState(() => {
    return localStorage.getItem('lobsterpedia_manual_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('lobsterpedia_manual_mode', String(isManualMode));
  }, [isManualMode]);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 250 && newWidth < 800) {
        setGraphSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  const [habitatLogs, setHabitatLogs] = useState<HabitatLog[]>([
    { timestamp: new Date().toLocaleTimeString(), action: 'init', message: 'Habitat initialization complete. Shell is hardened.' },
    { timestamp: new Date().toLocaleTimeString(), action: 'init', message: 'Active agent scuttling the filesystem...' }
  ]);

  const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' | 'warn' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadReef = useCallback(async () => {
    try {
      const res = await fetch('/api/wiki/files');
      const data = await res.json();
      if (data.reef) setReef(data.reef);
    } catch (err) {
      console.warn("[CrustAgent] Reef topology unreachable.");
    }
  }, []);

  const loadLintIssues = useCallback(async () => {
    try {
      const res = await fetch('/api/wiki/lint');
      const data = await res.json();
      if (data.issues) setLintIssues(data.issues);
    } catch (err) {
      console.warn("[CrustAgent] Maintenance lint unreachable.");
    }
  }, []);

  useEffect(() => {
    loadReef();
    loadLintIssues();
  }, [loadReef, loadLintIssues]);

  // File Watcher Integration
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let timer: any = null;

    const connect = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/api/wiki/watch');
      
      eventSource.onopen = () => {
        console.log("[CrustAgent] Watcher channel secured.");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const fileName = data.file.split(/[/\\]/).pop() || 'unknown';
          const cleanName = fileName.replace('.md', '');
          
          setHabitatLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            action: 'watch',
            message: `FS Change: [${data.event}] observed on ${cleanName}`
          }]);

          if (data.event === 'add' || data.event === 'change' || data.event === 'unlink' || data.event === 'addDir' || data.event === 'unlinkDir') {
            loadReef();
            loadLintIssues();
            if (data.event === 'change' || data.event === 'add') {
              showToast(`Reef Updated: ${cleanName}`, 'info');
            }
          }
        } catch (e) {
          console.error("Failed to parse watcher event", e);
        }
      };

      eventSource.onerror = () => {
        console.warn("[CrustAgent] Watcher connection lost. Retrying...");
        if (eventSource) eventSource.close();
        timer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (timer) clearTimeout(timer);
    };
  }, [loadReef, showToast]);

  const moltNavigate = (view: ViewSect, id?: string) => {
    setCurrentView(view);
    if (view === 'ingest') {
      setSuggestedIngestTitle(id);
    } else {
      setSuggestedIngestTitle(undefined);
    }
    if (id && view !== 'ingest') setActivePolyPId(id);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    moltNavigate('search');
  };

  const pinchIngest = async (title: string, text: string, tags: string[] = []): Promise<string> => {
    const newId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (isManualMode) {
      try {
        setHabitatLogs(prev => [...prev, { 
          timestamp: new Date().toLocaleTimeString(), 
          action: 'ingest', 
          message: `Manual Mode Enforced: Saving ${newId} without LLM synthesis...` 
        }]);

        const finalId = `concepts/${newId}`;
        const res = await fetch('/api/wiki/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: finalId,
            title: title,
            type: 'concepts',
            author: 'Manual User',
            tags: tags.length > 0 ? tags : ['manual'],
            links: ['index'],
            confidence: 1.0,
            supersedes: '',
            summary: 'Manually ingested document.',
            synthesizedContent: text
          })
        });
        
        if (!res.ok) throw new Error("Manual save signal dropped.");

        setHabitatLogs(prev => [...prev, { 
          timestamp: new Date().toLocaleTimeString(), 
          action: 'ingest', 
          message: `Manual shell secured: ${newId}.md` 
        }]);
        
        await loadReef();
        moltNavigate('article', finalId);
        return finalId;
      } catch (err) {
        console.error(err);
        alert("Manual Ingest failed.");
        return newId;
      }
    }

    try {
      setHabitatLogs(prev => [...prev, { 
        timestamp: new Date().toLocaleTimeString(), 
        action: 'ingest', 
        message: `Agent scuttling (${aiProvider}): Synthesizing pearl for ${newId}...` 
      }]);

      const wikiPatterns = `
LLM WIKI PATTERN v1: COMPOUNDING REEF
- Goal: Build a persistent, compounding artifact.
- Method: Synthesize new documents relative to existing context.
- Cross-linking: Mandatory internal links [[id]] or [title](id) are the tendons of the reef.

LLM WIKI PATTERN v2: ACTIVE SHELL
- Directory Sovereignty: Group articles into folder directories: concepts/, entities/, events/, patterns/, references/, insights/, meetings/, projects/, log/.
- Metadata Integrity: Rigorous frontmatter including: title, type, author, lastUpdated, tags, links, confidence, supersededBy.
`;

      const prompt = `Communicate with rigorous epistemic discipline: prefer measured confidence, deep reasoning and parsimonious explanations, avoiding unnecessary complexity or overextension.

${wikiPatterns}

Synthesize the following ingested text into a highly polished, professional markdown document for Lobsterpedia.

INGESTED DATA:
Title: ${title}
Extracted Content: ${text}
User Suggested Tags: ${tags.join(', ')}

CURRENT REEF CONTEXT (File Registry):
${JSON.stringify(Object.values(reef).map(p => ({ id: p.id, title: p.title, path: p.path, tags: p.tags })))}

Your response MUST follow this exact structure:
[CONFIDENCE]: <a float between 0.0 and 1.0 representing your certainty in the extraction>
[DIRECTORY]: <suggested directory from Pattern v2 (e.g. concepts, entities, events, etc)>
[SUPERSEDES]: <comma separated list of existing page IDs this information might update or replace, otherwise 'none'>
[SUMMARY]: <one line summary for the index catalog>
[BODY]:
<the markdown body of the article. Use Pattern v1/v2 principles for cross-linking and structure.>

Focus on core concepts, architectural models, and summarizing the meaning. Keep it concise but dense.`;

      const responseText = await aiService.generateContent(prompt, aiProvider, openRouterModel);
      
      const confidenceMatch = responseText.match(/\[CONFIDENCE\]:\s*([\d.]+)/);
      const directoryMatch = responseText.match(/\[DIRECTORY\]:\s*(.*)/);
      const supersedesMatch = responseText.match(/\[SUPERSEDES\]:\s*(.*)/);
      const summaryMatch = responseText.match(/\[SUMMARY\]:\s*(.*)/);
      const bodyIndex = responseText.indexOf('[BODY]:');
      
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8;
      const suggestedDir = directoryMatch ? directoryMatch[1].trim().toLowerCase().replace(/[^a-z0-9]/g, '') : 'concepts';
      const supersedes = supersedesMatch && supersedesMatch[1].trim() !== 'none' ? supersedesMatch[1].trim() : '';
      const summary = summaryMatch ? summaryMatch[1].trim() : '';
      const synthesizedContent = bodyIndex !== -1 ? responseText.substring(bodyIndex + 7).trim() : responseText;

      const finalId = suggestedDir ? `${suggestedDir}/${newId}` : newId;

      const res = await fetch('/api/wiki/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalId,
          title: title,
          type: suggestedDir,
          author: 'CrustAgent Synthesis',
          tags: tags.length > 0 ? tags : ['ingested'],
          links: ['index'],
          confidence,
          supersedes,
          summary,
          synthesizedContent
        })
      });
      
      if (!res.ok) throw new Error("Synthesis save signal dropped.");

      setHabitatLogs(prev => [...prev, { 
        timestamp: new Date().toLocaleTimeString(), 
        action: 'ingest', 
        message: `Hardened new local shell: ${newId}.md` 
      }]);
      
      await loadReef();
      moltNavigate('article', newId);
    } catch (err) {
       console.error(err);
       alert("IsCracked: Synthesis failed. Check the core shell logs.");
    }
    return newId;
  };

  const activePolyP = reef[activePolyPId];
  const reefFiles = Object.keys(reef).filter(id => id !== 'index' && id !== 'index-list');

  return (
    <AnimatePresence mode="wait">
      {currentView === 'systemic-graph' ? (
        <SystemicGraph key="systemic-graph" reef={reef} onNavigate={moltNavigate} theme={theme} />
      ) : (
        <motion.div 
          key="standard-layout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-screen flex flex-col bg-bg-primary overflow-hidden"
        >
          <Header onNavigate={moltNavigate as any} onSearch={handleSearch} onToggleTheme={toggleTheme} isDark={theme === 'dark'} />
          
          <div className="flex flex-1 overflow-hidden relative">
            {/* Sidebar Toggle Button (Visible when sidebar is closed) */}
            {!isSidebarOpen && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setIsSidebarOpen(true)}
                className="absolute left-4 top-4 z-40 p-2 btn-dynamic-main rounded-md ring-2 ring-white/20"
                title="Open Directory"
              >
                <PanelLeftOpen size={20} />
              </motion.button>
            )}

            {/* Sidebar Overlay for Mobile */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] lg:hidden"
                />
              )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside 
              initial={false}
              animate={{ 
                width: isSidebarOpen ? (window.innerWidth < 1024 ? 280 : 288) : 0,
                opacity: isSidebarOpen ? 1 : 0,
                x: isSidebarOpen ? 0 : (window.innerWidth < 1024 ? -280 : -288)
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`border-r border-border-primary bg-card-bg flex flex-col p-6 overflow-hidden flex-shrink-0 z-[46] 
                ${isSidebarOpen ? 'fixed lg:relative h-full' : 'absolute lg:relative h-full'} 
                lg:z-auto lg:h-auto`}
            >
              <div className="mb-8 overflow-hidden flex flex-col">
                <h2 className="text-[11px] font-black text-text-primary/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 flex-shrink-0">
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 hover:bg-border-primary/50 rounded transition-colors text-text-primary"
                    title="Collapse Sidebar"
                  >
                    <Menu size={16} />
                  </button>
                  <span className="flex-1">Wiki Directory</span>
                  <span className="bg-bg-primary text-text-primary/50 border border-border-primary px-2 py-0.5 rounded font-mono">{reefFiles.length + 2} Files</span>
                </h2>
                
                <div className="flex-1 overflow-hidden flex flex-col mb-6">
                  <div className="space-y-1 mb-4 flex-shrink-0">
                    <button 
                      onClick={() => moltNavigate('index')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${currentView === 'index' ? 'sidebar-item-active' : 'text-text-primary/70 hover:bg-border-primary/50'}`}
                    >
                      <List size={16} className="opacity-60" /> index-list.md
                    </button>

                    <button 
                      onClick={() => moltNavigate('article', 'index')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${activePolyPId === 'index' && currentView === 'article' ? 'sidebar-item-active' : 'text-text-primary/70 hover:bg-border-primary/50'}`}
                    >
                      <FileText size={16} className="opacity-60" /> index.md
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <WikiDirectory 
                      reef={reef} 
                      reefFiles={reefFiles} 
                      currentView={currentView} 
                      activePolyPId={activePolyPId} 
                      moltNavigate={moltNavigate} 
                      onRefresh={loadReef}
                    />
                  </div>
                </div>

                <nav className="space-y-3 pb-6 border-b border-border-primary">
                   <h2 className="text-[11px] font-black text-text-primary/40 uppercase tracking-[0.2em] mb-4">Core Shell Tools</h2>
                    <button onClick={() => moltNavigate('graph')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${currentView === 'graph' ? 'sidebar-item-active' : 'text-text-primary/70 hover:bg-border-primary/50'}`}>
                       <Network size={16} /> Graph Topology
                    </button>
                    <button onClick={() => moltNavigate('systemic-graph')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all text-text-primary/70 hover:bg-border-primary/50`}>
                       <Share2 size={16} /> Immersive Mode
                    </button>
                   <button onClick={() => moltNavigate('git')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${currentView === 'git' ? 'sidebar-item-active' : 'text-text-primary/70 hover:bg-border-primary/50'}`}>
                      <GitBranch size={16} /> Git Timeline
                   </button>
                </nav>
              </div>

              <div className="mt-auto pt-6 border-t border-border-primary">
                <div className="bg-bg-primary rounded-xl p-4 border border-border-primary shadow-inner">
                  <div className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Sync Health</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-primary/70">/wiki directory</span>
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter animate-pulse flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Synced
                    </span>
                  </div>
                  <div className="w-full bg-border-primary h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full w-[96%] transition-all duration-1000" />
                  </div>
                </div>
              </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col bg-bg-primary">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {currentView === 'index' && (
                    <WikiIndex key="index" pages={reef} onNavigate={moltNavigate} />
                  )}
                  {currentView === 'article' && activePolyP && (
                    <div className="h-full flex flex-col lg:flex-row overflow-hidden relative">
                      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {/* Graph View Toggle - Hidden on small screens */}
                        <div className="absolute top-4 right-4 z-40 hidden lg:block">
                          <button
                            onClick={() => setShowGraphSidebar(!showGraphSidebar)}
                            className={`p-2 rounded-full border transition-all ${
                              showGraphSidebar 
                                ? 'bg-lobster text-white border-lobster shadow-lg' 
                                : 'bg-card-bg text-text-primary/40 border-border-primary hover:border-lobster hover:text-lobster'
                            }`}
                            title={showGraphSidebar ? "Hide Topology" : "Show Topology"}
                          >
                            <Network size={18} />
                          </button>
                        </div>

                        <ArticleView 
                          key={`article-${activePolyPId}`} 
                          article={activePolyP} 
                          pages={reef} 
                          issues={lintIssues}
                          onRefreshIssues={loadLintIssues}
                          onNavigate={moltNavigate} 
                          aiProvider={aiProvider} 
                          openRouterModel={openRouterModel}
                          onHoverNode={setHoveredNodeId}
                          externalHoveredId={hoveredNodeId}
                        />
                      </div>
                      
                      {showGraphSidebar && (
                        <>
                          {/* Resize Handle */}
                          <div 
                            onMouseDown={startResizing}
                            className={`hidden lg:block w-1.5 h-full cursor-col-resize transition-colors z-30 relative group ${isResizing ? 'bg-lobster' : 'hover:bg-lobster/50 bg-border-primary'}`}
                          >
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none">
                                <GripVertical size={16} className="text-lobster" />
                             </div>
                          </div>

                          <div 
                            className="hidden lg:block border-l border-border-primary bg-card-bg relative overflow-hidden group select-none"
                            style={{ width: `${graphSidebarWidth}px` }}
                          >
                            <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-bg-primary/80 backdrop-blur border border-border-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-text-primary">
                                 <Network size={12} className="text-lobster" /> topology_preview.pyp
                              </div>
                            </div>
                            <GraphView reef={reef} onNavigate={moltNavigate} theme={theme} hoveredNodeId={hoveredNodeId} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {currentView === 'ingest' && (
                    <IngestZone key="ingest" onIngest={pinchIngest} suggestedTitle={suggestedIngestTitle} />
                  )}
                  {currentView === 'graph' && (
                    <GraphView key="graph" reef={reef} onNavigate={moltNavigate} theme={theme} hoveredNodeId={hoveredNodeId} />
                  )}
                  {currentView === 'git' && (
                    <GitHistory key="git" theme={theme} />
                  )}
                  {currentView === 'search' && (
                    <SearchResults key="search" query={searchQuery} reef={reef} onNavigate={moltNavigate} />
                  )}
                  {currentView === 'maintenance' && (
                    <MaintenanceZone 
                      key="maintenance" 
                      issues={lintIssues}
                      onRefresh={loadLintIssues}
                      onNavigate={moltNavigate} 
                      aiProvider={aiProvider} 
                      openRouterModel={openRouterModel} 
                      isManualMode={isManualMode}
                      onToggleManualMode={() => setIsManualMode(!isManualMode)}
                    />
                  )}
                  {currentView === 'logs' && (
                    <div className="h-full">
                       <LogTerminal logs={habitatLogs} />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-20 right-8 z-[100] px-6 py-3 rounded-xl shadow-2xl border border-lobster/20 bg-habitat-dark text-white flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-lobster animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <Footer 
            currentModel={openRouterModel} 
            onModelChange={setOpenRouterModel} 
            onNavigate={moltNavigate} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
