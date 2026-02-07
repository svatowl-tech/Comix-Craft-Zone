
export type ElementType = 'frame' | 'bubble' | 'text' | 'image' | 'sticker';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CropData {
  x: number;
  y: number;
  scale: number;
}

export interface ComicElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content?: string; // Text content or Image URL
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    opacity?: number;
    shape?: 'rectangle' | 'circle' | 'cloud' | 'thought' | 'shout' | 'triangle' | 'polygon' | 'electric' | 'star' | 'wobbly' | 'sharp' | 'none';
    
    // Tail Properties
    tailPlacement?: 'top' | 'bottom' | 'left' | 'right'; // Which side
    tailOffset?: number; // 0-100 percentage along the side
    tailLength?: number; // Pixel length
    hideTail?: boolean; // Hides the tail for caption boxes etc.
    
    crop?: CropData; // For images and frames with content
    stroke?: string; // For text stroke
    polygonPoints?: string; // SVG format "x,y x,y x,y" (0-100 scale) for custom shapes
  };
  selected?: boolean;
}

export interface ComicPage {
  id: string;
  elements: ComicElement[];
  background: string;
  order: number;
  width?: number;
  height?: number;
}

export interface ComicProject {
  id: string;
  title: string;
  pages: ComicPage[];
  activePageId: string;
}

export enum ToolMode {
  SELECT = 'SELECT',
  PAN = 'PAN',
  DRAW = 'DRAW' // Future use
}

export interface DragItem {
  type: ElementType;
  content?: string;
  style?: any;
}