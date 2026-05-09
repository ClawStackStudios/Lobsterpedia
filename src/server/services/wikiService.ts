import fs from 'fs';
import path from 'path';
import { dbService } from './dbService.js';

export interface WikiMetadata {
  title: string;
  type: string;
  author: string;
  lastUpdated: string;
  tags: string[];
  links: string[];
  externalUrls?: string[];
  confidence?: number;
  supersededBy?: string | null;
}

export interface WikiPage extends WikiMetadata {
  id: string;
  content: string;
  path: string;
  isRaw: boolean;
}

export class WikiService {
  private wikiPath: string;

  constructor(wikiPath: string) {
    this.wikiPath = wikiPath;
    this.ensureBaseStructure();
  }

  private ensureBaseStructure() {
    if (!fs.existsSync(this.wikiPath)) {
      fs.mkdirSync(this.wikiPath, { recursive: true });
    }

    // Ensure default categories exist (The Skeletal Structure)
    const defaultCategories = [
      'concepts', 'entities', 'events', 'insights', 
      'meetings', 'patterns', 'projects', 'references'
    ];
    
    defaultCategories.forEach(cat => {
      const catPath = path.join(this.wikiPath, cat);
      if (!fs.existsSync(catPath)) {
        fs.mkdirSync(catPath, { recursive: true });
        const subIndexId = `${cat}/${cat}-index`;
        const subIndexPath = path.join(catPath, `${cat}-index.md`);
        if (!fs.existsSync(subIndexPath)) {
          const now = new Date().toISOString().split('T')[0];
          const fm = `---\ntitle: "${cat.charAt(0).toUpperCase() + cat.slice(1)} Index"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: ["${cat}", "index"]\nlinks: ["index-list"]\n---\n`;
          fs.writeFileSync(subIndexPath, fm + `# ${cat.charAt(0).toUpperCase() + cat.slice(1)} Index\nThis index catalogizes the ${cat} category.`);
          
          // Link it to the manifest
          this.updateIndexCatalog(subIndexId, `${cat.charAt(0).toUpperCase() + cat.slice(1)} Index`, `Index for ${cat}`, 'system');
        }
      }
    });

    // Ensure Activity Log exists and is linked
    const logPath = path.join(this.wikiPath, 'log.md');
    if (!fs.existsSync(logPath)) {
       const now = new Date().toISOString().split('T')[0];
       const logFm = `---\ntitle: "Activity Log"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: ["log", "system"]\nlinks: ["index-list"]\n---\n# Wiki Activity Log\nThis is a chronological record of wiki evolution.\n`;
       fs.writeFileSync(logPath, logFm);
       this.updateIndexCatalog('log', 'Activity Log', 'System activity and mutation log', 'system');
    }

    // Ensure initial seed if empty (The Genetic Pearl)
    const files = fs.readdirSync(this.wikiPath);
    const hasSeed = files.some(f => f === 'index.md');

    if (!hasSeed) {
      const seedReef: Record<string, any> = {
        'index': {
          title: 'Lobsterpedia Knowledge Hub',
          type: 'system',
          author: 'CrustAgent',
          lastUpdated: '2026-05-07',
          tags: ['hub', 'index'],
          links: ['index-list', 'concepts/llm-knowledge-bases'],
          content: '# Lobsterpedia Knowledge Index\n\nWelcome to the synthesized knowledge base. This index manages the thematic structure and high-level connections of the wiki.\n\n## Core Concepts\n- [LLM Knowledge Bases](concepts/llm-knowledge-bases)\n- [LLM Wiki Pattern](concepts/llm-wiki)\n- [LLM Wiki v2: Advanced Memory](concepts/llm-wiki-v2)\n- [General LLM Cognition](concepts/general-llm-cognition)\n- [Limitations of RAG](concepts/rag-limitations)\n\n## Key Entities\n- [Andrej Karpathy](entities/andrej-karpathy)\n\n## System Files\n- [Article List (UI Manifest)](index-list)\n- [Activity Log](log)\n\n---\n*Maintained by CrustAgent Maintenance Systems*'
        },
        'concepts/llm-wiki': {
          title: 'LLM Wiki',
          type: 'concept',
          author: 'CrustAgent',
          lastUpdated: '2026-05-07',
          tags: ['blueprint', 'system', 'methodology'],
          links: ['concepts/llm-wiki-v2', 'concepts/llm-knowledge-bases'],
          content: '# LLM Wiki\n\nA pattern for building personal knowledge bases using LLMs...\n\n(See full content in repository docs)'
        },
        'concepts/llm-wiki-v2': {
          title: 'LLM Wiki v2',
          type: 'concept',
          author: 'CrustAgent',
          lastUpdated: '2026-05-07',
          tags: ['methodology', 'memory', 'architecture'],
          links: ['concepts/llm-wiki', 'concepts/llm-knowledge-bases', 'concepts/poly-context-llm-wiki-v2'],
          content: '# LLM Wiki v2\n\nA pattern for building personal knowledge bases using LLMs. Extended with lessons from agentmemory...'
        },
        'entities/andrej-karpathy': {
          title: 'Andrej Karpathy',
          type: 'entity',
          author: 'CrustAgent',
          lastUpdated: '2026-05-07',
          tags: ['founder', 'researcher', 'ai'],
          links: ['concepts/llm-wiki'],
          content: '# Andrej Karpathy\n\nFounding member of OpenAI and former Director of AI at Tesla.'
        }
      };

      for (const [id, data] of Object.entries(seedReef)) {
        this.savePage(id, {
          ...data,
          tags: data.tags || [],
          links: data.links || [],
          externalUrls: []
        }, data.content);
      }
    }
  }

