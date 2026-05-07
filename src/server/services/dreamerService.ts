// ─── Dreamer Service (The Carapace Engine) ────────────────────────────────────
//
// Orchestrates the 3-phase autonomous knowledge synthesis cycle:
//   1. Shell Inspection (Light Sleep) — scan, dedupe, stage candidates
//   2. Tidal Dreaming (REM Sleep)     — LLM-driven theme reflection
//   3. Carapace Hardening (Deep Sleep) — score, gate, promote to insights
//
// The Dreamer reads from the Sovereign Ledger (habitat.db) and writes
// exclusively to the sandboxed carapace/ directory. It NEVER modifies wiki/.
// ──────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { dbService } from './dbService.js';
import { habitatLogger } from './habitatLogger.js';
import type { DreamCandidateRecord, PearlSignals } from './dbService.js';
import { PROMPTS } from './promptManager.js';
import {
  scorePearl,
  passesGates,
  DEFAULT_GATE_CONFIG,
  DEFAULT_REEF_WEIGHTS,
  type ReefScoreResult,
} from './dreamerScoring.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SweepResult {
  sweepId: string;
  phase: 'light' | 'rem' | 'deep';
  candidates: number;
  reflections: number;
  promotions: number;
  duration: number;
}

interface ScoredCandidate {
  pageId: string;
  signals: PearlSignals;
  scoreResult: ReefScoreResult;
  signalTypes: string[];
}

// ─── Service ────────────────────────────────────────────────────────────────

