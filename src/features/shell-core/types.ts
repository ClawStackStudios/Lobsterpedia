export type ShellType = 'system' | 'concept';

export interface PolyP {
  id: string;
  title: string;
  type: string;
  author?: string;
  lastUpdated: string;
  tags?: string[];
  content: string;
  links?: string[];
  externalUrls?: string[];
  confidence?: number;
  supersededBy?: string;
  path?: string;
  isRaw?: boolean;
}

export type Reef = Record<string, PolyP>;

export type AIProvider = 'openrouter';

export interface HabitatLog {
  timestamp: string;
  action: string;
  message: string;
  type?: 'info' | 'warn' | 'error' | 'success' | 'system';
}
