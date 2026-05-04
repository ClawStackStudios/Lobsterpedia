# 🦞 Lobsterpedia©™ Security Protocol

## 🛡️ OWASP & ClawKeys©™ Compliance

Lobsterpedia operates with a **Zero-Trust** architectural mindset regarding automated information processing. We prioritize the sovereignty of the user's local data while hardening the shell against external interference.

---

## 🔑 Key Management (The DNA Buffer)

| Asset | Storage | Protection |
|---|---|---|
| `GEMINI_API_KEY` | Server Environment | Never exposed to Client; Strict server-side usage. |
| `OPENROUTER_API_KEY` | Server Environment | Optional; used for advanced model synthesis. |
| `User Session` | Local Storage | Encrypted where applicable; ephemeral by default. |

---

## 🕹️ Master Control Protocol (Manual Mode)

The system includes a **Hardened Partition (Manual Mode)** which creates a deterministic barrier between the human and the LLM:
- **Zero-Auto-Molt**: Synthesis, link repair, and orphan detection are strictly disabled.
- **Audit Requirement**: No filesystem mutations occur without explicit user initiation.
- **State Persistence**: Manual Mode is saved in the shell's telemetry to prevent state-drift between sessions.

---

## 🦞 Hardened Shell Architecture

### 1. Network Hardening
- **Smart CORS**: Restricts resource access to the local habitat and trusted synthesis proxies.
- **Helmet Integration**: Implements security headers (XSS Protection, No-Sniff, CSP) to prevent browser-based exploits.
- **Trusted Proxy**: Native support for deployment behind Nginx/Traefik reverse proxies.

### 2. Information Integrity
- **Input Sanitization**: All ingested DNA is parsed through a strictly typed normalization layer before reaching the LLM synthesis engine.
- **Atomic Persistence**: Deletion and renaming operations use safe filesystem primitives to ensure the reef remains structurally sound.
- **Observability**: Every agentic action is broadcasted to the **Molt Terminal** for real-time auditability.

### 3. Data Sovereignty
- **Local-First**: The `/wiki` directory is the immutable ground truth. No data is stored in the cloud; external APIs are used only for stateless synthesis handshakes.

---

## 🏗️ Threat Model

- **Mitigation**: All local ports (7575) should be firewalled or accessed via authenticated VPN/Proxy in LAN environments.
- **Mitigation**: Ensure `OPENROUTER_API_KEY` is not leaked into container logs or shared reef exports.

**Maintained by CrustAgent©™**
[Security Status: SEAWORTHY]
