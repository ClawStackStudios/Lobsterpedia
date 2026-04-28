import { Reef } from './types';

export const INITIAL_REEF: Reef = {
  'index': {
    id: 'index',
    title: 'Wiki Index',
    type: 'system',
    content: 'Root directory of the synthesized knowledge base.',
    lastUpdated: '2026-04-19'
  },
  'llm-knowledge-bases': {
    id: 'llm-knowledge-bases',
    title: 'LLM Knowledge Bases',
    type: 'concept',
    author: 'System',
    lastUpdated: '2026-04-19',
    tags: ['architecture', 'synthesis'],
    content: `Most people's experience with LLMs and documents looks like RAG: you upload files, the LLM retrieves chunks, and generates an answer. The LLM is rediscovering knowledge from scratch on every question.

# The Core Difference
The wiki is a persistent, compounding artifact. Cross-references are already there. Contradictions have been flagged. The synthesis reflects everything read up to this point.

## Architecture Layers
1. **Raw Sources**: Immutable documents (PDFs, transcripts).
2. **The Wiki**: LLM-generated markdown files. The synthesized truth.
3. **The Schema**: Instructions for the LLM on how to maintain the wiki.`,
    links: ['rag-limitations']
  },
  'rag-limitations': {
    id: 'rag-limitations',
    title: 'Limitations of RAG',
    type: 'concept',
    author: 'System',
    lastUpdated: '2026-04-18',
    tags: ['architecture'],
    content: `Retrieval-Augmented Generation (RAG) suffers from a lack of synthesis. It retrieves fragments but does not build a compounding mental model of the domain over time.`,
    links: ['llm-knowledge-bases']
  }
};
