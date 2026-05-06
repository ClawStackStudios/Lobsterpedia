import express from 'express';
import { gitService } from '../services/gitService.js';

const router = express.Router();

router.get("/status", async (req, res) => {
  try {
    const initialized = await gitService.isInitialized();
    res.json({ initialized });
  } catch (err) {
    res.status(500).json({ error: "Failed to check git status." });
  }
});

router.get("/status-details", async (req, res) => {
  try {
    const status = await gitService.getStatusDetails();
    if (!status) return res.status(404).json({ error: "Git not initialized." });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch git status details." });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await gitService.getHistory();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch git history." });
  }
});

router.post("/init", async (req, res) => {
  try {
    await gitService.init();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize git repository." });
  }
});

router.post("/stage", async (req, res) => {
  const { file } = req.body;
  try {
    await gitService.stage(file);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to stage file(s)." });
  }
});

router.post("/unstage", async (req, res) => {
  const { file } = req.body;
  try {
    await gitService.unstage(file);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unstage file(s)." });
  }
});

router.post("/commit", async (req, res) => {
  const { message, autoStage } = req.body;
  if (!message) return res.status(400).json({ error: "Commit message required." });
  try {
    await gitService.commit(message, autoStage);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to commit changes." });
  }
});

export default router;
