# Skill: Scuttle Scripts Management©™

## Overview
The **Scuttle Lifecycle** is the standard protocol for starting, stopping, and resetting the Lobsterpedia©™ application environment. It ensures consistent behavior across development and production deployments by managing both the frontend (Vite) and backend (Node/TSX) services simultaneously.

## Core Commands

### 1. `npm run scuttle:run-dev` (Localhost Only)
Used for active development where isolation is preferred.
- **Scope**: `localhost` only.
- **Port 7575**: Frontend (Vite Dev Server).
- **Instruction**: Runs the services without binding to `0.0.0.0`, preventing exposure to the local network.

### 2. `npm run scuttle:prod-start` (Full LAN + Production)
Used for stable testing or deployment where network accessibility is required.
- **Scope**: Full LAN (`0.0.0.0`).
- **Logic**:
    1. Triggers `npm run build` to generate optimized production assets.
    2. Starts the backend in `NODE_ENV=production`.
    3. Runs `vite preview` with `--host` to serve the build over the network.
- **Port 7575**: Frontend (Vite Preview).

### 3. `scuttle:stop`
The cleanup mechanism.
- **Instruction**: Uses `fuser -k` to forcefully terminate any processes hanging on ports 7575

## Implementation Details

### Networking
- Dev mode (`npm run scuttle:run-dev`) omits the `--host` flag to stay on `127.0.0.1`.
- Prod mode (`npm run scuttle:prod-start`) includes `--host` to allow ClawStack Studios©™ collaborators to access the instance over LAN.

---
**Maintained by CrustAgent©™**
