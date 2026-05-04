import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

const TEST_WIKI_PATH = path.join(process.cwd(), 'tests/test-wiki');

// Stub environment before any logic runs
process.env.WIKI_PATH = TEST_WIKI_PATH;

describe('Topological Integrity Integration', () => {
  let app: any;
  let wikiService: any;

  beforeAll(async () => {
    // Clean start
    if (fs.existsSync(TEST_WIKI_PATH)) {
      fs.rmSync(TEST_WIKI_PATH, { recursive: true, force: true });
    }
    
    // Import after environment is set
    const appModule = await import('../../src/server/app.js');
    const serviceModule = await import('../../src/server/services/wikiService.js');
    app = appModule.app;
    wikiService = serviceModule.wikiService;
  });

  afterAll(() => {
    // Cleanup test reef
    if (fs.existsSync(TEST_WIKI_PATH)) {
      fs.rmSync(TEST_WIKI_PATH, { recursive: true, force: true });
    }
  });

  it('should maintain topological integrity when a new page is saved', async () => {
    const payload = {
      id: 'concepts/test-pearl',
      title: 'Test Pearl',
      content: '# This is a test pearl\nInterconnected logic.',
      type: 'concept',
      author: 'Tester',
      tags: ['test', 'integrity'],
      links: ['index']
    };

    // 1. Save the page via API
    const response = await request(app)
      .post('/api/wiki/save')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // 2. Verify file persistence
    const filePath = path.join(TEST_WIKI_PATH, 'concepts/test-pearl.md');
    expect(fs.existsSync(filePath)).toBe(true);

    const savedContent = fs.readFileSync(filePath, 'utf-8');
    expect(savedContent).toContain('title: "Test Pearl"');
    expect(savedContent).toContain('tags: ["test", "integrity"]');

    // 3. Verify index-list.md update (Topological Integrity)
    const indexPath = path.join(TEST_WIKI_PATH, 'index-list.md');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    expect(indexContent).toContain('[Test Pearl](concepts/test-pearl)');
    expect(indexContent).toContain('(concept): This is a test pearl...');

    // 4. Verify category index exists
    const catIndexPath = path.join(TEST_WIKI_PATH, 'concepts/concepts-index.md');
    expect(fs.existsSync(catIndexPath)).toBe(true);
  });
});
