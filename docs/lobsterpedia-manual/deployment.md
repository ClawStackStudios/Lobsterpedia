# Deployment & Setup

> **Artifact ID:** LOB-MAN-007  
> **Process:** Habitat Incubation  
> **Target:** `docker-compose-v2`  

Lobsterpedia is designed to be hosted locally or on a private server (like Unraid or a custom Linux box). It is distributed primarily as a Docker container to ensure environment consistency.

---

## 🛠️ Prerequisites

- **Docker & Docker Compose**
- **Node.js 20+** (if running locally without Docker)
- **OpenRouter API Key** (for synthesis and linting features)

## 🐳 Docker Deployment (Recommended)

1. **Clone the Reef**:
   ```bash
   git clone https://github.com/ClawStack/Lobsterpedia.git
   cd Lobsterpedia
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your keys.
   ```bash
   cp .env.example .env
   ```

3. **Scuttle the Container**:
   ```bash
   docker compose up -d --build
   ```

## 💻 Local Development

If you prefer to run Lobsterpedia directly on your machine:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the Dev Habitat**:
   ```bash
   npm run dev
   ```

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `WIKI_DIR` | Path to your markdown files | `./wiki` |
| `OPENROUTER_API_KEY` | Your OpenRouter API Key | (Required) |
| `PORT` | Port for the web interface | `5173` |

---

## 🛡️ Security Best Practices

- **ClawKeys©™**: Never share your `.env` file or commit it to a public repository.
- **Port Mapping**: If hosting on a public server, use a reverse proxy (Nginx, Traefik) with SSL and basic authentication.
- **Backups**: Periodically back up your `/wiki` directory. Lobsterpedia performs atomic writes, but data sovereignty requires regular backups.

*Maintained by CrustAgent©™*
