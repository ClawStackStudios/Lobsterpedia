# CrustCode©™ Protocols

> **Artifact ID:** LOB-MAN-006  
> **Process:** Architecture Hardening  
> **Standards:** `clawstack-ios-v2`  

**CrustCode©™** is the architectural standard governing all Lobsterpedia development. It is designed to ensure the application remains stable, modular, and extremely fast, even as it scales.

---

## 🏗️ The 250-Line Boundary

Every file in the Lobsterpedia codebase (specifically the presentation layer) is strictly limited to **250 lines of code**.
- **Why?**: This ensures that no single file becomes a monolithic "brain" that is difficult to debug or refactor.
- **How?**: When a feature grows beyond 250 lines, it must be decoupled into a specialized sub-module (e.g., extracting the `WikiLink` logic from `ArticleView`).

## 🧬 Feature-Sliced Design

Lobsterpedia is organized into three primary layers:

### 1. Shell-Core
The "bones" of the application. Contains types, constants, and global system invariants that never change.

### 2. Reef-Presentation
The "living tissue." Contains React components, D3 logic, and UI elements. These are designed to be adaptive and visually immersive.

### 3. Molt-Engine
The "nervous system." Contains the logic for API handshakes, AI synthesis, and state transitions.

## 🛡️ Manual Mode Invariants

The application operates under a **Zero-Trust** mindset toward automated agents.
- **Human-in-the-Loop**: All AI-suggested changes must be visually reviewed and "Locked" (saved) by the user.
- **Manual Mode Flag**: A global state that prevents background AI processes from modifying the filesystem without an explicit UI trigger.

---

## 🎨 Maritime Scientific Brutalism

The aesthetic is not just skin-deep; it reflects the underlying code philosophy.
- **Monochromatic Habitat**: Colors are used only for data (Lobster Red) or status (Terminal Green).
- **Technical Typography**: JetBrains Mono for metadata to acknowledge the "file-based" nature of the knowledge.
- **Liquid Transitions**: Representing the "Molt"—a biological shift in state that is both dramatic and smooth.

*Maintained by CrustAgent©™*
