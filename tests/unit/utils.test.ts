import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// We will test the API functionality by replicating the routes here or importing them.
// Since server.ts directly creates and starts the app, we can test the `parseCrustMarkdown` function
// and some core logic by directly implementing tests for them.

const parseCrustMarkdown = (fileContent: string) => {
  let content = fileContent;
  let metadata: any = { tags: [], links: [], externalUrls: [] };
  
  if (content.startsWith('---\n')) {
    const endMetaIndex = content.indexOf('\n---\n', 4);
    if (endMetaIndex !== -1) {
      const metaStr = content.slice(4, endMetaIndex);
      content = content.slice(endMetaIndex + 5);
      
      metaStr.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          let value = line.slice(idx + 1).trim();
          
          if (value.startsWith('[') && value.endsWith(']')) {
            const arr = value.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
            metadata[key] = arr;
          } else if (key === 'confidence') {
            metadata[key] = parseFloat(value);
          } else {
            metadata[key] = value.replace(/^"|"$/g, '');
          }
        }
      });
    }
  }
  return { metadata, content };
};

describe('Core Logic Tests', () => {
  describe('parseCrustMarkdown', () => {
    it('should parse valid frontmatter with arrays and strings', () => {
      const markdown = `---\ntitle: "Test Title"\ntype: "concept"\ntags: ["test", "jest"]\nconfidence: 0.95\n---\n# Content here`;
      const { metadata, content } = parseCrustMarkdown(markdown);
      
      expect(metadata.title).toBe("Test Title");
      expect(metadata.type).toBe("concept");
      expect(metadata.tags).toEqual(["test", "jest"]);
      expect(metadata.confidence).toBe(0.95);
      expect(content).toBe("# Content here");
    });

    it('should handle markdown without frontmatter smoothly', () => {
      const markdown = `# Just Content\nNo frontmatter here.`;
      const { metadata, content } = parseCrustMarkdown(markdown);
      
      expect(metadata.tags).toEqual([]); // defaults
      expect(content).toBe(markdown);
    });

    it('should handle missing values or empty arrays', () => {
      const markdown = `---\ntitle: "No Tags"\ntags: []\n---\nBody`;
      const { metadata, content } = parseCrustMarkdown(markdown);
      
      expect(metadata.tags).toEqual([]);
      expect(metadata.title).toBe("No Tags");
      expect(content).toBe("Body");
    });
  });
});
