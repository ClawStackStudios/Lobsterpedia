import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PearlRecord {
  page_id: string;
  title: string;
  type: string;
  author: string;
  confidence: number;
  quality_score: number;
  relevance_score: number;
  last_updated: string;
  file_path: string;
  tags: string; // JSON array stored as string
}

export interface PearlLinkRecord {
  source_id: string;
  target_id: string;
  link_type: string; // 'references' | 'supersedes' | 'depends_on' | 'contradicts'
}

export interface MoltRecord {
  id?: number;
  page_id: string;
  action: string;   // 'created' | 'updated' | 'linted' | 'witnessed' | 'external'
  summary: string;
  author: string;   // 'Human' | 'LLM' | 'System' | 'External'
  timestamp?: string;
}

// ─── Dreaming Types ─────────────────────────────────────────────────────────

export type DreamSignalType = 'hot_pearl' | 'ghost_link' | 'island' | 'stale' | 'low_confidence';

export interface DreamCandidateRecord {
  id?: number;
  sweep_id: string;
  page_id: string;
  signal_type: DreamSignalType;
  score: number;
  metadata: string;  // JSON blob
  created_at?: string;
}

export interface DreamReflectionRecord {
  id?: number;
  sweep_id: string;
  theme: string;
  summary: string;
  related_ids: string;  // JSON array of page_ids
  confidence?: number;
  relationship?: string;
  created_at?: string;
}

export interface DreamPromotionRecord {
  id?: number;
  sweep_id: string;
  source_ids: string;    // JSON array of source page_ids
  insight_path: string;  // Path in carapace/insights/
  score: number;
  promoted_at?: string;
}

export interface PearlSignals {
  page_id: string;
  molt_count: number;
  inbound_link_count: number;
  outbound_link_count: number;
  unique_authors: string[];  // Distinct authors from molt_ledger
  unique_days: string[];     // Distinct days from molt_ledger
  last_molt_at: string | null;
  confidence: number;
  tags: string[];
}

// ─── Service ────────────────────────────────────────────────────────────────

export class DbService {
  private db: Database.Database | null = null;
  private dbPath: string;
  private isHatched: boolean;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.isHatched = process.env.HATCH_DATABASE === 'true';

