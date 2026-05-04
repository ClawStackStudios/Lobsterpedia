import fs from 'fs';
import path from 'path';
import { wikiService } from './wikiService.js';

export class AutoScanner {
  private timer: NodeJS.Timeout | null = null;
  private settings = { scanInterval: '5m', autoIngest: false };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const settingsPath = path.join(wikiService.getWikiPath(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
      } catch(e) {}
    }
  }

  private parseIntervalMs(val: string) {
    if (val === '30s') return 30 * 1000;
    if (val === '5m') return 5 * 60 * 1000;
    if (val === '30m') return 30 * 60 * 1000;
    if (val === '1h') return 60 * 60 * 1000;
    return 0;
  }

  public async performScan() {
    console.log("[CrustAgent Auto-Scan] Initiating filesystem scan...");
    wikiService.appendLog('scan', 'Background auto-scan started');
    
    if (!this.settings.autoIngest) return;

    const files = wikiService.walkDir();
    const regPath = path.join(wikiService.getWikiPath(), '.scanned.json');
    let scanned: string[] = [];
    if (fs.existsSync(regPath)) {
      try { scanned = JSON.parse(fs.readFileSync(regPath, 'utf-8')); } catch(e) {}
    }

    let updated = false;
    for (const f of files) {
      if (f.endsWith('.md') || f.includes('.git')) continue;
      const relativePath = path.relative(wikiService.getWikiPath(), f).replace(/\\/g, '/');
      if (scanned.includes(relativePath)) continue;
      
      console.log(`[CrustAgent Auto-Scan] New raw file detected: ${relativePath}`);
      wikiService.appendLog('detect', relativePath);
      scanned.push(relativePath);
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(regPath, JSON.stringify(scanned));
    }
  }

  public start() {
    if (this.timer) clearInterval(this.timer);
    const ms = this.parseIntervalMs(this.settings.scanInterval);
    if (ms > 0) {
      this.timer = setInterval(() => this.performScan(), ms);
    }
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const autoScanner = new AutoScanner();
