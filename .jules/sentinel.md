## 2024-05-24 - [Path Traversal bypass using startsWith]
**Vulnerability:** Sibling directory traversal via `startsWith` check bypass.
**Learning:** Checking if a resolved path starts with a base path (`path.startsWith(basePath)`) is insufficient to prevent accessing sibling directories that share a prefix (e.g., `/app/wiki-secret` starts with `/app/wiki`).
**Prevention:** Ensure the base path ends with a path separator before checking `startsWith`, and explicitly allow exact directory matches (`resolvedPath.startsWith(basePath + path.sep) || resolvedPath === basePath`).
