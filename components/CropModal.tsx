import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, Move, Check, Maximize } from 'lucide-react';
import { CropData } from '../types';

interface CropModalProps {
  image: string;
  initialCrop?: CropData;
  aspectRatio: number; // element width / element height
  elementWidth: number;
  elementHeight: number;
  onSave: (crop: CropData) => void;
  onCancel: () => void;
}

export const CropModal: React.FC<CropModalProps> = ({ 
  image, 
  initialCrop, 
  aspectRatio, 
  elementWidth,
  elementHeight,
  onSave, 
  onCancel 
}) => {
  const [scale, setScale] = useState(initialCrop?.scale || 1);
  const [pos, setPos] = useState({ x: initialCrop?.x || 0, y: initialCrop?.y || 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{w: number, h: number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Constants for display
  const MAX_VIEW_WIDTH = 500;
  const MAX_VIEW_HEIGHT = 500;

  // Calculate view dimensions (the box in the modal)
  // We want it to be as big as possible within MAX_VIEW, maintaining aspect ratio of the element
  let viewW = MAX_VIEW_WIDTH;
  let viewH = viewW / aspectRatio;

  if (viewH > MAX_VIEW_HEIGHT) {
      viewH = MAX_VIEW_HEIGHT;
      viewW = viewH * aspectRatio;
  }

  // Calculate the visual scale factor:
  // How many view pixels represent one actual element pixel?
  // viewScale = viewW / elementWidth
  const viewScale = viewW / elementWidth;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { x: pos.x, y: pos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startMouseRef.current.x;
    const dy = e.clientY - startMouseRef.current.y;
    
    // We need to convert the mouse delta (modal pixels) to element pixels
    // deltaElement = deltaMouse / viewScale
    const dXElement = dx / viewScale;
    const dYElement = dy / viewScale;

    setPos({
        x: startPosRef.current.x + dXElement,
        y: startPosRef.current.y + dYElement
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave({ x: pos.x, y: pos.y, scale });
  };

  const handleFitCover = () => {
      if (!naturalSize) return;
      
      // We want to simulate 'object-fit: cover' centered
      // 1. Determine which dimension is the constraining one for 'cover'
      // The image has naturalSize.w and .h
      // The container has elementWidth and elementHeight
      
      // Calculate Scale needed to match width
      const scaleW = elementWidth / naturalSize.w;
      // Calculate Scale needed to match height
      const scaleH = elementHeight / naturalSize.h;
      
      // For Cover, we take the larger scale
      const coverScale = Math.max(scaleW, scaleH);
      
      // Now we need to center it.
      // At scale 1 (width=100% of container), the image width is elementWidth.
      // Wait, in CanvasElement logic: width is 100% of container.
      // So natural scale (scale=1) means image width == element width.
      
      // If we assume the image CSS is width: 100%; height: auto; (standard for HTML img in div)
      // Then current rendered height at scale 1 is: elementWidth * (naturalH / naturalW)
      const renderedHAtScale1 = elementWidth * (naturalSize.h / naturalSize.w);
      
      // We want to cover. 
      // If renderedH < elementH, we need to scale up.
      // Target Scale = elementH / renderedHAtScale1
      
      let targetScale = 1;
      
      if (renderedHAtScale1 < elementHeight) {
          targetScale = elementHeight / renderedHAtScale1;
      }
      
      // Center logic:
      // We want the center of the image to be at the center of the box.
      // Box Center: elementWidth/2, elementHeight/2
      // Image Center relative to top-left of image: (elementWidth * targetScale) / 2, (renderedHAtScale1 * targetScale) / 2
      
      // The transform origin is 0,0. 
      // x = BoxCenter.x - ImageCenter.x
      // x = (elementWidth/2) - (elementWidth * targetScale / 2)
      // x = elementWidth * (1 - targetScale) / 2
      
      const newX = (elementWidth * (1 - targetScale)) / 2;
      const newY = (elementHeight - (renderedHAtScale1 * targetScale)) / 2;
      
      setScale(targetScale);
      setPos({ x: newX, y: newY });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setNaturalSize({
          w: e.currentTarget.naturalWidth,
          h: e.currentTarget.naturalHeight
      });
      // If this is the first open (no crop set), auto fit?
      // For now let's just let user click the button or use default
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl w-[560px]" onMouseUp={handleMouseUp}>
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             <Move size={20} className="text-brand-500" /> Adjust Image
           </h3>
           <button onClick={onCancel} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex justify-center mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800 select-none">
           {/* Mask Container representing the Element */}
           <div 
             ref={containerRef}
             style={{ 
               width: viewW, 
               height: viewH, 
               overflow: 'hidden',
               position: 'relative',
               cursor: isDragging ? 'grabbing' : 'grab',
               border: '2px solid #334155',
               backgroundColor: '#1e293b'
             }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseUp}
           >
              {/* 
                 To Simulate the CanvasElement:
                 The CanvasElement has width: elementWidth.
                 Here we have width: viewW.
                 So we visually scale everything by viewScale.
                 
                 Inside the CanvasElement, the img has width: 100% (so it matches elementWidth).
                 So here, the img should have width: 100% (matches viewW).
                 
                 The transform is translate(x, y) scale(scale).
                 Since x, y are in element pixels, we must multiply them by viewScale for visual display here.
              */}
              <img 
                ref={imageRef}
                src={image} 
                onLoad={handleImageLoad}
                draggable={false}
                alt="Crop target"
                style={{
                  width: '100%',
                  // transform origin 0 0 matches the logic in CanvasElement
                  transformOrigin: '0 0',
                  transform: `translate(${pos.x * viewScale}px, ${pos.y * viewScale}px) scale(${scale})`,
                  maxWidth: 'none', 
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none' // Let clicks pass to container
                }}
              />
           </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ZoomIn size={18} className="text-slate-400" />
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.05" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 w-12 text-right">{Math.round(scale * 100)}%</span>
            
            <button 
              onClick={handleFitCover}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
              title="Fit to Cover"
            >
                <Maximize size={14} /> Fit
            </button>
          </div>

          <div className="flex gap-2 pt-2">
             <button 
               onClick={onCancel}
               className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium"
             >
               Cancel
             </button>
             <button 
               onClick={handleSave}
               className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
             >
               <Check size={16} /> Apply Changes
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};