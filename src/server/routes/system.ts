import express from 'express';
import { dbService } from '../services/dbService.js';
import { autoScanner } from '../services/autoScanner.js';
import { habitatLogger } from '../services/habitatLogger.js';

const router = express.Router();

/**
 * 🛰️ SYSTEM STATUS: Returns health and lock status.
 */
router.get('/status', (req, res) => {
  res.json({
    hatched: dbService.isActive,
    stats: dbService.isActive ? dbService.getStats() : null,
    hatch_lock: autoScanner.getHatchLock()
  });
});

/**
 * ☢️ HARD RESET: Wipes the Sovereign Ledger.
 * Engages the Hatch Lock to prevent auto-population.
 */
router.post('/reset-database', async (req, res) => {
  try {
    habitatLogger.log('system', 'System: Initiating full database hard reset...', 'warn');
    
    // 1. Wipe the DB
    dbService.resetFullDatabase();
    
    // 2. Lock the scanner so it doesn't immediately re-populate
    autoScanner.setHatchLock(true);
    
    res.json({ success: true, message: 'Habitat database has been cleared and LOCKED.' });
  } catch (err) {
    habitatLogger.log('system', `System: Reset failed: ${(err as Error).message}`, 'error');
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * 🧬 AUTHORIZE GENESIS: Clears the lock and triggers a scan.
 */
router.post('/authorize-genesis', async (req, res) => {
  try {
    habitatLogger.log('system', 'System: Manual Genesis authorized. Starting hull scan...', 'info');
    await autoScanner.triggerGenesisMolt();
    res.json({ success: true, message: 'Genesis Molt initiated.' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
