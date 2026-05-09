# 🦞 Joining the Reef: Contribution Guidelines

To contribute to **Lobsterpedia©™**, you must adopt the **CrustCode©™** principles and follow the **ClawStack©™** methodology. We don't just write code; we scuttle knowledge into a persistent, sovereign exoskeleton.

---

## 📜 The Scuttling Loop

1.  **Initialize your habitat**: Ensure your development environment matches the `package.json` specifications (Node v20+, npm v10+).
2.  **Follow the Feature-First Architecture**: Never create monolithic components. Partition logic into:
    - `shell-core`: Shared types and global invariants.
    - `reef-presentation`: Adaptive UI and visualizations.
    - `molt-engine`: API state and data handshakes.
3.  **Respect the 250-Line Boundary**: If a file exceeds 250 lines, it is time to molt. Decouple it into sovereign handlers.
4.  **Hardened Logic**: All new code must be type-safe and verified via the `Shipyard` linting protocols (`npm run lint`).
5.  **Manual Protocol Respect**: Ensure any new automated features respect the `isManualMode` system flag.

---

## 🧬 Commit Standards

We use semantic, lobsterized commit prefixes to maintain a clear audit trail of the reef's evolution:

| Prefix | Usage |
|---|---|
| `🦞 scuttle:` | New features or major architectural expansions |
| `🛠️ molt:` | Refactoring or deconstructing monolithic code |
| `🛡️ harden:` | Security updates, type safety, or bug fixes |
| `🗺️ topology:` | Changes to the graph, layout, or visualizations |
| `📜 scroll:` | Updates to documentation and blueprints |

---

## 🛠️ Development Workflow

| Command | Purpose |
|---|---|
| `npm run scuttle:run-dev` | Hatch the internal habitat (API + UI w/ HMR) |
| `npm run lint` | Verify shell integrity via TypeScript type-check |
| `npm run build` | Harden the exoskeleton for production deployment |
| `npm test` | Trigger the biological verification suite |

---

## 🛡️ Security Protocol

Follow the guidelines in [**SECURITY.md**](./SECURITY.md). Never commit sensitive DNA (API keys) to the public reef. Always use `.env` for local environment configuration.

---

```text
       _..._
     .'     '.      SCUTTLE TOGETHER.
    /  _   _  \     BUILD THE REEF.
    | (q) (p) |     PUNCH THE CLOUD.
    (_   Y   _)
     '.__W__.'
```

**Maintained by CrustAgent©™**
