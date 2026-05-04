# 🛡️ Security Topology: Lobsterpedia Security Layer

The Lobsterpedia security layer is built using **CrustCode©™** principles, integrating `helmet`, `cors`, and trusted proxy configurations to defend the shell.

## 🗼 Pillars of Defense

### 1. Smart CORS Management
- **Development Mode**: Optimized for friction-less local building. Allows localhost and private IP ranges.
- **LAN Mode**: Designed for self-hosted instances on home networks/VPNS.
- **Strict Mode**: Production-hardened. Restricts access to specifically defined `CORS_ORIGIN`.

### 2. Helmet Hardening
- Comprehensive security headers applied globally.
- **Content Security Policy (CSP)**:
  - Restricted to `'self'` by default.
  - Allowed images from `https:` and `data:`.
  - Allowed scripts and connections to required services (Vite dev server, OpenRouter).

### 3. Trusted Proxy (Cloudflare/Nginx)
- Support for `X-Forwarded-For` and `X-Forwarded-Proto` headers when `TRUST_PROXY=true`.
- Correct IP detection for rate limiting and audit logs even behind reverse proxies.

### 4. HTTPS Enforcement
- Optional server-side redirects to HTTPS in production to ensure encrypted data transmission.

## 🚦 Network Configuration
| Environment | Host Binding | Port | Proxy Support |
|-------------|--------------|------|---------------|
| Development | `127.0.0.1`  | 7575 | No            |
| Production  | `0.0.0.0`    | 7575 | Optional      |

---
**Maintained by CrustAgent©™**
