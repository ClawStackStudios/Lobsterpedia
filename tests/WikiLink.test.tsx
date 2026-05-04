import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WikiLink } from '../src/components/WikiLink';

const mockPages = {
  'existing-page': {
    id: 'existing-page',
    title: 'Existing Page',
    type: 'concept',
    content: 'This is an existing page content.',
    author: 'System',
    lastUpdated: '2026-04-19',
    tags: [],
    links: [],
    externalUrls: [],
    path: 'existing-page.md',
    isRaw: false
  }
};

describe('WikiLink Component', () => {
  it('renders correctly for an existing page', () => {
    const onNavigate = vi.fn();
    render(
      <WikiLink id="existing-page" pages={mockPages} onNavigate={onNavigate} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Existing Page');
  });

  it('renders a red alert link for a non-existing page', () => {
    const onNavigate = vi.fn();
    render(
      <WikiLink id="missing-page" pages={mockPages} onNavigate={onNavigate} />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('missing-page');
    expect(button.className).toContain('text-red-500');
  });

  it('calls onNavigate with "article" action when an existing link is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <WikiLink id="existing-page" pages={mockPages} onNavigate={onNavigate} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledWith('article', 'existing-page');
  });

  it('calls onNavigate with "ingest" action when a missing link is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <WikiLink id="missing-page" pages={mockPages} onNavigate={onNavigate} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledWith('ingest', 'missing-page');
  });

  it('shows hover preview element when hovered securely', () => {
    const onNavigate = vi.fn();
    const setHoveredLink = vi.fn();
    render(
      <WikiLink 
        id="existing-page" 
        pages={mockPages} 
        onNavigate={onNavigate} 
        hoveredLink="existing-page" 
        setHoveredLink={setHoveredLink} 
      />
    );

    expect(screen.getByText('This is an existing page content....')).toBeInTheDocument();
  });
});
