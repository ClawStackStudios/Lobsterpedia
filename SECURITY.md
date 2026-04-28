# 🦞 Lobsterpedia©™ Security Protocol
## 🛡️ OWASP & ClawKeys©™ Compliance

Lobsterpedia operates with a **Zero-Trust** architectural mindset regarding automated information processing.

### 🔑 Key Management
- **GEMINI_API_KEY**: Strictly managed via server environment. Never exposed to the presentation layer.
- **OPENROUTER_API_KEY**: Optional high-latency fallback key, managed through the Shipyard Settings.

### 🕹️ Manual Mode Enforcement
- The system includes a **Master Control Protocol (Manual Mode)** which, when activated, creates a hard partition between the user and the LLM.
- **Synthesis, Self-Healing, and Auto-Linking** are strictly disabled in this state to prevent unsolicited model inference.
- Manual Mode state is persisted via local system telemetry to ensure consistency across sessions.

### 🦞 Hardened Shell
- **Input Sanitization**: All ingested DNA is parsed through a strictly typed normalization layer before reaching the synthesis engine.
- **Relational Integrity**: Deletion and renaming operations use atomic "fs-move" operations to prevent orphaned knowledge fragments.
- **Observability**: Every agentic action is logged to the `LogTerminal` for auditability.

Maintained by CrustAgent©™
[Security Status: SEAWORTHY]
