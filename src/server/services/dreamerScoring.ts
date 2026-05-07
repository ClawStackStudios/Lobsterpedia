// ─── Dreamer Scoring Engine (Pure Functions) ──────────────────────────────────
//
// Wiki-adapted scoring from OpenClaw's 6-signal promotion formula.
// Zero side effects. Every function is unit-testable.
//
// Signal Adaptation: Chat → Wiki
//   OpenClaw recall frequency  → Molt frequency (edit count)
//   OpenClaw retrieval quality → Link relevance (inbound link centrality)
//   OpenClaw query diversity   → Author diversity (Human/LLM/External + unique days)
//   OpenClaw recency           → Freshness (days since last molt)
//   OpenClaw consolidation     → Edit patterns (edits across multiple days)
//   OpenClaw concept-tag       → Tag richness (frontmatter tags + outbound links)
// ──────────────────────────────────────────────────────────────────────────────

import type { PearlSignals } from './dbService.js';

// ─── Weights (verified from OpenClaw short-term-promotion.ts:55-62) ─────────

export interface ReefPromotionWeights {
  moltFrequency:     number;
  linkRelevance:     number;
  authorDiversity:   number;
  recency:           number;
  consolidation:     number;
  conceptualRichness: number;
}

export const DEFAULT_REEF_WEIGHTS: ReefPromotionWeights = {
  moltFrequency:      0.24,
  linkRelevance:      0.30,
  authorDiversity:    0.15,
  recency:            0.15,
  consolidation:      0.10,
  conceptualRichness: 0.06,
};

// ─── Gate Thresholds (adapted for slower wiki signals) ──────────────────────

export const DEFAULT_MIN_SCORE = 0.6;
export const DEFAULT_MIN_MOLT_COUNT = 3;
export const DEFAULT_MIN_CONTEXT_DIVERSITY = 2;
export const DEFAULT_RECENCY_HALF_LIFE_DAYS = 14;
export const DEFAULT_MAX_AGE_DAYS = 60;

// ─── Component Calculators ──────────────────────────────────────────────────

/** Clamp a value between 0 and 1. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Molt Frequency: log1p(moltCount) / log1p(10)
 * Mirrors OpenClaw's frequency = log1p(signalCount) / log1p(10)
 */
export function harvestMoltFrequency(moltCount: number): number {
  return clampScore(Math.log1p(Math.max(0, moltCount)) / Math.log1p(10));
}

/**
 * Link Relevance: Normalized inbound link count.
 * inboundLinks / 5 (capped at 1.0).
 * A page with 5+ inbound links is maximally relevant.
 */
export function harvestLinkRelevance(inboundLinkCount: number): number {
  return clampScore(Math.max(0, inboundLinkCount) / 5);
}

/**
 * Author Diversity: max(uniqueAuthors, uniqueDays) / 5
 * A page touched by 5+ distinct sources/days is maximally diverse.
 * Mirrors OpenClaw's diversity = max(uniqueQueries, recallDays.length) / 5
 */
export function harvestAuthorDiversity(
  uniqueAuthors: string[],
  uniqueDays: string[]
): number {
  const contextDiversity = Math.max(uniqueAuthors.length, uniqueDays.length);
  return clampScore(contextDiversity / 5);
}

/**
 * Recency: Exponential decay with configurable half-life.
 * recency = exp(-ln2 / halfLifeDays * ageDays)
 * Directly from OpenClaw short-term-promotion.ts:568-577
 */
export function harvestRecency(
  ageDays: number,
  halfLifeDays: number = DEFAULT_RECENCY_HALF_LIFE_DAYS
): number {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 1;
  const lambda = Math.LN2 / halfLifeDays;
  return Math.exp(-lambda * ageDays);
}

/**
 * Consolidation: Multi-day edit pattern strength.
 * Weighted combination of edit spacing and time span.
 * consolidation = 0.55 * spacing + 0.45 * span
 * Adapted from OpenClaw calculateConsolidationComponent
 */
export function harvestConsolidation(uniqueDays: string[]): number {
  if (uniqueDays.length === 0) return 0;
  if (uniqueDays.length === 1) return 0.2;

  const parsed = uniqueDays
    .map(d => Date.parse(`${d}T00:00:00.000Z`))
    .filter(ms => Number.isFinite(ms))
    .sort((a, b) => a - b);

  if (parsed.length <= 1) return 0.2;

  const spanDays = Math.max(0, (parsed[parsed.length - 1] - parsed[0]) / (24 * 60 * 60 * 1000));
  const spacing = clampScore(Math.log1p(parsed.length - 1) / Math.log1p(4));
  const span = clampScore(spanDays / 7);
  return clampScore(0.55 * spacing + 0.45 * span);
}

