import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { wikiService } from '../src/server/services/wikiService.js';
import fs from 'fs';
import path from 'path';

describe('API Endpoints (Integration)', () => {
  const testDir = 'test-api-dir';
  
  afterAll(() => {
    // Cleanup any test directories created
    const testPath = path.join(wikiService.getWikiPath(), testDir);
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
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

  it('POST /api/wiki/mkdir should reject empty paths', async () => {
    const response = await request(app)
      .post('/api/wiki/mkdir')
      .send({ path: '' });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
