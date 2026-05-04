# 🛡️ CORS-Helmet-Proxy Security Skill

A production-ready security configuration for Express.js with CORS, Helmet, and trusted proxy support optimized for Cloudflare deployments.

## Features

- 🔒 **Smart CORS**: Three-mode system (Development, LAN, Strict/Production)
- 🛡️ **Helmet Security**: Comprehensive security headers with CSP
- 🔗 **Trusted Proxy**: Cloudflare/Nginx/Docker reverse proxy support
- 🔒 **HTTPS Enforcement**: Optional HTTPS redirect for production
- 🚦 **Rate Limiting**: Ready-to-use rate limiting middleware
- 📝 **Audit Logging**: Built-in security logging

## Quick Start

```javascript
import { setupSecurity } from '@.crustagent/skills/cors-helmet-proxy-security';

// Apply to your Express app
const app = express();
setupSecurity(app);
```

## Installation

```bash
# Create the skill directory
mkdir -p .crustagent/skills/cors-helmet-proxy-security

# Add SKILL.md file
touch .crustagent/skills/cors-helmet-proxy-security/SKILL.md
```

## Usage

### Basic Setup

```javascript
import express from 'express';
import { setupSecurity } from '.crustagent/skills/cors-helmet-proxy-security';

const app = express();

// Apply complete security middleware
setupSecurity(app);
```

### Environment Variables

Create a `.env` file in your project root:

```env
# ── CORS Configuration ────────────────────────────────────────────────────────
# Development: Allow localhost and private IPs (default)
# LAN: Allow private network access
# Production: Restrict to specific domain (Cloudflare Tunnel)

# For Cloudflare Tunnel/Reverse Proxy
CORS_ORIGIN=https://your-domain.com

# Enable if using reverse proxy (Cloudflare, Nginx, Docker)
TRUST_PROXY=true

# Force HTTPS redirect (recommended for production)
ENFORCE_HTTPS=true
```

### Advanced Configuration

```javascript
import { setupSecurity, corsConfig, helmetConfig } from '.crustagent/skills/cors-helmet-proxy-security';

// Custom helmet config
const customHelmet = helmetConfig({
  enableCSP: true,
  enableHSTS: true,
  customDirectives: {
    'connect-src': ["'self'", 'https://api.example.com']
  }
});

setupSecurity(app, {
  cors: corsConfig('production', 'https://your-domain.com'),
  helmet: customHelmet,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per window
  }
});
```

## Configuration Options

### CORS Modes

1. **Development Mode** (default)
   - Allows localhost and private IP ranges
   - No `CORS_ORIGIN` required
   - Perfect for local development

2. **LAN Mode**
   - Allows private network access
   - No `CORS_ORIGIN` required
   - Good for self-hosted deployments

3. **Strict Mode** (Production)
   - Restricts to specified `CORS_ORIGIN`
   - Required for Cloudflare Tunnel
   - Most secure option

### Security Headers Applied

```javascript
// Helmet Security Headers
{
  strictTransportSecurity: true,      // HSTS
  contentSecurityPolicy: {           // CSP
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'wss:', 'ws:']
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false
}
```

### Cloudflare Tunnel Setup

1. **Environment Variables**
   ```env
   TRUST_PROXY=true
   CORS_ORIGIN=https://your-domain.cf
   ENFORCE_HTTPS=true
   ```

2. **Cloudflare Tunnel Config**
   ```bash
   # Create tunnel
   cloudflared tunnel create clawchives
   
   # Configure DNS
   cloudflared tunnel route dns clawchives your-domain.cf
   ```

3. **Nginx Config (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.cf;
       
       location / {
           proxy_pass http://localhost:4646;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## Rate Limiting

The setup includes rate limiting middleware:

```javascript
// Apply to specific routes
app.use('/api/auth', rateLimiter({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit auth endpoints
}));

// Global rate limiting
app.use(rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // limit all API endpoints
}));
```

## Security Features

### IP Address Detection

- When `TRUST_PROXY=true`, reads real client IP from `X-Forwarded-For`
- Supports Cloudflare, Nginx, Docker, and other reverse proxies
- Audit logs show actual client IP instead of proxy IP

### CORS Security

- Validates origins with regex patterns
- Supports multiple comma-separated origins
- Exposes rate limit headers for client-side monitoring
- Credentials support for cookies/authorization

### Content Security Policy

- Blocks XSS and data injection attacks
- Allows fonts from Google Fonts
- Supports WebSocket connections
- Customizable for third-party integrations

## Deployment Examples

### Docker Deployment

```dockerfile
FROM node:18-alpine

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Environment variables
ENV TRUST_PROXY=true
ENV CORS_ORIGIN=https://your-domain.com
ENV ENFORCE_HTTPS=true

EXPOSE 4646
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4646:4646"
    environment:
      - TRUST_PROXY=true
      - CORS_ORIGIN=https://your-domain.com
      - ENFORCE_HTTPS=true
    volumes:
      - ./data:/app/data
```

## Testing

```bash
# Test CORS
curl -H "Origin: http://localhost:3000" -v http://localhost:4646/api/health

# Test HTTPS redirect
curl -I http://localhost:4646/api/health

# Test security headers
curl -I http://localhost:4646/api/health | grep -E 'Helmet|CSP|HSTS'
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Check CORS origin setting
   echo $CORS_ORIGIN
   
   # Test with allowed origin
   curl -H "Origin: https://your-domain.com" -v http://localhost:4646/api/health
   ```

2. **HTTPS Redirect Not Working**
   ```bash
   # Ensure ENFORCE_HTTPS is true
   echo $ENFORCE_HTTPS
   
   # Check proxy headers
   curl -H "X-Forwarded-Proto: https" -v http://localhost:4646/api/health
   ```

3. **Rate Limiting**
   ```bash
   # Check rate limiting headers
   curl -I http://localhost:4646/api/health | grep -i rate-limit
   ```

## API Reference

### `setupSecurity(app, options?)`

Configure complete security middleware stack.

**Parameters:**
- `app` - Express.js application instance
- `options` - Optional configuration object

**Example:**
```javascript
setupSecurity(app, {
  cors: corsConfig('strict', 'https://your-domain.com'),
  helmet: helmetConfig({
    enableCSP: true,
    customDirectives: {
      'script-src': ["'self'", "'unsafe-inline'"]
    }
  })
});
```

### `corsConfig(mode, origin?)`

Create CORS configuration object.

**Modes:**
- `'development'` - Allow localhost and private IPs
- `'lan'` - Allow private network access
- `'strict'` - Restrict to specified origin

### `helmetConfig(options?)`

Create Helmet configuration object.

**Options:**
- `enableCSP` - Enable Content Security Policy (default: true)
- `enableHSTS` - Enable HTTP Strict Transport Security (default: true)
- `customDirectives` - Custom CSP directives

---

**Maintained by CrustAgent©™**