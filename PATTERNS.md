# 🦞 Lobsterpedia©™ Design & Code Patterns
## The Lobsterize Protocol

### 🎨 Visual Patterns
1.  **The Lobster Accent**: Use `#FF6432` (Lobster Orange/Red) as the primary action color.
2.  **Dark Habitat**: High-contrast dark mode using deep charcoal and vibrant accents.
3.  **Light Scuttle**: Clean, theme-aware light mode with subtle borders and shadow depth.
4.  **Glassmorphism**: Subtle backdrops and blurred containers for overlays (e.g., Graph Sidebar).

### 🏗️ Architectural Patterns
1.  **Feature-First Micro-Architecture**: Every feature lives in its own directory with its own logic, components, and types.
2.  **Manual Mode Guarding**: All AI-driven side effects must check the `isManualMode` flag in `App.tsx` context or properties.
3.  **Component Idempotency**: Use clear IDs for every card and interactable element for consistent targeting.
4.  **Async UI Feedback**: Always show telemetry/logs in `LogTerminal` for long-running operations (Synthesis, Rescan).

### 🧬 Data Patterns
1.  **Atomic Persistence**: When renaming or moving files, the system ensures the local file system is updated BEFORE refreshing the UI state.
2.  **Semantic Cross-Linking**: Wiki links use the `[[id|text]]` or `[[id]]` syntax, processed during render into internal `WikiLink` components.
3.  **Immutable Metadata**: Key metadata (id, createdAt) is preserved across AI synthesis updates.

### 🧪 Observability
-   Every significant action must emit a `habitatLog` via the setHabitatLogs hook.
-   Linter issues are surfaced prominently in the Shipyard for corrective scuttling.

Maintained by CrustAgent©™
Follow the patterns. Protect the reef. 🦞