/**
 * Conceptual Richness: tag density + outbound link contribution.
 * richness = (tags.length + outboundLinks) / 8
 * Adapted from OpenClaw: conceptTags.length / 6
 * We use /8 because wiki pages naturally have more metadata.
 */
export function harvestConceptualRichness(
  tags: string[],
  outboundLinkCount: number = 0
): number {
  const density = tags.length + Math.max(0, outboundLinkCount);
  return clampScore(density / 8);
}

// ─── Composite Score ────────────────────────────────────────────────────────

export interface ReefScoreComponents {
  moltFrequency:      number;
  linkRelevance:      number;
  authorDiversity:    number;
  recency:            number;
  consolidation:      number;
  conceptualRichness: number;
}

export interface ReefScoreResult {
  score: number;
  components: ReefScoreComponents;
}

/**
 * Scores a pearl using the 6-signal weighted formula.
 * The composite score determines promotion eligibility.
 */
export function scorePearl(
  signals: PearlSignals,
  weights: ReefPromotionWeights = DEFAULT_REEF_WEIGHTS,
  nowMs: number = Date.now()
): ReefScoreResult {
  const moltFrequency = harvestMoltFrequency(signals.molt_count);
  const linkRelevance = harvestLinkRelevance(signals.inbound_link_count);
  const authorDiversity = harvestAuthorDiversity(
    signals.unique_authors,
    signals.unique_days
  );

  const lastMoltMs = signals.last_molt_at ? Date.parse(signals.last_molt_at) : nowMs;
  const ageDays = Number.isFinite(lastMoltMs)
    ? Math.max(0, (nowMs - lastMoltMs) / (24 * 60 * 60 * 1000))
    : 0;
  const recency = harvestRecency(ageDays);

  const consolidation = harvestConsolidation(signals.unique_days);
  const conceptualRichness = harvestConceptualRichness(
    signals.tags,
    signals.outbound_link_count
  );

  const components: ReefScoreComponents = {
    moltFrequency,
    linkRelevance,
    authorDiversity,
    recency,
    consolidation,
    conceptualRichness,
  };

  const score = clampScore(
    weights.moltFrequency     * moltFrequency +
    weights.linkRelevance     * linkRelevance +
    weights.authorDiversity   * authorDiversity +
    weights.recency           * recency +
    weights.consolidation     * consolidation +
    weights.conceptualRichness * conceptualRichness
  );

  return { score, components };
}

// ─── Gate Checks ────────────────────────────────────────────────────────────

export interface GateConfig {
  minScore: number;
  minMoltCount: number;
  minContextDiversity: number;
  maxAgeDays: number;
}

export const DEFAULT_GATE_CONFIG: GateConfig = {
  minScore: DEFAULT_MIN_SCORE,
  minMoltCount: DEFAULT_MIN_MOLT_COUNT,
  minContextDiversity: DEFAULT_MIN_CONTEXT_DIVERSITY,
  maxAgeDays: DEFAULT_MAX_AGE_DAYS,
};

/**
 * Checks whether a pearl passes all promotion gates.
 * ALL gates must pass — same as OpenClaw's gating logic.
 */
export function passesGates(
  signals: PearlSignals,
  score: number,
  config: GateConfig = DEFAULT_GATE_CONFIG,
  nowMs: number = Date.now()
): { passes: boolean; failures: string[] } {
  const failures: string[] = [];

  if (score < config.minScore) {
    failures.push(`score ${score.toFixed(3)} < min ${config.minScore}`);
  }
  if (signals.molt_count < config.minMoltCount) {
    failures.push(`molt_count ${signals.molt_count} < min ${config.minMoltCount}`);
  }

  const contextDiversity = Math.max(
    signals.unique_authors.length,
    signals.unique_days.length
  );
  if (contextDiversity < config.minContextDiversity) {
    failures.push(`context_diversity ${contextDiversity} < min ${config.minContextDiversity}`);
  }

  if (config.maxAgeDays > 0 && signals.last_molt_at) {
    const lastMoltMs = Date.parse(signals.last_molt_at);
    if (Number.isFinite(lastMoltMs)) {
      const ageDays = (nowMs - lastMoltMs) / (24 * 60 * 60 * 1000);
      if (ageDays > config.maxAgeDays) {
        failures.push(`age ${ageDays.toFixed(1)} days > max ${config.maxAgeDays}`);
      }
    }
  }

  return { passes: failures.length === 0, failures };
}
