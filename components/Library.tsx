import React, { useRef, useState } from 'react';
import { Layout, MessageSquare, Type, Image as ImageIcon, Sticker, Upload, Grid, Wand2, Shapes, AlignLeft } from 'lucide-react';
import { ElementType, DragItem } from '../types';

interface LibraryProps {
  onDragStart: (e: React.DragEvent, item: DragItem) => void;
  onItemClick: (item: DragItem) => void;
  onApplyTemplate: (layoutId: string) => void;
  onGenerateLayout: (count: number) => void;
  uploadedImages: string[];
  onUploadImage: (url: string) => void;
}

// Helper for Sidebar Previews ONLY. Actual rendering is now in CanvasElement.
const generateStickerPreview = (text: string, primaryColor: string, secondaryColor: string, type: 'star' | 'cloud' | 'sharp') => {
    let path = '';
    // ViewBox 0 0 200 150
    if (type === 'star') {
        path = "M100,10 L125,40 L160,20 L150,60 L190,75 L150,90 L160,130 L125,110 L100,140 L75,110 L40,130 L50,90 L10,75 L50,60 L40,20 L75,40 Z";
    } else if (type === 'sharp') {
        path = "M20,20 L80,10 L180,20 L160,75 L190,130 L100,110 L20,130 L40,75 Z";
    } else {
        path = "M50,75 Q20,75 20,45 Q20,15 50,15 Q60,5 80,15 Q100,5 120,15 Q150,15 150,45 Q150,75 120,75 Q100,85 80,75 Q60,85 50,75 Z";
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <defs>
            <filter id="shadow">
                <feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="black" flood-opacity="1"/>
            </filter>
        </defs>
        <path d="${path}" fill="${primaryColor}" stroke="black" stroke-width="3" filter="url(#shadow)"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Impact, sans-serif" font-weight="900" font-size="40" fill="${secondaryColor}" stroke="black" stroke-width="1.5" transform="rotate(-5, 100, 75)">${text}</text>
    </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const STICKERS = [
    { label: 'BOOM', p: '#0ea5e9', s: '#facc15', type: 'star' },
    { label: 'POW', p: '#ef4444', s: '#ffffff', type: 'star' },
    { label: 'BANG', p: '#facc15', s: '#ef4444', type: 'sharp' },
    { label: 'ZAP', p: '#f97316', s: '#fef08a', type: 'sharp' },
    { label: 'CRASH', p: '#94a3b8', s: '#facc15', type: 'cloud' },
    { label: 'OUCH', p: '#22c55e', s: '#ffffff', type: 'star' },
    { label: 'WHAM', p: '#a855f7', s: '#facc15', type: 'sharp' },
    { label: 'BAM', p: '#ef4444', s: '#facc15', type: 'cloud' },
    { label: 'GULP', p: '#84cc16', s: '#ffffff', type: 'cloud' },
    { label: 'SPLASH', p: '#06b6d4', s: '#cffafe', type: 'star' },
] as const;

export const Library: React.FC<LibraryProps> = ({ 
  onDragStart, 
  onItemClick,
  onApplyTemplate,
  onGenerateLayout,
  uploadedImages, 
  onUploadImage 
}) => {
  const [activeTab, setActiveTab] = React.useState<'layouts' | 'frames' | 'bubbles' | 'assets' | 'uploads'>('bubbles');
  const [panelCount, setPanelCount] = useState<number>(4);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, type: ElementType, style: any = {}, content: string = '') => {
    const item: DragItem = { type, style, content };
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    onDragStart(e, item);
  };

  // Helper for mobile users (click instead of drag)
  const handleClick = (type: ElementType, style: any = {}, content: string = '') => {
    onItemClick({ type, style, content });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUploadImage(url);
    }
  };

  // --- Data Definitions ---

  const classicLayouts = [
      { id: '1-full', label: 'Full Page', count: 1, type: 'basic' },
      { id: '2-vert', label: '2 Vertical', count: 2, type: 'basic' },
      { id: '2-horiz', label: '2 Horizontal', count: 2, type: 'basic' },
      { id: '4-grid', label: '4 Grid', count: 4, type: 'grid' },
      { id: '6-grid', label: '6 Grid', count: 6, type: 'grid' },
  ];

  const actionLayouts = [
      { id: 'slanted-split', label: 'Slash', count: 2, type: 'slanted-2' },
      { id: 'slanted-action', label: 'Action Z', count: 3, type: 'slanted-3' },
      { id: 'masonry-hero', label: 'Hero Left', count: 3, type: 'masonry' },
      { id: 'shattered', label: 'Shattered', count: 3, type: 'shattered' },
      { id: 'circle-focus', label: 'Circle Focus', count: 3, type: 'circle-center' },
  ];

  const webtoonLayouts = [
      { id: 'webtoon-short', label: 'Short (2k)', count: 3, type: 'webtoon-s' },
      { id: 'webtoon-medium', label: 'Medium (3k)', count: 5, type: 'webtoon-m' },
      { id: 'webtoon-cinematic', label: 'Cinematic', count: 3, type: 'webtoon-c' },
  ];

  // Helper to visualize polygon in library
  const getCssClipPath = (points: string) => {
    const parts = points.split(' ');
    return `polygon(${parts.map(p => {
        const [px, py] = p.split(',');
        return `${px}% ${py}%`;
    }).join(', ')})`;
  };

  const frameGroups = [
    {
      title: "Basic Shapes",
      items: [
        { label: 'Square', h: 100, w: 100, shape: 'rectangle' },
        { label: 'Wide', h: 100, w: 180, shape: 'rectangle' },
        { label: 'Tall', h: 180, w: 100, shape: 'rectangle' },
        { label: 'Circle', h: 100, w: 100, shape: 'circle' },
      ]
    },
    {
      title: "Slanted & Action",
      items: [
        { label: 'Right Tilt', h: 100, w: 140, shape: 'polygon', points: '20,0 100,0 80,100 0,100' },
        { label: 'Left Tilt', h: 100, w: 140, shape: 'polygon', points: '0,0 80,0 100,100 20,100' },
        { label: 'Trapezoid Up', h: 100, w: 140, shape: 'polygon', points: '20,0 80,0 100,100 0,100' },
        { label: 'Trapezoid Dwn', h: 100, w: 140, shape: 'polygon', points: '0,0 100,0 80,100 20,100' },
        { label: 'Perspective R', h: 100, w: 140, shape: 'polygon', points: '0,10 100,0 100,100 0,90' },
        { label: 'Perspective L', h: 100, w: 140, shape: 'polygon', points: '0,0 100,10 100,90 0,100' },
      ]
    },
    {
      title: "Geometric",
      items: [
        { label: 'Triangle', h: 100, w: 120, shape: 'triangle' },
        { label: 'Diamond', h: 120, w: 120, shape: 'polygon', points: '50,0 100,50 50,100 0,50' },
        { label: 'Pentagon', h: 110, w: 110, shape: 'polygon', points: '50,0 100,38 82,100 18,100 0,38' },
        { label: 'Hexagon', h: 110, w: 100, shape: 'polygon', points: '50,0 100,25 100,75 50,100 0,75 0,25' },
        { label: 'Octagon', h: 100, w: 100, shape: 'polygon', points: '30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30' },
      ]
    },
    {
      title: "Creative",
      items: [
        { label: 'Cut Corner', h: 100, w: 120, shape: 'polygon', points: '0,0 75,0 100,25 100,100 0,100' },
        { label: 'Shard', h: 130, w: 100, shape: 'polygon', points: '0,0 100,20 80,100 20,80' },
        { label: 'Chevron', h: 100, w: 120, shape: 'polygon', points: '0,0 50,20 100,0 100,100 50,80 0,100' },
        { label: 'Arrow', h: 100, w: 140, shape: 'polygon', points: '0,25 70,25 70,0 100,50 70,100 70,75 0,75' },
        { label: 'Burst', h: 120, w: 120, shape: 'polygon', points: '50,0 65,35 100,20 80,50 100,80 65,65 50,100 35,65 0,80 20,50 0,20 35,35' },
      ]
    }
  ];

  const bubbleGroups = [
    {
      title: "Speech",
      items: [
        { type: 'rectangle', label: 'Box' },
        { type: 'circle', label: 'Oval' },
        { type: 'wobbly', label: 'Wobbly' },
        { type: 'cloud', label: 'Cloud' },
      ]
    },
    {
      title: "Action & Shout",
      items: [
        { type: 'shout', label: 'Burst' },
        { type: 'star', label: 'Star' },
        { type: 'electric', label: 'Electric' },
      ]
    },
    {
      title: "Thought",
      items: [
        { type: 'thought', label: 'Thought' },
      ]
    },
    {
      title: "Captions & Text",
      items: [
        { type: 'rectangle', label: 'Caption', hideTail: true },
        { type: 'circle', label: 'Oval', hideTail: true },
        { type: 'electric', label: 'Jagged', hideTail: true },
        { type: 'star', label: 'Impact', hideTail: true },
        { type: 'cloud', label: 'Soft', hideTail: true },
      ]
    }
  ];

  // --- Render Functions ---

  const renderLayoutButton = (layout: any) => {
    const isGrid = layout.type === 'grid';
    return (
      <button 
        key={layout.id}
        onClick={() => onApplyTemplate(layout.id)}
        className="bg-slate-700 p-2 rounded hover:bg-slate-600 transition-colors text-center group flex flex-col items-center"
      >
        <div className={`bg-white/10 border border-slate-500 mb-2 w-12 flex flex-wrap content-start overflow-hidden relative p-[2px] gap-[2px] ${layout.type.includes('webtoon') ? 'aspect-[1/2]' : 'aspect-[3/4]'}`}>
            {layout.type === 'basic' && Array.from({ length: layout.count }).map((_, i) => <div key={i} className="border border-slate-600 bg-white/20 grow" style={{ width: layout.id.includes('vert') ? '45%' : '100%' }}></div>)}
            {layout.type === 'grid' && Array.from({ length: layout.count }).map((_, i) => <div key={i} className="border border-slate-600 bg-white/20 grow" style={{ width: '45%', height: '30%' }}></div>)}
            {layout.type === 'slanted-2' && <><div className="absolute top-0 left-0 w-full h-[60%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)' }}></div><div className="absolute bottom-0 left-0 w-full h-[38%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 100%)' }}></div></>}
            {layout.type === 'slanted-3' && <><div className="absolute top-0 left-0 w-full h-[32%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)' }}></div><div className="absolute top-[34%] left-0 w-full h-[32%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 80%, 0 100%)' }}></div><div className="absolute bottom-0 left-0 w-full h-[32%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 100%, 0 100%)' }}></div></>}
            {layout.type === 'masonry' && <><div className="absolute left-0 top-0 w-[60%] h-full bg-white/20 border border-slate-600"></div><div className="absolute right-0 top-0 w-[38%] h-[48%] bg-white/20 border border-slate-600"></div><div className="absolute right-0 bottom-0 w-[38%] h-[48%] bg-white/20 border border-slate-600"></div></>}
            {layout.type === 'shattered' && <><div className="absolute top-0 left-0 w-full h-[60%] bg-white/20 border border-slate-600" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div><div className="absolute bottom-0 left-0 w-1/2 h-[40%] bg-white/20 border border-slate-600"></div><div className="absolute bottom-0 right-0 w-1/2 h-[40%] bg-white/20 border border-slate-600"></div></>}
            {layout.type === 'circle-center' && <><div className="w-full h-[25%] bg-white/20 border border-slate-600"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 border border-slate-600 z-10"></div><div className="w-full h-[25%] bg-white/20 border border-slate-600 mt-auto"></div></>}
            {layout.type.includes('webtoon') && <div className="flex flex-col gap-1 w-full h-full p-[2px]"><div className="w-full bg-white/20 border border-slate-600 h-1/4"></div><div className="w-full bg-white/20 border border-slate-600 h-1/4"></div><div className="w-full bg-white/20 border border-slate-600 h-1/4"></div></div>}
        </div>
        <span className="text-[10px] leading-tight text-slate-300 group-hover:text-white">{layout.label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full select-none bg-slate-800">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layout size={20} className="text-brand-500" /> Library
        </h2>
      </div>

      <div className="grid grid-cols-5 border-b border-slate-700 shrink-0 bg-slate-800">
        {[
          { id: 'layouts', label: 'Layouts', icon: Grid },
          { id: 'frames', label: 'Frames', icon: Shapes },
          { id: 'bubbles', label: 'Bubbles', icon: MessageSquare },
          { id: 'assets', label: 'Assets', icon: Sticker },
          { id: 'uploads', label: 'Uploads', icon: Upload },
        ].map((tab) => (
           <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-1 text-[10px] font-medium transition-colors flex flex-col items-center gap-1.5 ${activeTab === tab.id ? 'text-brand-500 border-b-2 border-brand-500 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-700 border-b-2 border-transparent'}`}
          >
            <tab.icon size={18}/> 
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'layouts' && (
          <div className="space-y-6">
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-700 space-y-3">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Magic Generator</span>
                  <Wand2 size={14} className="text-purple-400"/>
               </div>
               <div className="flex gap-2">
                 <input 
                   type="number" 
                   min={1} 
                   max={20}
                   value={panelCount}
                   onChange={(e) => setPanelCount(Math.max(1, parseInt(e.target.value) || 1))}
                   className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-center focus:border-brand-500 outline-none"
                 />
                 <button 
                   onClick={() => onGenerateLayout(panelCount)}
                   className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded px-3 py-1 transition-colors"
                 >
                   Generate {panelCount} Panels
                 </button>
               </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Classic</p>
              <div className="grid grid-cols-2 gap-3">
                {classicLayouts.map(renderLayoutButton)}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Manga & Action</p>
              <div className="grid grid-cols-2 gap-3">
                {actionLayouts.map(renderLayoutButton)}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Webtoon</p>
              <div className="grid grid-cols-3 gap-2">
                {webtoonLayouts.map(renderLayoutButton)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'frames' && (
          <div className="space-y-6">
             {frameGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                   <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.title}</h3>
                   <div className="grid grid-cols-3 gap-2">
                      {group.items.map((frame, i) => (
                        <div 
                          key={i}
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'frame', { 
                            borderWidth: 4, 
                            borderColor: '#000000',
                            backgroundColor: '#ffffff',
                            shape: frame.shape,
                            polygonPoints: (frame as any).points
                          })}
                          onClick={() => handleClick('frame', { 
                            borderWidth: 4, 
                            borderColor: '#000000',
                            backgroundColor: '#ffffff',
                            shape: frame.shape,
                            polygonPoints: (frame as any).points
                          })}
                          className="bg-slate-700 p-1.5 rounded hover:bg-slate-600 cursor-grab active:cursor-grabbing transition-colors text-center group"
                          title={frame.label}
                        >
                          <div className="w-full aspect-square flex items-center justify-center bg-slate-800/50 rounded mb-1 p-2">
                              <div 
                                className="bg-white border-2 border-slate-900 shadow-sm transition-transform group-hover:scale-105"
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  borderRadius: frame.shape === 'circle' ? '50%' : '0px',
                                  clipPath: frame.shape === 'triangle' 
                                      ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
                                      : ((frame as any).points ? getCssClipPath((frame as any).points) : undefined)
                                }}
                              />
                          </div>
                          <span className="text-[9px] text-slate-400 block truncate leading-tight">{frame.label}</span>
                        </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'bubbles' && (
          <div className="space-y-4">
             {bubbleGroups.map((group, gIdx) => (
               <div key={gIdx}>
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.title}</h3>
                 <div className="grid grid-cols-2 gap-3">
                  {group.items.map((b, i) => (
                    <div 
                      key={i}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'bubble', { 
                        shape: b.type, 
                        backgroundColor: '#ffffff', 
                        borderColor: '#000000', 
                        borderWidth: 2,
                        color: '#000000',
                        fontFamily: 'Neucha',
                        hideTail: (b as any).hideTail
                      }, (b as any).hideTail ? "Текст..." : "Привет!")}
                      onClick={() => handleClick('bubble', { 
                        shape: b.type, 
                        backgroundColor: '#ffffff', 
                        borderColor: '#000000',
                        borderWidth: 2,
                        color: '#000000',
                        fontFamily: 'Neucha',
                        hideTail: (b as any).hideTail
                      }, (b as any).hideTail ? "Текст..." : "Привет!")}
                      className="bg-slate-700 p-2 rounded hover:bg-slate-600 cursor-grab text-center group"
                    >
                      <div className="h-12 flex items-center justify-center mb-1">
                        {b.type === 'thought' ? (
                          <div className="w-8 h-6 bg-slate-400 rounded-full relative">
                             <div className="absolute -bottom-1 left-1 w-2 h-2 bg-slate-400 rounded-full"></div>
                             <div className="absolute -bottom-2 -left-1 w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                          </div>
                        ) : (b as any).hideTail ? (
                           // Icon for tailless items
                           b.type === 'rectangle' ? <AlignLeft className="text-slate-300 group-hover:text-brand-400" /> :
                           b.type === 'circle' ? <div className="w-8 h-6 border-2 border-slate-300 rounded-full group-hover:border-brand-400"></div> :
                           <Shapes className="text-slate-300 group-hover:text-brand-400" />
                        ) : (
                          <MessageSquare className={`text-slate-300 group-hover:text-brand-400 ${
                             b.type === 'shout' || b.type === 'star' ? 'scale-125' : ''
                          }`} />
                        )}
                      </div>
                      <span className="text-xs text-slate-300 capitalize">{b.label}</span>
                    </div>
                  ))}
                 </div>
               </div>
             ))}
            
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Typography</h3>
            <div 
               draggable
               onDragStart={(e) => handleDragStart(e, 'text', { 
                 color: '#000000', 
                 fontSize: 24,
                 fontFamily: 'Ruslan Display'
               }, "ЗАГОЛОВОК")}
               onClick={() => handleClick('text', { 
                 color: '#000000', 
                 fontSize: 24,
                 fontFamily: 'Ruslan Display'
               }, "ЗАГОЛОВОК")}
               className="bg-slate-700 p-3 rounded hover:bg-slate-600 cursor-grab flex items-center gap-3"
            >
              <Type size={18} />
              <span className="font-banger text-xl tracking-wider">Big Header</span>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pop-Art Stickers</h3>
            <div className="grid grid-cols-2 gap-3">
               {STICKERS.map((sticker, i) => {
                 const previewSrc = generateStickerPreview(sticker.label, sticker.p, sticker.s, sticker.type as any);
                 return (
                    <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'sticker', {
                             backgroundColor: sticker.p, 
                             color: sticker.s,
                             shape: sticker.type
                        }, sticker.label)}
                        onClick={() => handleClick('sticker', {
                             backgroundColor: sticker.p, 
                             color: sticker.s,
                             shape: sticker.type
                        }, sticker.label)}
                        className="bg-slate-700 p-2 rounded hover:bg-slate-600 cursor-grab group transition-colors flex items-center justify-center"
                    >
                        <img src={previewSrc} alt={sticker.label} className="w-full h-auto drop-shadow-md group-hover:scale-105 transition-transform" />
                    </div>
                 );
               })}
            </div>
            
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Placeholders</h3>
             <div 
               draggable
               onDragStart={(e) => handleDragStart(e, 'image', {}, `https://picsum.photos/300/300?random=${Math.floor(Math.random() * 1000)}`)}
               onClick={() => handleClick('image', {}, `https://picsum.photos/300/300?random=${Math.floor(Math.random() * 1000)}`)}
               className="bg-slate-700 p-3 rounded hover:bg-slate-600 cursor-grab flex items-center gap-3"
            >
              <ImageIcon size={18} />
              <span className="text-sm">Random Image</span>
            </div>
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="space-y-4">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white p-3 rounded flex items-center justify-center gap-2 transition-colors"
             >
                <Upload size={16} /> Upload Image
             </button>

             <div className="grid grid-cols-2 gap-2">
                {uploadedImages.map((img, idx) => (
                  <div 
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'image', {}, img)}
                    onClick={() => handleClick('image', {}, img)}
                    className="aspect-square bg-slate-700 rounded overflow-hidden cursor-grab hover:ring-2 ring-brand-500"
                  >
                    <img src={img} alt="upload" className="w-full h-full object-cover" />
                  </div>
                ))}
                {uploadedImages.length === 0 && (
                  <div className="col-span-2 text-center text-xs text-slate-500 py-8">
                    No uploads yet
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};