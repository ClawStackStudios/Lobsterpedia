import { simpleGit, SimpleGit, StatusResult } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { wikiService } from './wikiService.js';

export class GitService {
  private git: SimpleGit;
  private wikiPath: string;

  constructor(wikiPath: string) {
    this.wikiPath = wikiPath;
    this.git = simpleGit(wikiPath);
  }

  public async isInitialized(): Promise<boolean> {
    try {
      const gitPath = path.join(this.wikiPath, '.git');
      return fs.existsSync(gitPath) && fs.lstatSync(gitPath).isDirectory();
    } catch (err) {
      return false;
    }
  }

  public async init(): Promise<void> {
    if (!(await this.isInitialized())) {
      // Ensure we are initializing the CORRECT directory
      await this.git.init();
      
      const readmePath = path.join(this.wikiPath, 'README.md');
      if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(readmePath, '# Lobsterpedia Wiki\nSovereign knowledge reef.');
      }
      
      // We must use the absolute path for the git dir to prevent climbing
      const gitDir = path.join(this.wikiPath, '.git');
      const workTree = this.wikiPath;
      
      await this.git.addConfig('core.autocrlf', 'input');
      await this.git.add('.');
      await this.git.commit('Initial molt: Repository hatched.');
    }
  }

  private async getIsolatedGit() {
    const isInit = await this.isInitialized();
    if (!isInit) return null;
    
    // Create a strictly isolated instance for this operation
    const gitDir = path.join(this.wikiPath, '.git');
    return simpleGit(this.wikiPath).customBinary('git').env('GIT_DIR', gitDir).env('GIT_WORK_TREE', this.wikiPath);
  }

  public async getHistory(limit: number = 50) {
    const isolated = await this.getIsolatedGit();
    if (!isolated) return [];
    
    try {
      const log = await isolated.log({ maxCount: limit });
      return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name
      }));
    } catch (err) {
      console.error('[GitService] Failed to fetch log:', err);
      return [];
    }
  }

  public async getStatusDetails(): Promise<StatusResult | null> {
    const isolated = await this.getIsolatedGit();
    if (!isolated) return null;
    
    try {
      return await isolated.status();
    } catch (err) {
      console.error('[GitService] Failed to fetch status:', err);
      return null;
    }
  }

  public async stage(file?: string): Promise<void> {
    const isolated = await this.getIsolatedGit();
    if (!isolated) return;
    
    if (file) {
      await isolated.add(file);
    } else {
      await isolated.add('.');
    }
  }

  public async unstage(file?: string): Promise<void> {
    const isolated = await this.getIsolatedGit();
    if (!isolated) return;
    
    if (file) {
      await isolated.reset(['--', file]);
    } else {
      await isolated.reset(['--']);
    }
  }

  public async commit(message: string, autoStage: boolean = false): Promise<void> {
    const isolated = await this.getIsolatedGit();
    if (!isolated) {
      throw new Error("Git repository not hatched. Please initialize versioning first.");
    }
    
    if (autoStage) {
      await isolated.add('.');
    }
    await isolated.commit(message);
  }
}

export const gitService = new GitService(wikiService.getWikiPath());
