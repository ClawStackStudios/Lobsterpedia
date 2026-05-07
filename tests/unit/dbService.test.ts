import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DbService } from '../../src/server/services/dbService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── DbService Test Oracle ────────────────────────────────────────────────────
// Validates the Sovereign Ledger's invariants:
//   1. Pearl Registry: upsert, retrieve, delete, relevance scoring.
//   2. Pearl Link Graph: sync, inbound/outbound traversal.
//   3. Molt Ledger: recording and retrieval of audit events.
//   4. Guard: operations on an un-hatched DB throw correctly.

describe('DbService — Sovereign Ledger', () => {
  let tempDir: string;
  let db: DbService;

  // Temporarily set HATCH_DATABASE=true for the DbService constructor
  beforeEach(() => {
    process.env.HATCH_DATABASE = 'true';
    tempDir = path.join(os.tmpdir(), `lobster-db-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    db = new DbService(path.join(tempDir, 'test.db'));
  });

  afterEach(() => {
    db.close();
    delete process.env.HATCH_DATABASE;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ─── Core Invariant ─────────────────────────────────────────────────────────

  it('should be active after construction with HATCH_DATABASE=true', () => {
    expect(db.isActive).toBe(true);
  });

  it('should NOT be active when HATCH_DATABASE is not set', () => {
    delete process.env.HATCH_DATABASE;
    const dormantDb = new DbService(path.join(tempDir, 'dormant.db'));
    expect(dormantDb.isActive).toBe(false);
    dormantDb.close();
  });

  // ─── Pearl Registry ─────────────────────────────────────────────────────────

  it('should upsert and retrieve a pearl', () => {
    db.upsertPearl({
      page_id:       'concepts/lobster-ecology',
      title:         'Lobster Ecology',
      type:          'concept',
      author:        'Lucas',
      confidence:    0.9,
      quality_score: 1.0,
      last_updated:  '2026-05-06',
      file_path:     '/wiki/concepts/lobster-ecology.md',
      tags:          JSON.stringify(['biology', 'marine']),
    });

    const pearl = db.getPearl('concepts/lobster-ecology');
    expect(pearl).not.toBeNull();
    expect(pearl!.title).toBe('Lobster Ecology');
    expect(pearl!.author).toBe('Lucas');
  });

  it('should update an existing pearl on conflict (upsert semantics)', () => {
    const base = {
      page_id: 'concepts/molting', title: 'Molting', type: 'concept',
      author: 'System', confidence: 0.5, quality_score: 1.0,
      last_updated: '2026-05-01', file_path: '/wiki/concepts/molting.md', tags: '[]'
    };
    db.upsertPearl(base);
    db.upsertPearl({ ...base, confidence: 0.95, last_updated: '2026-05-07' });

    const pearl = db.getPearl('concepts/molting');
    expect(pearl!.confidence).toBe(0.95);
    expect(pearl!.last_updated).toBe('2026-05-07');
  });

  it('should delete a pearl and its associated links', () => {
    db.upsertPearl({
      page_id: 'to-delete', title: 'Delete Me', type: 'concept',
      author: 'Test', confidence: 1.0, quality_score: 1.0,
      last_updated: '2026-05-06', file_path: '/wiki/to-delete.md', tags: '[]'
    });
    db.syncLinks('to-delete', [{ id: 'some-target' }]);
    db.deletePearl('to-delete');

    expect(db.getPearl('to-delete')).toBeNull();
    expect(db.getOutboundLinks('to-delete')).toHaveLength(0);
  });

  it('should return all pearls ordered by relevance score descending', () => {
    db.upsertPearl({ page_id: 'low-centrality',  title: 'Low',  type: 'concept', author: 'Test', confidence: 1.0, quality_score: 1.0, last_updated: '2026-05-06', file_path: '/l.md', tags: '[]' });
    db.upsertPearl({ page_id: 'high-centrality', title: 'High', type: 'concept', author: 'Test', confidence: 1.0, quality_score: 1.0, last_updated: '2026-05-06', file_path: '/h.md', tags: '[]' });

    // Point two sources at high-centrality to increase its inbound link density
    db.syncLinks('source-a', [{ id: 'high-centrality' }]);
    db.syncLinks('source-b', [{ id: 'high-centrality' }]);
    db.recalculateRelevanceScores();

    const pearls = db.getAllPearls();
    const highIdx = pearls.findIndex(p => p.page_id === 'high-centrality');
    const lowIdx  = pearls.findIndex(p => p.page_id === 'low-centrality');
    expect(highIdx).toBeLessThan(lowIdx);
  });

  // ─── Pearl Link Graph ───────────────────────────────────────────────────────

  it('should sync outbound links atomically (replacing old links)', () => {
    db.syncLinks('page-a', [{ id: 'page-b' }, { id: 'page-c' }]);
    let outbound = db.getOutboundLinks('page-a');
    expect(outbound).toHaveLength(2);

    // Replace — page-c link should be gone, page-d added
    db.syncLinks('page-a', [{ id: 'page-b' }, { id: 'page-d' }]);
    outbound = db.getOutboundLinks('page-a');
    expect(outbound).toHaveLength(2);
    expect(outbound.map(l => l.target_id)).not.toContain('page-c');
    expect(outbound.map(l => l.target_id)).toContain('page-d');
  });

  it('should correctly resolve inbound links (graph traversal)', () => {
    db.syncLinks('source-1', [{ id: 'hub-page' }]);
    db.syncLinks('source-2', [{ id: 'hub-page' }]);
    db.syncLinks('source-3', [{ id: 'other-page' }]);

    const inbound = db.getInboundLinks('hub-page');
    expect(inbound).toHaveLength(2);
    expect(inbound).toContain('source-1');
    expect(inbound).toContain('source-2');
  });

  it('should support typed link relationships', () => {
    db.syncLinks('page-a', [
      { id: 'page-b', type: 'supersedes' },
      { id: 'page-c', type: 'depends_on' },
    ]);

    const outbound = db.getOutboundLinks('page-a');
    expect(outbound.find(l => l.target_id === 'page-b')?.link_type).toBe('supersedes');
    expect(outbound.find(l => l.target_id === 'page-c')?.link_type).toBe('depends_on');
  });

  // ─── Molt Ledger ────────────────────────────────────────────────────────────

  it('should record and retrieve molt events in reverse chronological order', () => {
    db.recordMolt({ page_id: 'page-x', action: 'created', summary: 'First entry', author: 'Human' });
    db.recordMolt({ page_id: 'page-x', action: 'updated', summary: 'Updated entry', author: 'LLM' });

    const molts = db.getRecentMolts(10);
    expect(molts.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    expect(molts[0].action).toBe('updated');
    expect(molts[1].action).toBe('created');
  });

  it('should retrieve page-specific molt history', () => {
    db.recordMolt({ page_id: 'page-a', action: 'created', summary: 'Created A', author: 'Human' });
    db.recordMolt({ page_id: 'page-b', action: 'created', summary: 'Created B', author: 'System' });
    db.recordMolt({ page_id: 'page-a', action: 'updated', summary: 'Updated A', author: 'LLM' });

    const moltsA = db.getMoltsForPage('page-a');
    expect(moltsA).toHaveLength(2);
    expect(moltsA.every(m => m.page_id === 'page-a')).toBe(true);
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────

  it('should return accurate stats', () => {
    db.upsertPearl({ page_id: 'p1', title: 'P1', type: 'concept', author: 'T', confidence: 1.0, quality_score: 1.0, last_updated: '2026-05-06', file_path: '/p1.md', tags: '[]' });
    db.upsertPearl({ page_id: 'p2', title: 'P2', type: 'concept', author: 'T', confidence: 1.0, quality_score: 1.0, last_updated: '2026-05-06', file_path: '/p2.md', tags: '[]' });
    db.syncLinks('p1', [{ id: 'p2' }]);
    db.recordMolt({ page_id: 'p1', action: 'created', summary: '', author: 'System' });

    const stats = db.getStats();
    expect(stats.pearl_count).toBe(2);
    expect(stats.link_count).toBe(1);
    expect(stats.molt_count).toBe(1);
  });

  // ─── Guard Invariant ────────────────────────────────────────────────────────

  it('should throw a descriptive error if calling guarded methods when dormant', () => {
    delete process.env.HATCH_DATABASE;
    const dormant = new DbService(path.join(tempDir, 'guard-test.db'));
    expect(() => dormant.getAllPearls()).toThrow('[Ledger]');
    dormant.close();
  });
});
