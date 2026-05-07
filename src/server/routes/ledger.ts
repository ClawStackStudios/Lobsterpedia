import express from 'express';
import { dbService } from '../services/dbService.js';

const router = express.Router();

// ─── Status ──────────────────────────────────────────────────────────────────
// Reports whether the Sovereign Ledger is active (HATCH_DATABASE=true).
router.get('/status', (req, res) => {
  res.json({
    hatched:       dbService.isActive,
    hatch_env_set: process.env.HATCH_DATABASE === 'true',
  });
});

// ─── Molt History ─────────────────────────────────────────────────────────────
// Returns the recent molt event log, ordered newest-first.
router.get('/history', (req, res) => {
  if (!dbService.isActive) {
    return res.json({ history: [], hatched: false });
  }
  try {
    const limit  = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const history = dbService.getRecentMolts(limit);
    res.json({ history, hatched: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch molt history.' });
  }
});

// ─── Pearl Registry ──────────────────────────────────────────────────────────
// Returns the full metadata registry, ordered by relevance score.
router.get('/pearls', (req, res) => {
  if (!dbService.isActive) {
    return res.json({ pearls: [], hatched: false });
  }
  try {
    const pearls = dbService.getAllPearls();
    res.json({ pearls, hatched: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pearl registry.' });
  }
});

// ─── Single Pearl ─────────────────────────────────────────────────────────────
router.get('/pearls/:pageId(*)', (req, res) => {
  if (!dbService.isActive) return res.status(503).json({ error: 'Ledger not hatched.' });
  try {
    const pearl = dbService.getPearl(req.params.pageId);
    if (!pearl) return res.status(404).json({ error: 'Pearl not found.' });
    const inbound  = dbService.getInboundLinks(req.params.pageId);
    const outbound = dbService.getOutboundLinks(req.params.pageId);
    const molts    = dbService.getMoltsForPage(req.params.pageId);
    res.json({ pearl, inbound, outbound, molts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pearl.' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  if (!dbService.isActive) return res.json({ hatched: false });
  try {
    const stats = dbService.getStats();
    res.json({ ...stats, hatched: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─── Manual Molt Entry ────────────────────────────────────────────────────────
// Allows the UI to manually record a molt event (e.g., an LLM action).
router.post('/molt', (req, res) => {
  if (!dbService.isActive) return res.status(503).json({ error: 'Ledger not hatched.' });
  const { page_id, action, summary, author } = req.body;
  if (!page_id || !action) return res.status(400).json({ error: 'page_id and action are required.' });
  try {
    dbService.recordMolt({ page_id, action, summary: summary || '', author: author || 'Human' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record molt.' });
  }
});

export default router;
