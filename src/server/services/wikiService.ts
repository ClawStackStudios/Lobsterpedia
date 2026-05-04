import fs from 'fs';
import path from 'path';

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

    // Ensure initial seed if empty
    if (fs.readdirSync(this.wikiPath).length === 0) {
      const seedReef: Record<string, any> = {
        'index': {
          title: 'Wiki Index', type: 'system', author: 'System', lastUpdated: '2026-04-19', tags: [], links: ['llm-knowledge-bases'], content: 'Root directory of the synthesized knowledge base.'
        },
        'llm-knowledge-bases': {
          title: 'LLM Knowledge Bases', type: 'concept', author: 'System', lastUpdated: '2026-04-19', tags: ['architecture', 'synthesis'], links: ['rag-limitations'], content: `Most people's experience with LLMs and documents looks like RAG: you upload files, the LLM retrieves chunks, and generates an answer. The LLM is rediscovering knowledge from scratch on every question.\n\n# The Core Difference\nThe wiki is a persistent, compounding artifact. Cross-references are already there. Contradictions have been flagged. The synthesis reflects everything read up to this point.\n\n## Architecture Layers\n1. **Raw Sources**: Immutable documents (PDFs, transcripts).\n2. **The Wiki**: LLM-generated markdown files. The synthesized truth.\n3. **The Schema**: Instructions for the LLM on how to maintain the wiki.`
        },
        'rag-limitations': {
          title: 'Limitations of RAG', type: 'concept', author: 'System', lastUpdated: '2026-04-18', tags: ['architecture'], links: ['llm-knowledge-bases'], content: `Retrieval-Augmented Generation (RAG) suffers from a lack of synthesis. It retrieves fragments but does not build a compounding mental model of the domain over time.`
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

    // Ensure default categories exist
    const defaultCategories = ['concepts', 'entities', 'events', 'insights', 'meetings', 'patterns', 'projects', 'references'];
    defaultCategories.forEach(cat => {
      const catPath = path.join(this.wikiPath, cat);
      if (!fs.existsSync(catPath)) {
        fs.mkdirSync(catPath, { recursive: true });
        const subIndexPath = path.join(catPath, `${cat}-index.md`);
        if (!fs.existsSync(subIndexPath)) {
          const now = new Date().toISOString().split('T')[0];
          const fm = `---\ntitle: "${cat.charAt(0).toUpperCase() + cat.slice(1)} Index"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: ["${cat}", "index"]\nlinks: []\n---\n`;
          fs.writeFileSync(subIndexPath, fm + `# ${cat.charAt(0).toUpperCase() + cat.slice(1)} Index\nThis index catalogizes the ${cat} category.`);
        }
      }
    });
  }

  public walkDir(dir: string = this.wikiPath): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (!filePath.includes('.git') && !filePath.includes('node_modules')) {
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
    const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const now = new Date().toISOString().split('T')[0];
    const frontmatter = `---\ntitle: "${metadata.title || safeId}"\ntype: "${metadata.type || 'concept'}"\nauthor: "${metadata.author || 'System'}"\nlastUpdated: "${metadata.lastUpdated || now}"\ntags: [${(metadata.tags || []).map(t => `"${t}"`).join(', ')}]\nlinks: [${(metadata.links || []).map(l => `"${l}"`).join(', ')}]\nexternalUrls: [${(metadata.externalUrls || []).map(l => `"${l}"`).join(', ')}]\nconfidence: ${metadata.confidence || 1.0}\nsupersededBy: "${metadata.supersededBy || ''}"\n---\n`;
    
    const filePath = path.join(this.wikiPath, `${safeId}.md`);
    this.ensureDir(filePath);
    fs.writeFileSync(filePath, frontmatter + content);
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
