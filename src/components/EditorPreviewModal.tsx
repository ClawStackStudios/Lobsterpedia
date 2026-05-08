import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, X, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface EditorPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  content: string;
  tags?: string[];
  isSaving?: boolean;
}

export const EditorPreviewModal: React.FC<EditorPreviewModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  content,
  tags = [],
  isSaving = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-habitat-dark/95 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full h-full max-w-5xl bg-bg-primary rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-border-primary bg-card-bg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-lobster/10 rounded-xl flex items-center justify-center text-lobster">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-text-primary leading-tight">Preview</h3>
                  <p className="text-[10px] font-bold text-text-primary/40 uppercase tracking-tighter">
                    Reviewing: {title || 'Untitled Draft'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-lobster/10 text-text-primary/40 hover:text-lobster rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-16 custom-scrollbar bg-bg-primary">
              <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
                <h1 className="text-4xl font-extrabold text-text-primary mb-8 tracking-tight border-b border-border-primary pb-4">
                  {title}
                </h1>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-bg-primary border border-border-primary text-text-primary/40 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-black mb-6 mt-10 text-text-primary border-b border-border-primary pb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-black mb-4 mt-8 text-text-primary/80" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-3 mt-6 text-text-primary/80" {...props} />,
                    p: ({node, ...props}) => <p className="mb-6 leading-relaxed text-text-primary/70" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-6 space-y-2 ml-4 text-text-primary/70" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-border-primary text-lobster px-1 py-0.5 rounded" {...props}>{children}</code>
                      );
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>

            <div className="p-6 bg-card-bg border-t border-border-primary flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-text-primary/50 hover:text-text-primary transition-colors"
              >
                Return to Editor
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-8 py-3 bg-lobster text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-lobster/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
