import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';

export const corsConfig = (mode: 'development' | 'lan' | 'strict', origin?: string) => {
  const privateIPRanges = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/
  ];

  return {
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!requestOrigin) return callback(null, true);

      if (mode === 'development' || mode === 'lan') {
        const isAllowed = privateIPRanges.some(regex => regex.test(requestOrigin));
        if (isAllowed) return callback(null, true);
        if (mode === 'development') return callback(null, true); // Allow all in dev
      }

      if (mode === 'strict' && origin) {
        const allowedOrigins = origin.split(',').map(o => o.trim());
        if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
};

export const helmetConfig = (options: any = {}) => {
  return {
    contentSecurityPolicy: options.enableCSP !== false ? {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'default-src': ["'self'"],
        'img-src': ["'self'", "data:", "https:"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'connect-src': ["'self'", "wss:", "ws:", "https://openrouter.ai"],
        ...(options.customDirectives || {})
      }
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    hsts: options.enableHSTS !== false
  };
};

export const setupSecurity = (app: Express, options: any = {}) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const origin = process.env.CORS_ORIGIN;
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const enforceHttps = process.env.ENFORCE_HTTPS === 'true';

  // 🛰️ Auto-detect Mode
  let mode: 'development' | 'lan' | 'strict' = 'development';
  if (nodeEnv === 'production') {
    mode = origin ? 'strict' : 'lan';
  }

  // 🔗 Trusted Proxy
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // 🛡️ Helmet (Disable HSTS for LAN/Dev unless forced)
  const helmetOptions = {
    ...options.helmet,
    enableHSTS: enforceHttps && nodeEnv === 'production'
  };
  app.use(helmet(helmetConfig(helmetOptions)));

  // 🔒 CORS
  app.use(cors(options.cors || corsConfig(mode, origin)));

  // 🔒 HTTPS Enforcement
  if (enforceHttps) {
    app.use((req, res, next) => {
      const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.secure;
      if (!isHttps && nodeEnv === 'production') {
        return res.redirect(`https://${req.get('host')}${req.url}`);
      }
      next();
    });
  }
};
