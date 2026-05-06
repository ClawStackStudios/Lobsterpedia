/**
 * Managed by CrustAgent©™
 * Shell Service: AI Scuttle Layer
 * Handles generation via OpenRouter (Backend-Proxy)
 */

import { AIProvider } from "../features/shell-core/types";

class AIService {
  /**
   * Dispatches generation request to the OpenRouter provider.
   * @param prompt 
   * @param provider 
   * @param model Optional model string
   */
  async generateContent(prompt: string, _provider: AIProvider, model?: string): Promise<string> {
    // Provider: OpenRouter (via Secure Server Proxy)
    const res = await fetch('/api/ai/openrouter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || "OpenRouter scuttle failed at the proxy layer.");
    }
    
    // OpenRouter returns standard OpenAI schema: { choices: [{ message: { content: "..." } }] }
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content || "";
    }
    
    return data.text || "";
  }
}

export const aiService = new AIService();
