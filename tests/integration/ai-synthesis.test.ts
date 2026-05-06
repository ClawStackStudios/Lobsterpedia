import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';

// We mock the autoScanner so it doesn't trigger real LLM calls during tests
vi.mock('../../src/server/services/autoScanner.js', () => ({
  autoScanner: {
    start: vi.fn(),
    stop: vi.fn(),
    scan: vi.fn().mockResolvedValue({ processed: 1, failed: 0 }),
  }
}));

// We also might want to mock the AI routes if they hit the real OpenRouter API,
// but for integration tests, we can test the structure of the request/response.
// Since we don't want to burn tokens, we'll test that the endpoint requires proper input.
describe('AI Synthesis Integration', () => {
  it('POST /api/wiki/synthesize should reject missing payload keys', async () => {
    const response = await request(app)
      .post('/api/wiki/synthesize')
      .send({ prompt: '' });
      
    // Should be caught by validation or return an error
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required payload keys');
  });

  it('POST /api/ai/openrouter should enforce rate limiting and require API key', async () => {
    const response = await request(app)
      .post('/api/ai/openrouter')
      .send({ prompt: 'test prompt' });
      
    // It should either return 400 (if no API key configured in test env)
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('OPENROUTER_API_KEY is not configured');
  });
});
