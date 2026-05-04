import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import chokidar from "chokidar";
import { simpleGit } from "simple-git";
import multer from "multer";
import { setupSecurity } from "./.crustagent/skills/cors-helmet-proxy-security/index.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { parseOffice } = require("officeparser");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wikiPath = path.join(process.cwd(), 'wiki');

const walkDir = (dir: string): string[] => {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!filePath.includes('.git') && !filePath.includes('node_modules')) {
        results = results.concat(walkDir(filePath));
      }
    } else {
      results.push(filePath);
    }
  });
  return results;
};

if (!fs.existsSync(wikiPath)) {
  fs.mkdirSync(wikiPath);
}

// Ensure initial seed
if (fs.readdirSync(wikiPath).length === 0) {
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
    const frontmatter = `---\ntitle: "${data.title}"\ntype: "${data.type}"\nauthor: "${data.author}"\nlastUpdated: "${data.lastUpdated}"\ntags: [${data.tags.map((t: string) => `"${t}"`).join(', ')}]\nlinks: [${data.links.map((l: string) => `"${l}"`).join(', ')}]\n---\n`;
    fs.writeFileSync(path.join(wikiPath, `${id}.md`), frontmatter + data.content);
  }
}

// Ensure default categories exist
const defaultCategories = ['concepts', 'entities', 'events', 'insights', 'meetings', 'patterns', 'projects', 'references'];
defaultCategories.forEach(cat => {
  const catPath = path.join(wikiPath, cat);
  if (!fs.existsSync(catPath)) {
    fs.mkdirSync(catPath, { recursive: true });
    // Create sub-index if missing
    const subIndexPath = path.join(catPath, `${cat}-index.md`);
    if (!fs.existsSync(subIndexPath)) {
      const now = new Date().toISOString().split('T')[0];
      const fm = `---\ntitle: "${cat.charAt(0).toUpperCase() + cat.slice(1)} Index"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: ["${cat}", "index"]\nlinks: []\n---\n`;
      fs.writeFileSync(subIndexPath, fm + `# ${cat.charAt(0).toUpperCase() + cat.slice(1)} Index\nThis index catalogizes the ${cat} category.`);
    }
  }
});


const git = simpleGit(wikiPath);
const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse minimalist YAML frontmatter
function parseCrustMarkdown(fileContent: string) {
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

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "7575");
  const HOST = process.env.HOST || "0.0.0.0";

  setupSecurity(app);

  app.use(bodyParser.json({ limit: '50mb' }));

  // --- Meaningful Logging Middleware ---
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      const bodyKeys = Object.keys(req.body || {}).filter(k => k !== 'content' && k !== 'file').join(', ');
      console.log(`[CrustAgent] ${req.method} ${req.url} ${bodyKeys ? `| Payload: [${bodyKeys}]` : ''}`);
    }
    next();
  });

