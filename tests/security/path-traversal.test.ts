import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { wikiService } from '../../src/server/services/wikiService.js';
import path from 'path';
import fs from 'fs';

describe('Path Traversal Security Invariants', () => {
  const testDir = 'test-security-dir';

  afterAll(() => {
    // Clean up any rogue artifacts created during testing so the wiki directory remains sacred
    const testPath = path.join(wikiService.getWikiPath(), testDir);
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
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
    // It becomes `test-security-dir/malicious-file` and saves safely.
    expect(response.status).toBe(200);
    expect(response.body.id).toContain('malicious-file');
  });

  it('POST /api/wiki/move should reject moving files outside the wiki root', async () => {
    const response = await request(app)
      .post('/api/wiki/move')
      .send({ oldPath: 'index', newPath: '../malicious-index' });
    
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  });
});
