import express from 'express';
import fs from 'fs';
import path from 'path';
import { wikiService } from '../services/wikiService.js';
import { dbService } from '../services/dbService.js';

const router = express.Router();

/**
 * Generates geometric context for the LLM if the database is hatched.
 * Provides relevance hub data, document metadata, and link topology.
 */
function getGeometricContext(pageId?: string) {
  if (!dbService.isActive) return "";

  let context = "\n[GEOMETRIC REEF CONTEXT]\n";
  
  // 1. Hub Knowledge (Global Relevance)
  const topPearls = dbService.getAllPearls().slice(0, 5);
  context += "--- Global Hubs (High Relevance) ---\n";
  topPearls.forEach(p => {
    context += `- ${p.page_id} (Relevance: ${(p.relevance_score * 100).toFixed(1)}%, Type: ${p.type})\n`;
  });

  // 2. Specific Page DNA
  if (pageId) {
    const pearl = dbService.getPearl(pageId);
    if (pearl) {
      context += `\n--- Target Page DNA: ${pageId} ---\n`;
      context += `- Confidence: ${(pearl.confidence * 100).toFixed(0)}%\n`;
      context += `- Quality Score: ${(pearl.quality_score * 100).toFixed(0)}%\n`;
      context += `- Relevance: ${(pearl.relevance_score * 100).toFixed(1)}%\n`;
      
      const inbound = dbService.getInboundLinks(pageId);
      if (inbound.length > 0) {
        context += `- Inbound Links (Blast Radius): ${inbound.join(', ')}\n`;
      }
    }
  }

  return context + "\n";
}

router.post("/openrouter", async (req, res) => {
  const { prompt, model } = req.body;
  let apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({ 
      error: "OPENROUTER_API_KEY is not configured on the server reef. Please check your environment variables." 
    });
  }

  apiKey = apiKey.trim();
  try {
    const safeTitle = "Lobsterpedia";
    const referer = (process.env.APP_URL || "https://lobsterpedia.clawstackstudios.com").replace(/[^\x00-\x7f]/g, '');
    
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
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: "OpenRouter LLM execution failed: " + (data.error?.message || response.statusText) });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "IsCracked: AI handshake failed." });
  }
});

router.post("/fix", async (req, res) => {
  const { issue, openRouterModel } = req.body;
  let apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({ error: "OPENROUTER_API_KEY is not configured." });
  }

  try {
    const wikiPath = wikiService.getWikiPath();
    let contextStr = "";
    if (issue.sourceId) {
      try {
         const fileData = fs.readFileSync(path.join(wikiPath, `${issue.sourceId}.md`), 'utf-8');
         contextStr += `\n--- File: ${issue.sourceId}.md ---\n${fileData}\n`;
      } catch(e) {}
    }

    const allFiles = wikiService.walkDir().map(f => path.relative(wikiPath, f).replace(/\\/g, '/'));
    
    // Augment with Geometric Context if database is active
    const geometricContext = getGeometricContext(issue.sourceId);

    const prompt = `You are the backend maintenance agent for Lobsterpedia, a "Geometric Knowledge Reef."
Your goal is to maintain the integrity of the knowledge graph while fixing issues.

${geometricContext}

Issue to Fix: ${issue.description}
Contextual Files Provided: ${contextStr}

INSTRUCTIONS:
1. Fix the issue strictly following the Lobsterpedia philosophy (no ghost files, high synthesis).
2. If the target page has a high confidence score or high relevance hub status, proceed with surgical precision.
3. Maintain all frontmatter fields (title, type, author, lastUpdated, tags, links, confidence).
4. Respond with ONLY a JSON array of actions: [{"action": "update", "fileId": "...", "content": "..."}]`;

    const safeTitle = "Lobsterpedia";
    const referer = (process.env.APP_URL || "https://lobsterpedia.clawstackstudios.com").replace(/[^\x00-\x7f]/g, '');

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
    const replyStr = data.choices[0].message.content;
    const jsonMatch = replyStr.match(/(\[[\s\S]*\])/);
    if (!jsonMatch) return res.status(500).json({ error: "Invalid LLM response." });

    const actions = JSON.parse(jsonMatch[1]);
    for (const act of actions) {
       if (!act.fileId) continue;
       const fPath = path.resolve(path.join(wikiPath, `${act.fileId}.md`));
       
       // 🛡️ Path Traversal Security Check: Ensure fPath is strictly within wikiPath
       if (!fPath.startsWith(path.resolve(wikiPath))) {
         console.warn(`[CrustAgent] AI attempted to escape habitat boundary: ${act.fileId}`);
         continue; 
       }

       if (act.action === "update" || act.action === "create") {
          // Use wikiService.savePage to ensure the edit is Witnessed by the ledger
          const { metadata, content } = wikiService.parseCrustMarkdown(act.content);
          
          // Ensure we don't lose existing metadata if the LLM hallucinated a blank set
          const existingRaw = fs.existsSync(fPath) ? fs.readFileSync(fPath, 'utf-8') : "";
          const existing = existingRaw ? wikiService.parseCrustMarkdown(existingRaw).metadata : {};
          
          wikiService.savePage(act.fileId, {
            ...existing,
            ...metadata,
            author: "LLM" // Mark the hand of the agent
          }, content);
       }
    }
    wikiService.appendLog('fix', issue.id);
    res.json({ success: true, actions });
  } catch (err) {
    res.status(500).json({ error: "IsCracked: Maintenance fix failed." });
  }
});

export default router;
