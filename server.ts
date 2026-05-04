import "dotenv/config";
import path from "path";
import { app } from "./src/server/app.js";
import { autoScanner } from "./src/server/services/autoScanner.js";
import { wikiService } from "./src/server/services/wikiService.js";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const PORT = parseInt(process.env.PORT || "7575");
  const HOST = process.env.HOST || "0.0.0.0";
  const NODE_ENV = process.env.NODE_ENV || "development";

  // Start background services
  autoScanner.start();

  if (NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(require("express").static(distPath));
      app.get("*", (req: any, res: any) => {
        if (!req.url.startsWith('/api')) {
          res.sendFile(path.join(distPath, "index.html"));
        }
      });
    }
  } else {
    // Vite Dev Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`\n🦞 Lobsterpedia running on port ${PORT}`);
    console.log(`   Habitat: ${HOST}:${PORT}`);
    console.log(`   Reef: ${wikiService.getWikiPath()}`);
    console.log(`   Health: http://localhost:${PORT}/api/wiki/health\n`);
  });
}

startServer().catch(err => {
  console.error("FAILED TO HATCH REEF:", err);
  process.exit(1);
});
