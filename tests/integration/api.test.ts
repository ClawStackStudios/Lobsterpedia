import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const TEST_WIKI_PATH = path.join(process.cwd(), 'tests/test-wiki/api');

describe('API Endpoints (Integration)', () => {
  const testDir = 'test-api-dir';
  let app: any;
  let wikiService: any;

  beforeAll(async () => {
    process.env.WIKI_PATH = TEST_WIKI_PATH;
    vi.resetModules();
    const appMod = await import('../../src/server/app.js');
    const svcMod = await import('../../src/server/services/wikiService.js');
    app = appMod.app;
    wikiService = svcMod.wikiService;
  });

  afterAll(() => {
    try {
      const testPath = path.join(TEST_WIKI_PATH, testDir);
      if (fs.existsSync(testPath)) {
        fs.rmSync(testPath, { recursive: true, force: true });
      }
      if (fs.existsSync(TEST_WIKI_PATH)) {
        fs.rmSync(TEST_WIKI_PATH, { recursive: true, force: true });
      }
    } catch {
      // Directory may already be removed
    }
  });

  it('GET /api/wiki/health should return status shellHardened', async () => {
    const response = await request(app).get('/api/wiki/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'shellHardened');
    expect(response.body).toHaveProperty('message', 'Habitat is stable.');
  });

  it('GET /api/wiki/files should return the reef catalog', async () => {
    const response = await request(app).get('/api/wiki/files');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reef');
    // We expect at least the 'index' page to exist as per the seed
    expect(response.body.reef).toHaveProperty('index');
  });

  it('POST /api/wiki/mkdir should safely create a directory', async () => {
    const response = await request(app)
      .post('/api/wiki/mkdir')
      .send({ path: testDir });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    
    const dirExists = fs.existsSync(path.join(wikiService.getWikiPath(), testDir));
    expect(dirExists).toBe(true);
  });
});
