import React from 'react';
import { Plus } from 'lucide-react';
import { ComicPage } from '../types';

interface PageNavigatorProps {
  pages: ComicPage[];
  activePageId: string;
  onPageSelect: (id: string) => void;
  onAddPage: () => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  pages,
  activePageId,
  onPageSelect,
  onAddPage
}) => {
  return (
    <div className="h-16 md:h-20 bg-slate-900 border-t border-slate-700 flex items-center px-4 gap-4 z-20 shrink-0">
      <div className="flex gap-3 overflow-x-auto pb-1 max-w-full md:max-w-2xl no-scrollbar">
        {pages.map((page, idx) => (
          <button
            key={page.id}
            onClick={() => onPageSelect(page.id)}
            className={`w-10 h-14 md:w-12 md:h-16 border-2 rounded flex items-center justify-center text-xs flex-shrink-0 transition-colors ${page.id === activePageId ? 'border-brand-500 bg-slate-800 text-white' : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-500'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <button
        onClick={onAddPage}
        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-brand-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};