import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitService } from '../../src/server/services/gitService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('GitService', () => {
  let tempDir: string;
  let gitService: GitService;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `lobster-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    gitService = new GitService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should not be initialized initially', async () => {
    const isInit = await gitService.isInitialized();
    expect(isInit).toBe(false);
  });

  it('should initialize successfully', async () => {
    await gitService.init();
    const isInit = await gitService.isInitialized();
    expect(isInit).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.git'))).toBe(true);
  });

  it('should stage files correctly', async () => {
    await gitService.init();
    const testFile = path.join(tempDir, 'test.md');
    fs.writeFileSync(testFile, 'test content');
    
    await gitService.stage('test.md');
    const status = await gitService.getStatusDetails();
    expect(status?.staged).toContain('test.md');
  });

  it('should stage all files when no file is specified', async () => {
    await gitService.init();
    fs.writeFileSync(path.join(tempDir, 'a.md'), 'a');
    fs.writeFileSync(path.join(tempDir, 'b.md'), 'b');
    
    await gitService.stage();
    const status = await gitService.getStatusDetails();
    expect(status?.staged).toContain('a.md');
    expect(status?.staged).toContain('b.md');
  });

  it('should unstage files correctly', async () => {
    await gitService.init();
    const testFile = path.join(tempDir, 'test.md');
    fs.writeFileSync(testFile, 'test content');
    
    await gitService.stage('test.md');
    await gitService.unstage('test.md');
    const status = await gitService.getStatusDetails();
    expect(status?.staged).not.toContain('test.md');
  });

  it('should throw error if committing without initialization', async () => {
    await expect(gitService.commit('test commit')).rejects.toThrow("Git repository not hatched");
  });

  it('should ignore parent repositories', async () => {
    // This test is tricky since we are already in a git repo
    // But our new isInitialized logic check for DIRECTORY existence in the specific path
    const isInit = await gitService.isInitialized();
    expect(isInit).toBe(false);
    
    const history = await gitService.getHistory();
    expect(history).toEqual([]);
  });
});
