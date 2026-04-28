import React, { useState, useRef } from 'react';
import { Search, List, Share2, Terminal, Network, Wrench, Moon, Sun } from 'lucide-react';

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const renderBrand = () => {
    const lobsterpedia = "Lobsterpedia".split('').map((c, i) => <BouncyLetter key={`l-${i}`} char={c} colorClass="text-lobster" />);

    return (
      <div 
        className="flex select-none text-xl font-bold gap-0.5 cursor-pointer"
        onClick={() => onNavigate('index')}
      >
        <span className="flex">{lobsterpedia}</span>
        <span className="text-white/30 text-[0.6em] font-normal ml-0.5 self-end mb-1 tracking-tighter">©™</span>
      </div>
    );
  };

  return (
    <header className="h-16 bg-habitat-dark border-b-4 border-lobster flex items-center px-6 justify-between flex-shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onNavigate('index')}
          className="w-10 h-10 bg-lobster/20 rounded-full flex items-center justify-center text-xl cursor-pointer hover:bg-lobster/30 transition-all font-mono"
        >
          🦞
        </button>
        <div className="flex items-baseline gap-2">
          {renderBrand()}
          <span className="bg-lobster text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Beta</span>
        </div>
      </div>

      <nav className="hidden md:flex gap-6 ml-12">
        <button onClick={() => onNavigate('index')} className="text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest">
          <List size={14} /> Index
        </button>
        <button onClick={() => onNavigate('ingest')} className="text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest">
          <Share2 size={14} /> Ingest
        </button>
        <button onClick={() => onNavigate('graph')} className="text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest text-lobster">
          <Network size={14} /> Graph view
        </button>
        <button onClick={() => onNavigate('maintenance')} className="text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest">
          <Wrench size={14} /> Shipyard
        </button>
        <button onClick={() => onNavigate('logs')} className="text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-widest">
          <Terminal size={14} /> CLI
        </button>
      </nav>

      <div className="flex items-center gap-3 ml-auto">
        <button 
          onClick={onToggleTheme}
          className="p-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-lobster/20 transition-all flex items-center justify-center"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wiki..." 
            className="bg-white/10 border border-white/20 text-white text-sm px-4 py-1.5 rounded-md w-48 lg:w-64 focus:outline-none focus:border-lobster transition-all placeholder-white/30"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-white/30 hover:text-white transition-colors cursor-pointer">
            <Search size={14} />
          </button>
        </form>
      </div>
    </header>
  );
};
