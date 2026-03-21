import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { ZoomIn, ZoomOut, X, PlusCircle, Sliders, Layers, Wrench, PenTool, Scaling } from 'lucide-react';
import { Library } from './components/Library';
import { PropertyPanel } from './components/PropertyPanel';
import { CanvasElement } from './components/CanvasElement';
import { CropModal } from './components/CropModal';
import { PageSettingsModal } from './components/PageSettingsModal';
import { ExportModal } from './components/ExportModal';
import { StitchModal } from './components/StitchModal';
import { Header } from './components/Header';
import { PageNavigator } from './components/PageNavigator';
import { DrawingEditor } from './components/DrawingEditor';
import { ComicProject, ComicElement, DragItem, ComicPage, CropData } from './types';
import { generateAlgorithmicLayout, generateTemplateLayout, generateStitchLayout } from './utils/layoutGenerator';
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
  const [isPageNavigatorOpen, setIsPageNavigatorOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isStitchModalOpen, setIsStitchModalOpen] = useState(false);
  const [isDrawingEditorOpen, setIsDrawingEditorOpen] = useState(false);
  const [drawingBackground, setDrawingBackground] = useState<string | undefined>(undefined);
  const [stitchModalMode, setStitchModalMode] = useState<'new' | 'add'>('new');
  const [stitchReplaceId, setStitchReplaceId] = useState<string | null>(null);
  const [isPageSelected, setIsPageSelected] = useState(false);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  // Dragging State
  const paperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const elementStartRef = useRef<{ x: number, y: number, w: number, h: number } | null>(null);
  const dragStartProjectState = useRef<ComicProject | null>(null);
  const hasMoved = useRef<boolean>(false);

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
  const lastHistorySaveTime = useRef<number>(0);

  const saveHistory = useCallback((force = false) => {
    const now = Date.now();
    if (force || now - lastHistorySaveTime.current > 1000) {
      setHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === project) return prev;
        return [...prev, project];
      });
      setFuture([]);
    }
    lastHistorySaveTime.current = now;
  }, [project]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [project, ...prev]);
    setHistory(history.slice(0, -1));
    setProject(previous);
    lastHistorySaveTime.current = 0;
  }, [history, project]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, project]);
    setFuture(future.slice(1));
    setProject(next);
    lastHistorySaveTime.current = 0;
  }, [future, project]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.clear();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
    await saveProjectToFile({ ...project, assets: uploadedImages });
  };

  const handleLoadProject = async (file: File) => {
    try {
      const loadedProject = await loadProjectFromFile(file);
      // Validate loaded project has activePageId or set it
      if (!loadedProject.activePageId && loadedProject.pages.length > 0) {
        loadedProject.activePageId = loadedProject.pages[0].id;
      }
      
      setProject(loadedProject);
      if (loadedProject.assets) {
        setUploadedImages(loadedProject.assets);
      } else {
        setUploadedImages([]);
      }
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
    saveHistory(true);
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
    saveHistory(true);
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
    saveHistory(true);
    const el = activePage.elements.find(e => e.id === id);
    const isStitch = el?.isStitch;

    setProject(prev => {
        const page = prev.pages.find(p => p.id === prev.activePageId);
        if (!page) return prev;

        let newElements = page.elements.filter(e => e.id !== id);
        
        // If it was a stitch, re-layout the remaining stitch elements
        if (isStitch) {
            const stitchElements = newElements.filter(e => e.isStitch);
            const nonStitchElements = newElements.filter(e => !e.isStitch);
            
            // Check if we had numbering enabled by looking for stitch bubbles
            const hadNumbering = stitchElements.some(e => e.type === 'bubble');
            
            // We only want the frames for re-layouting
            const stitchFrames = stitchElements.filter(e => e.type === 'frame');
            
            const images = stitchFrames.map(e => ({
                url: e.content || '',
                ratio: e.width / e.height
            }));

            const { elements: reLayouted, height: newHeight } = generateStitchLayout({ 
                images, 
                currentWidth: page.width || PAGE_WIDTH, 
                currentHeight: page.height || PAGE_HEIGHT,
                shouldNumber: hadNumbering
            });
            
            newElements = [...nonStitchElements, ...reLayouted];
            
            // Update page height if it changed
            if (newHeight) {
                return {
                    ...prev,
                    pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
                        ...p, 
                        elements: newElements,
                        height: newHeight
                    })
                };
            }
        }

        return {
            ...prev,
            pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { ...p, elements: newElements })
        };
    });
    setSelectedId(null);
  };
  
  const duplicateElement = (id: string) => {
      saveHistory(true);
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
      saveHistory(true);
      const el = activePage.elements.find(e => e.id === id);
      if(!el) return;
      const newZ = dir === 'up' ? el.zIndex + 1 : Math.max(0, el.zIndex - 1);
      updateElement(id, { zIndex: newZ });
  };

  const handleCropSave = (crop: CropData) => {
    if (cropTargetId) {
      saveHistory(true);
      const style = activePage.elements.find(e => e.id === cropTargetId)?.style;
      updateElement(cropTargetId, { style: { ...style, crop } });
      setCropTargetId(null);
    }
  };

  // -- Layout Generation Calls --
  const handleGenerateLayout = (count: number) => {
      saveHistory(true);
      const { elements } = generateAlgorithmicLayout({ count, currentWidth, currentHeight });
      updateActivePage({ elements });
      setSelectedId(null);
      if (window.innerWidth < 1024) setIsLibraryOpen(false);
  };

  const applyTemplate = (layoutId: string) => {
     saveHistory(true);
     const { elements, width, height } = generateTemplateLayout({ layoutId, currentWidth, currentHeight });
     updateActivePage({ elements, width, height });
     setSelectedId(null);
     if (window.innerWidth < 1024) setIsLibraryOpen(false);
  };

  const handleCreateStitch = (images: { url: string, ratio: number }[]) => {
      saveHistory(true);
      
      // Create a new page for the stitch
      const newPageId = `page-${Date.now()}`;
      const { elements } = generateStitchLayout({ images, currentWidth: PAGE_WIDTH, currentHeight: PAGE_HEIGHT });
      
      const newPage: ComicPage = {
          id: newPageId,
          order: project.pages.length,
          background: '#ffffff',
          elements,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT
      };

      setProject(prev => ({
          ...prev,
          pages: [...prev.pages, newPage],
          activePageId: newPageId
      }));
      
      setSelectedId(null);
  };

  const handleAddStitchImage = () => {
      setStitchModalMode('add');
      setIsStitchModalOpen(true);
      setStitchReplaceId(null);
  };

  const handleOpenStitchHeader = () => {
      setStitchModalMode('new');
      setIsStitchModalOpen(true);
  };

  const handleReplaceStitchImage = (id: string) => {
      setStitchReplaceId(id);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          saveHistory(true);
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
              const ratio = img.naturalWidth / img.naturalHeight;
              
              setProject(prev => {
                  const page = prev.pages.find(p => p.id === prev.activePageId);
                  if (!page) return prev;

                  const stitchElements = page.elements.filter(e => e.isStitch);
                  const nonStitchElements = page.elements.filter(e => !e.isStitch);
                  
                  // Check if we had numbering enabled
                  const hadNumbering = stitchElements.some(e => e.type === 'bubble');
                  
                  // Only frames for re-layout
                  const stitchFrames = stitchElements.filter(e => e.type === 'frame');

                  const images = stitchFrames.map(e => {
                      if (e.id === id) {
                          return { url, ratio };
                      }
                      return { url: e.content || '', ratio: e.width / e.height };
                  });

                  const { elements: reLayouted, height: newHeight } = generateStitchLayout({ 
                      images, 
                      currentWidth: page.width || PAGE_WIDTH, 
                      currentHeight: page.height || PAGE_HEIGHT,
                      shouldNumber: hadNumbering
                  });

                  return {
                      ...prev,
                      pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
                          ...p, 
                          elements: [...nonStitchElements, ...reLayouted],
                          height: newHeight || p.height
                      })
                  };
              });
          };
          img.src = url;
      };
      input.click();
  };

  const onStitchComplete = (newImages: { url: string, ratio: number }[], shouldNumber: boolean) => {
      saveHistory(true);
      
      if (stitchModalMode === 'new') {
          // Find first empty page
          const emptyPage = project.pages.find(p => p.elements.length === 0);
          
          if (emptyPage) {
              const { elements, width, height } = generateStitchLayout({ 
                  images: newImages, 
                  currentWidth: emptyPage.width || PAGE_WIDTH, 
                  currentHeight: emptyPage.height || PAGE_HEIGHT,
                  shouldNumber
              });
              
              setProject(prev => ({
                  ...prev,
                  pages: prev.pages.map(p => p.id === emptyPage.id ? { ...p, elements, width, height } : p),
                  activePageId: emptyPage.id
              }));
          } else {
              const newPageId = `page-${Date.now()}`;
              const { elements, width, height } = generateStitchLayout({ 
                  images: newImages, 
                  currentWidth: PAGE_WIDTH, 
                  currentHeight: PAGE_HEIGHT,
                  shouldNumber
              });
              
              const newPage: ComicPage = {
                  id: newPageId,
                  order: project.pages.length,
                  background: '#ffffff',
                  elements,
                  width: width || PAGE_WIDTH,
                  height: height || PAGE_HEIGHT
              };

              setProject(prev => ({
                  ...prev,
                  pages: [...prev.pages, newPage],
                  activePageId: newPageId
              }));
          }
      } else {
          setProject(prev => {
              const page = prev.pages.find(p => p.id === prev.activePageId);
              if (!page) return prev;

              const existingStitchElements = page.elements.filter(e => e.isStitch);
              const nonStitchElements = page.elements.filter(e => !e.isStitch);

              const existingImages = existingStitchElements.map(e => ({
                  url: e.content || '',
                  ratio: e.width / e.height
              }));

              const allImages = [...existingImages, ...newImages];

              const { elements: reLayouted, width, height } = generateStitchLayout({ 
                  images: allImages, 
                  currentWidth: page.width || PAGE_WIDTH, 
                  currentHeight: page.height || PAGE_HEIGHT,
                  shouldNumber
              });

              return {
                  ...prev,
                  pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
                      ...p, elements: [...nonStitchElements, ...reLayouted], width, height
                  })
              };
          });
      }
      
      setIsStitchModalOpen(false);
  };

  // -- Interactions (Drag & Drop) --

  const addItemToCanvas = async (item: DragItem, xPos?: number, yPos?: number) => {
     saveHistory(true);
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
         saveHistory(true);
         updateElement(targetFrame.id, { content: item.content, style: { ...targetFrame.style, crop: undefined } });
         return;
       }
    }
    addItemToCanvas(item, dropX - 50, dropY - 50);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setSelectedId(null);
    setIsPageSelected(true);
    setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
            ...p, elements: p.elements.map(e => ({...e, selected: false})) 
        })
    }));
    if (window.innerWidth < 1024) setIsPropertiesOpen(false);
  };

  const handlePageResizeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      setDragMode('page-resize');
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      dragStartRef.current = { x: clientX, y: clientY };
      elementStartRef.current = { x: 0, y: 0, w: currentWidth, h: currentHeight };
      dragStartProjectState.current = project;
      hasMoved.current = false;
  };

  const handleElementMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, id: string, type: 'move' | 'resize') => {
    e.stopPropagation(); 
    setSelectedId(id);
    setDragMode(type);
    setIsDragging(true);
    setIsPropertiesOpen(true);
    setIsPageSelected(false);
    
    dragStartProjectState.current = project;
    hasMoved.current = false;
    
    // Select logic
    setProject(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
            ...p, elements: p.elements.map(el => ({...el, selected: el.id === id})) 
        })
    }));

    const el = project.pages.find(p => p.id === project.activePageId)?.elements.find(e => e.id === id);
    if (el) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      dragStartRef.current = { x: clientX, y: clientY };
      elementStartRef.current = { x: el.x, y: el.y, w: el.width, h: el.height };
    }
  }, [project]);

  // Global Mouse Handlers for Dragging
  const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragStartRef.current || !elementStartRef.current || !dragMode) return;
    if ((dragMode === 'move' || dragMode === 'resize') && !selectedId) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    const dx = (clientX - dragStartRef.current.x) / zoom;
    const dy = (clientY - dragStartRef.current.y) / zoom;
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        hasMoved.current = true;
    }

    const start = elementStartRef.current;
    const snap = (val: number) => Math.round(val / 10) * 10;

    if (dragMode === 'move') {
      updateElement(selectedId!, { x: snap(start.x + dx), y: snap(start.y + dy) });
    } else if (dragMode === 'resize') {
      updateElement(selectedId!, { width: Math.max(20, snap(start.w + dx)), height: Math.max(20, snap(start.h + dy)) });
    } else if (dragMode === 'page-resize') {
      const newW = Math.max(200, snap(start.w + dx));
      const newH = Math.max(200, snap(start.h + dy));
      setProject(prev => ({
          ...prev,
          pages: prev.pages.map(p => p.id === prev.activePageId ? { ...p, width: newW, height: newH } : p)
      }));
    }
  }, [isDragging, selectedId, dragMode, zoom, updateElement]);

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging && dragStartProjectState.current && hasMoved.current) {
        setHistory(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === dragStartProjectState.current) return prev;
            return [...prev, dragStartProjectState.current!];
        });
        setFuture([]);
        lastHistorySaveTime.current = 0;
    }
    setIsDragging(false);
    setDragMode(null);
    dragStartRef.current = null;
    elementStartRef.current = null;
    dragStartProjectState.current = null;
    hasMoved.current = false;
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalMouseMove as any, { passive: false });
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove as any);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleOpenDrawing = async () => {
    if (paperRef.current) {
      try {
        // Temporarily deselect to avoid capturing selection borders
        setSelectedId(null);
        setIsPageSelected(false);
        const dataUrl = await toPng(paperRef.current, { cacheBust: true, pixelRatio: 1 });
        setDrawingBackground(dataUrl);
        setIsDrawingEditorOpen(true);
      } catch (err) {
        console.error('Failed to capture page for drawing', err);
        setDrawingBackground(undefined);
        setIsDrawingEditorOpen(true);
      }
    } else {
      setDrawingBackground(undefined);
      setIsDrawingEditorOpen(true);
    }
  };

  const handleToggleLibrary = () => {
    setIsLibraryOpen(!isLibraryOpen);
    if (!isLibraryOpen) setIsPropertiesOpen(false);
  };

  const handleToggleProperties = () => {
    setIsPropertiesOpen(!isPropertiesOpen);
    if (!isPropertiesOpen) setIsLibraryOpen(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Header 
        onToggleLibrary={handleToggleLibrary}
        onToggleProperties={handleToggleProperties}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenPageSettings={() => setIsPageSettingsOpen(true)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenStitch={handleOpenStitchHeader}
        onOpenDrawing={handleOpenDrawing}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden relative pb-16 lg:pb-0">
        {/* Left Sidebar (Library) */}
        <>
          {isLibraryOpen && <div className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" onClick={() => setIsLibraryOpen(false)} />}
          <div className={`${isLibraryOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:-translate-x-full'} lg:translate-y-0 fixed lg:relative bottom-0 lg:inset-y-0 left-0 w-full lg:w-72 h-[85vh] lg:h-full z-50 lg:z-40 transition-transform duration-300 ease-in-out shadow-[0_-8px_30px_rgba(0,0,0,0.5)] lg:shadow-none bg-slate-800 rounded-t-2xl lg:rounded-none flex flex-col pb-16 lg:pb-0`}>
              <div className="h-full flex flex-col relative">
                  <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-3 mb-1 lg:hidden shrink-0" />
                  <Library 
                      onDragStart={() => {}} 
                      onItemClick={(item) => addItemToCanvas(item)}
                      onApplyTemplate={applyTemplate}
                      onGenerateLayout={handleGenerateLayout}
                      uploadedImages={uploadedImages}
                      onUploadImage={(url) => setUploadedImages(p => [url, ...p])}
                      onOpenStitch={handleOpenStitchHeader}
                      onOpenDrawing={handleOpenDrawing}
                      onClose={() => setIsLibraryOpen(false)}
                  />
              </div>
          </div>
        </>

        {/* Center Canvas */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col" onClick={() => { if(window.innerWidth < 1024) {} }}>
            {/* Zoom Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 p-1.5 rounded-xl flex gap-1 z-20 shadow-xl pointer-events-auto">
               <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomOut size={18} /></button>
               <span className="px-2 flex items-center text-xs font-mono text-slate-400 w-12 justify-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="p-2 hover:bg-slate-700 rounded text-slate-300"><ZoomIn size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8 flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y">
                <div 
                  ref={paperRef}
                  className="bg-white shadow-2xl relative comic-paper transition-transform duration-75 origin-top"
                  style={{ width: currentWidth, height: currentHeight, transform: `scale(${zoom})`, flexShrink: 0 }}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onMouseDown={handleCanvasMouseDown}
                  onTouchStart={(e) => handleCanvasMouseDown(e as any)}
                >
                    {activePage.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                        <CanvasElement key={el.id} element={el} onMouseDown={handleElementMouseDown} />
                    ))}

                    {isPageSelected && (
                        <>
                            {/* Page Resize Handle */}
                            <div 
                                className="absolute -right-2 -bottom-2 w-8 h-8 bg-brand-500 rounded-full cursor-nwse-resize z-50 border-4 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                                onMouseDown={handlePageResizeMouseDown}
                                onTouchStart={(e) => handlePageResizeMouseDown(e as any)}
                            >
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                            {/* Visual border for selected page */}
                            <div className="absolute inset-0 border-4 border-brand-500/40 pointer-events-none z-40"></div>
                        </>
                    )}

                    <div className="absolute bottom-2 right-4 text-slate-400 text-xs font-comic opacity-50 pointer-events-none">
                        Page {activePage.order + 1}
                    </div>
                </div>
            </div>

            <div className="hidden lg:block">
              <PageNavigator 
                  pages={project.pages}
                  activePageId={project.activePageId}
                  onPageSelect={(id) => setProject(p => ({...p, activePageId: id}))}
                  onAddPage={addPage}
              />
            </div>
        </main>

        {/* Right Sidebar (Properties) */}
        <>
          {isPropertiesOpen && <div className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" onClick={() => setIsPropertiesOpen(false)} />}
          <div className={`${isPropertiesOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full'} lg:translate-y-0 fixed lg:relative bottom-0 lg:inset-y-0 right-0 w-full lg:w-72 h-[85vh] lg:h-full z-50 lg:z-40 transition-transform duration-300 ease-in-out shadow-[0_-8px_30px_rgba(0,0,0,0.5)] lg:shadow-none bg-slate-800 rounded-t-2xl lg:rounded-none flex flex-col pb-16 lg:pb-0`}>
              <div className="h-full flex flex-col relative">
                  <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-3 mb-1 lg:hidden shrink-0" />
                  <PropertyPanel 
                     element={selectedElement}
                     onUpdate={updateElementWithHistory}
                     onDelete={deleteElement}
                     onDuplicate={duplicateElement}
                     onLayerChange={changeLayer}
                     onOpenCrop={(id) => setCropTargetId(id)}
                     onClose={() => setIsPropertiesOpen(false)}
                     onAddStitchImage={handleAddStitchImage}
                     onReplaceStitchImage={handleReplaceStitchImage}
                  />
              </div>
          </div>
        </>

        {/* Mobile Page Navigator Bottom Sheet */}
        <>
          {isPageNavigatorOpen && <div className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" onClick={() => setIsPageNavigatorOpen(false)} />}
          <div className={`${isPageNavigatorOpen ? 'translate-y-0' : 'translate-y-full'} lg:hidden fixed bottom-0 inset-x-0 w-full h-auto max-h-[50vh] z-50 transition-transform duration-300 ease-in-out shadow-[0_-8px_30px_rgba(0,0,0,0.5)] bg-slate-800 rounded-t-2xl flex flex-col pb-16`}>
              <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mt-3 mb-3 shrink-0" />
              <div className="px-4 pb-2 flex justify-between items-center">
                  <h2 className="text-white font-bold">Pages</h2>
                  <div className="flex items-center gap-2">
                      <button onClick={() => { setIsPageSettingsOpen(true); setIsPageNavigatorOpen(false); }} className="p-2 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 text-xs font-medium">
                         <Scaling size={16} /> Size
                      </button>
                      <button onClick={() => setIsPageNavigatorOpen(false)} className="p-2 hover:bg-slate-700 rounded text-slate-300">
                         <X size={20} />
                      </button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 pt-0">
                  <div className="grid grid-cols-4 gap-3">
                      {project.pages.map((page, idx) => (
                          <button
                              key={page.id}
                              onClick={() => { setProject(p => ({...p, activePageId: page.id})); setIsPageNavigatorOpen(false); }}
                              className={`aspect-[3/4] border-2 rounded-lg flex items-center justify-center text-lg font-bold transition-colors ${page.id === project.activePageId ? 'border-brand-500 bg-slate-700 text-white' : 'border-slate-600 bg-slate-900 text-slate-500 hover:border-slate-500'}`}
                          >
                              {idx + 1}
                          </button>
                      ))}
                      <button
                          onClick={() => { addPage(); setIsPageNavigatorOpen(false); }}
                          className="aspect-[3/4] border-2 border-dashed border-slate-600 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                      >
                          <PlusCircle size={24} />
                      </button>
                  </div>
              </div>
          </div>
        </>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center p-2 z-30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <button onClick={() => { setIsLibraryOpen(true); setIsPropertiesOpen(false); }} className={`flex flex-col items-center p-2 ${isLibraryOpen ? 'text-brand-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <PlusCircle size={24} />
          <span className="text-[10px] mt-1 font-medium">Add</span>
        </button>
        <button onClick={() => { setIsPropertiesOpen(true); setIsLibraryOpen(false); }} disabled={!selectedId} className={`flex flex-col items-center p-2 ${!selectedId ? 'text-slate-700' : isPropertiesOpen ? 'text-brand-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <Sliders size={24} />
          <span className="text-[10px] mt-1 font-medium">Edit</span>
        </button>
        <button onClick={() => { setIsPageNavigatorOpen(true); setIsLibraryOpen(false); setIsPropertiesOpen(false); }} className={`flex flex-col items-center p-2 ${isPageNavigatorOpen ? 'text-brand-500' : 'text-slate-400 hover:text-slate-200'}`}>
          <Layers size={24} />
          <span className="text-[10px] mt-1 font-medium">Pages</span>
        </button>
        <button onClick={handleOpenDrawing} className="flex flex-col items-center p-2 text-slate-400 hover:text-slate-200">
          <PenTool size={24} />
          <span className="text-[10px] mt-1 font-medium">Draw</span>
        </button>
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

      {isStitchModalOpen && (
          <StitchModal 
             onClose={() => setIsStitchModalOpen(false)}
             onComplete={onStitchComplete}
          />
      )}

      <DrawingEditor 
         isOpen={isDrawingEditorOpen}
         onClose={() => setIsDrawingEditorOpen(false)}
         backgroundImage={drawingBackground}
         canvasWidth={currentWidth}
         canvasHeight={currentHeight}
         onSave={(imageData) => {
            saveHistory(true);
            const newElement: ComicElement = {
              id: `el-${Date.now()}`,
              type: 'image',
              x: 0, y: 0, width: currentWidth, height: currentHeight,
              rotation: 0, zIndex: activePage.elements.length + 1,
              content: imageData, selected: true
            };
            setProject(prev => ({
                ...prev,
                pages: prev.pages.map(p => p.id !== prev.activePageId ? p : { 
                    ...p, elements: [...p.elements.map(e => ({...e, selected: false})), newElement]
                })
            }));
            setSelectedId(newElement.id);
            setIsDrawingEditorOpen(false);
         }}
      />
    </div>
  );
}