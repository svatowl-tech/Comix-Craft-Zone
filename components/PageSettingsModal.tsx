import React, { useState, useEffect } from 'react';
import { X, Check, Grid, Smartphone, Book, Monitor } from 'lucide-react';

interface PageSettingsModalProps {
  initialWidth: number;
  initialHeight: number;
  onSave: (width: number, height: number) => void;
  onClose: () => void;
}

type Unit = 'px' | 'cm' | 'mm' | 'in';

// 96 DPI is standard for web CSS pixels
const UNIT_RATES: Record<Unit, number> = {
  px: 1,
  in: 96,
  cm: 37.795,
  mm: 3.7795
};

const PRESETS = [
  { label: 'Comic Book', w: 800, h: 1200, icon: <Book size={16}/>, desc: 'Standard Portrait' },
  { label: 'A4 (Screen)', w: 794, h: 1123, icon: <Book size={16}/>, desc: '210 x 297 mm' },
  { label: 'A5 (Screen)', w: 559, h: 794, icon: <Book size={16}/>, desc: '148 x 210 mm' },
  { label: 'Instagram', w: 1080, h: 1080, icon: <Smartphone size={16}/>, desc: 'Square 1:1' },
  { label: 'Story (HD)', w: 1080, h: 1920, icon: <Smartphone size={16}/>, desc: '9:16 Mobile' },
  { label: 'Webtoon', w: 800, h: 3000, icon: <Grid size={16}/>, desc: 'Vertical Scroll' },
  { label: 'Full HD', w: 1920, h: 1080, icon: <Monitor size={16}/>, desc: '16:9 Landscape' },
];

export const PageSettingsModal: React.FC<PageSettingsModalProps> = ({ 
  initialWidth, 
  initialHeight, 
  onSave, 
  onClose 
}) => {
  const [unit, setUnit] = useState<Unit>('px');
  // Internal state stores current value in the SELECTED unit
  const [valW, setValW] = useState(initialWidth);
  const [valH, setValH] = useState(initialHeight);

  // Convert values when unit changes
  const handleUnitChange = (newUnit: Unit) => {
    // Convert current values back to pixels first
    const pxW = valW * UNIT_RATES[unit];
    const pxH = valH * UNIT_RATES[unit];

    // Then convert pixels to new unit
    const newW = pxW / UNIT_RATES[newUnit];
    const newH = pxH / UNIT_RATES[newUnit];

    setUnit(newUnit);
    setValW(parseFloat(newW.toFixed(2)));
    setValH(parseFloat(newH.toFixed(2)));
  };

  const handlePresetClick = (pxW: number, pxH: number) => {
    // Presets are defined in pixels. Convert to current unit.
    const newW = pxW / UNIT_RATES[unit];
    const newH = pxH / UNIT_RATES[unit];
    setValW(parseFloat(newW.toFixed(2)));
    setValH(parseFloat(newH.toFixed(2)));
  };

  const handleSave = () => {
    // Convert whatever is currently set back to pixels for the app
    const finalW = Math.round(valW * UNIT_RATES[unit]);
    const finalH = Math.round(valH * UNIT_RATES[unit]);
    onSave(finalW, finalH);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             Page Setup
           </h3>
           <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Dimensions Input */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Width</label>
                    <input 
                        type="number" 
                        value={valW}
                        onChange={(e) => setValW(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Height</label>
                    <input 
                        type="number" 
                        value={valH}
                        onChange={(e) => setValH(parseFloat(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-brand-500 outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                    <select 
                        value={unit}
                        onChange={(e) => handleUnitChange(e.target.value as Unit)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-brand-500 outline-none"
                    >
                        <option value="px">Pixels</option>
                        <option value="cm">Centimeters</option>
                        <option value="mm">Millimeters</option>
                        <option value="in">Inches</option>
                    </select>
                </div>
            </div>

            {/* Presets Grid */}
            <div>
                <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider font-semibold">Presets</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {PRESETS.map((p, i) => (
                        <button 
                            key={i}
                            onClick={() => handlePresetClick(p.w, p.h)}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-brand-500 transition-all text-left group"
                        >
                            <div className="p-2 bg-slate-900 rounded text-slate-400 group-hover:text-brand-400">
                                {p.icon}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">{p.label}</div>
                                <div className="text-xs text-slate-500">{p.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Note */}
            <div className="text-xs text-slate-500 italic bg-slate-800/30 p-2 rounded">
                Note: Standard Web DPI (96) is used for conversions.
            </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-800 bg-slate-800/50">
             <button 
               onClick={onClose}
               className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
             >
               Cancel
             </button>
             <button 
               onClick={handleSave}
               className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-900/20"
             >
               <Check size={16} /> Apply Size
             </button>
        </div>

      </div>
    </div>
  );
};