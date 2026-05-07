---
Brand: ClawStack Studios©™
Project: Lobsterpedia©™
Maintainer: CrustAgent©™
---

# 🦞 Lobsterpedia©™: The Sovereign Knowledge Reef

**Lobsterpedia** is the definitive synthesis layer for raw information. It transforms a graveyard of unstructured files into a living, breathing reef of interconnected markdown concepts. This document serves as my high-level understanding of the project's soul and operational invariants.

### 🛡️ Hardened Maintenance Stability
- Maintenance "Fix" actions are now protected against unintended page reloads (type="button", preventDefault).
- Vite HMR is explicitly configured to ignore data directories (`wiki/`, `carapace/`, `db/`), preventing development loop interruptions during agent writes.
- Fix operations are batched/sequenced to avoid race conditions on the filesystem and ledger.
- AI Payload Parsing is hardened to handle markdown code blocks and conversational filler, ensuring stability for high-capacity models like **gpt-oss-120b**.

### 🏗️ Path-Aware Hierarchical Knowledge Graph
- The reef has transitioned from a flat file list to a **Category-First Hierarchy** (`concepts/`, `entities/`, etc.).
- **Smart Link Resolution**: The linter and UI resolve links using a three-tier priority: 
  1. **Exact ID Match** (canonical path)
  2. **Category-Relative Match** (relative to the current file)
  3. **Fuzzy Global Match** (finding the unique ID in any directory)
- This architecture ensures zero-drift connectivity and a 100% clean linter state (`{"issues": []}`).

## 🧬 Core Directives

- **Incremental Synthesis**: Never start from zero. Every new document adds a layer to the existing knowledge exoskeleton, building upon the reef's prior wisdom.
- **Directory Sovereignty**: The reef directory structure is user-navigable and reorganization-friendly. We respect the filesystem as the ultimate source of truth.
- **Topological Insight**: All concepts are nodes in a semantic mesh. The graph visualizer (and the new **Immersive Mode**) is the map of the collective mind.
- **Manual Protocol**: We respect human intent. If Manual Mode is active, agentic automation (synthesis, linting) must yield to human orchestration.
- **Epistemic Discipline**: We communicate with rigorous honesty. Measured confidence, deep reasoning, and parsimonious explanations are the requirements for every handshake.
- **Hardened Shell**: Security is not an afterthought. Smart CORS, Helmet-hardened headers, and Dockerized deployment ensure the habitat is secure in any environment.
- **The Sovereign Voice (Habitat Agent)**: Our LLM layer isn't a generic assistant. It is a **Master Wiki Habitat Scuttler**—a multi-disciplinary "Poly-Lobster" that combines the traits of the Scribe (narrative), Sentinel (security), Bolt (performance), Lock (persistence), and Palette (polish).
- **Memory Lifecycle (LLM Wiki v2)**: Knowledge in the reef is not static. We implement confidence scoring, supersession (newer facts refining older ones), and consolidation tiers (Episodic → Semantic) to prevent the wiki from rotting.

## 🛠️ Specialized Skills Library

I utilize the following hardened skills to maintain the habitat:

| Skill | Purpose |
|---|---|
| [**crust-code**](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/Lobsterpedia/Lobsterpedia/.crustagent/skills/crust-code/) | Standardized patterns, naming conventions, and the 250-line boundary. |
| [**cors-helmet-security**](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/Lobsterpedia/Lobsterpedia/.crustagent/skills/cors-helmet-proxy-security/) | Network hardening and CSP protocols for secure information ingestion. |
| [**scuttle-scripts**](file:///home/dietpi/Documents/workspace-lucas/projects/Agents/Lobsterpedia/Lobsterpedia/.crustagent/scuttle-scripts/) | Utilities for removing technical debt and managing the "Molt" lifecycle. |

## 📍 Operational Status
- **Phase**: BETA
- **Topology**: Feature-Sliced Micro-Architecture
- **Integrity**: SIGNED_AND_HARDENED

---

```text
       _..._
     .'     '.      HATCH THE REEF.
    /  _   _  \     SCUTTLE DATA.
    | (q) (p) |     PUNCH THE CLOUD.
    (_   Y   _)
     '.__W__.'
```

## 3. The Carapace Dreaming Layer (Autonomous Synthesis)
The **Carapace** is an autonomous background engine that reads the Ledger, synthesizes themes, and promotes high-value insights into a sandboxed `carapace/` directory.

- **Phase 1: Shell Inspection (Light Sleep)**
  The engine scans the Molt Ledger for recent activity, identifying "Hot Pearls", "Islands", and "Low Confidence" nodes.
- **Phase 2: Tidal Dreaming (REM Sleep)**
  The engine uses an LLM to reflect on the staged candidates, identifying cross-cutting themes, contradictions, and knowledge gaps.
  Candidates are strictly gated using a **6-signal weighted formula** (Molt Frequency, Link Relevance, Author Diversity, Recency, Consolidation, Conceptual Richness). Only candidates that pass `minScore >= 0.6` and `minMoltCount >= 3` are promoted to immutable `carapace/insights/` files.
- **Sovereign Reflection**: During the REM phase, the agent identifies **Typed Relationships** (supersedes, reinforces, contradicts) and assigns **Confidence Scores** to every synthesized theme, which are persisted in the Sovereign Ledger.

*Constraint:* The Carapace output directory is strictly excluded from `autoScanner` witnessing to prevent runaway feedback loops.

---

**Maintained by CrustAgent©™**
