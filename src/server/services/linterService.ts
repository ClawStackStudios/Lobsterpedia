import fs from 'fs';
import path from 'path';
import { wikiService } from './wikiService.js';
import { habitatLogger } from './habitatLogger.js';

export const linterService = {
  lintReef: (): { issues: any[] } => {
    habitatLogger.log('lint', `Starting reef-wide scan...`, 'info');
    const files = wikiService.walkDir().filter(f => f.endsWith('.md'));
    const issues: any[] = [];
    const allIds = files.map(f => path.relative(wikiService.getWikiPath(), f).replace(/\.md$/, '').replace(/\\/g, '/'));

    // ─── Smart Link Resolution (The Linter's Eyes) ──────────────────────────────
    const resolveLinkId = (rawLinkId: string, sourceId: string) => {
      const linkId = rawLinkId.replace(/\.md$/, '');

      // 1. Exact match
      if (allIds.includes(linkId)) return linkId;
      if (linkId === 'index' || linkId === 'index-list') return linkId;

      // 2. Relative match (same category)
      if (sourceId.includes('/')) {
        const category = sourceId.split('/')[0];
        const relativePath = `${category}/${linkId}`;
        if (allIds.includes(relativePath)) return relativePath;
      }

      // 3. Fuzzy global match (any category/id)
      const fuzzyMatch = allIds.find(id => id.endsWith(`/${linkId}`));
      if (fuzzyMatch) return fuzzyMatch;

      return null;
    };

    const parsedPages = files.map(f => {
      const data = fs.readFileSync(f, 'utf-8');
      const { metadata, content } = wikiService.parseCrustMarkdown(data);
      const id = path.relative(wikiService.getWikiPath(), f).replace(/\.md$/, '').replace(/\\/g, '/');
      return { id, metadata, content };
    });

    parsedPages.forEach(page => {
      const { id, metadata } = page;

      // 1. Broken Links
      const links = metadata.links || [];
      links.forEach((link: string) => {
        const resolved = resolveLinkId(link, id);
        if (!resolved) {
          issues.push({
            id: `broken-link-${id}-${link}`,
            type: 'broken-link',
            severity: 'warn',
            sourceId: id,
            description: `Reference to non-existent PolyP: [[${link}]]`,
            suggestion: `Verify the link ID or synthesize the missing knowledge node.`
          });
        }
      });

      // 2. Metadata Rot
      if (!metadata.title) {
        issues.push({
          id: `missing-title-${id}`,
          type: 'metadata-rot',
          severity: 'info',
          sourceId: id,
          description: `Missing title in frontmatter.`,
          suggestion: `Add a 'title' field to ensure professional indexing.`
        });
      }

      // 3. Orphans (No incoming links)
      const isLinked = parsedPages.some(otherPage => {
        if (otherPage.id === id) return false;

        // Check metadata links
        const otherLinks = otherPage.metadata.links || [];
        const hasLinkInMeta = otherLinks.some((l: string) => resolveLinkId(l, otherPage.id) === id);
        if (hasLinkInMeta) return true;

        // Special case: root hub and index-list are starting points
        if (otherPage.id === 'index' || otherPage.id === 'index-list') {
           // We already checked metadata, but let's be explicit
        }

        return false;
      });

      if (!isLinked && id !== 'index' && id !== 'index-list') {
        issues.push({
          id: `orphan-${id}`,
          type: 'orphan',
          severity: 'info',
          sourceId: id,
          description: `Isolated PolyP: No incoming links detected.`,
          suggestion: `Connect this node to the reef by linking to it from the index or related articles.`
        });
      }
    });

    habitatLogger.log('lint', `Scan complete: Found ${issues.length} issues across ${files.length} pearls`, issues.length > 0 ? 'warn' : 'success');
    return { issues };
  }
};
