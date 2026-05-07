import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikiIndex } from '../../src/features/reef-presentation/WikiIndex';


const mockPages = {
  'index-list': {
    id: 'index-list',
    title: 'Index List',
    type: 'system',
    content: '## Concepts\n- **[Concept 1](concept-1)**',
    author: 'System',
    lastUpdated: '2026-04-19',
    tags: [],
    links: [],
    externalUrls: [],
    path: 'index-list.md',
    isRaw: false
  },
  'concept-1': {
    id: 'concept-1',
    title: 'Concept 1',
    type: 'concept',
    content: 'Concept content',
    author: 'User',
    lastUpdated: '2026-04-19',
    tags: [],
    links: [],
    externalUrls: [],
    path: 'concept-1.md',
    isRaw: false
  }
};

describe('WikiIndex Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders index list content and external vault notice by default', () => {
    const onNavigate = vi.fn();
    render(<WikiIndex pages={mockPages} onNavigate={onNavigate} />);

    expect(screen.getByText(/EXTERNAL VAULT ECOSYSTEM/i)).toBeInTheDocument();
    expect(screen.getAllByText('Concept 1').length).toBeGreaterThan(0);
  });

  it('dismisses external vault notice when close button is clicked', async () => {
    const onNavigate = vi.fn();
    render(<WikiIndex pages={mockPages} onNavigate={onNavigate} />);

    const dismissButton = screen.getByTitle('Dismiss notice');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/EXTERNAL VAULT ECOSYSTEM/i)).not.toBeInTheDocument();
    });
  });

  it('remembers dismissed state from localStorage', () => {
    localStorage.setItem('lobsterpedia_vault_notice_dismissed', 'true');
    const onNavigate = vi.fn();
    render(<WikiIndex pages={mockPages} onNavigate={onNavigate} />);

    expect(screen.queryByText(/EXTERNAL VAULT ECOSYSTEM/i)).not.toBeInTheDocument();
  });
});

