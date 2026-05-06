import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';

describe('API Key Isolation Security Invariants', () => {
  it('GET /api/wiki/health should not leak API keys in the response', async () => {
    const response = await request(app).get('/api/wiki/health');
    const responseStr = JSON.stringify(response.body);
    
    expect(responseStr).not.toContain('sk-or-');
    expect(responseStr).not.toContain(process.env.OPENROUTER_API_KEY || 'MISSING_KEY');
    expect(responseStr).not.toContain(process.env.GEMINI_API_KEY || 'MISSING_KEY');
  });

  // Verify that the AI endpoints return 401/403 or specific errors if no key is provided,
  // or that they don't echo the key back if they fail.
  it('POST /api/wiki/synthesize should not leak API keys on failure', async () => {
    // Intentionally send a bad request
    const response = await request(app)
      .post('/api/wiki/synthesize')
      .send({ prompt: '' });
      
    const responseStr = JSON.stringify(response.body);
    expect(responseStr).not.toContain('sk-or-');
    expect(responseStr).not.toContain(process.env.OPENROUTER_API_KEY || 'MISSING_KEY');
  });
});
