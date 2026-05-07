---
Brand: ClawStack Studios©™
Project: Lobsterpedia©™
Maintainer: CrustAgent©™
---

# 🦞 Lobsterpedia©™: Technical Heart

This directory contains the presentation logic, state orchestrations, and visualization engines for the **Lobsterpedia Habitat**.

## 🏗️ Technical Topology

The codebase is partitioned into discrete feature domains to prevent monolithic drift:
- `shell-core`: Shared types, constants, and global system invariants.
- `reef-presentation`: Adaptive UI components (Motion, D3, Tailwind 4).
- `molt-engine`: API state management and asynchronous data handshakes.
- `services`: The "Reef Mind" (DbService, WikiService, DreamerService, PromptManager).

## 🦞 CrustCode©™ Patterns

- **Scientific Observation Aesthetic**: High-fidelity, monospaced interfaces (JetBrains Mono) with **Lobster Red** accents (`#E63946`) and **Bone White** focused states.
- **Immersive Topology**: Dedicated D3 physics simulation with density-optimized clustering and bioluminescent pulse effects.
- **Protocol Partitions**: Strict enforcement of the `isManualMode` state to isolate automated side-effects from human workflows.
- **Atomic File Operations**: Renaming and moving operations use safe, non-destructive FS primitives to ensure no orphaned PolyPs.
- **Feature-Sliced Navigation**: Recursive, folder-aware directory trees with native drag & drop support.

### 🛡️ Maintenance Invariants
- **No Hard Refreshes**: UI buttons for maintenance MUST be `type="button"` to avoid form-like reloads in the habitat.
- **Watcher Discipline**: The Vite HMR watcher MUST ignore `wiki/`, `carapace/`, and `src/server/db/`. Failure to do this causes a reload loop when the agent modifies the reef.
- **Sequential Fixes**: `handleFixAll` must sequence its `handleFixIssue` calls to prevent filesystem locks.

### 🧬 Persistence Invariants
- **Parameter Parity**: Use `model` in API payloads consistently.
- **Environment Parity**: Always provide `VITE_DEFAULT_OPENROUTER_MODEL` for the UI and `DEFAULT_OPENROUTER_MODEL` for the server.
- **Ledger Resilience**: If the Ledger is dormant (`HATCH_DATABASE=false`), components must gracefully fallback to environment defaults.
- **The Sovereign Voice**: High-fidelity prompt engineering via `PromptManager.ts` that implements the multi-disciplinary "Poly-Lobster" persona.
- **Machine Subconscious (The Carapace)**: A dedicated 3-phase background pipeline for autonomous thematic synthesis and promotion.

## 🧬 Data Flow (The Scuttle Cycle)

1. **Ingestion**: Raw DNA (Text, PDF, Docx) is normalized in `IngestZone`.
2. **Synthesis**: LLM request triggered via `apiService` (OpenRouter Handshake).
3. **Persistence**: Synthesized markdown is scuttled to the `/wiki` volume.
4. **Rescan**: Global reef state is refreshed, updating the directory tree and graph topology.

## 🛡️ Epistemic Framing
Every code modification must be verified against the project's invariants. We prefer **rigorous type-safety** and **declarative logic** over imperative hacks. If the logic is opaque, it is not CrustCode©™.

## 🛠️ Internal Skills Reference
- [**crust-code**](../.crustagent/skills/crust-code/) - The law of the shell.
- [**scuttle-scripts**](../.crustagent/scuttle-scripts/) - The tools of the molt.

---
**Maintained by CrustAgent©™**
[Status: FULLY_SCUTTLED]
