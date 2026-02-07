import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Library } from './components/Library';
import { PropertyPanel } from './components/PropertyPanel';
import { CanvasElement } from './components/CanvasElement';
import { CropModal } from './components/CropModal';
import { PageSettingsModal } from './components/PageSettingsModal';
import { ExportModal } from './components/ExportModal';
import { Header } from './components/Header';
import { PageNavigator } from './components/PageNavigator';
import { ComicProject, ComicElement, DragItem, ComicPage, CropData } from './types';
import { generateAlgorithmicLayout, generateTemplateLayout } from './utils/layoutGenerator';
import { saveProjectToFile, loadProjectFromFile } from './utils/storage';

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1000;

export default function App() {
  // -- State --
  const [project, setProject] = useState<ComicProject>({
    id: 'proj-1',
    title: 'New Comic',
    activePageId: 'page-1',
    pages: [{ id: 'page-1', order: 0, background: '#ffffff', elements: [] }]
  });

  const [history, setHistory] = useState<ComicProject[]>([]);
  const [future, setFuture] = useState<ComicProject[]>([]);
  
  const [zoom, setZoom] = useState(0.8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  // UI State
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  
  // Modals
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const elementStartRef = useRef<{ x: number, y: number, w: number, h: number } | null>(null);
  const dragStartProjectState = useRef<ComicProject | null>(null);

  // -- Derived Data --
  const activePage = project.pages.find(p => p.id === project.activePageId) || project.pages[0];
  const selectedElement = activePage.elements.find(el => el.id === selectedId) || null;
  const cropTargetElement = activePage.elements.find(el => el.id === cropTargetId) || null;
  const currentWidth = activePage.width || PAGE_WIDTH;
  const currentHeight = activePage.height || PAGE_HEIGHT;

  // -- Initialization --
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setIsLibraryOpen(false);
            setIsPropertiesOpen(false);
            const scale = (window.innerWidth - 40) / PAGE_WIDTH;
            setZoom(Math.max(0.3, Math.min(1.0, scale)));
        } else {
            setIsLibraryOpen(true);
            setIsPropertiesOpen(true);
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // -- History Logic --
  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev, project]);
    setFuture([]);
  }, [project]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [project, ...prev]);
    setHistory(history.slice(0, -1));
    setProject(previous);
  }, [history, project]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, project]);
    setFuture(future.slice(1));
    setProject(next);
  }, [future, project]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            e.shiftKey ? handleRedo() : handleUndo();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            handleRedo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // -- Project Actions --
  const handleSaveProject = async () => {
    await saveProjectToFile(project);
  };

  const handleLoadProject = async (file: File) => {
    try {
      const loadedProject = await loadProjectFromFile(file);
      // Validate loaded project has activePageId or set it
      if (!loadedProject.activePageId && loadedProject.pages.length > 0) {
        loadedProject.activePageId = loadedProject.pages[0].id;
      }
      
      setProject(loadedProject);
      // Clear history as this is a new session state
      setHistory([]);
      setFuture([]);
      setSelectedId(null);
    } catch (error) {
      alert("Failed to load project. Please check if the file is a valid JSON comic project.");
      console.error(error);
    }
  };

  const addPage = () => {
    saveHistory();
    const newPage: ComicPage = {
      id: `page-${Date.now()}`,
      order: project.pages.length,
      background: '#ffffff',
      elements: [],
      width: activePage.width || PAGE_WIDTH,
      height: activePage.height || PAGE_HEIGHT
    };
    setProject(prev => ({ ...prev, pages: [...prev.pages, newPage], activePageId: newPage.id }));
  };

  const updateActivePage = (updates: Partial<ComicPage>) => {
      setProject(prev => ({
          ...prev,
          pages: prev.pages.map(p => p.id === prev.activePageId ? { ...p, ...updates } : p)
      }));
  };

  const handlePageResize = (w: number, h: number) => {
    saveHistory();
    updateActivePage({ width: w, height: h });
    setIsPageSettingsOpen(false);
  };

  const updateElement = useCallback((id: string, updates: Partial<ComicElement>) => {
    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(p => p.id !== prev.activePageId ? p : {
          ...p,
          elements: p.elements.map(el => el.id === id ? { ...el, ...updates } : el)
      })
    }));
  }, []); 

  const updateElementWithHistory = useCallback((id: string, updates: Partial<ComicElement>) => {
      saveHistory();
      updateElement(id, updates);
  }, [saveHistory, updateElement]);

  const deleteElement = (id: string) => {
    saveHistory();
    setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
            ...p, elements: p.elements.filter(e => e.id !== id)
        })
    }));
    setSelectedId(null);
  };
  
  const duplicateElement = (id: string) => {
      saveHistory();
      const el = activePage.elements.find(e => e.id === id);
      if(!el) return;
      const newEl = { ...el, id: `el-${Date.now()}`, x: el.x + 20, y: el.y + 20, selected: true };
      
      setProject(prev => ({
          ...prev,
          pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
              ...p, elements: [...p.elements.map(e => ({...e, selected: false})), newEl] 
          })
      }));
      setSelectedId(newEl.id);
  };

  const changeLayer = (id: string, dir: 'up' | 'down') => {
      saveHistory();
      const el = activePage.elements.find(e => e.id === id);
      if(!el) return;
      const newZ = dir === 'up' ? el.zIndex + 1 : Math.max(0, el.zIndex - 1);
      updateElement(id, { zIndex: newZ });
  };

  const handleCropSave = (crop: CropData) => {
    if (cropTargetId) {
      saveHistory();
      const style = activePage.elements.find(e => e.id === cropTargetId)?.style;
      updateElement(cropTargetId, { style: { ...style, crop } });
      setCropTargetId(null);
    }
  };

  // -- Layout Generation Calls --
  const handleGenerateLayout = (count: number) => {
      saveHistory();
      const { elements } = generateAlgorithmicLayout({ count, currentWidth, currentHeight });
      updateActivePage({ elements });
      setSelectedId(null);
      if (window.innerWidth < 1024) setIsLibraryOpen(false);
  };

  const applyTemplate = (layoutId: string) => {
     saveHistory();
     const { elements, width, height } = generateTemplateLayout({ layoutId, currentWidth, currentHeight });
     updateActivePage({ elements, width, height });
     setSelectedId(null);
     if (window.innerWidth < 1024) setIsLibraryOpen(false);
  };

  // -- Interactions (Drag & Drop) --

  const addItemToCanvas = async (item: DragItem, xPos?: number, yPos?: number) => {
     saveHistory();
     const centerX = xPos ?? (currentWidth / 2 - 50);
     const centerY = yPos ?? (Math.min(currentHeight/2, 500) - 50);

     let width = item.type === 'text' ? 200 : 100;
     let height = item.type === 'text' ? 50 : 100;

     if (item.type === 'image' && item.content) {
         try {
             const { w, h } = await new Promise<{w: number, h: number}>((resolve, reject) => {
                 const img = new Image();
                 img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                 img.onerror = reject;
                 img.src = item.content!;
             });
             const maxSize = 300; 
             const ratio = w / h;
             if (w > h) { width = Math.min(w, maxSize); height = width / ratio; } 
             else { height = Math.min(h, maxSize); width = height * ratio; }
         } catch (e) { console.error("Image load error", e); }
     }

     const newElement: ComicElement = {
        id: `el-${Date.now()}`,
        type: item.type,
        x: centerX, y: centerY, width, height,
        rotation: 0, zIndex: activePage.elements.length + 1,
        content: item.content, style: item.style, selected: true
      };
  
      setProject(prev => ({
          ...prev,
          pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
              ...p, elements: [...p.elements.map(e => ({...e, selected: false})), newElement]
          })
      }));
      setSelectedId(newElement.id);
      if (window.innerWidth < 1024) { setIsLibraryOpen(false); setIsPropertiesOpen(true); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    const item: DragItem = JSON.parse(data);
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / zoom;
    const dropY = (e.clientY - rect.top) / zoom;

    // Drop Image into Frame Logic
    if (item.type === 'image') {
       const sortedElements = [...activePage.elements].sort((a, b) => b.zIndex - a.zIndex);
       const targetFrame = sortedElements.find(el => 
          el.type === 'frame' && dropX >= el.x && dropX <= el.x + el.width && dropY >= el.y && dropY <= el.y + el.height
       );
       if (targetFrame) {
         saveHistory();
         updateElement(targetFrame.id, { content: item.content, style: { ...targetFrame.style, crop: undefined } });
         return;
       }
    }
    addItemToCanvas(item, dropX - 50, dropY - 50);
  };

  const handleCanvasMouseDown = () => {
    setSelectedId(null);
    setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
            ...p, elements: p.elements.map(e => ({...e, selected: false})) 
        })
    }));
    if (window.innerWidth < 1024) setIsPropertiesOpen(false);
  };

  const handleElementMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
    e.stopPropagation(); 
    setSelectedId(id);
    setDragMode(type);
    setIsDragging(true);
    setIsPropertiesOpen(true);
    
    dragStartProjectState.current = project;
    
    // Select logic
    setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
            ...p, elements: p.elements.map(el => ({...el, selected: el.id === id})) 
        })
    }));

    const el = project.pages.find(p => p.id === project.activePageId)?.elements.find(e => e.id === id);
    if (el) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      elementStartRef.current = { x: el.x, y: el.y, w: el.width, h: el.height };
    }
  }, [project]);

  // Global Mouse Handlers for Dragging
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !elementStartRef.current || !selectedId || !dragMode) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    const start = elementStartRef.current;
    const snap = (val: number) => Math.round(val / 10) * 10;

    if (dragMode === 'move') {
      updateElement(selectedId, { x: snap(start.x + dx), y: snap(start.y + dy) });
    } else if (dragMode === 'resize') {
      updateElement(selectedId, { width: Math.max(20, snap(start.w + dx)), height: Math.max(20, snap(start.h + dy)) });
    }
  }, [isDragging, selectedId, dragMode, zoom, updateElement]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging && dragStartProjectState.current) {
        setHistory(prev => [...prev, dragStartProjectState.current!]);
        setFuture([]);
    }
    setIsDragging(false);
    setDragMode(null);
    dragStartRef.current = null;
    elementStartRef.current = null;
    dragStartProjectState.current = null;
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);


  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Header 
        onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
        onToggleProperties={() => setIsPropertiesOpen(!isPropertiesOpen)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenPageSettings={() => setIsPageSettingsOpen(true)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenExport={() => setIsExportModalOpen(true)}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div className={`${isLibraryOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 w-72 z-40 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none h-full`}>
            <div className="h-full flex flex-col relative">
                <button onClick={() => setIsLibraryOpen(false)} className="lg:hidden absolute top-2 right-2 z-50 p-2 bg-slate-900/80 rounded-full text-white"><ZoomOut className="rotate-45" size={20}/></button>
                <Library 
                    onDragStart={() => {}} 
                    onItemClick={(item) => addItemToCanvas(item)}
                    onApplyTemplate={applyTemplate}
                    onGenerateLayout={handleGenerateLayout}
                    uploadedImages={uploadedImages}
                    onUploadImage={(url) => setUploadedImages(p => [url, ...p])}
                />
            </div>
        </div>

        {/* Center Canvas */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col" onClick={() => { if(window.innerWidth < 1024) {} }}>
            {/* Zoom Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 p-1.5 rounded-xl flex gap-1 z-20 shadow-xl pointer-events-auto">
               <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomOut size={18} /></button>
               <span className="px-2 flex items-center text-xs font-mono text-slate-400 w-12 justify-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomIn size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y">
                <div 
                  className="bg-white shadow-2xl relative comic-paper transition-transform duration-75 origin-top"
                  style={{ width: currentWidth, height: currentHeight, transform: `scale(${zoom})`, flexShrink: 0 }}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onMouseDown={handleCanvasMouseDown}
                >
                    {activePage.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                        <CanvasElement key={el.id} element={el} onMouseDown={handleElementMouseDown} />
                    ))}
                    <div className="absolute bottom-2 right-4 text-slate-400 text-xs font-comic opacity-50 pointer-events-none">
                        Page {activePage.order + 1}
                    </div>
                </div>
            </div>

            <PageNavigator 
                pages={project.pages}
                activePageId={project.activePageId}
                onPageSelect={(id) => setProject(p => ({...p, activePageId: id}))}
                onAddPage={addPage}
            />
        </main>

        {/* Right Sidebar */}
        <div className={`${isPropertiesOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 right-0 w-72 z-40 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none h-full`}>
            <PropertyPanel 
               element={selectedElement}
               onUpdate={updateElementWithHistory}
               onDelete={deleteElement}
               onDuplicate={duplicateElement}
               onLayerChange={changeLayer}
               onOpenCrop={(id) => setCropTargetId(id)}
               onClose={() => setIsPropertiesOpen(false)}
            />
        </div>
      </div>

      {cropTargetElement && cropTargetElement.content && (
         <CropModal 
            image={cropTargetElement.content}
            aspectRatio={cropTargetElement.width / cropTargetElement.height}
            elementWidth={cropTargetElement.width}
            elementHeight={cropTargetElement.height}
            initialCrop={cropTargetElement.style?.crop}
            onSave={handleCropSave}
            onCancel={() => setCropTargetId(null)}
         />
      )}
      
      {isPageSettingsOpen && (
          <PageSettingsModal 
             initialWidth={currentWidth}
             initialHeight={currentHeight}
             onSave={handlePageResize}
             onClose={() => setIsPageSettingsOpen(false)}
          />
      )}

      {isExportModalOpen && (
          <ExportModal 
             project={project}
             onClose={() => setIsExportModalOpen(false)}
          />
      )}
    </div>
  );
}