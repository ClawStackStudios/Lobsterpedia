import React from 'react';
import { Heading1, Heading2, Heading3, Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Code, Sigma } from 'lucide-react';

interface MarkdownEditorToolbarProps {
  onInsert: (before: string, after: string) => void;
  showWikiLink?: boolean;
  showLinkSearch?: boolean;
  onToggleLinkSearch?: () => void;
}

export const MarkdownEditorToolbar: React.FC<MarkdownEditorToolbarProps> = ({
  onInsert,
  showWikiLink = true,
  showLinkSearch = false,
  onToggleLinkSearch
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-habitat-dark/50 border border-border-primary border-b-0 rounded-t-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onInsert('# ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Heading 1"
      >
        <Heading1 size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('## ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Heading 2"
      >
        <Heading2 size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('### ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Heading 3"
      >
        <Heading3 size={14}/>
      </button>
      <div className="w-px h-4 bg-border-primary mx-1" />
      <button
        type="button"
        onClick={() => onInsert('**', '**')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Bold"
      >
        <Bold size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('_', '_')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Italic"
      >
        <Italic size={14}/>
      </button>
      <div className="w-px h-4 bg-border-primary mx-1" />
      {showWikiLink && (
        <button
          type="button"
          onClick={() => onInsert('[[', ']]')}
          className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
          title="Wiki Link"
        >
          <LinkIcon size={14}/>
        </button>
      )}
      {showLinkSearch && onToggleLinkSearch && (
        <button
          type="button"
          onClick={onToggleLinkSearch}
          className="p-1.5 hover:bg-blue-500/20 text-blue-500 hover:text-blue-600 rounded transition-colors"
          title="Search and Add Link"
        >
          <LinkIcon size={14}/>
        </button>
      )}
      <button
        type="button"
        onClick={() => onInsert('[', '](url)')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="External Link"
      >
        <LinkIcon size={12}/>
      </button>
      <div className="w-px h-4 bg-border-primary mx-1" />
      <button
        type="button"
        onClick={() => onInsert('- ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Bullet List"
      >
        <List size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('1. ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Ordered List"
      >
        <ListOrdered size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('> ', '')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Quote"
      >
        <Quote size={14}/>
      </button>
      <div className="w-px h-4 bg-border-primary mx-1" />
      <button
        type="button"
        onClick={() => onInsert('```\n', '\n```')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="Code Block"
      >
        <Code size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('$$ ', ' $$')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="KaTeX Block"
      >
        <Sigma size={14}/>
      </button>
      <button
        type="button"
        onClick={() => onInsert('$', '$')}
        className="p-1.5 hover:bg-lobster/20 text-text-primary/50 hover:text-lobster rounded transition-colors"
        title="KaTeX Inline"
      >
        <Sigma size={10}/>
      </button>
    </div>
  );
};
