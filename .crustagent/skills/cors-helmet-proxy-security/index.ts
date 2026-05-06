import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';
import rateLimit from 'express-rate-limit';

export const setupSecurity = (app: Express) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const trustProxy = process.env.TRUST_PROXY === 'true';

  // 🔗 Trusted Proxy (Required for Cloudflare/Tailscale)
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // 🛡️ Minimalist Helmet (No HSTS, No CSP, No Protocol Upgrades)
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));

  // 🔒 Permissive CORS (LAN Friendly)
  app.use(cors({
    origin: true, // Allow all origins for simplicity in LAN habitat
    credentials: true
  }));

  console.log(`[Reef Security] Minimalist LAN Posture Active (HSTS/CSP Disabled)`);
};

// 🛡️ General Rate Limiter (Protects against DoS)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// 🛡️ AI Rate Limiter
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
