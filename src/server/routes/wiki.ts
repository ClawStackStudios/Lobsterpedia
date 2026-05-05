import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { wikiService } from '../services/wikiService.js';
import { createRequire } from "module";
import chokidar from 'chokidar';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- API Routes ---

router.get("/health", (req, res) => {
  res.json({ status: "shellHardened", message: "Habitat is stable." });
});

router.get("/settings", (req, res) => {
  const settingsPath = path.join(wikiService.getWikiPath(), 'settings.json');
  let settings = { scanInterval: '5m', autoIngest: false };
  if (fs.existsSync(settingsPath)) {
    try {
      settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
    } catch(e) {}
  }
  res.json(settings);
});

router.post("/settings", (req, res) => {
  const settingsPath = path.join(wikiService.getWikiPath(), 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

router.post("/mkdir", (req, res) => {
  const { path: dirPath } = req.body;
  if (!dirPath) return res.status(400).json({ error: "Missing path." });
  
  const wikiPath = path.resolve(wikiService.getWikiPath());
  const safePath = path.resolve(path.join(wikiPath, dirPath));
  
  // 🛡️ Strict Boundary Check
  if (!safePath.startsWith(wikiPath)) {
    return res.status(403).json({ error: "Path traversal detected." });
  }

  try {
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
      wikiService.appendLog('mkdir', dirPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to create directory." });
  }
});

router.post("/move", (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ error: "Missing paths." });
  
  const wikiPath = path.resolve(wikiService.getWikiPath());
  const safeOld = path.resolve(path.join(wikiPath, oldPath));
  const safeNew = path.resolve(path.join(wikiPath, newPath));

  // 🛡️ Strict Boundary Check
  if (!safeOld.startsWith(wikiPath) || !safeNew.startsWith(wikiPath)) {
    return res.status(403).json({ error: "Path traversal detected." });
  }

  try {
    if (fs.existsSync(safeOld)) {
      wikiService.ensureDir(safeNew);
      fs.renameSync(safeOld, safeNew);
      wikiService.appendLog('move', `${oldPath} -> ${newPath}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Source not found." });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to move file/directory." });
  }
});

router.get("/files", (req, res) => {
  try {
    const files = wikiService.walkDir().filter(f => 
      !f.endsWith('.git') && 
      !f.includes('node_modules') && 
      !f.endsWith('.scanned.json') && 
      !f.endsWith('settings.json')
    );
    const reef: Record<string, any> = {};
    files.forEach(f => {
      const relativePath = path.relative(wikiService.getWikiPath(), f);
      const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
      const isMd = f.endsWith('.md');
      const id = isMd ? relativePath.replace(/\.md$/, '').replace(/\\/g, '/') : relativePath.replace(/\\/g, '/');
      
      if (isMd) {
        const data = fs.readFileSync(f, 'utf-8');
        const parsed = wikiService.parseCrustMarkdown(data);
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
    res.status(500).json({ error: "Failed to parse reef." });
  }
});

router.get("/file/*", (req, res) => {
  const safeId = req.params[0].replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
  const filePath = path.join(wikiService.getWikiPath(), `${safeId}.md`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = wikiService.parseCrustMarkdown(data);
    res.json({ 
      id: safeId,
      ...parsed.metadata,
      content: parsed.content 
    });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

router.post("/synthesize", async (req, res) => {
  const { id, title, content, type, author, tags, links, externalUrls, confidence, supersedes, summary, synthesizedContent } = req.body;
  if (!id || !synthesizedContent) return res.status(400).json({ error: "Missing required payload keys." });
  const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
  try {
    wikiService.savePage(safeId, { title, type, author, tags, links, externalUrls, confidence }, synthesizedContent);
    if (supersedes) {
      const supersededIds = supersedes.split(',').map((s: string) => s.trim().replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '')).filter(Boolean);
      for (const sId of supersededIds) {
        const oldFilePath = path.join(wikiService.getWikiPath(), `${sId}.md`);
        if (fs.existsSync(oldFilePath)) {
          const oldContent = fs.readFileSync(oldFilePath, 'utf-8');
          const parsedOld = wikiService.parseCrustMarkdown(oldContent);
          const now = new Date().toISOString().split('T')[0];
          wikiService.savePage(sId, { ...parsedOld.metadata, supersededBy: safeId, lastUpdated: now }, "\n**[STALE: Superseded by [" + safeId + "](" + safeId + ".md)]**\n\n" + parsedOld.content);
          wikiService.appendLog('supercession', `${sId} superseded by ${safeId}`);
        }
      }
    }
    wikiService.appendLog('ingest', safeId);
    wikiService.updateIndexCatalog(safeId, title || safeId, summary || synthesizedContent, type || 'concept');
    res.json({ success: true, id: safeId });
  } catch (err) {
    res.status(500).json({ error: "Failed to persist synthesized document." });
  }
});

router.post("/save", async (req, res) => {
  const { id, title, content, type, author, tags, links, externalUrls, confidence, supersededBy } = req.body;
  if (!id || content === undefined) return res.status(400).json({ error: "Missing required payload keys." });
  const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
  try {
    wikiService.savePage(safeId, { title, type, author, tags, links, externalUrls, confidence, supersededBy }, content);
    wikiService.appendLog('update', safeId);
    wikiService.updateIndexCatalog(safeId, title || safeId, content, type || 'concept');
    res.json({ success: true, id: safeId });
  } catch (err) {
    res.status(500).json({ error: "Failed to save document." });
  }
});

router.delete("/delete/*", async (req, res) => {
  const id = req.params[0];
  const safeId = id.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/]/g, '');
  const filePath = path.join(wikiService.getWikiPath(), `${safeId}.md`);
  if (safeId === 'index' || safeId === 'index-list') return res.status(400).json({ error: "Cannot delete the index hub." });
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      wikiService.appendLog('delete', safeId);
      // Optional: Add relational cleanup here if needed
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to purge PolyP from reef." });
  }
});

router.post("/parse", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file payload." });
    
    const require = createRequire(import.meta.url);
    let extractedText = "";
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.pdf') {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    } else if (ext === '.rtf') {
      const { parseOffice } = require("officeparser");
      const doc = await parseOffice(req.file.buffer);
      extractedText = doc.toText();
    } else if (ext === '.txt' || ext === '.md') {
      extractedText = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: "Unsupported file type." });
    }
    res.json({ text: extractedText });
  } catch (err) {
    res.status(500).json({ error: "Failed to extract pearl payload." });
  }
});

router.get("/lint", (req, res) => {
  try {
    const files = wikiService.walkDir().filter(f => f.endsWith('.md'));
    const issues: any[] = [];
    const allIds = files.map(f => path.relative(wikiService.getWikiPath(), f).replace(/\.md$/, '').replace(/\\/g, '/'));
    
    files.forEach(f => {
      const data = fs.readFileSync(f, 'utf-8');
      const { metadata, content } = wikiService.parseCrustMarkdown(data);
      const id = path.relative(wikiService.getWikiPath(), f).replace(/\.md$/, '').replace(/\\/g, '/');
      
      // 1. Broken Links
      const links = metadata.links || [];
      links.forEach((link: string) => {
        if (!allIds.includes(link) && link !== 'index' && link !== 'index-list') {
          issues.push({
            id: `broken-link-${id}-${link}`,
            type: 'broken-link',
            severity: 'warn',
            sourceId: id,
            description: `Reference to non-existent PolyP: [[${link}]]`,
            suggestion: `Verify the link ID or synthesize the missing knowledge node.`
          });
        }
      });
      
      // 2. Metadata Rot
      if (!metadata.title) {
        issues.push({
          id: `missing-title-${id}`,
          type: 'metadata-rot',
          severity: 'info',
          sourceId: id,
          description: `Missing title in frontmatter.`,
          suggestion: `Add a 'title' field to ensure professional indexing.`
        });
      }
      
      // 3. Orphans (No incoming links)
      const isLinked = allIds.some(otherId => {
        if (otherId === id) return false;
        const otherData = fs.readFileSync(path.join(wikiService.getWikiPath(), `${otherId}.md`), 'utf-8');
        const otherParsed = wikiService.parseCrustMarkdown(otherData);
        return (otherParsed.metadata.links || []).includes(id);
      });
      
      if (!isLinked && id !== 'index' && id !== 'index-list') {
        issues.push({
          id: `orphan-${id}`,
          type: 'orphan',
          severity: 'info',
          sourceId: id,
          description: `Isolated PolyP: No incoming links detected.`,
          suggestion: `Connect this node to the reef by linking to it from the index or related articles.`
        });
      }
    });
    
    res.json({ issues });
  } catch (err) {
    res.status(500).json({ error: "Linting engine failed." });
  }
});

router.get("/watch", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const watcher = chokidar.watch(wikiService.getWikiPath(), {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true
  });

  const sendEvent = (event: string, file: string) => {
    res.write(`data: ${JSON.stringify({ event, file })}\n\n`);
  };

  watcher
    .on('add', path => sendEvent('add', path))
    .on('change', path => sendEvent('change', path))
    .on('unlink', path => sendEvent('unlink', path))
    .on('addDir', path => sendEvent('addDir', path))
    .on('unlinkDir', path => sendEvent('unlinkDir', path));

  req.on('close', () => {
    watcher.close();
  });
});

export default router;
