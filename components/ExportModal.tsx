import React, { useState, useRef } from 'react';
import { Download, X, FileImage, FileType, CheckCircle, Loader2 } from 'lucide-react';
import { ComicProject } from '../types';
import { CanvasElement } from './CanvasElement';

interface ExportModalProps {
  project: ComicProject;
  onClose: () => void;
}

type ExportFormat = 'jpg' | 'png' | 'pdf';
type ExportMode = 'single' | 'separate'; // Single file (PDF/ZIP) or Separate downloads

export const ExportModal: React.FC<ExportModalProps> = ({ project, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [selectedPages, setSelectedPages] = useState<string[]>(project.pages.map(p => p.id));
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('single');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const renderContainerRef = useRef<HTMLDivElement>(null);

  const togglePage = (id: string) => {
    setSelectedPages(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id].sort((a, b) => {
            const pa = project.pages.find(p => p.id === a)?.order || 0;
            const pb = project.pages.find(p => p.id === b)?.order || 0;
            return pa - pb;
        })
    );
  };

  const handleExport = async () => {
    if (selectedPages.length === 0) return;
    setIsExporting(true);
    setStatusMessage('Loading libraries...');

    try {
      // Dynamic imports to reduce initial bundle size
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const JSZip = (await import('jszip')).default;

      setStatusMessage('Rendering pages...');

      const container = renderContainerRef.current;
      if (!container) throw new Error("Render container not found");

      const pagesToExport = project.pages
        .filter(p => selectedPages.includes(p.id))
        .sort((a, b) => a.order - b.order);

      const images: { data: string, width: number, height: number, name: string }[] = [];

      // 1. Render all selected pages to Canvas -> DataURL
      for (const page of pagesToExport) {
        const pageEl = container.querySelector(`[data-page-id="${page.id}"]`) as HTMLElement;
        if (!pageEl) continue;

        // Wait for images to be ready (rudimentary check)
        const imgElements = pageEl.getElementsByTagName('img');
        await Promise.all(Array.from(imgElements).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        }));

        const canvas = await html2canvas(pageEl, {
          scale: 2, // Better quality
          useCORS: true,
          logging: false,
          backgroundColor: page.background || '#ffffff'
        });

        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        images.push({
          data: canvas.toDataURL(mimeType, 0.9),
          width: canvas.width,
          height: canvas.height,
          name: `page_${page.order + 1}`
        });
      }

      setStatusMessage('Generating file...');
      const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'comic';

      // 2. Handle Output Format
      if (format === 'pdf') {
        const pdf = new jsPDF({
           orientation: images[0].width > images[0].height ? 'l' : 'p',
           unit: 'px',
           format: [images[0].width, images[0].height] // Initial format based on first page
        });

        images.forEach((img, index) => {
           if (index > 0) {
               pdf.addPage([img.width, img.height], img.width > img.height ? 'l' : 'p');
           }
           pdf.addImage(img.data, format === 'jpg' ? 'JPEG' : 'PNG', 0, 0, img.width, img.height);
        });

        if (exportMode === 'single') {
            pdf.save(`${safeTitle}.pdf`);
        } else {
            const zip = new JSZip();
            images.forEach((img, i) => {
                const singlePdf = new jsPDF({
                    orientation: img.width > img.height ? 'l' : 'p',
                    unit: 'px',
                    format: [img.width, img.height]
                });
                singlePdf.addImage(img.data, format === 'jpg' ? 'JPEG' : 'PNG', 0, 0, img.width, img.height);
                const pdfBlob = singlePdf.output('blob');
                zip.file(`${safeTitle}_page_${i+1}.pdf`, pdfBlob);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${safeTitle}_pages.zip`;
            link.click();
        }
      } 
      else {
        // Image Formats (JPG/PNG)
        if (images.length === 1 && exportMode === 'single') {
            const link = document.createElement('a');
            link.href = images[0].data;
            link.download = `${safeTitle}_page_${pagesToExport[0].order + 1}.${format}`;
            link.click();
        } else if (exportMode === 'single') {
            // Multiple images requested as single -> ZIP Archive
            const zip = new JSZip();
            images.forEach(img => {
                const base64Data = img.data.split(',')[1];
                zip.file(`${img.name}.${format}`, base64Data, { base64: true });
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${safeTitle}_images.zip`;
            link.click();
        } else {
             // Separate Downloads
             images.forEach((img) => {
                const link = document.createElement('a');
                link.href = img.data;
                link.download = `${img.name}.${format}`;
                link.click();
             });
        }

        onClose();
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. See console for details.");
    } finally {
      setIsExporting(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             <Download size={20} className="text-brand-500" /> Export Project
           </h3>
           <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            
            <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column: Settings */}
                <div className="space-y-6">
                    
                    {/* Format Selection */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3 block">File Format</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['png', 'jpg', 'pdf'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                                        format === f 
                                        ? 'border-brand-500 bg-brand-900/20 text-white' 
                                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    {f === 'pdf' ? <FileType size={24} /> : <FileImage size={24} />}
                                    <span className="text-sm font-bold mt-1 uppercase">{f}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                     {/* Export Mode */}
                     <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3 block">Download Mode</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                                <input 
                                    type="radio" 
                                    name="mode" 
                                    checked={exportMode === 'single'} 
                                    onChange={() => setExportMode('single')}
                                    className="w-4 h-4 text-brand-500 bg-slate-900 border-slate-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-medium text-slate-200">
                                        {format === 'pdf' ? 'Single PDF File' : 'ZIP Archive / Single File'}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {format === 'pdf' ? 'All pages in one document' : 'Best for multiple images'}
                                    </div>
                                </div>
                            </label>
                            
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                                <input 
                                    type="radio" 
                                    name="mode" 
                                    checked={exportMode === 'separate'} 
                                    onChange={() => setExportMode('separate')}
                                    className="w-4 h-4 text-brand-500 bg-slate-900 border-slate-600 focus:ring-brand-500"
                                />
                                <div>
                                    <div className="text-sm font-medium text-slate-200">
                                        Separate Files
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Download each page individually
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Right Column: Page Selection */}
                <div>
                     <div className="flex justify-between items-center mb-3">
                        <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Select Pages</label>
                        <button 
                            onClick={() => setSelectedPages(selectedPages.length === project.pages.length ? [] : project.pages.map(p => p.id))}
                            className="text-xs text-brand-400 hover:text-brand-300"
                        >
                            {selectedPages.length === project.pages.length ? 'Deselect All' : 'Select All'}
                        </button>
                     </div>
                     
                     <div className="border border-slate-700 rounded-lg bg-slate-950/50 max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {project.pages.map((page, idx) => (
                            <div 
                                key={page.id}
                                onClick={() => togglePage(page.id)}
                                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                    selectedPages.includes(page.id) ? 'bg-brand-900/20 border border-brand-500/30' : 'hover:bg-slate-800 border border-transparent'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                    selectedPages.includes(page.id) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-600 bg-slate-900'
                                }`}>
                                    {selectedPages.includes(page.id) && <CheckCircle size={14} />}
                                </div>
                                <span className="text-sm text-slate-300 font-medium">Page {idx + 1}</span>
                                <span className="text-xs text-slate-600 ml-auto">{page.elements.length} elements</span>
                            </div>
                        ))}
                     </div>
                </div>
            </div>

        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-800/50 flex gap-3">
             <button 
               onClick={onClose}
               disabled={isExporting}
               className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
             >
               Cancel
             </button>
             <button 
               onClick={handleExport}
               disabled={isExporting || selectedPages.length === 0}
               className="flex-[2] py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
               {isExporting ? (statusMessage || 'Processing...') : `Download ${selectedPages.length} Page${selectedPages.length !== 1 ? 's' : ''}`}
             </button>
        </div>

      </div>

      {/* Hidden Render Container */}
      {/* We position it way off-screen but keep it 'visible' so html2canvas can render it. */}
      <div 
        ref={renderContainerRef} 
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: -10000, 
            pointerEvents: 'none',
            zIndex: -1 
        }}
      >
        {project.pages.map(page => (
            <div 
                key={page.id} 
                data-page-id={page.id}
                className="relative bg-white comic-paper overflow-hidden"
                style={{ 
                    width: page.width || 800, 
                    height: page.height || 1000,
                    marginBottom: 20 // Spacing just in case
                }}
            >
                {/* Re-using Canvas rendering logic but ensuring selection is false */}
                {page.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                    <CanvasElement 
                        key={el.id} 
                        element={{ ...el, selected: false }} // FORCE NOT SELECTED 
                        onMouseDown={() => {}} // No-op
                    />
                ))}
            </div>
        ))}
      </div>

    </div>
  );
};