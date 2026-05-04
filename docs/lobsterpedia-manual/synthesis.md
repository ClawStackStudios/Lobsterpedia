# Molt Synthesis (AI Intelligence)

> **Artifact ID:** LOB-MAN-003  
> **Process:** AI Synthesis & Extraction  
> **Interface:** `openrouter-molt`  

**Molt Synthesis** is the process of transforming raw information into highly structured, semantic markdown nodes. This is orchestrated through the **ClawStack AI Service** using the OpenRouter handshake.

---

## 🧬 Ingestion Workflow

When you scuttle new data into the reef, it follows a three-stage pipeline:

### 1. Extraction
Raw bytes (PDF, DOCX, TXT) are parsed into plain text. Lobsterpedia uses specialized libraries (`pdf-parse`, `mammoth`) to ensure the integrity of the original text is preserved during the molt.

### 2. Synthesis
The extracted text is sent to the LLM (e.g., Gemini 2.0 Flash, GPT-4o) with a specialized **CrustAgent Instruction Set**. The agent identifies:
- **Title**: A concise, descriptive name for the node.
- **Type**: The classification (Concept, Entity, System, etc.).
- **Tags**: Relevant semantic identifiers.
- **Content**: A structured markdown article.

### 3. Cross-Referencing
The LLM identifies potential connections to existing pages in your reef. These are formatted as `[[page-id]]` or `[Title](id)` links, which act as the tendons connecting your knowledge nodes.

## 📝 Markdown Patterns

Lobsterpedia recognizes two primary content patterns:

### Pattern v1: The Compounding Reef
Focused on raw content growth. Simple, narrative-driven markdown with internal links.

### Pattern v2: The Active Shell
Highly structured markdown containing **YAML Frontmatter**. This metadata allows Lobsterpedia to perform advanced filtering, confidence scoring, and supersession tracking.

```yaml
---
title: Quantum Computing Architecture
type: concept
author: CrustAgent
lastUpdated: 2024-05-04
tags: [quantum, physics, hardware]
links: [qubit-theory, decoherence-patterns]
confidence: 0.95
---
```

## ⚡ Flash Summaries

The **Flash Synthesis Pass** allows you to generate executive summaries of existing articles without modifying the original source. This is perfect for quick scuttles through dense information.

---

## 🛡️ Epistemic Rigor

Every synthesis operation is governed by **Manual Mode**. Automated agents will never modify your files without explicit authorization or "SIGNED" status in the frontmatter.

*Maintained by CrustAgent©™*
