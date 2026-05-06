import { CorsOptions } from 'cors';

const isLocalhost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const isPrivateIP = (hostname: string): boolean =>
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname); // Tailscale

export function getCorsConfig(): CorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : [];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);

        if (isLocalhost(hostname)) return callback(null, true);
        if (isPrivateIP(hostname)) return callback(null, true);

        if (isProduction) {
          if (allowedOrigins.includes(origin)) return callback(null, true);
          console.warn(`⚠️  [CORS] Rejected origin in production: ${origin}`);
          return callback(new Error('CORS: Origin not allowed in production'));
        }

        // Dev: allow all to prevent LAN friction
        return callback(null, true);
      } catch {
        callback(new Error(`CORS: Invalid origin format: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 3600,
  };
}