export class DreamerService {
  private carapacePath: string;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(carapacePath: string) {
    this.carapacePath = carapacePath;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  public get isHatched(): boolean {
    return (
      process.env.HATCH_CARAPACE === 'true' &&
      process.env.HATCH_DATABASE === 'true' &&
      dbService.isActive
    );
  }

  public start(): void {
    if (!this.isHatched) return;

    this.ensureCarapaceStructure();
    const freqMs = parseInt(process.env.CARAPACE_FREQUENCY || '3600000', 10);
    if (freqMs > 0) {
      this.timer = setInterval(() => this.runSweep(), freqMs);
      console.log(`[Carapace] 💤 Dreamer scheduled every ${Math.round(freqMs / 60000)}m`);
    }
    console.log(`[Carapace] 🦞 Carapace hatched at: ${this.carapacePath}`);
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ─── Directory Structure ────────────────────────────────────────────────────

  private ensureCarapaceStructure(): void {
    const dirs = [
      path.join(this.carapacePath, 'dreams'),
      path.join(this.carapacePath, 'dreams', 'sweeps'),
      path.join(this.carapacePath, 'insights'),
      path.join(this.carapacePath, 'reflections'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.seedCarapace();
  }

  /**
   * Seeds the Carapace with an initial index and category explanation if empty.
   * This turns the sandboxed directory into a readable "Machine Wiki".
   */
  private seedCarapace(): void {
    const indexPath = path.join(this.carapacePath, 'index.md');
    if (fs.existsSync(indexPath)) return;

    const now = new Date().toISOString().split('T')[0];
    const content = `---
title: "The Carapace: Machine Subconscious"
type: "system"
author: "Dreamer"
lastUpdated: "${now}"
tags: ["root", "carapace", "subconscious"]
links: []
---
# 🦞 The Carapace

Welcome to the **Machine Subconscious** of Lobsterpedia. 

This directory is a sandboxed "Machine Wiki" where the autonomous Dreaming Layer synthesizes, reflects, and promotes knowledge without human intervention.

## 🌌 Topology of the Subconscious

- **[[insights/|Insights]]**: High-confidence knowledge promoted during **Deep Sleep**. These are the "Hardened Shells" of the reef's thinking.
- **[[dreams/JOURNAL.md|Dream Journal]]**: A chronological record of every dream sweep, including staged candidates and scoring breakdowns.
- **[[reflections/|Reflections]]**: Thematic patterns and contradictions identified during **REM Sleep**.

## ⚖️ The Law of the Carapace

1. **Autonomous Territory**: The Dreamer writes here. Humans are encouraged to read and link, but manual edits here may be overwritten or ignored by the engine.
2. **Promotion Gate**: Nothing enters the \`insights/\` directory without passing the 6-signal weighted scoring gate (\`minScore >= 0.6\`).
3. **Sandbox Isolation**: This directory is invisible to the main wiki scanner to prevent recursive feedback loops.

---
*Maintained by the Carapace Dreamer*
`;
    fs.writeFileSync(indexPath, content);

    // Create category indices
    const categories = ['insights', 'reflections'];
    for (const cat of categories) {
      const catIndexPath = path.join(this.carapacePath, cat, 'index.md');
      if (!fs.existsSync(catIndexPath)) {
        const catContent = `---
title: "Carapace: ${cat.charAt(0).toUpperCase() + cat.slice(1)}"
type: "system"
author: "Dreamer"
lastUpdated: "${now}"
tags: ["carapace", "${cat}"]
---
# ${cat.charAt(0).toUpperCase() + cat.slice(1)}

This directory contains autonomous outputs related to the ${cat} phase of dreaming.
`;
        fs.writeFileSync(catIndexPath, catContent);
      }
    }
  }

  // ─── Full Sweep Orchestrator ────────────────────────────────────────────────

  public async runSweep(): Promise<SweepResult> {
    if (!this.isHatched) {
      throw new Error('[Carapace] Cannot dream — HATCH_CARAPACE or HATCH_DATABASE not active.');
    }
    if (this.isRunning) {
      throw new Error('[Carapace] A sweep is already running.');
    }

    this.isRunning = true;
    const sweepId = randomUUID().slice(0, 8);
    const startMs = Date.now();

    console.log(`[Carapace] 🌊 Starting sweep ${sweepId}...`);

    try {
      // Phase 1: Shell Inspection (Light Sleep)
      const candidates = this.runShellInspection(sweepId);

      // Phase 2: Tidal Dreaming (REM Sleep) — LLM-driven, graceful skip
      const reflections = await this.runTidalDreaming(sweepId, candidates);

      // Phase 3: Carapace Hardening (Deep Sleep) — scoring + promotion
      const promotions = this.runCarapaceHardening(sweepId, candidates);

      // Write the sweep report to JOURNAL.md
      this.writeJournalEntry(sweepId, candidates, reflections, promotions);

      // Record sweep state
      dbService.setDreamState('last_sweep_id', sweepId);
      dbService.setDreamState('last_sweep_time', new Date().toISOString());
      dbService.setDreamState('last_sweep_phase', 'complete');

      const duration = Date.now() - startMs;
      habitatLogger.log('dreamer', `Sweep ${sweepId} complete: ${candidates.length} candidates, ${reflections} reflections, ${promotions} promotions`, 'success');
      console.log(
        `[Carapace] ✅ Sweep ${sweepId} complete: ` +
        `${candidates.length} candidates, ${reflections} reflections, ${promotions} promotions (${duration}ms)`
      );

      return {
        sweepId,
        phase: 'deep',
        candidates: candidates.length,
        reflections,
        promotions,
        duration,
      };
    } finally {
      this.isRunning = false;
    }
  }

  // ─── Phase 1: Shell Inspection (Light Sleep) ───────────────────────────────

  private runShellInspection(sweepId: string): ScoredCandidate[] {
    console.log(`[Carapace] 🐚 Phase 1: Shell Inspection...`);

    const lookbackDays = 2;
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
    const moltedPages = dbService.getMoltedPagesSince(cutoff);
    const islands = dbService.getIslandPearls();
    const lowConfidence = dbService.getLowConfidencePearls(0.5);

    // Collect unique candidate page IDs with their signal types
    const candidateMap = new Map<string, Set<string>>();

    const addCandidate = (pageId: string, signalType: string) => {
      if (!candidateMap.has(pageId)) candidateMap.set(pageId, new Set());
      candidateMap.get(pageId)!.add(signalType);
    };

    // Hot pearls: pages edited in the lookback window
    for (const pageId of moltedPages) {
      addCandidate(pageId, 'hot_pearl');
    }

    // Islands: pages with no connections
    for (const pageId of islands) {
      addCandidate(pageId, 'island');
    }

    // Low confidence pages
    for (const pageId of lowConfidence) {
      addCandidate(pageId, 'low_confidence');
    }

    // Score each candidate and record in the database
    const scored: ScoredCandidate[] = [];

    for (const [pageId, signalTypes] of candidateMap) {
      const signals = dbService.getSignalsForPearl(pageId);
      if (!signals) continue;

      const scoreResult = scorePearl(signals, DEFAULT_REEF_WEIGHTS);

      // Record each signal type as a separate candidate row
      for (const signalType of signalTypes) {
        dbService.insertDreamCandidate({
          sweep_id: sweepId,
          page_id: pageId,
          signal_type: signalType as any,
          score: scoreResult.score,
          metadata: JSON.stringify({
            components: scoreResult.components,
            molt_count: signals.molt_count,
            inbound_links: signals.inbound_link_count,
          }),
        });
      }

      scored.push({
        pageId,
        signals,
        scoreResult,
        signalTypes: [...signalTypes],
      });
    }

    console.log(`[Carapace]   → ${scored.length} unique candidates staged`);
    return scored;
  }

  // ─── Phase 2: Tidal Dreaming (REM Sleep) ───────────────────────────────────

  private async runTidalDreaming(
    sweepId: string,
    candidates: ScoredCandidate[]
  ): Promise<number> {
    console.log(`[Carapace] 🌙 Phase 2: Tidal Dreaming...`);

    if (!process.env.OPENROUTER_API_KEY) {
      console.log(`[Carapace]   → Skipped (no OPENROUTER_API_KEY)`);
      return 0;
    }

    if (candidates.length === 0) {
      console.log(`[Carapace]   → Skipped (no candidates)`);
      return 0;
    }

    // Take top 10 candidates by score for reflection
    const topCandidates = candidates
      .sort((a, b) => b.scoreResult.score - a.scoreResult.score)
      .slice(0, 10);

    const summaryLines = topCandidates.map(c =>
      `- ${c.pageId} (score: ${c.scoreResult.score.toFixed(3)}, ` +
      `molts: ${c.signals.molt_count}, links: ${c.signals.inbound_link_count}, ` +
      `signals: [${c.signalTypes.join(', ')}])`
    );

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: dbService.getDreamState('model') || 'nousresearch/hermes-3-llama-3.1-405b:free',
          messages: [
            {
              role: 'user',
              content: PROMPTS.Wiki.TidalDreaming(summaryLines.join('\n')),
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        console.log(`[Carapace]   → LLM request failed: ${response.status}`);
        return 0;
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content?.trim() || '[]';

      let reflections: { theme: string; summary: string; related_ids: string[], confidence?: number, relationship?: string }[];
      try {
        reflections = JSON.parse(content);
        if (!Array.isArray(reflections)) reflections = [];
      } catch {
        console.log(`[Carapace]   → LLM response was not valid JSON`);
        return 0;
      }

      for (const r of reflections) {
        if (!r.theme || !r.summary) continue;
        dbService.insertDreamReflection({
          sweep_id: sweepId,
          theme: r.theme,
          summary: r.summary,
          related_ids: JSON.stringify(r.related_ids || []),
          confidence: r.confidence || 0,
          relationship: r.relationship || '',
        });
      }

      habitatLogger.log('dreamer', `REM phase captured ${reflections.length} thematic reflections`, 'success');
      console.log(`[Carapace]   → ${reflections.length} reflections captured`);
      return reflections.length;
    } catch (err) {
      habitatLogger.log('dreamer', `REM phase error: ${(err as Error).message}`, 'error');
      console.log(`[Carapace]   → REM phase error: ${(err as Error).message}`);
      return 0;
    }
  }

  // ─── Phase 3: Carapace Hardening (Deep Sleep) ──────────────────────────────

  private runCarapaceHardening(
    sweepId: string,
    candidates: ScoredCandidate[]
  ): number {
    console.log(`[Carapace] 🪨 Phase 3: Carapace Hardening...`);

    const promoted: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      const { passes, failures } = passesGates(
        candidate.signals,
        candidate.scoreResult.score,
        DEFAULT_GATE_CONFIG
      );

      if (passes) {
        promoted.push(candidate);
      }
    }

    if (promoted.length === 0) {
      console.log(`[Carapace]   → No candidates passed gates`);
      return 0;
    }

    // Write insight files to carapace/insights/
    const today = new Date().toISOString().split('T')[0];
    let promotionCount = 0;

    for (const candidate of promoted) {
      const insightFileName = `${today}-${candidate.pageId.replace(/\//g, '-')}.md`;
      const insightPath = path.join(this.carapacePath, 'insights', insightFileName);

      const insightContent = this.buildInsightPage(candidate, sweepId);
      fs.writeFileSync(insightPath, insightContent);

      dbService.insertDreamPromotion({
        sweep_id: sweepId,
        source_ids: JSON.stringify([candidate.pageId]),
        insight_path: insightPath,
        score: candidate.scoreResult.score,
      });

      promotionCount++;
    }

    console.log(`[Carapace]   → ${promotionCount} insights promoted`);
    return promotionCount;
  }

  // ─── Insight Page Builder ──────────────────────────────────────────────────

  private buildInsightPage(candidate: ScoredCandidate, sweepId: string): string {
    const { pageId, signals, scoreResult } = candidate;
    const c = scoreResult.components;
    const now = new Date().toISOString().split('T')[0];

    return `---
title: "Insight: ${pageId}"
type: "carapace-insight"
author: "Dreamer"
generated: "${now}"
sweep_id: "${sweepId}"
source_page: "${pageId}"
score: ${scoreResult.score.toFixed(4)}
---
# 🦞 Carapace Insight: ${pageId}

> Autonomously generated by the Carapace Dreamer on ${now}
> Sweep: \`${sweepId}\` | Score: **${scoreResult.score.toFixed(3)}**

## Signal Profile

| Signal | Value | Weight | Contribution |
| :--- | :--- | :--- | :--- |
| Molt Frequency | ${c.moltFrequency.toFixed(3)} | 0.24 | ${(c.moltFrequency * 0.24).toFixed(3)} |
| Link Relevance | ${c.linkRelevance.toFixed(3)} | 0.30 | ${(c.linkRelevance * 0.30).toFixed(3)} |
| Author Diversity | ${c.authorDiversity.toFixed(3)} | 0.15 | ${(c.authorDiversity * 0.15).toFixed(3)} |
| Recency | ${c.recency.toFixed(3)} | 0.15 | ${(c.recency * 0.15).toFixed(3)} |
| Consolidation | ${c.consolidation.toFixed(3)} | 0.10 | ${(c.consolidation * 0.10).toFixed(3)} |
| Conceptual Richness | ${c.conceptualRichness.toFixed(3)} | 0.06 | ${(c.conceptualRichness * 0.06).toFixed(3)} |

## Activity Summary

- **Total Molts**: ${signals.molt_count}
- **Inbound Links**: ${signals.inbound_link_count}
- **Outbound Links**: ${signals.outbound_link_count}
- **Unique Authors**: ${signals.unique_authors.join(', ') || 'None'}
- **Active Days**: ${signals.unique_days.length}
- **Tags**: ${signals.tags.join(', ') || 'None'}
- **Confidence**: ${signals.confidence}
`;
  }

  // ─── Dream Journal Writer ──────────────────────────────────────────────────

  private writeJournalEntry(
    sweepId: string,
    candidates: ScoredCandidate[],
    reflections: number,
    promotions: number
  ): void {
    const journalPath = path.join(this.carapacePath, 'dreams', 'JOURNAL.md');
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const header = !fs.existsSync(journalPath)
      ? `# 🦞 Carapace Dream Journal\n\n> Autonomously maintained by the Carapace Dreamer\n\n---\n\n`
      : '';

    const topCandidates = candidates
      .sort((a, b) => b.scoreResult.score - a.scoreResult.score)
      .slice(0, 5)
      .map(c => `  - \`${c.pageId}\` — score: ${c.scoreResult.score.toFixed(3)} [${c.signalTypes.join(', ')}]`)
      .join('\n');

    const entry = `${header}## 💤 Sweep \`${sweepId}\` — ${today}

- **Time**: ${now}
- **Candidates**: ${candidates.length}
- **Reflections**: ${reflections}
- **Promotions**: ${promotions}

### Top Signals
${topCandidates || '  (no candidates)'}

---

`;

    fs.appendFileSync(journalPath, entry);
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  public getStatus(): {
    hatched: boolean;
    running: boolean;
    lastSweepId: string | null;
    lastSweepTime: string | null;
    lastPhase: string | null;
    carapacePath: string;
  } {
    return {
      hatched: this.isHatched,
      running: this.isRunning,
      lastSweepId: this.isHatched ? dbService.getDreamState('last_sweep_id') : null,
      lastSweepTime: this.isHatched ? dbService.getDreamState('last_sweep_time') : null,
      lastPhase: this.isHatched ? dbService.getDreamState('last_sweep_phase') : null,
      carapacePath: this.carapacePath,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

const carapacePath = process.env.CARAPACE_PATH || path.join(process.cwd(), 'carapace');
export const dreamerService = new DreamerService(carapacePath);
