import fs from 'fs';
import path from 'path';
import { wikiService } from './wikiService.js';
import { dbService } from './dbService.js';

// ─── AutoScanner (The Parity Guardian) ────────────────────────────────────────
//
// Responsibilities:
//   1. Detect new raw (non-markdown) files dropped into the reef.
//   2. When HATCH_DATABASE=true, witness external .md mutations into the Ledger.
//      This catches changes made outside the app (e.g., Obsidian, VSCode).
//   3. NEVER modifies files. Read-only. Witness-only.

export class AutoScanner {
  private timer: NodeJS.Timeout | null = null;
  private settings = { scanInterval: '5m', autoIngest: false, preventAutoGenesis: false };
  private fileTimestamps: Map<string, number> = new Map();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const settingsPath = path.join(wikiService.getWikiPath(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
      } catch(e) {}
    }
  }

  private saveSettings() {
    const settingsPath = path.join(wikiService.getWikiPath(), 'settings.json');
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
    } catch(e) {
      console.error('[AutoScanner] Failed to save settings:', e);
    }
  }

  private parseIntervalMs(val: string) {
    if (val === '30s') return 30 * 1000;
    if (val === '5m')  return 5 * 60 * 1000;
    if (val === '30m') return 30 * 60 * 1000;
    if (val === '1h')  return 60 * 60 * 1000;
    return 0;
  }

  // ─── External Mutation Witness ──────────────────────────────────────────────
  // Scans all .md files and checks their mtime against a known timestamp.
  // If mtime has changed and DB is active, upsert the pearl into the registry.
  private witnessExternalMutations(files: string[]) {
    if (!dbService.isActive) return;

    const wikiRoot = wikiService.getWikiPath();
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.includes('log.md'));

    for (const filePath of mdFiles) {
      try {
        const mtime = fs.statSync(filePath).mtimeMs;
        const knownMtime = this.fileTimestamps.get(filePath);

        if (knownMtime !== undefined && mtime > knownMtime) {
          // External mutation detected — witness it into the ledger
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const { metadata } = wikiService.parseCrustMarkdown(rawContent);
          const pageId = path.relative(wikiRoot, filePath).replace(/\.md$/, '').replace(/\\/g, '/');

          dbService.upsertPearl({
            page_id:       pageId,
            title:         metadata.title || pageId,
            type:          metadata.type || 'concept',
            author:        metadata.author || 'External',
            confidence:    metadata.confidence ?? 1.0,
            quality_score: 1.0,
            last_updated:  new Date().toISOString().split('T')[0],
            file_path:     filePath,
            tags:          JSON.stringify(metadata.tags || []),
          });
          dbService.syncLinks(
            pageId,
            (metadata.links || []).map((l: string) => ({ id: l, type: 'references' }))
          );
          dbService.recordMolt({
            page_id: pageId,
            action:  'witnessed',
            summary: `External edit detected for "${metadata.title || pageId}"`,
            author:  'External',
          });

          console.log(`[CrustAgent Witness] External molt detected: ${pageId}`);
        }

        // Always update our known mtime
        this.fileTimestamps.set(filePath, mtime);
      } catch (e) {
        // Silently skip unreadable files
      }
    }
  }

  // ─── Genesis Molt ───────────────────────────────────────────────────────────
  // On first scan with DB active, populate the registry with all existing pages.
  // Only runs if the registry is empty (fresh hatch).
  private performGenesisMolt(mdFiles: string[]) {
    if (!dbService.isActive) return;
    const stats = dbService.getStats();
    if (stats.pearl_count > 0) return;

    if (this.settings.preventAutoGenesis) {
      console.log(`[CrustAgent Witness] Auto-Genesis is LOCKED. Waiting for manual authorization.`);
      return;
    }

    console.log(`[CrustAgent Witness] Performing Genesis Molt — seeding ${mdFiles.length} pearls...`);
    const wikiRoot = wikiService.getWikiPath();

    for (const filePath of mdFiles) {
      try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const { metadata } = wikiService.parseCrustMarkdown(rawContent);
        const pageId = path.relative(wikiRoot, filePath).replace(/\.md$/, '').replace(/\\/g, '/');
        const mtime = fs.statSync(filePath).mtimeMs;

        dbService.upsertPearl({
          page_id:       pageId,
          title:         metadata.title || pageId,
          type:          metadata.type || 'concept',
          author:        metadata.author || 'System',
          confidence:    metadata.confidence ?? 1.0,
          quality_score: 1.0,
          last_updated:  metadata.lastUpdated || new Date().toISOString().split('T')[0],
          file_path:     filePath,
          tags:          JSON.stringify(metadata.tags || []),
        });
        dbService.syncLinks(
          pageId,
          (metadata.links || []).map((l: string) => ({ id: l, type: 'references' }))
        );

        this.fileTimestamps.set(filePath, mtime);
      } catch (e) {
        // Skip malformed files silently
      }
    }

    dbService.recalculateRelevanceScores();
    dbService.recordMolt({
      page_id: '__system__',
      action:  'genesis',
      summary: `Genesis Molt: seeded ${mdFiles.length} pearls from existing wiki.`,
      author:  'System',
    });

    const stats2 = dbService.getStats();
    console.log(`[CrustAgent Witness] Genesis complete: ${stats2.pearl_count} pearls, ${stats2.link_count} links.`);
  }

  // ─── Main Scan Loop ─────────────────────────────────────────────────────────

  public async performScan() {
    console.log("[CrustAgent Auto-Scan] Initiating filesystem scan...");

    const files = wikiService.walkDir();
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.includes('.git'));

    // Genesis Molt: runs once when DB is first hatched
    this.performGenesisMolt(mdFiles);

    // External Mutation Witness: runs every cycle when DB is active
    this.witnessExternalMutations(files);

    // Raw file detection (existing behavior, unchanged)
    if (!this.settings.autoIngest) return;

    const regPath = path.join(wikiService.getWikiPath(), '.scanned.json');
    let scanned: string[] = [];
    if (fs.existsSync(regPath)) {
      try { scanned = JSON.parse(fs.readFileSync(regPath, 'utf-8')); } catch(e) {}
    }

    let updated = false;
    let newFilesCount = 0;
    for (const f of files) {
      if (f.endsWith('.md') || f.includes('.git')) continue;
      const relativePath = path.relative(wikiService.getWikiPath(), f).replace(/\\/g, '/');
      if (scanned.includes(relativePath)) continue;

      console.log(`[CrustAgent Auto-Scan] New raw file detected: ${relativePath}`);
      wikiService.appendLog('detect', relativePath);
      scanned.push(relativePath);
      updated = true;
      newFilesCount++;
    }

    if (updated) {
      fs.writeFileSync(regPath, JSON.stringify(scanned));
      wikiService.appendLog('scan', `Background auto-scan detected ${newFilesCount} new files.`);
    }
  }

  public start() {
    if (this.timer) clearInterval(this.timer);
    const ms = this.parseIntervalMs(this.settings.scanInterval);
    if (ms > 0) {
      this.timer = setInterval(() => this.performScan(), ms);
    }
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }

  // ─── Hatch Lock Protocol ──────────────────────────────────────────────────

  /**
   * Locks or unlocks the Genesis protocol.
   * When locked, an empty DB will stay empty until triggerGenesisMolt is called.
   */
  public setHatchLock(locked: boolean) {
    this.settings.preventAutoGenesis = locked;
    this.saveSettings();
    console.log(`[AutoScanner] Hatch Lock ${locked ? 'ENGAGED' : 'DISENGAGED'}`);
  }

  public getHatchLock(): boolean {
    return this.settings.preventAutoGenesis;
  }

  /**
   * Manually triggers the Genesis Molt and clears the lock.
   */
  public async triggerGenesisMolt() {
    this.setHatchLock(false);
    // Trigger a scan immediately
    await this.performScan();
  }
}

export const autoScanner = new AutoScanner();