// --- Global Auto-Scanner System ---
  let autoScanTimer: NodeJS.Timeout | null = null;
  let currentSettings = {
    scanInterval: '5m',
    autoIngest: false
  };

  const settingsPath = path.join(wikiPath, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      currentSettings = { ...currentSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
    } catch(e) {}
  }

  const parseIntervalMs = (val: string) => {
    if (val === '30s') return 30 * 1000;
    if (val === '5m') return 5 * 60 * 1000;
    if (val === '30m') return 30 * 60 * 1000;
    if (val === '1h') return 60 * 60 * 1000;
    return 0; // off
  };

  const getScannedRegistry = () => {
    const regPath = path.join(wikiPath, '.scanned.json');
    if (fs.existsSync(regPath)) {
      try {
        return JSON.parse(fs.readFileSync(regPath, 'utf-8'));
      } catch(e) {}
    }
    return [];
  };
  const saveScannedRegistry = (arr: string[]) => {
    fs.writeFileSync(path.join(wikiPath, '.scanned.json'), JSON.stringify(arr));
  };

  const performAutoScan = async () => {
    console.log("[CrustAgent Auto-Scan] Initiating filesystem scan...");
    appendLog('scan', 'Background auto-scan started');
    
    if (!currentSettings.autoIngest) return;

    const files = walkDir(wikiPath);
    const scanned = getScannedRegistry();
    let updated = false;

    for (const f of files) {
      if (f.endsWith('.md') || f.endsWith('settings.json') || f.endsWith('.scanned.json') || f.includes('.git')) continue;
      
      const relativePath = path.relative(wikiPath, f).replace(/\\/g, '/');
      if (scanned.includes(relativePath)) continue;

      try {
        // Detect and Extract
        console.log(`[CrustAgent Auto-Scan] New raw file detected: ${relativePath}`);
        appendLog('detect', relativePath);
        
        // This is where real auto-ingest would happen using pdf-parse or officeparser if wanted.
        // We will just mark it scanned for this implementation unless explicitly invoking the LLM.
        // We'll leave it as detected for now, or just mark it scanned.
        
        scanned.push(relativePath);
        updated = true;
      } catch(err) {
        console.error(`Failed to ingest ${relativePath}`, err);
      }
    }
    if (updated) {
      saveScannedRegistry(scanned);
    }
  };

  const updateAutoScanTimer = () => {
    if (autoScanTimer) clearInterval(autoScanTimer);
    const ms = parseIntervalMs(currentSettings.scanInterval);
    if (ms > 0) {
      autoScanTimer = setInterval(performAutoScan, ms);
    }
  };

  updateAutoScanTimer();

  app.get("/api/wiki/settings", (req, res) => {
    res.json(currentSettings);
  });

  app.post("/api/wiki/settings", (req, res) => {
    currentSettings = { ...currentSettings, ...req.body };
    fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 2));
    updateAutoScanTimer();
    res.json({ success: true });
  });

  // --- API Routes ---

  const ensureDir = (filePath: string) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };

  app.post("/api/wiki/mkdir", (req, res) => {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: "Missing path." });
    
    const safePath = path.join(wikiPath, dirPath.replace(/\.\./g, ''));
    try {
      if (!fs.existsSync(safePath)) {
        fs.mkdirSync(safePath, { recursive: true });
        appendLog('mkdir', dirPath);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create directory." });
    }
  });

  app.post("/api/wiki/move", (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: "Missing paths." });

    const safeOld = path.join(wikiPath, oldPath.replace(/\.\./g, ''));
    const safeNew = path.join(wikiPath, newPath.replace(/\.\./g, ''));

    try {
      if (fs.existsSync(safeOld)) {
        ensureDir(safeNew);
        fs.renameSync(safeOld, safeNew);
        appendLog('move', `${oldPath} -> ${newPath}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Source not found." });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to move file/directory." });
    }
  });

  const logPath = path.join(wikiPath, 'log.md');
  const appendLog = (action: string, id: string) => {
    const now = new Date().toISOString().split('T')[0];
    const logEntry = `\n## [${now}] ${action} | ${id}\n`;
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, `# Wiki Activity Log\nThis is a chronological record of wiki evolution.\n`);
    }
    fs.appendFileSync(logPath, logEntry);
  };

  const updateIndexCatalog = (id: string, title: string, content: string, type: string) => {
    if (id === 'index' || id === 'index-list' || id === 'log') return;
    const indexPath = path.join(wikiPath, 'index-list.md');
    if (!fs.existsSync(indexPath)) return;

    const data = parseCrustMarkdown(fs.readFileSync(indexPath, 'utf-8'));
    let lines = data.content.split('\n');
    
    // Simple one-line extract
    const summary = content.trim().split('\n')[0].substring(0, 100).replace(/[#*`]/g, '') + '...';
    const entry = `- **[${title}](${id})** (${type}): ${summary}`;
    
    // Check if category header exists
    const categoryHeader = `### ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
    let categoryIndex = lines.findIndex(l => l.trim() === categoryHeader);
    
    if (categoryIndex === -1) {
      lines.push('\n' + categoryHeader);
      lines.push(entry);
    } else {
      // Find if entry already exists
      const existingIndex = lines.findIndex(l => l.includes(`](${id})`));
      if (existingIndex !== -1) {
        lines[existingIndex] = entry;
      } else {
        lines.splice(categoryIndex + 1, 0, entry);
      }
    }

    const now = new Date().toISOString().split('T')[0];
    const indexFm = `---\ntitle: "${data.metadata.title || 'Wiki Index'}"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: []\nlinks: [${(data.metadata.links || []).map((l:string) => `"${l}"`).join(', ')}]\nexternalUrls: [${(data.metadata.externalUrls || []).map((l:string) => `"${l}"`).join(', ')}]\n---\n`;
    fs.writeFileSync(indexPath, indexFm + lines.join('\n'));
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "shellHardened", message: "Habitat is stable." });
  });

  app.get("/api/wiki/files", (req, res) => {
    try {
      const files = walkDir(wikiPath).filter(f => !f.endsWith('.git') && !f.includes('node_modules') && !f.endsWith('.scanned.json') && !f.endsWith('settings.json'));
      const reef: Record<string, any> = {};
      
      files.forEach(f => {
        const relativePath = path.relative(wikiPath, f);
        const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
        const dirName = path.dirname(relativePath);
        // ensure ID uniqueness by using the relative path, but without extension if it's a markdown file?
        // Actually, let's keep the exact relative path as ID for non-markdown, and omit .md for markdown.
        const isMd = f.endsWith('.md');
        const id = isMd ? relativePath.replace(/\.md$/, '').replace(/\\/g, '/') : relativePath.replace(/\\/g, '/');
        
        if (isMd) {
          const data = fs.readFileSync(f, 'utf-8');
          const parsed = parseCrustMarkdown(data);
          reef[id] = {
            id,
            title: parsed.metadata.title || nameWithoutExt,
            type: parsed.metadata.type || 'concept',
            author: parsed.metadata.author || 'System',
            lastUpdated: parsed.metadata.lastUpdated || fs.statSync(f).mtime.toISOString().split('T')[0],
            tags: parsed.metadata.tags || [],
            links: parsed.metadata.links || [],
            externalUrls: parsed.metadata.externalUrls || [],
            confidence: parsed.metadata.confidence || 1.0,
            supersededBy: parsed.metadata.supersededBy || null,
            content: parsed.content,
            path: relativePath,
            isRaw: false
          };
        } else {
          reef[id] = {
            id,
            title: nameWithoutExt,
            type: 'raw',
            lastUpdated: fs.statSync(f).mtime.toISOString().split('T')[0],
            tags: ['raw'],
            content: 'Raw binary or unparsed file.',
            path: relativePath,
            isRaw: true
          };
        }
      });
      res.json({ reef });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to parse reef." });
    }
  });

  app.get("/api/wiki/file/*", (req, res) => {
    // Sanitize ID to prevent path traversal
    const safeId = req.params[0].replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const filePath = path.join(wikiPath, `${safeId}.md`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseCrustMarkdown(data);
      res.json({ 
        id: safeId,
        title: parsed.metadata.title || safeId,
        type: parsed.metadata.type || 'concept',
        author: parsed.metadata.author || 'System',
        lastUpdated: parsed.metadata.lastUpdated || fs.statSync(filePath).mtime.toISOString().split('T')[0],
        tags: parsed.metadata.tags || [],
        links: parsed.metadata.links || [],
        externalUrls: parsed.metadata.externalUrls || [],
        confidence: parsed.metadata.confidence || 1.0,
        supersededBy: parsed.metadata.supersededBy || null,
        content: parsed.content 
      });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/wiki/synthesize", async (req, res) => {
    const { id, title, content, type, author, tags, links, externalUrls, confidence, supersedes, summary, synthesizedContent } = req.body;
    if (!id || !synthesizedContent) return res.status(400).json({ error: "Missing required payload keys." });
    
    // Sanitize ID to prevent path traversal
    const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    
    try {
      const now = new Date().toISOString().split('T')[0];
      const frontmatter = `---\ntitle: "${title || safeId}"\ntype: "${type || 'concept'}"\nauthor: "${author || 'CrustAgent Synthesis'}"\nlastUpdated: "${now}"\ntags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]\nlinks: [${(links || []).map((l: string) => `"${l}"`).join(', ')}]\nexternalUrls: [${(externalUrls || []).map((l: string) => `"${l}"`).join(', ')}]\nconfidence: ${confidence || 1.0}\n---\n`;
      const filePath = path.join(wikiPath, `${safeId}.md`);
      ensureDir(filePath);
      fs.writeFileSync(filePath, frontmatter + synthesizedContent);
      
      if (supersedes) {
        const supersededIds = supersedes.split(',').map((s: string) => s.trim().replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '')).filter(Boolean);
        for (const sId of supersededIds) {
          const oldFilePath = path.join(wikiPath, `${sId}.md`);
          if (fs.existsSync(oldFilePath)) {
            const oldContent = fs.readFileSync(oldFilePath, 'utf-8');
            const parsedOld = parseCrustMarkdown(oldContent);
            
            const oldFrontmatter = `---\ntitle: "${parsedOld.metadata.title}"\ntype: "${parsedOld.metadata.type}"\nauthor: "${parsedOld.metadata.author}"\nlastUpdated: "${now}"\ntags: [${(parsedOld.metadata.tags || []).map((t: string) => `"${t}"`).join(', ')}]\nlinks: [${(parsedOld.metadata.links || []).map((l: string) => `"${l}"`).join(', ')}]\nexternalUrls: [${(parsedOld.metadata.externalUrls || []).map((l: string) => `"${l}"`).join(', ')}]\nconfidence: ${parsedOld.metadata.confidence || 0.5}\nsupersededBy: "${safeId}"\n---\n`;
            
            fs.writeFileSync(oldFilePath, oldFrontmatter + "\n**[STALE: Superseded by [" + safeId + "](" + safeId + ".md)]**\n\n" + parsedOld.content);
            appendLog('supercession', `${sId} superseded by ${safeId}`);
          }
        }
      }

      appendLog('ingest', safeId);
      updateIndexCatalog(safeId, title || safeId, summary || synthesizedContent, type || 'concept');

      res.json({ success: true, id: safeId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to persist synthesized document to local FS." });
    }
  });

  app.post("/api/wiki/save", async (req, res) => {
    const { id, title, content, type, author, tags, links, externalUrls, confidence, supersededBy } = req.body;
    if (!id || content === undefined) return res.status(400).json({ error: "Missing required payload keys." });
    
    const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const now = new Date().toISOString().split('T')[0];
    const frontmatter = `---\ntitle: "${title || safeId}"\ntype: "${type || 'concept'}"\nauthor: "${author || 'Manual Update'}"\nlastUpdated: "${now}"\ntags: [${(tags || []).map((t: string) => `"${t}"`).join(', ')}]\nlinks: [${(links || []).map((l: string) => `"${l}"`).join(', ')}]\nexternalUrls: [${(externalUrls || []).map((l: string) => `"${l}"`).join(', ')}]\nconfidence: ${confidence || 1.0}\nsupersededBy: "${supersededBy || ''}"\n---\n`;
    
    try {
      const filePath = path.join(wikiPath, `${safeId}.md`);
      ensureDir(filePath);
      fs.writeFileSync(filePath, frontmatter + content);
      appendLog('update', safeId);
      updateIndexCatalog(safeId, title || safeId, content, type || 'concept');
      res.json({ success: true, id: safeId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save document." });
    }
  });

  app.delete("/api/wiki/delete/*", async (req, res) => {
    const id = req.params[0];
    const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
    const filePath = path.join(wikiPath, `${safeId}.md`);

    if (safeId === 'index' || safeId === 'index-list') {
      return res.status(400).json({ error: "Cannot delete the index hub." });
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        appendLog('delete', safeId);
        
        // Remove from index catalog
        const indexPath = path.join(wikiPath, 'index-list.md');
        if (fs.existsSync(indexPath)) {
          const data = parseCrustMarkdown(fs.readFileSync(indexPath, 'utf-8'));
          let lines = data.content.split('\n').filter(line => !line.includes(`](${safeId})`));
          const now = new Date().toISOString().split('T')[0];
          const currentLinks = data.metadata.links || [];
          const currentUrls = data.metadata.externalUrls || [];
          const indexFm = `---\ntitle: "${data.metadata.title || 'Wiki Index'}"\ntype: "system"\nauthor: "System"\nlastUpdated: "${now}"\ntags: []\nlinks: [${currentLinks.filter((l:string) => l !== safeId).map((l:string) => `"${l}"`).join(', ')}]\nexternalUrls: [${currentUrls.map((l:string) => `"${l}"`).join(', ')}]\n---\n`;
          fs.writeFileSync(indexPath, indexFm + lines.join('\n'));
        }

        // Relational Cleanup: Remove references to this ID from all other files
        const files = fs.readdirSync(wikiPath).filter(f => f.endsWith('.md'));
        files.forEach(f => {
          const otherPath = path.join(wikiPath, f);
          const raw = fs.readFileSync(otherPath, 'utf-8');
          const { metadata, content } = parseCrustMarkdown(raw);
          
          if (metadata.links && metadata.links.includes(safeId)) {
            metadata.links = metadata.links.filter((l: string) => l !== safeId);
            const now = new Date().toISOString().split('T')[0];
            const frontmatter = `---\ntitle: "${metadata.title}"\ntype: "${metadata.type}"\nauthor: "${metadata.author}"\nlastUpdated: "${now}"\ntags: [${(metadata.tags || []).map((t: string) => `"${t}"`).join(', ')}]\nlinks: [${(metadata.links || []).map((l: string) => `"${l}"`).join(', ')}]\nexternalUrls: [${(metadata.externalUrls || []).map((l: string) => `"${l}"`).join(', ')}]\n---\n`;
            fs.writeFileSync(otherPath, frontmatter + content);
          }
        });

        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "IsCracked: Failed to purge PolyP from reef." });
    }
  });



  // Document Ingestion Parsing Route
  app.post("/api/wiki/parse", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Missing file payload in scuttle request." });
      }

      let extractedText = "";
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      if (ext === '.pdf') {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      } else if (ext === '.rtf') {
        // use officeparser for proper clean text extraction of rtf
        const doc = await parseOffice(req.file.buffer);
        extractedText = doc.toText();
      } else if (ext === '.txt' || ext === '.md') {
         extractedText = req.file.buffer.toString('utf-8');
      } else {
         return res.status(400).json({ error: "Unsupported file type for pearl extraction." });
      }

      res.json({ text: extractedText });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "IsCracked: Failed to extract pearl payload." });
    }
  });

  // Maintenance LLM Lint Fixer
  app.post("/api/wiki/fix", async (req, res) => {
    const { issue, openRouterModel } = req.body;
    let apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({ error: "OPENROUTER_API_KEY is not configured on the server reef. Check your platform environment variables." });
    }
    
    apiKey = apiKey.trim();
    if (apiKey === "undefined" || apiKey === "null") {
      return res.status(400).json({ error: "OPENROUTER_API_KEY is set to an invalid string value." });
    }

    try {
      // Gather context depending on issue
      let contextStr = "";
      let indexSummary = "";
      let indexListSummary = "";
      
      try {
        indexSummary = fs.readFileSync(path.join(wikiPath, 'index.md'), 'utf-8');
      } catch (e) {}
      
      try {
        indexListSummary = fs.readFileSync(path.join(wikiPath, 'index-list.md'), 'utf-8');
      } catch (e) {}

      if (issue.sourceId) {
        try {
           const fileData = fs.readFileSync(path.join(wikiPath, `${issue.sourceId}.md`), 'utf-8');
           contextStr += `\n--- File: ${issue.sourceId}.md ---\n${fileData}\n`;
        } catch(e) {}
      }

      const wikiPatterns = `
