import React from 'react';
import { Terminal } from 'lucide-react';
import { HabitatLog } from '../shell-core/types';
import { motion } from 'motion/react';

interface LogTerminalProps {
  logs: HabitatLog[];
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs }) => {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 overflow-hidden bg-habitat-dark">
      <div className="flex items-center px-6 py-2 border-b border-white/5 justify-between bg-habitat-dark flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Agent CLI Logs</span>
        </div>
        <div className="text-[10px] text-gray-500 font-medium">Session: scuttle_hab_0x1</div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-xs leading-relaxed opacity-95">
        <div className="flex flex-col gap-2">
          {logs.map((log, i) => (
             <div key={i} className="flex gap-4 group">
               <span className="text-cyan-400 whitespace-nowrap opacity-70">[{log.timestamp}]</span>
                <span className={`uppercase font-bold text-[9px] min-w-[50px] ${
                  log.type === 'error' ? 'text-red-500' : 
                  log.type === 'warn' ? 'text-yellow-500' :
                  log.type === 'success' ? 'text-green-500' :
                  log.type === 'system' ? 'text-purple-400' :
                  log.action === 'error' ? 'text-red-500' : 
                  log.action === 'ingest' ? 'text-blue-400' :
                  log.action === 'dreamer' ? 'text-indigo-400' :
                  log.action === 'ledger' ? 'text-amber-500' :
                  'text-green-500'
                }`}>
                  {log.action}:
                </span>
                <span className={`transition-colors ${
                  log.type === 'error' ? 'text-red-300' : 
                  log.type === 'warn' ? 'text-yellow-200' :
                  'text-white group-hover:text-[#00FF00]'
                }`}>{log.message}</span>
              </div>
          ))}
          <div className="flex gap-2 mt-2 animate-pulse text-[#00FF00]">
            <span>&gt;</span>
            <span className="w-2 h-4 bg-[#00FF00]"></span>
          </div>
        </div>
      </div>
    </div>
  );
};
