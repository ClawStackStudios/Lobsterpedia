import "dotenv/config";
import path from "path";
import express from "express";
import { app } from "./src/server/app.js";
import { autoScanner } from "./src/server/services/autoScanner.js";
import { wikiService } from "./src/server/services/wikiService.js";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import os from "os";

async function startServer() {
  const PORT = parseInt(process.env.PORT || "7575");
  const HOST = process.env.HOST || "0.0.0.0";
  const NODE_ENV = process.env.NODE_ENV || "development";

  // Start background services
  autoScanner.start();

  if (NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    const docsPath = path.join(process.cwd(), "docs");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    if (fs.existsSync(docsPath)) {
      app.use("/docs", express.static(docsPath));
    }
    
    app.get("*", (req: any, res: any) => {
      if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  } else {
    const docsPath = path.join(process.cwd(), "docs");
    app.use("/docs", express.static(docsPath));

    // Vite Dev Middleware
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: ['**/src/server/db/**', '**/carapace/**', '**/wiki/**', '**/docs/**']
        }
      },
      appType: "custom"
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, HOST, () => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    
    Object.values(interfaces).forEach(iface => {
      iface?.forEach(details => {
        if (details.family === 'IPv4') {
          // Only show all IPs if bound to 0.0.0.0, otherwise only show the specific host
          if (HOST === '0.0.0.0' || details.address === HOST) {
            addresses.push(details.address);
          }
        }
      });
    });

    console.log(`\n🦞 Lobsterpedia Habitat Hatchery`);
    console.log(`   Status: 🟢 ACTIVE`);
    console.log(`   Port:   ${PORT}`);
    console.log(`   Reef:   ${wikiService.getWikiPath()}`);
    console.log(`\n📡 Available Access Points:`);
    addresses.forEach(addr => {
      const label = addr === '127.0.0.1' ? 'Localhost' : 
                    addr.startsWith('100.') ? 'Tailscale' : 'LAN/Net';
      console.log(`   -> http://${addr}:${PORT} (${label})`);
    });
    console.log(`\n   Health: http://localhost:${PORT}/api/wiki/health\n`);
  });
}

startServer().catch(err => {
  console.error("FAILED TO HATCH REEF:", err);
  process.exit(1);
});
