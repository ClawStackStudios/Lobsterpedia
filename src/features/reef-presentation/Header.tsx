import React, { useState, useRef } from 'react';
import { Search, List, Share2, Terminal, Network, Wrench, Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onNavigate: (view: any, id?: string) => void;
  onSearch: (query: string) => void;
  onToggleTheme: (e: React.MouseEvent) => void;
  isDark: boolean;
}

class Spring {
  stiffness: number;
  damping: number;
  mass: number;

  constructor(stiffness = 400, damping = 10, mass = 1) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  step(current: number, velocity: number, target: number, dt: number) {
    const force = -this.stiffness * (current - target) - this.damping * velocity;
    velocity += (force / this.mass) * dt;
    current += velocity * dt;
    return { current, velocity };
  }

  isSettled(current: number, velocity: number, target: number) {
    return Math.abs(current - target) < 0.01 && Math.abs(velocity) < 0.01;
  }
}

const spring = new Spring(400, 10, 1);
const VARIANTS = { subtle: { y: -3, scale: 1.05 }, prominent: { y: -12, scale: 1.15 } };

const BouncyLetter: React.FC<{ char: string; colorClass: string; variant?: 'subtle' | 'prominent' }> = ({ char, colorClass, variant = 'subtle' }) => {
  const elRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<number | null>(null);
  
  const motionData = useRef({
    cy: 0, cs: 1,
    vy: 0, vs: 0,
    targetY: 0, targetScale: 1
  });

  const tick = () => {
    const dt = 1 / 60;
    const { cy, cs, vy, vs, targetY, targetScale } = motionData.current;
    
    const yr = spring.step(cy, vy, targetY, dt);
    const sr = spring.step(cs, vs, targetScale, dt);
    
    motionData.current.cy = yr.current;
    motionData.current.vy = yr.velocity;
    motionData.current.cs = sr.current;
    motionData.current.vs = sr.velocity;

    if (elRef.current) {
      elRef.current.style.transform = `translateY(${yr.current}px) scale(${sr.current})`;
    }

    if (!spring.isSettled(yr.current, yr.velocity, targetY) || !spring.isSettled(sr.current, sr.velocity, targetScale)) {
      animRef.current = requestAnimationFrame(tick);
    } else {
      animRef.current = null;
    }
  };

  const startAnimation = (ty: number, ts: number) => {
    motionData.current.targetY = ty;
    motionData.current.targetScale = ts;
    if (animRef.current === null) {
      animRef.current = requestAnimationFrame(tick);
    }
  };

  return (
    <span 
      ref={elRef}
      className={`bouncy-letter inline-block cursor-pointer will-change-transform ${colorClass}`}
      onMouseEnter={() => {
        const v = VARIANTS[variant];
        startAnimation(v.y, v.scale);
      }}
      onMouseLeave={() => startAnimation(0, 1)}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  );
};

export const Header: React.FC<HeaderProps> = ({ onNavigate, onSearch, onToggleTheme, isDark }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const menuItems = [
    { view: 'index', icon: <List size={14} />, label: 'Index' },
    { view: 'ingest', icon: <Share2 size={14} />, label: 'Ingest' },
    { view: 'graph', icon: <Network size={14} />, label: 'Graph view', highlight: true },
    { view: 'maintenance', icon: <Wrench size={14} />, label: 'Shipyard' },
    { view: 'logs', icon: <Terminal size={14} />, label: 'CLI' },
  ];

  const renderBrand = () => {
    const lobsterpedia = "Lobsterpedia".split('').map((c, i) => <BouncyLetter key={`l-${i}`} char={c} colorClass="text-lobster" />);

    return (
      <div 
        className="flex select-none text-lg md:text-xl font-bold gap-0.5 cursor-pointer"
        onClick={() => { onNavigate('index'); setIsMenuOpen(false); }}
      >
        <span className="flex">{lobsterpedia}</span>
        <span className="text-white/30 text-[0.6em] font-normal ml-0.5 self-end mb-1 tracking-tighter">©™</span>
      </div>
    );
  };

  return (
    <header className="h-16 bg-habitat-dark border-b-4 border-lobster flex items-center px-4 md:px-6 justify-between flex-shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={() => { onNavigate('index'); setIsMenuOpen(false); }}
          className="w-8 h-8 md:w-10 md:h-10 bg-lobster/20 rounded-full flex items-center justify-center text-lg cursor-pointer hover:bg-lobster/30 transition-all font-mono"
        >
          🦞
        </button>
        <div className="flex items-baseline gap-2">
          {renderBrand()}
          <span className="hidden sm:inline-block bg-lobster text-white text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Beta</span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex gap-6 ml-8">
        {menuItems.map((item) => (
          <button 
            key={item.view}
            onClick={() => onNavigate(item.view)} 
            className={`text-white/70 hover:text-white text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest ${item.highlight ? 'text-lobster' : ''}`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        {/* Search - Visible on Large, Hidden on Small (moves to menu) */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reef..." 
            className="bg-white/10 border border-white/20 text-white text-xs px-4 py-1.5 rounded-md w-32 xl:w-64 focus:outline-none focus:border-lobster transition-all placeholder-white/30"
          />
          <button type="submit" className="absolute right-3 top-2 text-white/30 hover:text-white transition-colors cursor-pointer">
            <Search size={14} />
          </button>
        </form>

        <button 
          onClick={onToggleTheme}
          className="p-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-lobster/20 transition-all flex items-center justify-center"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Hamburger Toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-white/70 hover:text-white transition-all"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[280px] bg-habitat-dark border-l-4 border-lobster z-[70] p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Sea Navigation</span>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              <div className="space-y-2 mb-8">
                {menuItems.map((item) => (
                  <button 
                    key={item.view}
                    onClick={() => { onNavigate(item.view); setIsMenuOpen(false); }} 
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg text-sm font-bold uppercase tracking-widest transition-all ${item.highlight ? 'bg-lobster/20 text-lobster border border-lobster/30' : 'text-white/70 hover:bg-white/10'}`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto">
                <form onSubmit={handleSearchSubmit} className="relative w-full">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reef..." 
                    className="bg-white/10 border border-white/20 text-white text-sm px-4 py-3 rounded-lg w-full focus:outline-none focus:border-lobster transition-all placeholder-white/30"
                  />
                  <button type="submit" className="absolute right-4 top-3 text-white/30 hover:text-white transition-colors cursor-pointer">
                    <Search size={18} />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
