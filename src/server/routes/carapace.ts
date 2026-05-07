// ─── Carapace Routes (/api/carapace/*) ────────────────────────────────────────
//
// API surface for the Carapace Dreaming engine.
// All routes are read-only except POST /dream which triggers a manual sweep.
// ──────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { dreamerService } from '../services/dreamerService.js';
import { dbService } from '../services/dbService.js';
import { scuttlerService } from '../services/scuttlerService.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// ─── GET /status — Dreamer state overview ────────────────────────────────────

router.get('/status', (req, res) => {
  try {
    const status = dreamerService.getStatus();
    const stats = dbService.isActive ? dbService.getStats() : null;
    res.json({ ...status, stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /journal — Dream diary entries ──────────────────────────────────────

router.get('/journal', (req, res) => {
  try {
    const carapacePath = process.env.CARAPACE_PATH || path.join(process.cwd(), 'carapace');
    const journalPath = path.join(carapacePath, 'dreams', 'JOURNAL.md');

    if (!fs.existsSync(journalPath)) {
      return res.json({ content: '', exists: false });
    }

    const content = fs.readFileSync(journalPath, 'utf-8');
    res.json({ content, exists: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /candidates — Current staged candidates ────────────────────────────

router.get('/candidates', (req, res) => {
  try {
    if (!dbService.isActive) {
      return res.json({ candidates: [], sweepId: null });
    }

    const lastSweepId = dbService.getDreamState('last_sweep_id');
    if (!lastSweepId) {
      return res.json({ candidates: [], sweepId: null });
    }

    const candidates = dbService.getDreamCandidates(lastSweepId);
    res.json({ candidates, sweepId: lastSweepId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /insights — Promoted insights list ──────────────────────────────────

router.get('/insights', (req, res) => {
  try {
    if (!dbService.isActive) {
      return res.json({ promotions: [] });
    }

    const promotions = dbService.getDreamPromotions(50);
    res.json({ promotions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /reflections — REM sleep reflections ────────────────────────────────

router.get('/reflections', (req, res) => {
  try {
    if (!dbService.isActive) {
      return res.json({ reflections: [], sweepId: null });
    }

    const lastSweepId = dbService.getDreamState('last_sweep_id');
    if (!lastSweepId) {
      return res.json({ reflections: [], sweepId: null });
    }

    const reflections = dbService.getDreamReflections(lastSweepId);
    res.json({ reflections, sweepId: lastSweepId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── POST /dream — Manual sweep trigger ─────────────────────────────────────

router.post('/dream', async (req, res) => {
  try {
    if (!dreamerService.isHatched) {
      return res.status(400).json({
        error: 'Carapace not hatched. Set HATCH_CARAPACE=true and HATCH_DATABASE=true.',
      });
    }

    const result = await dreamerService.runSweep();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── GET /page — Read raw Markdown from Carapace ──────────────────────────────

router.get('/page', (req, res) => {
  try {
    const targetPath = req.query.path as string;
    if (!targetPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const carapacePath = process.env.CARAPACE_PATH || path.join(process.cwd(), 'carapace');
    // Ensure the requested path is actually inside the carapace directory
    const resolvedPath = path.resolve(carapacePath, targetPath);
    
    if (!resolvedPath.startsWith(path.resolve(carapacePath))) {
      return res.status(403).json({ error: 'Path traversal forbidden' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const stats = fs.statSync(resolvedPath);
    
    res.json({ 
      title: path.basename(resolvedPath),
      path: targetPath,
      content,
      updatedAt: stats.mtime.toISOString(),
      totalLines: content.split('\n').length
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Advanced Actions ────────────────────────────────────────────────────────

router.post('/action/dedupe', async (req, res) => {
  const result = await scuttlerService.dedupeJournal();
  res.json({ status: 'success', ...result });
});

router.post('/action/repair', async (req, res) => {
  const result = await scuttlerService.repairCache();
  res.json({ status: 'success', ...result });
});

router.post('/action/backfill', async (req, res) => {
  const result = await scuttlerService.backfillLedger();
  res.json({ status: 'success', ...result });
});

router.post('/action/reset', async (req, res) => {
  const result = await scuttlerService.resetState();
  res.json({ status: 'success', ...result });
});

export default router;
