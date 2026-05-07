import { describe, it, expect } from 'vitest';
import {
  clampScore,
  harvestMoltFrequency,
  harvestLinkRelevance,
  harvestAuthorDiversity,
  harvestRecency,
  harvestConsolidation,
  harvestConceptualRichness,
  scorePearl,
  passesGates,
  DEFAULT_REEF_WEIGHTS,
  DEFAULT_GATE_CONFIG,
} from '../../src/server/services/dreamerScoring.js';
import type { PearlSignals } from '../../src/server/services/dbService.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildSignals(overrides: Partial<PearlSignals> = {}): PearlSignals {
  return {
    page_id: 'test/page',
    molt_count: 5,
    inbound_link_count: 3,
    outbound_link_count: 2,
    unique_authors: ['Human', 'LLM'],
    unique_days: ['2026-05-01', '2026-05-03', '2026-05-05'],
    last_molt_at: new Date().toISOString(),
    confidence: 0.9,
    tags: ['concept', 'architecture'],
    ...overrides,
  };
}

// ─── clampScore ─────────────────────────────────────────────────────────────

describe('clampScore', () => {
  it('clamps negative values to 0', () => {
    expect(clampScore(-0.5)).toBe(0);
  });
  it('clamps values above 1 to 1', () => {
    expect(clampScore(1.5)).toBe(1);
  });
  it('returns NaN/Infinity as 0', () => {
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(Infinity)).toBe(0);
  });
  it('passes through valid scores', () => {
    expect(clampScore(0.75)).toBe(0.75);
  });
});

// ─── Component Calculators ──────────────────────────────────────────────────

describe('harvestMoltFrequency', () => {
  it('returns 0 for no edits', () => {
    expect(harvestMoltFrequency(0)).toBe(0);
  });
  it('returns ~0.28 for 1 edit', () => {
    const result = harvestMoltFrequency(1);
    expect(result).toBeGreaterThan(0.2);
    expect(result).toBeLessThan(0.35);
  });
  it('approaches 1.0 for 10+ edits', () => {
    expect(harvestMoltFrequency(10)).toBeCloseTo(1.0, 1);
  });
});

describe('harvestLinkRelevance', () => {
  it('returns 0 for no links', () => {
    expect(harvestLinkRelevance(0)).toBe(0);
  });
  it('returns 1.0 for 5+ links', () => {
    expect(harvestLinkRelevance(5)).toBe(1);
    expect(harvestLinkRelevance(10)).toBe(1);
  });
  it('returns 0.6 for 3 links', () => {
    expect(harvestLinkRelevance(3)).toBe(0.6);
  });
});

describe('harvestAuthorDiversity', () => {
  it('returns 0 for empty arrays', () => {
    expect(harvestAuthorDiversity([], [])).toBe(0);
  });
  it('uses the larger of authors vs days', () => {
    const result = harvestAuthorDiversity(['Human'], ['2026-05-01', '2026-05-02', '2026-05-03']);
    expect(result).toBe(0.6); // 3/5
  });
});

describe('harvestRecency', () => {
  it('returns 1.0 for age 0', () => {
    expect(harvestRecency(0)).toBe(1);
  });
  it('returns 0.5 at half-life', () => {
    expect(harvestRecency(14, 14)).toBeCloseTo(0.5, 2);
  });
  it('decays exponentially', () => {
    const day7 = harvestRecency(7, 14);
    const day14 = harvestRecency(14, 14);
    expect(day7).toBeGreaterThan(day14);
    expect(day14).toBeCloseTo(0.5, 2);
  });
});

describe('harvestConsolidation', () => {
  it('returns 0 for empty days', () => {
    expect(harvestConsolidation([])).toBe(0);
  });
  it('returns 0.2 for single day', () => {
    expect(harvestConsolidation(['2026-05-01'])).toBe(0.2);
  });
  it('increases with more spread-out days', () => {
    const twoDay = harvestConsolidation(['2026-05-01', '2026-05-07']);
    const threeDay = harvestConsolidation(['2026-05-01', '2026-05-04', '2026-05-07']);
    expect(threeDay).toBeGreaterThan(twoDay);
  });
});

describe('harvestConceptualRichness', () => {
  it('returns 0 for empty tags and 0 links', () => {
    expect(harvestConceptualRichness([], 0)).toBe(0);
  });
  it('caps at 1.0 for 8+ tags+links', () => {
    expect(harvestConceptualRichness(['a', 'b', 'c', 'd'], 4)).toBe(1);
  });
});

// ─── Composite Scoring ──────────────────────────────────────────────────────

describe('scorePearl', () => {
  it('produces a score between 0 and 1', () => {
    const signals = buildSignals();
    const result = scorePearl(signals);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('scores higher for more active pages', () => {
    const quiet = buildSignals({ molt_count: 1, inbound_link_count: 0, unique_authors: ['System'] });
    const active = buildSignals({ molt_count: 10, inbound_link_count: 5, unique_authors: ['Human', 'LLM', 'External'] });
    expect(scorePearl(active).score).toBeGreaterThan(scorePearl(quiet).score);
  });

  it('weights sum to 1.0', () => {
    const sum = Object.values(DEFAULT_REEF_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('returns all 6 component values', () => {
    const result = scorePearl(buildSignals());
    expect(result.components).toHaveProperty('moltFrequency');
    expect(result.components).toHaveProperty('linkRelevance');
    expect(result.components).toHaveProperty('authorDiversity');
    expect(result.components).toHaveProperty('recency');
    expect(result.components).toHaveProperty('consolidation');
    expect(result.components).toHaveProperty('conceptualRichness');
  });
});

// ─── Gate Checks ────────────────────────────────────────────────────────────

describe('passesGates', () => {
  it('passes with good signals and score', () => {
    const signals = buildSignals();
    const { passes } = passesGates(signals, 0.7, DEFAULT_GATE_CONFIG);
    expect(passes).toBe(true);
  });

  it('fails on low score', () => {
    const signals = buildSignals();
    const { passes, failures } = passesGates(signals, 0.3, DEFAULT_GATE_CONFIG);
    expect(passes).toBe(false);
    expect(failures.some(f => f.includes('score'))).toBe(true);
  });

  it('fails on too few molts', () => {
    const signals = buildSignals({ molt_count: 1 });
    const { passes, failures } = passesGates(signals, 0.8, DEFAULT_GATE_CONFIG);
    expect(passes).toBe(false);
    expect(failures.some(f => f.includes('molt_count'))).toBe(true);
  });

  it('fails on low context diversity', () => {
    const signals = buildSignals({ unique_authors: ['System'], unique_days: ['2026-05-01'] });
    const { passes, failures } = passesGates(signals, 0.8, DEFAULT_GATE_CONFIG);
    expect(passes).toBe(false);
    expect(failures.some(f => f.includes('context_diversity'))).toBe(true);
  });

  it('reports all failures at once', () => {
    const signals = buildSignals({
      molt_count: 0,
      unique_authors: [],
      unique_days: [],
    });
    const { passes, failures } = passesGates(signals, 0.1, DEFAULT_GATE_CONFIG);
    expect(passes).toBe(false);
    expect(failures.length).toBeGreaterThanOrEqual(2);
  });
});
