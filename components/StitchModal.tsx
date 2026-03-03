import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, Plus } from 'lucide-react';

interface StitchModalProps {
  onClose: () => void;
  onComplete: (images: { url: string, ratio: number }[], shouldNumber: boolean) => void;
}

export const StitchModal: React.FC<StitchModalProps> = ({ onClose, onComplete }) => {
  const [files, setFiles] = useState<{ file: File, preview: string, ratio: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldNumber, setShouldNumber] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    const newFiles: { file: File, preview: string, ratio: number }[] = [];

    for (const file of selectedFiles) {
      const preview = URL.createObjectURL(file);
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
        img.onerror = () => resolve(1);
        img.src = preview;
      });
      newFiles.push({ file, preview, ratio });
    }

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleComplete = () => {
    if (files.length === 0) return;
    onComplete(files.map(f => ({ url: f.preview, ratio: f.ratio })), shouldNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <Plus className="text-brand-500" /> Create Stitch (Склейка)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center gap-3 hover:border-brand-500 hover:bg-brand-500/5 transition-all cursor-pointer group mb-6"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="text-slate-400 group-hover:text-brand-500" size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Click to upload images</p>
              <p className="text-slate-500 text-sm mt-1">Batch upload supported (PNG, JPG, WEBP)</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
              accept="image/*" 
            />
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file, idx) => (
                <div key={idx} className="relative group aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                  <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => removeFile(idx)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                    {file.ratio.toFixed(2)}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="aspect-square bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
                  <Loader2 className="animate-spin text-brand-500" size={24} />
                </div>
              )}
            </div>
          )}

          {files.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <ImageIcon size={48} className="opacity-20 mb-2" />
              <p>No images selected yet</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-800/30 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={shouldNumber}
                onChange={(e) => setShouldNumber(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-slate-600 rounded bg-slate-800 peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all"></div>
              <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-1 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-slate-300 text-sm font-medium group-hover:text-white transition-colors">Numbering (Пронумеровать)</span>
          </label>

          <div className="flex-1"></div>

          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleComplete}
            disabled={files.length === 0 || isProcessing}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-900/20"
          >
            Generate Stitch ({files.length} images)
          </button>
        </div>
      </div>
    </div>
  );
};
