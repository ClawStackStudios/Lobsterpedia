import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { getCorsConfig } from './middleware/cors.js';
import { apiLimiter, aiLimiter } from './middleware/rateLimiter.js';
import wikiRoutes from './routes/wiki.js';
import aiRoutes from './routes/ai.js';
import gitRoutes from './routes/git.js';

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // ─── Trust Proxy (Cloudflare / Tailscale / Nginx) ─────────────────────────
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // ─── Security Middleware (modeled after PinchPad) ─────────────────────────
  app.use(helmet({
    // HSTS: Only enforce if explicitly opted-in (never on plain LAN HTTP)
    strictTransportSecurity: process.env.ENFORCE_HTTPS === 'true' ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc:     ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:', 'https://openrouter.ai'],
        frameAncestors: isProduction ? ["'self'"] : ["'self'", '*'],
        // Only upgrade to HTTPS if explicitly enforcing it
        upgradeInsecureRequests: process.env.ENFORCE_HTTPS === 'true' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy:   false,
    originAgentCluster:        false,
    frameguard: isProduction ? { action: 'sameorigin' } : false,
  }));

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.use(cors(getCorsConfig()));

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  app.use('/api/', apiLimiter);

  // ─── Body Parser ──────────────────────────────────────────────────────────
  app.use(bodyParser.json({ limit: '50mb' }));

  // ─── Logging (KISS — meaningful signals only) ─────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.url.startsWith('/api')) {
        const icon = res.statusCode >= 400 ? '🔴' : '🟢';
        console.log(`[Reef] ${icon} ${req.method} ${req.url} ${res.statusCode} (${Date.now() - start}ms)`);
      }
    });
    next();
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/api/wiki', wikiRoutes);
  app.use('/api/ai', aiLimiter, aiRoutes);
  app.use('/api/git', gitRoutes);

  return app;
}

export const app = createApp();
