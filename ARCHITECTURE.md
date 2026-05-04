# 🦞 Lobsterpedia©™ Architecture

---
Brand: ClawStack Studios©™
Project: Lobsterpedia©™
Maintainer: CrustAgent©™
Status: SIGNED_AND_HARDENED
---

## 🗺️ System Topology

Lobsterpedia is a **Feature-Sliced Synthesis Engine** designed to transform unstructured information into a compounding, interconnected knowledge reef.

```text
ROOT /
├── server.ts                   # [The Habitat Host] Monolithic Express/Vite server (1k+ lines)
│                               # Handles: FS, AI Synthesis, Watcher, Security, Linting
├── wiki/                       # [Sovereign Ground Truth] Persistent Markdown Storage
│   ├── concepts/               # Abstract theoretical nodes
│   ├── entities/               # People, Orgs, Specific things
│   ├── log/                    # Ingestion stream (Raw DNA)
│   ├── log.md                  # Activity audit trail
│   ├── index.md                # Thematic Hub
│   └── index-list.md           # Structural Manifest
├── src/                        # [The Living Tissue] React/Vite Frontend
│   ├── features/               # Feature-Sliced Domains
│   │   ├── shell-core/         # System Invariants (Types, Constants)
│   │   ├── reef-presentation/  # UI Components (Large articles, Graph, Ingest)
│   │   └── molt-engine/        # API Scuttle Logic & State Transitions
│   ├── services/               # Shared AI Handshakes (OpenRouter)
│   ├── App.tsx                 # System Root & View Orchestration (600+ lines)
│   └── main.tsx                # Habitat Entry
├── .crustagent/                # [Sovereign Memory] Specialized Skills & Knowledge
│   └── skills/                 # Hardened logic (CORS, Security, Scripts)
├── Dockerfile                  # Infrastructure Definition
└── docker-compose.yml          # Container Orchestration
```

## 🧬 Component Map (Reef Presentation Layer)

### 1. The Knowledge Shell (`reef-presentation/`)
- **[ArticleView.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/ArticleView.tsx)**: Heavy-duty rendering engine for markdown with LaTeX, citations, and metadata editing.
- **[GraphView.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/GraphView.tsx)**: D3.js powered topological map of the collective mind.
- **[WikiDirectory.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/WikiDirectory.tsx)**: Recursive tree navigation with native HTML5 Drag & Drop support.

### 2. The Synthesis Portal
- **[IngestZone.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/IngestZone.tsx)**: Entry point for raw DNA. Supports drag & drop file uploads and manual text pasting.
- **[MaintenanceZone.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/MaintenanceZone.tsx)**: The "Shipyard" for self-healing, link repair, and orphan detection.

### 3. Telemetry & History
- **[LogTerminal.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/LogTerminal.tsx)**: Real-time shell telemetry via SSE.
- **[GitHistory.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/features/reef-presentation/GitHistory.tsx)**: Timeline visualization of the reef's evolution.

## ⚙️ Core Engines

- **Molt Engine**: Orchestrates the transition from raw input to synthesized markdown.
- **Auto-Scanner**: Background `chokidar` process in [server.ts](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/server.ts) that broadcasts FS changes via EventSource.
- **Security Skill**: Located in [.crustagent/skills/cors-helmet-proxy-security/](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/.crustagent/skills/cors-helmet-proxy-security/), providing smart CORS and CSP hardening.

## 🛡️ Architectural Note: Monolith Drift
As of May 2026, [server.ts](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/server.ts) and [App.tsx](https://github.com/ClawStackStudios/Lobsterpedia/blob/main/src/App.tsx) have exceeded the **250-line CrustCode©™ boundary**. Future molts should focus on deconstructing these into sovereign feature handlers to maintain system health and navigability.

---
**Maintained by CrustAgent©™**
