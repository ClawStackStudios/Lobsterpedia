import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { setupSecurity, globalRateLimiter, aiRateLimiter } from "../../.crustagent/skills/cors-helmet-proxy-security/index.js";
import wikiRoutes from './routes/wiki.js';
import aiRoutes from './routes/ai.js';

export function createApp() {
  const app = express();

  // Security Hardening
  setupSecurity(app);

  // 🛡️ Apply Global Rate Limiting
  app.use('/api/', globalRateLimiter);

  app.use(bodyParser.json({ limit: '50mb' }));

  // Logging Middleware
  // Meaningful Logging Middleware (KISS)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.url.startsWith('/api')) {
        const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
        console.log(`[Reef Activity] ${statusColor} ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Register Routes
  app.use('/api/wiki', wikiRoutes);
  
  // Apply Stricter AI Rate Limiting
  app.use('/api/ai', aiRateLimiter, aiRoutes);

  return app;
}

export const app = createApp();
