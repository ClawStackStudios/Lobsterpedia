import React, { useState, useEffect, useRef } from 'react';
import { Cpu, ChevronUp, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FooterProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  onNavigate: (view: any) => void;
}

const COMMON_FREE_MODELS = [
  { 
    category: 'Google',
    models: [
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B IT' },
      { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B' },
      { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B IT' },
    ]
  },
  {
    category: 'OpenAI',
    models: [
      { id: 'openai/gpt-oss-120b:free', name: 'GPT OSS 120B' },
      { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B' },
    ]
  },
  {
    category: 'Meta',
    models: [
      { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B Instruct' },
    ]
  },
  {
    category: 'NVIDIA',
    models: [
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B' },
      { id: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', name: 'Llama Nemotron Embed VL 1B' },
    ]
  },
  {
    category: 'Open Source',
    models: [
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen 3 Next 80B' },
      { id: 'minimax/minimax-m2.5:free', name: 'Minimax M2.5' },
      { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air' },
    ]
  },
  {
    category: 'Other',
    models: [
      { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LFM 2.5 1.2B Thinking' },
      { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 Llama 3.1 405B' },
    ]
  }
];

export const Footer: React.FC<FooterProps> = ({ currentModel, onModelChange, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customModelPath, setCustomModelPath] = useState(currentModel);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setCustomModelPath(modelId);
    setIsMenuOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customModelPath.trim()) {
      onModelChange(customModelPath.trim());
      setIsEditingCustom(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <footer className="h-8 bg-bg-primary border-t border-border-primary px-6 flex items-center justify-between text-[9px] font-black text-text-primary/40 uppercase tracking-[0.2em] flex-shrink-0 z-[60]">
      <div>Lobsterpedia Systems v1.0.0 (FS Linked)</div>
      
      <div className="flex items-center gap-6 relative">
        <div className="flex items-center gap-2 border-r border-border-primary pr-6 group relative">
          <Cpu size={12} className="text-lobster" />
          <span className="text-text-primary/60 font-black">OpenRouter</span>
          
          <div className="relative flex items-center">
            {isEditingCustom ? (
              <form onSubmit={handleCustomSubmit} className="flex items-center">
                <input 
                  autoFocus
                  type="text"
                  value={customModelPath}
                  onChange={(e) => setCustomModelPath(e.target.value)}
                  onBlur={() => setIsEditingCustom(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsEditingCustom(false);
                  }}
                  placeholder="Enter model path..."
                  className="ml-2 bg-card-bg px-2 py-0.5 rounded text-[8px] font-mono outline-none border border-lobster/50 w-48 text-text-primary"
                />
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setIsEditingCustom(true);
                  }}
                  className="ml-2 px-2 py-0.5 rounded bg-border-primary text-text-primary/70 hover:bg-border-primary/80 transition-colors flex items-center gap-1 lowercase font-mono tracking-normal"
                  title="Click for menu, Right-click to edit path"
                >
                  <span 
                    onClick={(e) => {
                      if (e.detail === 2) { // Double click to edit?
                         e.stopPropagation();
                         setIsEditingCustom(true);
                      }
                    }}
                  >
                    {currentModel}
                  </span>
                  <ChevronUp size={10} className={`transform transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <button 
                  onClick={() => setIsEditingCustom(true)}
                  className="text-[7px] text-text-primary/40 lowercase tracking-normal italic ml-1 hover:text-lobster transition-colors"
                  title="Toggle custom path input"
                >
                  (edit path)
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                ref={menuRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full right-0 mb-2 w-64 bg-card-bg border border-border-primary shadow-xl p-2 z-[70] normal-case tracking-normal"
              >
                <div className="px-3 py-2 border-b border-border-primary mb-2">
                  <div className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-1">OpenRouter Models</div>
                  <div className="text-[8px] text-text-primary/50">Pick a model or edit the path directly for custom integration.</div>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {COMMON_FREE_MODELS.map((group) => (
                    <div key={group.category} className="mb-3 last:mb-0">
                      <div className="px-3 py-1 text-[8px] font-black text-text-primary/40 uppercase tracking-widest bg-bg-primary mb-1 rounded">
                        {group.category}
                      </div>
                      {group.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(model.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-[10px] transition-colors flex flex-col ${currentModel === model.id ? 'bg-lobster/10 text-lobster font-bold' : 'hover:bg-bg-primary text-text-primary/70'}`}
                        >
                          <span>{model.name}</span>
                          <span className="text-[8px] opacity-60 font-mono italic">{model.id}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-border-primary">
                  <button 
                    onClick={() => {
                      setIsEditingCustom(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-[10px] text-lobster hover:bg-lobster/10 transition-colors flex items-center gap-2 border border-dashed border-lobster/30"
                  >
                    <Search size={10} /> Enter Custom Model Path...
                  </button>
                </div>

                <div className="mt-2 p-2 bg-lobster/10 rounded-md flex items-start gap-2">
                  <Info size={12} className="text-lobster mt-0.5" />
                  <p className="text-[8px] leading-tight text-text-primary/70">
                    Pro tip: You can also click the model name path in the footer to toggle edit mode directly.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 border-l border-border-primary pl-6 h-full overflow-hidden min-w-[200px]">
          <div className="text-sm select-none">
            🦞
          </div>
          <div className="flex items-center gap-1.5 h-full">
            <motion.div 
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)] flex-shrink-0" 
            />
            <span className="text-[8px] font-black tracking-widest uppercase text-text-primary/40 whitespace-nowrap">Agent Watcher:</span>
            <div className="text-[7.5px] font-mono lowercase text-lobster font-bold h-3 overflow-hidden ml-0.5">
              <motion.div
                animate={{ y: [0, -12, -24, -36, 0] }}
                transition={{ duration: 8, repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1], ease: "anticipate" }}
              >
                <div className="h-3 flex items-center">scuttling...</div>
                <div className="h-3 flex items-center">indexing reef...</div>
                <div className="h-3 flex items-center">linting shell...</div>
                <div className="h-3 flex items-center">syncing local vfs...</div>
              </motion.div>
            </div>
          </div>
        </div>
        <button onClick={() => onNavigate('logs')} className="hover:text-lobster transition-colors underline decoration-2 decoration-lobster/30 cursor-pointer">Habitat CLI Terminal</button>
        <div>CPU 2% | MEM 142MB</div>
      </div>
    </footer>
  );
};
