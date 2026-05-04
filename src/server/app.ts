import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { setupSecurity } from "../../.crustagent/skills/cors-helmet-proxy-security/index.js";
import wikiRoutes from './routes/wiki.js';
import aiRoutes from './routes/ai.js';

export function createApp() {
  const app = express();

  // Security Hardening
  setupSecurity(app);

  app.use(bodyParser.json({ limit: '50mb' }));

  // Logging Middleware
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      const bodyKeys = Object.keys(req.body || {}).filter(k => k !== 'content' && k !== 'file').join(', ');
      console.log(`[CrustAgent] ${req.method} ${req.url} ${bodyKeys ? `| Payload: [${bodyKeys}]` : ''}`);
    }
    next();
  });

  // Register Routes
  app.use('/api/wiki', wikiRoutes);
  app.use('/api/ai', aiRoutes);

  return app;
}

export const app = createApp();
