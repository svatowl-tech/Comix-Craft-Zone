import React, { useRef } from 'react';
import { Menu, Undo, Redo, Scaling, Save, Download, Settings2, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onToggleLibrary: () => void;
  onToggleProperties: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenPageSettings: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onOpenExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleLibrary,
  onToggleProperties,
  onUndo,
  onRedo,
  onOpenPageSettings,
  onSaveProject,
  onLoadProject,
  onOpenExport,
  canUndo,
  canRedo
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
    }
    // Reset value to allow loading the same file again if needed
    if (e.target) e.target.value = '';
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 z-30 shadow-md shrink-0">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-1 rounded hover:bg-slate-800" onClick={onToggleLibrary}>
          <Menu />
        </button>
        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="font-banger text-white">CC</span>
        </div>
        <h1 className="font-bold text-lg tracking-tight hidden sm:block">Comix Craft <span className="text-brand-500">Zone</span></h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={18} />
        </button>

        <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

        <button
          onClick={onOpenPageSettings}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
          title="Canvas Size"
        >
          <Scaling size={18} />
        </button>
        
        {/* Load Project Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" 
          title="Load Project"
        >
          <FolderOpen size={18} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".json"
        />

        <button 
          onClick={onSaveProject}
          className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" 
          title="Save Project"
        >
          <Save size={18} />
        </button>
        <button className="lg:hidden p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" onClick={onToggleProperties}>
          <Settings2 size={18} />
        </button>
        <button className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 text-sm font-medium transition-colors"
          onClick={onOpenExport}
        >
          <Download size={16} /> Export
        </button>
      </div>
    </header>
  );
};