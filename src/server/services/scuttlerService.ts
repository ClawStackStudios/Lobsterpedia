import fs from 'fs';
import path from 'path';
import { wikiService } from './wikiService.js';
import { dbService } from './dbService.js';
import { habitatLogger } from './habitatLogger.js';

/**
 * 🦀 ScuttlerService
 * 
 * Handles maintenance and "scuttler" routines for the Carapace Dreaming system.
 * Keeps the Sovereign Ledger and the Carapace filesystem in parity.
 * 
 * Maintained by CrustAgent©™
 */
export class ScuttlerService {
  private carapacePath: string;

  constructor() {
    this.carapacePath = process.env.CARAPACE_PATH || path.join(process.cwd(), 'carapace');
  }

  /**
   * Removes duplicate entries from the dream journal.
   */
  public async dedupeJournal(): Promise<{ message: string }> {
    const journalPath = path.join(this.carapacePath, 'dreams', 'JOURNAL.md');
    if (!fs.existsSync(journalPath)) {
      return { message: 'No journal found to deduplicate.' };
    }

    habitatLogger.log('system', 'Scuttler: Deduplicating dream journal...', 'info');

    const content = fs.readFileSync(journalPath, 'utf-8');
    // Split by date headers (e.g., # 2024-05-07)
    const blocks = content.split(/(?=\n# [0-9]{4}-[0-9]{2}-[0-9]{2})/).filter(b => b.trim().length > 0);
    
    const uniqueBlocks = new Array<string>();
    const seen = new Set<string>();

    for (const block of blocks) {
      const hash = block.trim();
      if (!seen.has(hash)) {
        seen.add(hash);
        uniqueBlocks.push(block);
      }
    }

    if (uniqueBlocks.length < blocks.length) {
      fs.writeFileSync(journalPath, uniqueBlocks.join(''), 'utf-8');
      const diff = blocks.length - uniqueBlocks.length;
      habitatLogger.log('system', `Scuttler: Removed ${diff} duplicate journal entries.`, 'success');
      return { message: `Deduplication complete. Removed ${diff} duplicates.` };
    }

    return { message: 'Journal is already optimized.' };
  }

  /**
   * Repairs the dream cache by verifying database promotions against filesystem insights.
   */
  public async repairCache(): Promise<{ message: string }> {
    if (!dbService.isActive) return { message: 'Ledger inactive. Cannot repair.' };

    habitatLogger.log('system', 'Scuttler: Repairing dream cache parity...', 'warn');

    const promotions = dbService.getDreamPromotions(1000);
    let repairedCount = 0;

    for (const p of promotions) {
      const fullPath = path.resolve(this.carapacePath, p.insight_path);
      if (!fs.existsSync(fullPath)) {
        // Promotion exists in DB but file is gone.
        // In a real system we might want to delete from DB, but for now we just log it.
        habitatLogger.log('system', `Scuttler: Missing insight file for ${p.insight_path}. Marking for review.`, 'error');
        repairedCount++;
      }
    }

    return { message: `Cache repair scan complete. Found ${repairedCount} inconsistencies.` };
  }

  /**
   * Resets the dreaming state and clears non-promoted candidates.
   */
  public async resetState(): Promise<{ message: string }> {
    if (!dbService.isActive) return { message: 'Ledger inactive. Cannot reset.' };

    habitatLogger.log('system', 'Scuttler: Resetting dream state (Hard Flush)...', 'warn');

    // We use a direct SQL execution via dbService if it exposed it, 
    // but we'll use the public methods or add one.
    // For now, let's assume we can clear dream_state and candidates.
    
    try {
      dbService.resetDreamingState();
      return { message: 'Dream state has been reset to Genesis.' };
    } catch (err) {
      return { message: `Reset failed: ${(err as Error).message}` };
    }
  }

  /**
   * Backfills the Pearl Registry by scanning the wiki directory for missing pages.
   */
  public async backfillLedger(): Promise<{ message: string }> {
    if (!dbService.isActive) return { message: 'Ledger inactive. Cannot backfill.' };

    habitatLogger.log('system', 'Scuttler: Initiating wiki-to-ledger backfill...', 'info');
    
    let count = 0;
    const wikiRoot = wikiService.getWikiPath();
    const files = wikiService.walkDir();
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.includes('.git') && !f.includes('log.md'));

    for (const filePath of mdFiles) {
      try {
        const rawContent = await fs.promises.readFile(filePath, 'utf-8');
        const { metadata } = wikiService.parseCrustMarkdown(rawContent);
        const pageId = path.relative(wikiRoot, filePath).replace(/\.md$/, '').replace(/\\/g, '/');
        
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
        count++;
      } catch (err) {
        habitatLogger.log('system', `Scuttler: Failed to process ${filePath}: ${(err as Error).message}`, 'error');
      }
    }

    dbService.recalculateRelevanceScores();
    habitatLogger.log('system', `Scuttler: Backfill complete. Witnessed ${count} pearls into the ledger.`, 'success');
    
    return { message: `Backfill complete. Witnessed ${count} pearls.` };
  }
}

export const scuttlerService = new ScuttlerService();
