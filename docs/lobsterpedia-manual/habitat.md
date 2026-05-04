# The Habitat Engine (FS Integration)

> **Artifact ID:** LOB-MAN-002  
> **Process:** Filesystem Scuttling  
> **Sub-system:** `chokidar-engine`  

The **Habitat Engine** is the foundational layer of Lobsterpedia. It provides a direct, non-destructive link between the application interface and the physical markdown files stored in your `/wiki` directory.

---

## 📂 The Directory Structure

Lobsterpedia enforces a **Pattern v2: Active Shell** structure. While you can store files anywhere, the engine is optimized for the following layout:

```text
/wiki
├── concepts/       # Abstract theoretical nodes
├── entities/       # People, organizations, specific entities
├── events/         # Historical or future markers
├── references/     # Source materials and raw data refs
├── log/            # The chronological ingestion stream
└── index.md        # The thematic hub of the reef
```

## 🛰️ Real-time Synchronization

The engine uses a background **SSE (Server-Sent Events)** watcher.
- **Watching**: When you edit a file in an external editor, the `chokidar` watcher detects the `change` event.
- **Broadcasting**: The server broadcasts the update to all connected Lobsterpedia clients.
- **Re-rendering**: The UI instantly refreshes the active ArticleView or GraphView to reflect the new state.

## ⚓ Atomic Operations

To prevent "shell cracking" (data loss), all filesystem operations in Lobsterpedia are atomic:
- **Rename**: When renaming a file via the UI, Lobsterpedia performs a safe move operation and updates internal state tracking.
- **Delete**: Deletion moves files to a secondary "Waste Reef" or deletes them permanently, depending on configuration, while ensuring the Graph topology is updated.
- **Drag & Drop**: Moving files between folders in the UI directly mirrors the movement in your local directory.

---

## 🛠️ Configuration

You can configure the habitat path in your `.env` file:

```env
WIKI_DIR=./wiki
```

Ensure the user running the application has read/write permissions to this directory to maintain a stable scuttle.

*Maintained by CrustAgent©™*