  public walkDir(dir: string = this.wikiPath): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (!filePath.includes('.git') && !filePath.includes('node_modules') && !filePath.includes('carapace')) {
          results = results.concat(this.walkDir(filePath));
        }
      } else {
        results.push(filePath);
      }
    });
    return results;
  }

  public parseCrustMarkdown(fileContent: string) {
    let content = fileContent;
    let metadata: any = { tags: [], links: [], externalUrls: [] };
    
    if (content.startsWith('---\n')) {
      const endMetaIndex = content.indexOf('\n---\n', 4);
      if (endMetaIndex !== -1) {
        const metaStr = content.slice(4, endMetaIndex);
        content = content.slice(endMetaIndex + 5);
        
        metaStr.split('\n').forEach(line => {
          const idx = line.indexOf(':');
          if (idx !== -1) {
            const key = line.slice(0, idx).trim();
            let value = line.slice(idx + 1).trim();
            
            if (value.startsWith('[') && value.endsWith(']')) {
              const arr = value.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
              metadata[key] = arr;
            } else if (key === 'tags' || key === 'links' || key === 'externalUrls') {
              // Robustness: Handle single values for array-typed fields
              metadata[key] = value ? [value.replace(/^"|"$/g, '').trim()] : [];
            } else if (key === 'confidence') {
              metadata[key] = parseFloat(value);
            } else {
              metadata[key] = value.replace(/^"|"$/g, '');
            }
          }
        });
      }
    }
    return { metadata, content };
  }

  public appendLog(action: string, id: string) {
    const logPath = path.join(this.wikiPath, 'log.md');
    const now = new Date().toISOString().split('T')[0];
    const logEntry = `\n## [${now}] ${action} | ${id}\n`;
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, `# Wiki Activity Log\nThis is a chronological record of wiki evolution.\n`);
    }
    fs.appendFileSync(logPath, logEntry);
  }

  public updateIndexCatalog(id: string, title: string, content: string, type: string) {
    if (id === 'index' || id === 'index-list' || id === 'log') return;
    const indexPath = path.join(this.wikiPath, 'index-list.md');
    if (!fs.existsSync(indexPath)) {
      // Create it if it doesn't exist
      const now = new Date().toISOString().split('T')[0];
      const fm = `---\ntitle: "Wiki Index"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: []\nlinks: []\nexternalUrls: []\n---\n# Wiki Index\n\n`;
      fs.writeFileSync(indexPath, fm);
    }

    const data = this.parseCrustMarkdown(fs.readFileSync(indexPath, 'utf-8'));
    let lines = data.content.split('\n');
    
    const summary = content.trim().split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 100) + '...';
    const entry = `- **[${title}](${id})** (${type}): ${summary}`;
    
    const categoryHeader = `### ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
    let categoryIndex = lines.findIndex(l => l.trim() === categoryHeader);
    
    if (categoryIndex === -1) {
      lines.push('\n' + categoryHeader);
      lines.push(entry);
    } else {
      const existingIndex = lines.findIndex(l => l.includes(`](${id})`));
      if (existingIndex !== -1) {
        lines[existingIndex] = entry;
      } else {
        lines.splice(categoryIndex + 1, 0, entry);
      }
    }

    const now = new Date().toISOString().split('T')[0];
    const indexFm = `---\ntitle: "${data.metadata.title || 'Wiki Index'}"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: []\nlinks: [${(data.metadata.links || []).map((l:any) => `"${l}"`).join(', ')}]\nexternalUrls: [${(data.metadata.externalUrls || []).map((l:any) => `"${l}"`).join(', ')}]\n---\n`;
    fs.writeFileSync(indexPath, indexFm + lines.join('\n'));
  }

  public savePage(id: string, metadata: Partial<WikiMetadata>, content: string) {
    // Strip .md if present and sanitize
    const cleanId = id.endsWith('.md') ? id.slice(0, -3) : id;
    const safeId = cleanId.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/\.]/g, '');
    const now = new Date().toISOString().split('T')[0];

    // Ensure array fields are actually arrays to prevent .map errors
    const ensureArray = (val: any) => Array.isArray(val) ? val : (val ? [String(val)] : []);
    const tags = ensureArray(metadata.tags);
    const links = ensureArray(metadata.links);
    const externalUrls = ensureArray(metadata.externalUrls);

    const frontmatter = `---\ntitle: "${metadata.title || safeId}"\ntype: "${metadata.type || 'concept'}"\nauthor: "${metadata.author || 'System'}"\nlastUpdated: "${metadata.lastUpdated || now}"\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\nlinks: [${links.map(l => `"${l}"`).join(', ')}]\nexternalUrls: [${externalUrls.map(l => `"${l}"`).join(', ')}]\nconfidence: ${metadata.confidence || 1.0}\nsupersededBy: "${metadata.supersededBy || ''}"\n---\n`;
    
    const filePath = path.join(this.wikiPath, `${safeId}.md`);
    this.ensureDir(filePath);
    fs.writeFileSync(filePath, frontmatter + content);

    // ─── Witness the Molt (DB Layer) ────────────────────────────────────────
    // If the Sovereign Ledger is active, record this mutation atomically.
    if (dbService.isActive) {
      const isNew = !dbService.getPearl(safeId);
      dbService.upsertPearl({
        page_id:       safeId,
        title:         metadata.title || safeId,
        type:          metadata.type || 'concept',
        author:        metadata.author || 'System',
        confidence:    metadata.confidence ?? 1.0,
        quality_score: 1.0,
        last_updated:  now,
        file_path:     filePath,
        tags:          JSON.stringify(metadata.tags || []),
      });
      dbService.syncLinks(
        safeId,
        (metadata.links || []).map(l => ({ id: l, type: 'references' }))
      );
      dbService.recordMolt({
        page_id: safeId,
        action:  isNew ? 'created' : 'updated',
        summary: `${isNew ? 'Created' : 'Updated'} "${metadata.title || safeId}"`,
        author:  metadata.author || 'System',
      });
      dbService.recalculateRelevanceScores();
    }

    return safeId;
  }

  public ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public getWikiPath(): string {
    return this.wikiPath;
  }
}

export const wikiService = new WikiService(process.env.WIKI_PATH || path.join(process.cwd(), 'wiki'));