LLM WIKI PATTERN v1: COMPOUNDING REEF
- Goal: Build a persistent, compounding artifact.
- Method: Synthesize new documents relative to existing context. Cross-referencing is mandatory.
- Cross-linking: Internal links [[id]] or [title](id) are the tendons of the reef.

LLM WIKI PATTERN v2: ACTIVE SHELL
- Directory Sovereignty: Group articles into directories: concepts/, entities/, events/, patterns/, references/, insights/, meetings/, projects/, log/.
- Metadata Integrity: Rigorous frontmatter including: title, type, author, lastUpdated, tags, links, confidence, supersededBy.
- Cataloging: index-list.md is the ground truth UI manifest. index.md is the thematic hub.
- Self-Healing: Repair broken links, orphans, and semantic gaps autonomously.
`;

      const allFiles = walkDir(wikiPath).map(f => path.relative(wikiPath, f).replace(/\\/g, '/'));

      const prompt = `You are the backend automated maintenance agent for Lobsterpedia.
Your task is to fix a specific structural or semantic issue detected in the wiki reef.

${wikiPatterns}

CURRENT DIRECTORY STRUCTURE (Relative to /wiki):
${allFiles.map(f => `- ${f}`).join('\n')}

ISSUE TO FIX:
Type: ${issue.type}
Description: ${issue.description}
Source File ID: ${issue.sourceId}

