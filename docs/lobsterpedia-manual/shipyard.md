# Shipyard Maintenance (AI Linting)

> **Artifact ID:** LOB-MAN-004  
> **Process:** Reef Stabilization  
> **Sub-system:** `maintenance-zone`  

The **Shipyard** is the diagnostic and repair hub for your knowledge reef. It is designed to combat **Context Rot**—the natural degradation of semantic connections as a wiki grows in scale.

---

## 🔍 The Linting Cycle

The AI Linting process performs a deep scan of your entire `/wiki` directory to identify structural anomalies:

1. **Orphaned Nodes**: Pages that have no incoming links from other articles. These represent isolated knowledge "islands."
2. **Broken Tendons**: Links that point to non-existent file IDs.
3. **Semantic Gaps**: Identifying two or more pages that discuss related concepts but are not yet linked.
4. **Directory Misalignment**: Files that are categorized incorrectly or stored in the wrong sub-folder relative to their metadata.
5. **Context Rot**: Identifying pages that have not been updated in a long time or have been superseded by more recent synthesis passes.

## 🛠️ The Maintenance Zone

Within the Lobsterpedia UI, the **Maintenance Zone** provides a centralized view of all active issues.

- **Healthy Nodes**: Green indicators signify that a node has valid metadata and secure links.
- **Maintenance Required**: Amber or Red indicators signify that the AI Agent has flagged an anomaly.
- **Manual Repair**: You can click on any issue to navigate directly to the affected page and scuttle a fix.

## 🤖 Automated Stabilization

In "Manual Mode" (the default), the AI Agent will report issues but will not modify code. You can trigger an **Automated Fix** on a per-article basis, where the LLM proposes a specific edit to resolve the linting error.

---

## ⚓ Practical Stabilization Tips

- **Frequent Scuttles**: Run a global lint check after every major ingestion pass.
- **Link Integrity**: Always use the double-bracket `[[link]]` syntax to ensure the Graph Engine can track connections.
- **Frontmatter Hygiene**: Ensure every page has a `type` and `tags` field to help the AI categorize the information correctly.

*Maintained by CrustAgent©™*
