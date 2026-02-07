import React from 'react';
import { Trash2, Copy, Layers, AlignCenter, AlignLeft, AlignRight, Bold, Type, Crop, X, MessageSquare, Shuffle, Sticker } from 'lucide-react';
import { ComicElement } from '../types';

interface PropertyPanelProps {
  element: ComicElement | null;
  onUpdate: (id: string, updates: Partial<ComicElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  onOpenCrop: (id: string) => void;
  onClose: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
  element, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  onLayerChange,
  onOpenCrop,
  onClose
}) => {
  if (!element) {
    return (
      <div className="w-full h-full bg-slate-800 p-6 flex flex-col items-center justify-center text-slate-500 relative">
        <button onClick={onClose} className="absolute top-4 right-4 md:hidden text-slate-400">
            <X size={24} />
        </button>
        <Layers size={48} className="mb-4 opacity-50" />
        <p className="text-center">Select an element to edit properties</p>
      </div>
    );
  }

  const handleChange = (key: string, value: any, nestedKey?: string) => {
    if (nestedKey) {
      onUpdate(element.id, {
        style: { ...element.style, [nestedKey]: value }
      });
    } else {
      onUpdate(element.id, { [key]: value });
    }
  };

  const hasImageContent = (element.type === 'image' || (element.type === 'frame' && element.content));
  const isBubble = element.type === 'bubble';
  const isSticker = element.type === 'sticker';
  const showTailControls = isBubble && !element.style?.hideTail;

  const handleRandomizeStickerShape = () => {
      const shapes = ['star', 'cloud', 'sharp'];
      const current = element.style?.shape;
      let next = shapes[Math.floor(Math.random() * shapes.length)];
      while(next === current) {
          next = shapes[Math.floor(Math.random() * shapes.length)];
      }
      handleChange('style', next, 'shape');
  };

  return (
    <div className="w-full h-full bg-slate-800 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Properties</h2>
        <div className="flex gap-2 items-center">
          <button onClick={() => onDuplicate(element.id)} className="p-2 hover:bg-slate-700 rounded text-slate-300" title="Duplicate">
            <Copy size={16} />
          </button>
          <button onClick={() => onDelete(element.id)} className="p-2 hover:bg-red-900/50 rounded text-red-400" title="Delete">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="p-2 md:hidden hover:bg-slate-700 rounded text-slate-300">
             <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Content specific actions */}
        {hasImageContent && (
           <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-700 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Image Content</span>
              </div>
              <button 
                onClick={() => onOpenCrop(element.id)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded flex items-center justify-center gap-2 border border-slate-600"
              >
                <Crop size={14} /> Crop / Position
              </button>
           </div>
        )}

        {/* Common Transforms */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500">Transform</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">X Position</label>
              <input 
                type="number" 
                value={Math.round(element.x)} 
                onChange={(e) => handleChange('x', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Y Position</label>
              <input 
                type="number" 
                value={Math.round(element.y)} 
                onChange={(e) => handleChange('y', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Rotation</label>
              <input 
                type="number" 
                value={Math.round(element.rotation)} 
                onChange={(e) => handleChange('rotation', parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Layer</label>
              <div className="flex gap-1">
                 <button onClick={() => onLayerChange(element.id, 'down')} className="flex-1 bg-slate-700 text-xs py-1 rounded hover:bg-slate-600">↓</button>
                 <button onClick={() => onLayerChange(element.id, 'up')} className="flex-1 bg-slate-700 text-xs py-1 rounded hover:bg-slate-600">↑</button>
              </div>
            </div>
          </div>
        </div>

        {/* Style Properties */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500">Appearance</h3>
          
          {(isSticker && element.style?.shape !== 'none') || !isSticker ? (
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">{isSticker ? 'Fill Color' : 'Background'}</label>
              <input 
                type="color" 
                value={element.style?.backgroundColor || '#ffffff'}
                onChange={(e) => handleChange('style', e.target.value, 'backgroundColor')}
                className="bg-transparent w-8 h-8 rounded cursor-pointer"
              />
            </div>
          ) : null}

          {!isSticker && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Border Color</label>
                <input 
                  type="color" 
                  value={element.style?.borderColor || '#000000'}
                  onChange={(e) => handleChange('style', e.target.value, 'borderColor')}
                  className="bg-transparent w-8 h-8 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Border Width</label>
                <input 
                  type="range" 
                  min="0" max="20"
                  value={element.style?.borderWidth ?? 2} 
                  onChange={(e) => handleChange('style', parseInt(e.target.value), 'borderWidth')}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Bubble Specific Tail Settings */}
        {showTailControls && (
           <div className="space-y-3 pt-4 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <MessageSquare size={12} /> Bubble Tail
              </h3>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">Placement</label>
                <div className="grid grid-cols-4 gap-1">
                   {['top', 'bottom', 'left', 'right'].map((side) => (
                      <button
                        key={side}
                        onClick={() => handleChange('style', side, 'tailPlacement')}
                        className={`text-[10px] py-1 rounded capitalize ${element.style?.tailPlacement === side || (!element.style?.tailPlacement && side === 'bottom') ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                      >
                        {side}
                      </button>
                   ))}
                </div>
              </div>

              <div>
                 <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Position</label>
                    <span className="text-xs text-slate-500">{element.style?.tailOffset ?? 50}%</span>
                 </div>
                 <input 
                   type="range"
                   min="10" max="90"
                   value={element.style?.tailOffset ?? 50}
                   onChange={(e) => handleChange('style', parseInt(e.target.value), 'tailOffset')}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                 />
              </div>

              <div>
                 <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Length</label>
                    <span className="text-xs text-slate-500">{element.style?.tailLength ?? 50}px</span>
                 </div>
                 <input 
                   type="range"
                   min="20" max="300"
                   value={element.style?.tailLength ?? 50}
                   onChange={(e) => handleChange('style', parseInt(e.target.value), 'tailLength')}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                 />
              </div>
           </div>
        )}

        {/* Sticker Specific */}
        {isSticker && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <Sticker size={12} /> Sticker Settings
              </h3>

              <div>
                 <label className="text-xs text-slate-400 block mb-1">Sticker Text</label>
                 <input 
                    type="text"
                    value={element.content || ''}
                    onChange={(e) => handleChange('content', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold uppercase"
                 />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Shape</label>
                <div className="flex items-center gap-2">
                    <select 
                       value={element.style?.shape || 'star'}
                       onChange={(e) => handleChange('style', e.target.value, 'shape')}
                       className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                    >
                        <option value="star">Star</option>
                        <option value="sharp">Sharp</option>
                        <option value="cloud">Cloud</option>
                        <option value="none">Text Only</option>
                    </select>
                    <button 
                       onClick={handleRandomizeStickerShape}
                       className="p-1.5 bg-slate-700 hover:bg-brand-600 rounded text-slate-300 hover:text-white transition-colors"
                       title="Randomize Shape"
                    >
                        <Shuffle size={14} />
                    </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Text Color</label>
                <input 
                    type="color" 
                    value={element.style?.color || '#ffffff'}
                    onChange={(e) => handleChange('style', e.target.value, 'color')}
                    className="bg-transparent w-8 h-8 rounded cursor-pointer"
                />
              </div>
            </div>
        )}

        {/* Text Specific */}
        {(element.type === 'text' || element.type === 'bubble') && (
          <div className="space-y-3 pt-4 border-t border-slate-700">
            <h3 className="text-xs font-semibold text-slate-500">Typography</h3>
            
            <div>
               <label className="text-xs text-slate-400 block mb-1">Content</label>
               <textarea 
                  rows={3}
                  value={element.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-comic"
               />
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="text-xs text-slate-400 block mb-1">Size</label>
                  <input 
                    type="number" 
                    value={element.style?.fontSize ?? 16}
                    onChange={(e) => handleChange('style', parseInt(e.target.value), 'fontSize')}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                  />
               </div>
               <div>
                   <label className="text-xs text-slate-400 block mb-1">Font</label>
                   <select 
                      value={element.style?.fontFamily || 'Neucha'}
                      onChange={(e) => handleChange('style', e.target.value, 'fontFamily')}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                   >
                     <option value="Neucha">Comic (Rus)</option>
                     <option value="Ruslan Display">Header (Rus)</option>
                     <option value="Rubik Mono One">Impact (Rus)</option>
                     <option value="Caveat">Hand (Rus)</option>
                     <option value="Inter">Sans (Rus)</option>
                   </select>
               </div>
            </div>
             <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Text Color</label>
              <input 
                type="color" 
                value={element.style?.color || '#000000'}
                onChange={(e) => handleChange('style', e.target.value, 'color')}
                className="bg-transparent w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};