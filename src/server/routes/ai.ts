import express from 'express';
import fs from 'fs';
import path from 'path';
import { wikiService } from '../services/wikiService.js';
import { dbService } from '../services/dbService.js';
import { PROMPTS } from '../services/promptManager.js';

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
    
    const modelToUse = model || dbService.getDreamState('model') || process.env.DEFAULT_OPENROUTER_MODEL || "nousresearch/hermes-3-llama-3.1-405b:free";
    
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
        model: modelToUse,
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
  const { issue, model } = req.body;
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

    const prompt = PROMPTS.Wiki.HabitatMaintenance(geometricContext, issue.description + `\nContextual Files Provided: ${contextStr}`);

    const safeTitle = "Lobsterpedia";
    const referer = (process.env.APP_URL || "https://lobsterpedia.clawstackstudios.com").replace(/[^\x00-\x7f]/g, '');

    const modelToUse = model || dbService.getDreamState('model') || process.env.DEFAULT_OPENROUTER_MODEL || "nousresearch/hermes-3-llama-3.1-405b:free";

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
        model: modelToUse,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
       console.error("[CrustAgent] OpenRouter Fix Handshake Failed:", data.error || data);
       return res.status(response.status).json({ error: "OpenRouter failure: " + (data.error?.message || response.statusText) });
    }

    if (!data.choices || !data.choices[0]) {
       console.error("[CrustAgent] OpenRouter returned empty choices:", data);
       return res.status(500).json({ error: "OpenRouter returned no response choices." });
    }

    const replyStr = data.choices[0].message.content;
    const jsonMatch = replyStr.match(/(\[[\s\S]*\])/);
    if (!jsonMatch) {
      console.warn("[CrustAgent] LLM output did not contain valid action JSON:", replyStr);
      return res.status(500).json({ error: "Invalid LLM response format." });
    }

    let actions;
    try {
      actions = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("[CrustAgent] Failed to parse LLM action JSON:", jsonMatch[1], e);
      return res.status(500).json({ error: "Broken action payload from LLM." });
    }

    if (!Array.isArray(actions)) {
      console.error("[CrustAgent] LLM response was not an array:", actions);
      return res.status(500).json({ error: "LLM response is not a valid action set." });
    }

    for (const act of actions) {
       if (!act.fileId || !act.action) continue;
       const cleanFileId = act.fileId.endsWith('.md') ? act.fileId.slice(0, -3) : act.fileId;
       
       if (act.action === "update" || act.action === "create") {
          // Use wikiService.savePage to ensure the edit is Witnessed by the ledger
          const { metadata, content } = wikiService.parseCrustMarkdown(act.content || "");
          
          // Ensure we don't lose existing metadata if the LLM hallucinated a blank set
          const fPath = path.resolve(path.join(wikiPath, `${cleanFileId}.md`));
          
          // 🛡️ Path Traversal Security Check: Ensure fPath is strictly within wikiPath
          if (!fPath.startsWith(path.resolve(wikiPath))) {
            console.warn(`[CrustAgent] AI attempted to escape habitat boundary: ${cleanFileId}`);
            continue; 
          }

          const existingRaw = fs.existsSync(fPath) ? fs.readFileSync(fPath, 'utf-8') : "";
          const existing = existingRaw ? wikiService.parseCrustMarkdown(existingRaw).metadata : {};
          
          wikiService.savePage(cleanFileId, {
            ...existing,
            ...metadata,
            author: "LLM" 
          }, content);
       }
    }
    wikiService.appendLog('fix', issue.id);
    res.json({ success: true, actions });
  } catch (err) {
    console.error("[CrustAgent] Maintenance fix CRITICAL FAILURE:", err);
    res.status(500).json({ error: "IsCracked: Maintenance fix failed." });
  }
});

export default router;
