import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Pencil, 
  Brush, 
  Eraser, 
  PaintBucket, 
  Pipette, 
  MousePointer2, 
  Cloud, 
  Wind,
  X,
  Check,
  Undo2,
  RotateCcw,
  Type
} from 'lucide-react';

interface DrawingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: string) => void;
  initialImage?: string;
  backgroundImage?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

type Tool = 'pencil' | 'brush' | 'airbrush' | 'eraser' | 'fill' | 'selection' | 'blur' | 'pipette';

export const DrawingEditor: React.FC<DrawingEditorProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialImage,
  backgroundImage,
  canvasWidth = 800,
  canvasHeight = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [opacity, setOpacity] = useState(100);
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selection, setSelection] = useState<{
    x: number, y: number, w: number, h: number,
    data: ImageData | null,
    isDragging: boolean,
    startX: number, startY: number
  } | null>(null);

  // Commit selection if tool changes
  useEffect(() => {
    if (currentTool !== 'selection' && selection?.data) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
         const tempCanvas = document.createElement('canvas');
         tempCanvas.width = selection.w;
         tempCanvas.height = selection.h;
         tempCanvas.getContext('2d')?.putImageData(selection.data, 0, 0);
         ctx.drawImage(tempCanvas, selection.x, selection.y);
         saveToHistory();
      }
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      overlayCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
      setSelection(null);
    }
  }, [currentTool, selection, canvasWidth, canvasHeight]);

  // Initialize canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill with white or initial image
      if (initialImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          saveToHistory();
        };
        img.src = initialImage;
      } else if (!backgroundImage) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      } else {
        // Just save empty transparent history
        saveToHistory();
      }

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = canvas.width;
        overlayCanvasRef.current.height = canvas.height;
      }
    }
  }, [isOpen]);

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, data].slice(-20); // Keep last 20 steps
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = history[newIndex];
    }
  };

  const reset = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      if (!backgroundImage) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      saveToHistory();
    }
  };

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const targetR = data[(startY * canvas.width + startX) * 4];
    const targetG = data[(startY * canvas.width + startX) * 4 + 1];
    const targetB = data[(startY * canvas.width + startX) * 4 + 2];
    const targetA = data[(startY * canvas.width + startX) * 4 + 3];

    // Convert hex to rgb
    const r = parseInt(fillColor.slice(1, 3), 16);
    const g = parseInt(fillColor.slice(3, 5), 16);
    const b = parseInt(fillColor.slice(5, 7), 16);

    if (targetR === r && targetG === g && targetB === b && targetA === 255) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(canvas.width * canvas.height);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * canvas.width + x;

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height || visited[idx]) continue;
      
      const pixelIdx = idx * 4;
      if (
        data[pixelIdx] === targetR &&
        data[pixelIdx + 1] === targetG &&
        data[pixelIdx + 2] === targetB &&
        data[pixelIdx + 3] === targetA
      ) {
        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
        visited[idx] = 1;

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveToHistory();
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'pipette') {
      const data = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const hex = '#' + [data[0], data[1], data[2]].map(x => x.toString(16).padStart(2, '0')).join('');
      setColor(hex);
      return;
    }

    if (currentTool === 'fill') {
      floodFill(Math.floor(pos.x), Math.floor(pos.y), color);
      return;
    }

    if (currentTool === 'selection') {
      if (selection && selection.data) {
        if (
          pos.x >= selection.x && pos.x <= selection.x + selection.w &&
          pos.y >= selection.y && pos.y <= selection.y + selection.h
        ) {
          setSelection({ ...selection, isDragging: true, startX: pos.x, startY: pos.y });
        } else {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
             const tempCanvas = document.createElement('canvas');
             tempCanvas.width = selection.w;
             tempCanvas.height = selection.h;
             tempCanvas.getContext('2d')?.putImageData(selection.data, 0, 0);
             ctx.drawImage(tempCanvas, selection.x, selection.y);
             saveToHistory();
          }
          const overlayCtx = overlayCanvasRef.current?.getContext('2d');
          overlayCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
          setSelection(null);
        }
      } else {
        setSelection({ x: pos.x, y: pos.y, w: 0, h: 0, data: null, isDragging: false, startX: pos.x, startY: pos.y });
        setIsDrawing(true);
      }
      return;
    }

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // Tool settings
    ctx.strokeStyle = currentTool === 'eraser' ? (backgroundImage ? 'rgba(0,0,0,1)' : '#ffffff') : color;
    if (currentTool === 'eraser' && backgroundImage) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = currentTool === 'airbrush' ? (0.1 * (opacity / 100)) : (opacity / 100);
    
    if (currentTool === 'brush') {
      ctx.shadowBlur = brushSize / 2;
      ctx.shadowColor = color;
    } else {
      ctx.shadowBlur = 0;
    }

    if (currentTool === 'blur') {
        ctx.filter = 'blur(4px)';
    } else {
        ctx.filter = 'none';
    }

    if (currentTool === 'airbrush') {
      const radius = brushSize / 2;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const offsetX = Math.cos(angle) * r;
        const offsetY = Math.sin(angle) * r;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.1 * (opacity / 100);
        ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
      }
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'selection') {
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      if (!overlayCtx) return;

      if (selection?.isDragging && selection.data) {
        const dx = pos.x - selection.startX;
        const dy = pos.y - selection.startY;
        const newX = selection.x + dx;
        const newY = selection.y + dy;
        
        overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = selection.w;
        tempCanvas.height = selection.h;
        tempCanvas.getContext('2d')?.putImageData(selection.data, 0, 0);
        overlayCtx.drawImage(tempCanvas, newX, newY);
        
        overlayCtx.strokeStyle = '#000000';
        overlayCtx.setLineDash([5, 5]);
        overlayCtx.strokeRect(newX, newY, selection.w, selection.h);
        overlayCtx.setLineDash([]);
        
        setSelection({ ...selection, x: newX, y: newY, startX: pos.x, startY: pos.y });
      } else if (isDrawing && selection) {
        const w = pos.x - selection.startX;
        const h = pos.y - selection.startY;
        
        overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        overlayCtx.strokeStyle = '#000000';
        overlayCtx.setLineDash([5, 5]);
        overlayCtx.strokeRect(selection.startX, selection.startY, w, h);
        overlayCtx.setLineDash([]);
        
        setSelection({ ...selection, w, h });
      }
      return;
    }

    if (!isDrawing) return;

    if (currentTool === 'airbrush') {
      const radius = brushSize / 2;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const offsetX = Math.cos(angle) * r;
        const offsetY = Math.sin(angle) * r;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
      }
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handleEnd = () => {
    if (currentTool === 'selection') {
      if (isDrawing && selection && !selection.data) {
        setIsDrawing(false);
        const x = Math.min(selection.startX, selection.startX + selection.w);
        const y = Math.min(selection.startY, selection.startY + selection.h);
        const w = Math.abs(selection.w);
        const h = Math.abs(selection.h);
        
        if (w > 0 && h > 0) {
          const ctx = canvasRef.current?.getContext('2d');
          const overlayCtx = overlayCanvasRef.current?.getContext('2d');
          if (ctx && overlayCtx) {
            const data = ctx.getImageData(x, y, w, h);
            ctx.clearRect(x, y, w, h);
            if (!backgroundImage) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x, y, w, h);
            }
            
            overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            tempCanvas.getContext('2d')?.putImageData(data, 0, 0);
            overlayCtx.drawImage(tempCanvas, x, y);
            
            overlayCtx.strokeStyle = '#000000';
            overlayCtx.setLineDash([5, 5]);
            overlayCtx.strokeRect(x, y, w, h);
            overlayCtx.setLineDash([]);
            
            setSelection({ x, y, w, h, data, isDragging: false, startX: 0, startY: 0 });
          }
        } else {
          setSelection(null);
        }
      } else if (selection?.isDragging) {
        setSelection({ ...selection, isDragging: false });
      }
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const getCursor = () => {
    if (currentTool === 'pipette') return 'crosshair';
    if (currentTool === 'fill') return 'crosshair';
    if (currentTool === 'selection') return 'crosshair';

    const cursorSize = Math.max(4, brushSize);
    const svg = `<svg width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="${cursorSize/2}" cy="${cursorSize/2}" r="${cursorSize/2 - 0.5}" fill="none" stroke="#000000" stroke-width="1"/><circle cx="${cursorSize/2}" cy="${cursorSize/2}" r="${cursorSize/2 - 0.5}" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="2,2"/></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cursorSize/2} ${cursorSize/2}, crosshair`;
  };

  if (!isOpen) return null;

  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'brush', icon: Brush, label: 'Brush' },
    { id: 'airbrush', icon: Wind, label: 'Airbrush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'fill', icon: PaintBucket, label: 'Fill' },
    { id: 'selection', icon: MousePointer2, label: 'Select' },
    { id: 'blur', icon: Cloud, label: 'Blur' },
    { id: 'pipette', icon: Pipette, label: 'Picker' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center sm:p-4">
      <div className="bg-slate-900 sm:border border-slate-700 sm:rounded-2xl shadow-2xl flex flex-col max-w-5xl w-full h-full sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 rounded-lg">
              <Pencil className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">Drawing Studio</h2>
              <p className="text-xs text-slate-400">Create your own assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-30">
              <Undo2 size={20} />
            </button>
            <button onClick={reset} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
              <RotateCcw size={20} />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-20 shrink-0 border-r border-slate-700 p-2 flex flex-col gap-2 bg-slate-800/30 overflow-y-auto custom-scrollbar">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id as Tool)}
                className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 shrink-0 ${
                  currentTool === tool.id 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 scale-105' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title={tool.label}
              >
                <tool.icon size={18} />
                <span className="text-[9px] font-medium uppercase tracking-tighter">{tool.label}</span>
              </button>
            ))}
            
            <div className="mt-auto flex flex-col gap-4 items-center pb-2 pt-4 shrink-0">
              <div className="relative group">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Color
                </div>
              </div>
              
              <div className="flex flex-col gap-2 items-center">
                <div className="w-1 h-20 bg-slate-700 rounded-full relative">
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="absolute inset-0 w-20 h-1 -rotate-90 origin-center translate-y-10 -translate-x-10 cursor-pointer accent-brand-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{brushSize}px</span>
              </div>

              <div className="flex flex-col gap-2 items-center mt-2">
                <div className="w-1 h-20 bg-slate-700 rounded-full relative">
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={opacity} 
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    className="absolute inset-0 w-20 h-1 -rotate-90 origin-center translate-y-10 -translate-x-10 cursor-pointer accent-purple-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{opacity}%</span>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-slate-950 p-8 flex items-center justify-center overflow-auto custom-scrollbar">
            <div 
              className="relative shadow-2xl rounded-sm overflow-hidden bg-white"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                className="touch-none"
                style={{ cursor: getCursor() }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Ready to draw</span>
            <span>{canvasWidth} x {canvasHeight} px</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-400 hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL())}
              className="px-8 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <Check size={18} />
              Add to Comic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
