import express from 'express';
import fs from 'fs';
import path from 'path';
import { wikiService } from '../services/wikiService.js';

const router = express.Router();

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
    const prompt = `You are the backend automated maintenance agent for Lobsterpedia. Fix the following issue in the wiki reef.\n\nIssue: ${issue.description}\nContext: ${contextStr}\n\nRespond with ONLY a JSON array of actions: [{"action": "update", "fileId": "...", "content": "..."}]`;

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
          // Ensure directory exists
          const dir = path.dirname(fPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fPath, act.content);
       }
    }
    wikiService.appendLog('fix', issue.id);
    res.json({ success: true, actions });
  } catch (err) {
    res.status(500).json({ error: "IsCracked: Maintenance fix failed." });
  }
});

export default router;