    if (this.isHatched) {
      this.initialize();
    }
  }

  // ─── Initialization ───────────────────────────────────────────────────────

  private initialize() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);

    // Enable WAL mode for concurrent read performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.runMigrations();
    console.log(`[Ledger] ⚓ Sovereign Ledger hatched at: ${this.dbPath}`);
  }

  private runMigrations() {
    if (!this.db) return;

    this.db.exec(`
      -- ─── Pearl Registry (The Metadata Topology) ─────────────────────────
      -- Stores normalized metadata for every wiki page.
      -- Source of truth: the filesystem. This is a queryable mirror.
      CREATE TABLE IF NOT EXISTS pearl_registry (
        page_id         TEXT PRIMARY KEY,
        title           TEXT NOT NULL,
        type            TEXT DEFAULT 'concept',
        author          TEXT DEFAULT 'System',
        confidence      REAL DEFAULT 1.0,
        quality_score   REAL DEFAULT 1.0,
        relevance_score REAL DEFAULT 0.0,
        last_updated    TEXT NOT NULL,
        file_path       TEXT NOT NULL,
        tags            TEXT DEFAULT '[]'
      );

      -- ─── Pearl Link Graph (The Neural Map) ───────────────────────────────
      -- Stores typed, directional relationships between pages.
      -- Enables O(1) graph traversal for LLM context-loading.
      -- NOTE: No FK on source_id — links may point at pages not yet in the
      -- registry (external refs, future pages). This is intentional.
      CREATE TABLE IF NOT EXISTS pearl_links (
        source_id  TEXT NOT NULL,
        target_id  TEXT NOT NULL,
        link_type  TEXT DEFAULT 'references',
        PRIMARY KEY (source_id, target_id)
      );

      -- ─── Molt Ledger (The Activity Audit) ────────────────────────────────
      -- Chronological log of all mutations: who, what, when.
      -- NOT content storage — only signals and intent.
      -- LLM: You can ignore this table during normal context-loading.
      CREATE TABLE IF NOT EXISTS molt_ledger (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id   TEXT NOT NULL,
        action    TEXT NOT NULL,
        summary   TEXT,
        author    TEXT DEFAULT 'System',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- ─── Carapace Dreaming Tables ──────────────────────────────────────────

      -- Candidates staged by Shell Inspection (Light Sleep)
      CREATE TABLE IF NOT EXISTS dream_candidates (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sweep_id    TEXT NOT NULL,
        page_id     TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        score       REAL DEFAULT 0.0,
        metadata    TEXT DEFAULT '{}',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Reflections generated by Tidal Dreaming (REM Sleep)
      CREATE TABLE IF NOT EXISTS dream_reflections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sweep_id    TEXT NOT NULL,
        theme       TEXT NOT NULL,
        summary     TEXT NOT NULL,
        related_ids TEXT DEFAULT '[]',
        confidence  REAL DEFAULT 0,
        relationship TEXT DEFAULT 'neutral',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Promotions written by Carapace Hardening (Deep Sleep)
      CREATE TABLE IF NOT EXISTS dream_promotions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        sweep_id      TEXT NOT NULL,
        source_ids    TEXT NOT NULL,
        insight_path  TEXT NOT NULL,
        score         REAL NOT NULL,
        promoted_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Dreamer state (key-value sweep tracking)
      CREATE TABLE IF NOT EXISTS dream_state (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- ─── Indexes (Query Performance) ─────────────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_pearl_type       ON pearl_registry(type);
      CREATE INDEX IF NOT EXISTS idx_pearl_updated    ON pearl_registry(last_updated);
      CREATE INDEX IF NOT EXISTS idx_links_source     ON pearl_links(source_id);
      CREATE INDEX IF NOT EXISTS idx_links_target     ON pearl_links(target_id);
      CREATE INDEX IF NOT EXISTS idx_molt_timestamp   ON molt_ledger(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_molt_page        ON molt_ledger(page_id);
      CREATE INDEX IF NOT EXISTS idx_dream_cand_sweep ON dream_candidates(sweep_id);
      CREATE INDEX IF NOT EXISTS idx_dream_refl_sweep ON dream_reflections(sweep_id);
      CREATE INDEX IF NOT EXISTS idx_dream_prom_sweep ON dream_promotions(sweep_id);
    `)
  }

  // ─── Guard ────────────────────────────────────────────────────────────────

  public get isActive(): boolean {
    return this.isHatched && this.db !== null;
  }

  private guard(): Database.Database {
    if (!this.db) {
      throw new Error('[Ledger] Database is not hatched. Set HATCH_DATABASE=true.');
    }
    return this.db;
  }

  // ─── Pearl Registry Operations ────────────────────────────────────────────

  /**
   * Upserts a page record into the Pearl Registry.
   * Called whenever a page is created or updated.
   */
  public upsertPearl(record: Omit<PearlRecord, 'relevance_score'>): void {
    const db = this.guard();
    const upsert = db.prepare(`
      INSERT INTO pearl_registry (page_id, title, type, author, confidence, quality_score, last_updated, file_path, tags)
      VALUES (@page_id, @title, @type, @author, @confidence, @quality_score, @last_updated, @file_path, @tags)
      ON CONFLICT(page_id) DO UPDATE SET
        title           = excluded.title,
        type            = excluded.type,
        author          = excluded.author,
        confidence      = excluded.confidence,
        quality_score   = excluded.quality_score,
        last_updated    = excluded.last_updated,
        file_path       = excluded.file_path,
        tags            = excluded.tags
    `);
    upsert.run(record);
  }

  /**
   * Recalculates relevance_score for all pearls based on inbound link density.
   * High inbound links = high centrality = high relevance.
   */
  public recalculateRelevanceScores(): void {
    const db = this.guard();
    db.exec(`
      UPDATE pearl_registry
      SET relevance_score = (
        SELECT COUNT(*) FROM pearl_links WHERE target_id = pearl_registry.page_id
      ) * 1.0 / MAX(1.0, (SELECT COUNT(*) FROM pearl_registry))
    `);
  }

  /**
   * Removes a pearl and its associated links from the registry.
   */
  public deletePearl(pageId: string): void {
    const db = this.guard();
    db.prepare('DELETE FROM pearl_registry WHERE page_id = ?').run(pageId);
    db.prepare('DELETE FROM pearl_links WHERE source_id = ? OR target_id = ?').run(pageId, pageId);
  }

  /**
   * Returns all pearls, ordered by relevance (most central first).
   */
  public getAllPearls(): PearlRecord[] {
    const db = this.guard();
    return db.prepare('SELECT * FROM pearl_registry ORDER BY relevance_score DESC, last_updated DESC').all() as PearlRecord[];
  }

  /**
   * Returns a single pearl by ID.
   */
  public getPearl(pageId: string): PearlRecord | null {
    const db = this.guard();
    return (db.prepare('SELECT * FROM pearl_registry WHERE page_id = ?').get(pageId) ?? null) as PearlRecord | null;
  }

  // ─── Pearl Link Operations ────────────────────────────────────────────────

  /**
   * Atomically replaces all outgoing links for a given source page.
   * Called whenever a page's [[links]] frontmatter changes.
   */
  public syncLinks(sourceId: string, targets: { id: string; type?: string }[]): void {
    const db = this.guard();
    const syncTx = db.transaction(() => {
      db.prepare('DELETE FROM pearl_links WHERE source_id = ?').run(sourceId);
      const insert = db.prepare(`
        INSERT OR IGNORE INTO pearl_links (source_id, target_id, link_type)
        VALUES (?, ?, ?)
      `);
      for (const target of targets) {
        insert.run(sourceId, target.id, target.type || 'references');
      }
    });
    syncTx();
  }

  /**
   * Returns all pages that link TO a given page (inbound link graph traversal).
   */
  public getInboundLinks(pageId: string): string[] {
    const db = this.guard();
    const rows = db.prepare('SELECT source_id FROM pearl_links WHERE target_id = ?').all(pageId) as { source_id: string }[];
    return rows.map(r => r.source_id);
  }

  /**
   * Returns all pages that a given page links TO (outbound).
   */
  public getOutboundLinks(pageId: string): PearlLinkRecord[] {
    const db = this.guard();
    return db.prepare('SELECT * FROM pearl_links WHERE source_id = ?').all(pageId) as PearlLinkRecord[];
  }

  // ─── Molt Ledger Operations ───────────────────────────────────────────────

  /**
   * Records a mutation event in the Molt Ledger.
   */
  public recordMolt(record: MoltRecord): void {
    const db = this.guard();
    db.prepare(`
      INSERT INTO molt_ledger (page_id, action, summary, author)
      VALUES (@page_id, @action, @summary, @author)
    `).run(record);
  }

  /**
   * Returns the N most recent molt events (default 50).
   */
  public getRecentMolts(limit: number = 50): MoltRecord[] {
    const db = this.guard();
    return db.prepare(
      'SELECT * FROM molt_ledger ORDER BY timestamp DESC, id DESC LIMIT ?'
    ).all(limit) as MoltRecord[];
  }

  /**
   * Returns the molt history for a specific page.
   */
  public getMoltsForPage(pageId: string): MoltRecord[] {
    const db = this.guard();
    return db.prepare(
      'SELECT * FROM molt_ledger WHERE page_id = ? ORDER BY timestamp DESC'
    ).all(pageId) as MoltRecord[];
  }

  // ─── Dreaming Operations ──────────────────────────────────────────────────

  /**
   * Returns the scoring signals for a single pearl.
   * Used by the DreamerService to compute promotion scores.
   */
  public getSignalsForPearl(pageId: string): PearlSignals | null {
    const db = this.guard();
    const pearl = this.getPearl(pageId);
    if (!pearl) return null;

    const moltCount = (db.prepare(
      'SELECT COUNT(*) as c FROM molt_ledger WHERE page_id = ?'
    ).get(pageId) as any).c;

    const inboundCount = (db.prepare(
      'SELECT COUNT(*) as c FROM pearl_links WHERE target_id = ?'
    ).get(pageId) as any).c;

    const outboundCount = (db.prepare(
      'SELECT COUNT(*) as c FROM pearl_links WHERE source_id = ?'
    ).get(pageId) as any).c;

    const authors = db.prepare(
      'SELECT DISTINCT author FROM molt_ledger WHERE page_id = ?'
    ).all(pageId) as { author: string }[];

    const days = db.prepare(
      `SELECT DISTINCT DATE(timestamp) as day FROM molt_ledger WHERE page_id = ?`
    ).all(pageId) as { day: string }[];

    const lastMolt = db.prepare(
      'SELECT timestamp FROM molt_ledger WHERE page_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(pageId) as { timestamp: string } | undefined;

    let tags: string[] = [];
    try { tags = JSON.parse(pearl.tags); } catch { tags = []; }

    return {
      page_id: pageId,
      molt_count: moltCount,
      inbound_link_count: inboundCount,
      outbound_link_count: outboundCount,
      unique_authors: authors.map(a => a.author),
      unique_days: days.map(d => d.day),
      last_molt_at: lastMolt?.timestamp ?? null,
      confidence: pearl.confidence,
      tags,
    };
  }

  /**
   * Returns page_ids modified since a given timestamp.
   * Used by Shell Inspection (Light Sleep) to scope the lookback.
   */
  public getMoltedPagesSince(since: string): string[] {
    const db = this.guard();
    const rows = db.prepare(
      'SELECT DISTINCT page_id FROM molt_ledger WHERE timestamp >= ? AND page_id != "__system__"'
    ).all(since) as { page_id: string }[];
    return rows.map(r => r.page_id);
  }

  /**
   * Returns pages with zero inbound AND zero outbound links (Islands).
   */
  public getIslandPearls(): string[] {
    const db = this.guard();
    const rows = db.prepare(`
      SELECT page_id FROM pearl_registry
      WHERE page_id NOT IN (SELECT source_id FROM pearl_links)
        AND page_id NOT IN (SELECT target_id FROM pearl_links)
    `).all() as { page_id: string }[];
    return rows.map(r => r.page_id);
  }

  /**
   * Returns pages with confidence below a threshold.
   */
  public getLowConfidencePearls(threshold: number = 0.5): string[] {
    const db = this.guard();
    const rows = db.prepare(
      'SELECT page_id FROM pearl_registry WHERE confidence < ?'
    ).all(threshold) as { page_id: string }[];
    return rows.map(r => r.page_id);
  }

  // ─── Dream State (Key-Value) ───────────────────────────────────────────────

  public setDreamState(key: string, value: string): void {
    const db = this.guard();
    db.prepare(
      'INSERT OR REPLACE INTO dream_state (key, value) VALUES (?, ?)'
    ).run(key, value);
  }

  public getDreamState(key: string): string | null {
    const db = this.guard();
    const row = db.prepare(
      'SELECT value FROM dream_state WHERE key = ?'
    ).get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  // ─── Dream Candidates ──────────────────────────────────────────────────────

  public insertDreamCandidate(record: DreamCandidateRecord): void {
    const db = this.guard();
    db.prepare(`
      INSERT INTO dream_candidates (sweep_id, page_id, signal_type, score, metadata)
      VALUES (@sweep_id, @page_id, @signal_type, @score, @metadata)
    `).run(record);
  }

  public getDreamCandidates(sweepId: string): DreamCandidateRecord[] {
    const db = this.guard();
    return db.prepare(
      'SELECT * FROM dream_candidates WHERE sweep_id = ? ORDER BY score DESC'
    ).all(sweepId) as DreamCandidateRecord[];
  }

  // ─── Dream Reflections ─────────────────────────────────────────────────────

  public insertDreamReflection(record: DreamReflectionRecord): void {
    const db = this.guard();
    db.prepare(`
      INSERT INTO dream_reflections (sweep_id, theme, summary, related_ids, confidence, relationship)
      VALUES (@sweep_id, @theme, @summary, @related_ids, @confidence, @relationship)
    `).run({
      ...record,
      confidence: record.confidence ?? 0,
      relationship: record.relationship ?? 'neutral'
    });
  }

  public getDreamReflections(sweepId: string): DreamReflectionRecord[] {
    const db = this.guard();
    return db.prepare(
      'SELECT * FROM dream_reflections WHERE sweep_id = ? ORDER BY created_at DESC'
    ).all(sweepId) as DreamReflectionRecord[];
  }

  // ─── Dream Promotions ──────────────────────────────────────────────────────

  public insertDreamPromotion(record: DreamPromotionRecord): void {
    const db = this.guard();
    db.prepare(`
      INSERT INTO dream_promotions (sweep_id, source_ids, insight_path, score)
      VALUES (@sweep_id, @source_ids, @insight_path, @score)
    `).run(record);
  }

  public getDreamPromotions(limit: number = 20): DreamPromotionRecord[] {
    const db = this.guard();
    return db.prepare(
      'SELECT * FROM dream_promotions ORDER BY promoted_at DESC LIMIT ?'
    ).all(limit) as DreamPromotionRecord[];
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  public getStats(): { pearl_count: number; link_count: number; molt_count: number; dream_count: number } {
    const db = this.guard();
    const pearl_count = (db.prepare('SELECT COUNT(*) as c FROM pearl_registry').get() as any).c;
    const link_count  = (db.prepare('SELECT COUNT(*) as c FROM pearl_links').get() as any).c;
    const molt_count  = (db.prepare('SELECT COUNT(*) as c FROM molt_ledger').get() as any).c;
    const dream_count = (db.prepare('SELECT COUNT(*) as c FROM dream_promotions').get() as any).c;
    return { pearl_count, link_count, molt_count, dream_count };
  }

  public close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'src', 'server', 'db', 'habitat.db');
export const dbService = new DbService(dbPath);
