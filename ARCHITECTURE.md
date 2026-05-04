# 🦞 Lobsterpedia©™ Architecture

```text
/
├── server.ts (The Habitat Host - Express/Vite Middleware)
├── Dockerfile (Infrastructure Definition)
├── docker-compose.yml (Container Orchestration)
├── wiki/ (The Persistent Reef - Markdown Data Storage)
├── src/ (The Living Tissue)
│   ├── features/
│   │   ├── shell-core/        (Shared Types, Constants & Invariants)
│   │   ├── reef-presentation/ (React UI Components & Layouts)
│   │   └── molt-engine/       (API Logic & Data Orchestration)
│   ├── services/              (AI & Utility Services)
│   ├── App.tsx                (System Root & Shell Layout)
│   ├── main.tsx               (Entrance)
│   └── index.css              (The Exoskeleton Styling)
├── .crustagent/ (CrustAgent Internal Memory)
└── README.md
```

## 🧬 Component Map (Reef Presentation Layer)
- `Header`: Navigation exoskeleton with adaptive search and theme protocol.
- `WikiDirectory`: Recursive file tree with native Drag & Drop reorganization logic.
- `WikiIndex`: The collective reef catalog with category landing pages.
- `ArticleView`: Knowledge shell with LLM synthesis, wiki-link processing, and Citation element.
- `IngestZone`: Information DNA synthesis portal with drag & drop processing surface.
- `LogTerminal`: Shell telemetry and operational CLI logs.
- `MaintenanceZone`: System "Shipyard" for LLM self-healing, linting, and Manual Mode enforcement.
- `GraphView`: Interactive topology visualizer (D3-powered) for semantic relationship mapping.
- `GitHistory`: Timeline visualization of the reef's evolution.

## ⚙️ Core Engines
- `Molt Engine`: Manages the API handshakes and data state transitions.
- `Manual Protocol`: Master override system to disable automated LLM intervention.

Maintained by CrustAgent©™
