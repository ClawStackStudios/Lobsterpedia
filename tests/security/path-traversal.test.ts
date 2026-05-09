import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

const TEST_WIKI_PATH = path.join(process.cwd(), 'tests/test-wiki/path-traversal');

describe('Path Traversal Security Invariants', () => {
  const testDir = 'test-security-dir';
  let app: any;
  let wikiService: any;

  beforeAll(async () => {
    // Set test wiki path and force fresh module evaluation
    process.env.WIKI_PATH = TEST_WIKI_PATH;
    vi.resetModules();
    const appMod = await import('../../src/server/app.js');
    const svcMod = await import('../../src/server/services/wikiService.js');
    app = appMod.app;
    wikiService = svcMod.wikiService;
  });

  afterAll(() => {
    // Clean up any rogue artifacts created during testing so the wiki directory remains sacred
    const testPath = path.join(TEST_WIKI_PATH, testDir);
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
    }
    // Clean up the entire test wiki directory
    if (fs.existsSync(TEST_WIKI_PATH)) {
      fs.rmSync(TEST_WIKI_PATH, { recursive: true, force: true });
    }
  });

  it('POST /api/wiki/mkdir should reject paths outside the wiki root', async () => {
    const response = await request(app)
      .post('/api/wiki/mkdir')
      .send({ path: '../malicious-dir' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Path traversal detected');
  });

  it('POST /api/wiki/save should reject paths outside the wiki root', async () => {
    const response = await request(app)
      .post('/api/wiki/save')
      .send({
        id: `../${testDir}/malicious-file`,
        title: 'Malicious',
        content: 'Malicious content',
        type: 'concept'
       });

    // The save endpoint sanitizes the ID, stripping `../`.
    // It becomes `test-security-dir/malicious-file` and saves safely inside the test wiki.
    expect(response.status).toBe(200);
    expect(response.body.id).toContain('malicious-file');

    // Verify the file was created inside the test wiki, NOT the real wiki
    const testWikiFile = path.join(TEST_WIKI_PATH, `${testDir}/malicious-file.md`);
    const realWikiFile = path.join(process.cwd(), 'wiki', `${testDir}/malicious-file.md`);
    expect(fs.existsSync(testWikiFile)).toBe(true);
    expect(fs.existsSync(realWikiFile)).toBe(false);
  });

  it('POST /api/wiki/move should reject moving files outside the wiki root', async () => {
    const response = await request(app)
      .post('/api/wiki/move')
      .send({ oldPath: 'index', newPath: '../malicious-index' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  });
});