CONTEXT FROM SOURCE FILE:
${contextStr}
-------------
INDEX FILE (Thematic Index):
${indexSummary}
-------------
INDEX-LIST FILE (UI Manifest/Catalog):
${indexListSummary}
-------------

Your job is to fix this issue completely in the backend. 
1. If "broken_link", update the source file or create the missing target.
2. If "orphan", link to it from relevant files or add it to the thematic index.
3. Use directories! If creating a new file, place it in an appropriate folder (e.g. concepts/new-topic.md).
4. Maintain the frontmatter strictly.

You MUST respond with ONLY a valid JSON array of actions to execute. Do not wrap it in markdown block quotes.
JSON Format:
[
  {
    "action": "update", // "update" | "create" | "delete"
    "fileId": "relative/path/to/file_without_extension",
    "content": "---\ntitle: ...\n---\n..." 
  }
]
`;

      const safeTitle = "Lobsterpedia";
      const referer = (process.env.APP_URL || "https://lobsterpedia.clawstackstudios.com").replace(/[^\x00-\x7f]/g, '');
      
      console.log(`[CrustAgent Scuttle] Invoking OpenRouter (Fix) | Referer: ${referer} | Title: ${safeTitle}`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": referer,
          "X-Title": safeTitle,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: openRouterModel || "openai/gpt-oss-120b:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(500).json({ error: "OpenRouter LLM execution failed: " + (data.error?.message || response.statusText) });
      }

      const replyStr = data.choices[0].message.content;
      // parse json out of replyStr (it might have markdown code blocks)
      const jsonMatch = replyStr.match(/(\[[\s\S]*\])/);
      if (!jsonMatch) {
         return res.status(500).json({ error: "LLM did not return a valid JSON array. Response: " + replyStr });
      }

      let actions;
      try {
        const jsonStr = jsonMatch[1];
        try {
          actions = JSON.parse(jsonStr);
        } catch (parseErr) {
          if (parseErr.message.includes("control character") || parseErr.message.includes("line break") || parseErr.message.includes("string literal")) {
            // Attempt to fix unescaped newlines inside string literals
            let inString = false;
            let fixedJson = "";
            for (let i = 0; i < jsonStr.length; i++) {
              const char = jsonStr[i];
              if (char === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
                inString = !inString;
                fixedJson += char;
              } else if (inString && (char === '\n' || char === '\r')) {
                fixedJson += char === '\n' ? '\\n' : '\\r';
              } else {
                fixedJson += char;
              }
            }
            actions = JSON.parse(fixedJson);
          } else {
            throw parseErr;
          }
        }
      } catch (err) {
        return res.status(500).json({ error: "Failed to parse LLM JSON: " + err.message });
      }

      for (const act of actions) {
         if (!act.fileId) continue;
         const fPath = path.join(wikiPath, `${act.fileId}.md`);
         if (act.action === "update" || act.action === "create") {
            if (act.content) fs.writeFileSync(fPath, act.content);
         } else if (act.action === "delete") {
            if (fs.existsSync(fPath)) fs.unlinkSync(fPath);
         }
      }

      // Trigger index rebuild ideally, but for now just appending to log works
      appendLog('fix', issue.id);
      
      res.json({ success: true, actions });
    } catch (err) {
      console.error("Fix Endpoint Error: ", err);
      res.status(500).json({ error: "IsCracked: Maintenance LLM fix failed." });
    }
  });

  app.get("/api/wiki/lint", async (req, res) => {
    try {
      if (!fs.existsSync(wikiPath)) fs.mkdirSync(wikiPath, { recursive: true });
      const files = walkDir(wikiPath).filter(f => f.endsWith('.md') && !f.endsWith('index.md') && !f.endsWith('index-list.md') && !f.endsWith('log.md'));
      const catalog: Record<string, any> = {};
      for (const f of files) {
        const relativePath = path.relative(wikiPath, f);
        const id = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
        const content = fs.readFileSync(f, 'utf-8');
        catalog[id] = parseCrustMarkdown(content);
      }
      
      const issues = [];
      const allIds = Object.keys(catalog);
      
      for (const id of allIds) {
        const doc = catalog[id];
        // 1. Broken Links (Frontmatter)
        if (doc.metadata.links) {
          for (const link of doc.metadata.links) {
             if (!allIds.includes(link) && link !== 'index' && link !== 'log') {
                 issues.push({ id: `broken_link_${id}_${link}`, type: 'broken_link', sourceId: id, targetId: link, description: `File '${id}' has a broken link to '${link}'.` });
             }
          }
        }
        
        // 1b. Broken Links (Inline)
        const linkRegex = /\[([^\]]+)\]\(([^)"]+)\)/g;
        let match;
        while ((match = linkRegex.exec(doc.content)) !== null) {
          const link = match[2];
          if (!link.startsWith('http') && !allIds.includes(link) && link !== 'index' && link !== 'log') {
              issues.push({ id: `broken_inline_link_${id}_${link}`, type: 'broken_link', sourceId: id, targetId: link, description: `File '${id}' has a broken inline link to '${link}'.` });
          }
        }

        // 2. Orphans (No inbound links)
        let isLinked = false;
        for (const otherId of allIds) {
            if (otherId === id) continue;
            const otherDoc = catalog[otherId];
            if (otherDoc.metadata.links?.includes(id)) {
                isLinked = true;
                break;
            }
            if (otherDoc.content.includes(`](${id})`)) {
                isLinked = true;
                break;
            }
        }
        if (!isLinked) {
            issues.push({ id: `orphan_${id}`, type: 'orphan', sourceId: id, description: `File '${id}' is an orphan page (no inbound links).` });
        }

        // 3. Missing tags
        if (!doc.metadata.tags || doc.metadata.tags.length === 0) {
            issues.push({ id: `missing_tags_${id}`, type: 'missing_tags', sourceId: id, description: `File '${id}' has no tags assigned.` });
        }
      }
      
      const uniqueIssues = Array.from(new Map(issues.map(i => [i.id, i])).values());
      res.json({ success: true, issues: uniqueIssues });
    } catch(err) {
        console.error("Lint error:", err);
        res.status(500).json({ error: "IsCracked: Lint scan failed" });
    }
  });

  // OpenRouter Proxy Endpoint (Security Layer: Key is never sent to browser)
  app.post("/api/ai/openrouter", async (req, res) => {
    const { prompt, model } = req.body;
    let apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({ 
        error: "OPENROUTER_API_KEY is not configured on the server reef. Please check your environment variables." 
      });
    }

    apiKey = apiKey.trim();
    if (apiKey === "undefined" || apiKey === "null") {
      return res.status(400).json({ error: "OPENROUTER_API_KEY is set to an invalid string value." });
    }

    if (!prompt) {
      return res.status(400).json({ error: "Raw payload (prompt) is missing." });
    }

    try {
      const safeTitle = "Lobsterpedia";
      const referer = (process.env.APP_URL || "https://lobsterpedia.clawstackstudios.com").replace(/[^\x00-\x7f]/g, '');
      
      console.log(`[CrustAgent Scuttle] Invoking OpenRouter (Proxy) | Model: ${model || "default"} | Referer: ${referer}`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": referer,
          "X-Title": safeTitle,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: model || "openai/gpt-oss-120b:free",
          messages: [
            { role: "system", content: "Communicate with rigorous epistemic discipline: prefer measured confidence, deep reasoning and parsimonious explanations, avoiding unnecessary complexity or overextension." },
            { role: "user", content: prompt }
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        let errorBody;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           errorBody = await response.json();
        } else {
           errorBody = await response.text();
        }
        
        return res.status(response.status).json({ 
          error: `OpenRouter Scuttle Failed: ${response.statusText}`, 
          details: errorBody 
        });
      }

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("[CrustAgent Security Log] Unexpected non-JSON response from OpenRouter:", text);
        return res.status(500).json({ error: "IsCracked: OpenRouter returned non-JSON payload." });
      }

      const text = data.choices?.[0]?.message?.content || "";
      res.json({ text });
    } catch (err) {
      console.error("[CrustAgent Security Log] OpenRouter Proxy Failure:", err);
      res.status(500).json({ 
        error: "IsCracked: OpenRouter Proxy failure.",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  app.get("/api/git/status", async (req, res) => {
    try {
      const isRepo = await git.checkIsRepo();
      res.json({ initialized: isRepo });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git status failed" });
    }
  });

  app.post("/api/git/init", async (req, res) => {
    try {
      await git.init();
      await git.addConfig('user.name', 'CrustAgent');
      await git.addConfig('user.email', 'agent@clawstack.com');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git init failed" });
    }
  });

  app.get("/api/git/history", async (req, res) => {
    try {
      const { file } = req.query;
      const options: any = file ? { file: `${file}.md` } : {};
      const logs = await git.log(options);
      res.json({ history: logs.all });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git history fetch failed" });
    }
  });

  app.get("/api/git/file/:commit/:id", async (req, res) => {
    try {
      const { commit, id } = req.params;
      const filePath = `${id}.md`;
      let fileContent = '';
      try {
        fileContent = await git.show([`${commit}:${filePath}`]);
      } catch (e) {
        return res.status(404).json({ error: "File not found in this commit" });
      }
      
      const parsed = parseCrustMarkdown(fileContent);
      res.json({
        content: parsed.content,
        metadata: parsed.metadata
      });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git show failed" });
    }
  });

  app.post("/api/git/commit", async (req, res) => {
    const { message, autoStage } = req.body;
    try {
      if (!message) return res.status(400).json({ error: "Commit message is required." });
      
      await git.addConfig('user.name', 'CrustAgent');
      await git.addConfig('user.email', 'agent@clawstack.com');
      
      if (autoStage) {
        await git.add('.');
      }
      
      const summary = await git.commit(message, { '--allow-empty': null });
      res.json({ success: true, summary });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "IsCracked: Git commit failed" });
    }
  });

  app.get("/api/git/status-details", async (req, res) => {
    try {
      const status = await git.status();
      res.json({
        not_added: status.not_added,
        conflicted: status.conflicted,
        created: status.created,
        deleted: status.deleted,
        modified: status.modified,
        renamed: status.renamed,
        staged: status.staged,
        files: status.files
      });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git status-details failed" });
    }
  });

  app.post("/api/git/stage", async (req, res) => {
    const { file } = req.body;
    try {
      await git.add(file || '.');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git stage failed" });
    }
  });

  app.post("/api/git/unstage", async (req, res) => {
    const { file } = req.body;
    try {
      if (file) {
        await git.reset(['--', file]);
      } else {
        await git.reset(['--']);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "IsCracked: Git unstage failed" });
    }
  });

  app.get("/api/wiki/watch", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const watcher = chokidar.watch(wikiPath, { 
      ignoreInitial: true, 
      ignored: /(^|[\/\\])\../,
      usePolling: true,
      interval: 1000
    });
    
    watcher.on('all', (event, pathStr) => {
      res.write(`data: ${JSON.stringify({ event, file: pathStr, timestamp: Date.now() })}\n\n`);
    });

    req.on('close', () => watcher.close());
  });

  // --- Global Error Handler ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[CrustAgent Global Error]:", err);
    res.status(500).json({ 
      error: "IsCracked: Internal server error.", 
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack 
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🦞 Lobsterpedia running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

startServer();
