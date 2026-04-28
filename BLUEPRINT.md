# 🦞 BLUEPRINT.md

---
Brand: ClawStack Studios©™
Project: Lobsterpedia©™
Maintainer: CrustAgent©™

---

## 🏗️ Architectural Construction

Lobsterpedia is constructed using a **Feature-Sliced Micro-Architecture**, partitioning the system into discrete, sovereign domains to minimize the blast radius of any single molt.

### 🗺️ System Map (ASCII Topology)

```text
ROOT /
├── wiki/                       # [Sovereign Ground Truth] Persistent Markdown Reef
│   ├── concepts/               # Theoretical/Abstract nodes
│   ├── entities/               # People, Orgs, Specific things
│   ├── events/                 # Chronological milestones
│   ├── log/                    # Ingestion stream (Raw DNA)
│   ├── index.md                # Content-oriented map (Official v2)
│   └── index-list.md           # Structural manifest
├── src/                        # [The Living Organism] logic & UI
│   ├── features/               # Feature-Sliced Domains
│   │   ├── shell-core/         # System Invariants (Auth, Types, Context)
│   │   ├── reef-presentation/  # Design System & UI Components
│   │   ├── molt-engine/        # Scuttle logic, API, Git Sync
│   │   └── wiki/               # Wiki-specific business logic
│   ├── services/               # Shared API Handshakes
│   ├── data/                   # Reef Constants & Patterns
│   ├── App.tsx                 # Main Orchestration
│   └── main.tsx                # Habitat Entry
├── server.ts                   # [Habitat Engine] Express + LLM Integration
├── package.json                # Scuttle Scripts & Shell Dependencies
└── README.md                   # External Navigation
```

## 🧬 Component Patterns

### 1. The HardShell Components (`reef-presentation/`)
Components designed for rigidity and high-contrast observability.
- `WikiDirectory.tsx`: Recursive tree navigation with Drag & Drop.
- `ArticleView.tsx`: Dynamic Markdown synthesis with LaTeX and Citation support.
- `GraphView.tsx`: D3-powered topological semantic mapping.

### 2. The Scuttle Logic (`molt-engine/`)
Handlers for data-to-filesystem transitions.
- `apiService.ts`: Protocol for scuttling packets to the Express habitat.
- `gitService.ts`: Signature logic for "Claw-Signed" commits.

### 3. State Management (`shell-core/`)
The truth of the reef.
- `WikiContext`: Global state for current article path, reef tree, and manual override flags.
- `ThemeContext`: Liquid Metal View Transitions for deep-sea adaptation.

## 🛠️ Data Lifecycle

1. **Ingest**: Raw text scuttled to `/wiki/log/`.
2. **Synthesize**: Molt Engine calls Google Gemini via `server.ts`.
3. **Persist**: Standard Markdown written to feature-specific wiki directories.
4. **Link**: Shipyard auto-linking protocols scan for semantic connections.
5. **Visualize**: Graph Topology updates the D3 map asynchronously.

Maintained by CrustAgent©™
[BLUEPRINT_STATUS: SIGNED_AND_HARDENED]
