import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Folder, ChevronRight, ChevronDown, Plus, MoreVertical, Edit2, Trash2, FolderPlus, FilePlus, ChevronsUp } from 'lucide-react';
import { PolyP, Reef } from '../shell-core/types';

interface WikiDirectoryProps {
  reef: Reef;
  reefFiles: string[];
  currentView: string;
  activePolyPId: string;
  moltNavigate: (view: any, id?: string) => void;
  onRefresh: () => void;
}

const FileTreeNode = ({ node, level, currentView, activePolyPId, moltNavigate, onMove, onDelete, onRename, collapseTrigger }: any) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [showMenu, setShowMenu] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(node.name);
  const isFile = node.isFile;

  React.useEffect(() => {
    if (collapseTrigger > 0) {
      setIsOpen(false);
    }
  }, [collapseTrigger]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ 
      id: node.id, 
      path: node.path, 
      isFile: node.isFile 
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isFile) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFile) return;
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    onMove(data, node.path);
  };

  const submitRename = () => {
    if (editName && editName !== node.name) {
      onRename(node, editName);
    }
    setIsEditing(false);
  };

  if (isFile) {
    const id = node.id;
    const isRaw = node.polyP?.isRaw;
    const isActive = currentView === 'article' && activePolyPId === id;
    
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        className="group relative"
      >
        {isEditing ? (
          <div style={{ paddingLeft: `${level * 12 + 12}px` }} className="py-1">
            <input 
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
              className="w-full bg-bg-primary text-sm p-1 rounded border border-lobster outline-none"
            />
          </div>
        ) : (
          <button 
            onClick={() => moltNavigate('article', id)}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
            className={`w-full flex items-center gap-2 py-1.5 text-sm rounded-md transition-all text-left ${isActive ? 'bg-lobster/10 text-lobster font-medium' : 'text-text-primary/70 hover:bg-border-primary/50'}`}
          >
            <FileText size={14} className={isRaw ? "opacity-40" : "opacity-60"} /> 
            <span className="truncate flex-1">{node.name}</span>
          </button>
        )}
        
        <div className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity ${showMenu ? 'opacity-100 z-50' : 'opacity-0 group-hover:opacity-100 z-10'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`p-1 rounded transition-colors ${showMenu ? 'bg-lobster text-white' : 'hover:bg-bg-primary text-text-primary/40 hover:text-text-primary'}`}
          >
            <MoreVertical size={12} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  style={{ top: 'calc(100% + 4px)', right: 0 }}
                  className="absolute z-50 w-36 bg-habitat-dark text-white rounded-lg shadow-2xl border border-white/10 py-1.5 overflow-hidden"
                >
                  <button 
                    onClick={() => { setShowMenu(false); setIsEditing(true); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-lobster transition-colors"
                  >
                    <Edit2 size={12} /> Rename
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); onDelete(node.id); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-lobster transition-colors text-red-400 hover:text-white"
                  >
                    <Trash2 size={12} /> Purge
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col"
    >
      <div className="group relative">
        {isEditing ? (
          <div style={{ paddingLeft: `${level * 12 + 12}px` }} className="py-1">
            <input 
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
              className="w-full bg-bg-primary text-sm p-1 rounded border border-lobster outline-none"
            />
          </div>
        ) : (
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
            className="w-full flex items-center gap-2 py-1.5 text-sm rounded-md transition-all text-left text-text-primary/70 hover:bg-border-primary/50 font-medium"
          >
            {isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
            <Folder size={14} className="text-blue-400" />
            <span className="truncate flex-1">{node.name}</span>
          </button>
        )}

        <div className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity ${showMenu ? 'opacity-100 z-50' : 'opacity-0 group-hover:opacity-100 z-10'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`p-1 rounded transition-colors ${showMenu ? 'bg-lobster text-white' : 'hover:bg-bg-primary text-text-primary/40 hover:text-text-primary'}`}
          >
            <MoreVertical size={12} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  style={{ top: 'calc(100% + 4px)', right: 0 }}
                  className="absolute z-50 w-36 bg-habitat-dark text-white rounded-lg shadow-2xl border border-white/10 py-1.5 overflow-hidden"
                >
                  <button 
                    onClick={() => { setShowMenu(false); setIsEditing(true); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-lobster transition-colors"
                  >
                    <Edit2 size={12} /> Rename
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex flex-col"
          >
            {node.children.map((child: any) => (
              <FileTreeNode 
                key={child.fullPath || child.path || child.name} 
                node={child} 
                level={level + 1} 
                currentView={currentView} 
                activePolyPId={activePolyPId} 
                moltNavigate={moltNavigate}
                onMove={onMove}
                onDelete={onDelete}
                onRename={onRename}
                collapseTrigger={collapseTrigger}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WikiDirectory = ({ reef, reefFiles, currentView, activePolyPId, moltNavigate, onRefresh }: WikiDirectoryProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'folder' | 'file'>('category');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [collapseTrigger, setCollapseTrigger] = useState(0);

  // Suggested categories
  const categories = ['concepts', 'entities', 'events', 'insights', 'meetings', 'patterns', 'projects', 'references', 'log'];

  const handleMove = async (source: any, targetDirectory: string) => {
    const oldPath = source.path;
    const fileName = oldPath.split(/[/\\]/).pop();
    const newPath = targetDirectory ? `${targetDirectory}/${fileName}` : fileName;

    if (oldPath === newPath) return;

    try {
      const res = await fetch('/api/wiki/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to move node:", err);
    }
  };

  const handleRename = async (node: any, newName: string) => {
    const oldPath = node.path;
    const pathParts = oldPath.split(/[/\\]/);
    pathParts.pop(); // remove old name
    
    // Add extension back if it's a file and doesn't have it
    const finalName = node.isFile && !newName.endsWith('.md') ? `${newName}.md` : newName;
    const newPath = pathParts.length > 0 ? `${pathParts.join('/')}/${finalName}` : finalName;

    if (oldPath === newPath) return;

    try {
      const res = await fetch('/api/wiki/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath })
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to rename node:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Purge ${id} from the reef?`)) return;
    try {
      const res = await fetch(`/api/wiki/delete/${id}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to delete polyP:", err);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setCreating(true);
    try {
      if (modalType === 'category') {
        // Create folder + sub-index
        const folderPath = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const indexPath = `${folderPath}/${folderPath}-index`;
        
        // Ensure folder exists
        await fetch('/api/wiki/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath })
        });

        // Create sub-index file
        await fetch('/api/wiki/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: indexPath,
            title: `${newName} Index`,
            type: 'system',
            content: `# ${newName} Index\nThis index catalogizes the ${newName} category.\n\n## Sub-sections\n- None yet.`,
            tags: [folderPath, 'index']
          })
        });

        moltNavigate('article', indexPath);
      } else if (modalType === 'folder') {
        await fetch('/api/wiki/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: newName })
        });
      } else {
        // New file
        const id = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await fetch('/api/wiki/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            title: newName,
            type: 'concept',
            content: `# ${newName}\nStart scuttling...`,
            tags: ['new']
          })
        });
        moltNavigate('article', id);
      }
      setIsModalOpen(false);
      setNewName('');
      onRefresh();
    } catch (err) {
      console.error("Creation failed:", err);
    } finally {
      setCreating(false);
    }
  };

  // Build tree
  const tree: any[] = [];
  reefFiles.forEach((id: string) => {
    const polyP = reef[id];
    let parts = polyP.path ? polyP.path.split(/[/\\]/) : [id + '.md'];
    
    let currentLevel = tree;
    let fullPath = '';
    
    parts.forEach((part: string, index: number) => {
      const isFile = index === parts.length - 1;
      fullPath = fullPath ? `${fullPath}/${part}` : part;
      
      let existing = currentLevel.find((n: any) => n.name === part && n.isFile === isFile);
      if (!existing) {
        existing = { 
          name: part, 
          isFile, 
          children: [], 
          id: isFile ? id : undefined, 
          polyP: isFile ? polyP : undefined,
          fullPath: isFile ? undefined : (fullPath.endsWith('.md') ? fullPath.replace(/\.md$/, '') : fullPath),
          path: isFile ? polyP.path : fullPath
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    });
  });

  const sortNodes = (nodes: any[]) => {
    nodes.sort((a, b) => {
      if (a.isFile && !b.isFile) return 1;
      if (!a.isFile && b.isFile) return -1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => { if (!n.isFile) sortNodes(n.children); });
    return nodes;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[11px] font-black text-text-primary/40 uppercase tracking-[0.2em]">Wiki Directory</h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => { setModalType('category'); setIsModalOpen(true); }}
            className="p-1.5 hover:bg-lobster hover:text-white rounded transition-all text-text-primary/50" 
            title="New Category"
          >
            <FolderPlus size={14} />
          </button>
          <button 
            onClick={() => { setModalType('file'); setIsModalOpen(true); }}
            className="p-1.5 hover:bg-lobster hover:text-white rounded transition-all text-text-primary/50" 
            title="New PolyP"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={() => setCollapseTrigger(prev => prev + 1)}
            className="p-1.5 hover:bg-lobster hover:text-white rounded transition-all text-text-primary/50"
            title="Collapse All"
          >
            <ChevronsUp size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-0.5">
        <div 
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            handleMove(data, '');
          }}
          className="min-h-[20px]"
        >
          {sortNodes(tree).map(node => (
            <FileTreeNode 
              key={node.name} 
              node={node} 
              level={0} 
              currentView={currentView} 
              activePolyPId={activePolyPId} 
              moltNavigate={moltNavigate}
              onMove={handleMove}
              onDelete={handleDelete}
              onRename={handleRename}
              collapseTrigger={collapseTrigger}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-bg-primary rounded-xl shadow-2xl border border-border-primary overflow-hidden"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-text-primary">
                  {modalType === 'category' ? 'Create Category Shell' : modalType === 'folder' ? 'Create Folder' : 'Synthesize New PolyP'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {modalType === 'category' && (
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setNewName(cat)}
                        className={`text-[10px] font-bold uppercase py-2 rounded border transition-all ${newName === cat ? 'bg-lobster text-white border-lobster' : 'hover:border-lobster/50 text-text-primary/60 border-border-primary'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase text-text-primary/40 mb-2">Name / Title</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={modalType === 'category' ? "e.g. concepts" : "Enter name..."}
                    className="w-full bg-card-bg border border-border-primary rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-lobster/50 transition-all"
                  />
                </div>

                <p className="text-xs text-text-primary/40 italic">
                  {modalType === 'category' ? "This will create a dedicated folder and an index-catalyst file." : "This will add a new node to the reef structure."}
                </p>
              </div>

              <div className="p-6 bg-card-bg border-t border-border-primary flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-text-primary/50 hover:text-text-primary transition-colors"
                >
                  Abort
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newName || creating}
                  className="px-6 py-2 bg-lobster text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-lobster/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {creating ? 'Initializing...' : 'Construct'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
