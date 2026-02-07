import React from 'react';
import { ComicElement } from '../types';

interface CanvasElementProps {
  element: ComicElement;
  onMouseDown: (e: React.MouseEvent, id: string, type: 'move' | 'resize') => void;
}

export const CanvasElement: React.FC<CanvasElementProps> = React.memo(({ element, onMouseDown }) => {
  const { x, y, width, height, rotation, zIndex, type, style, content, selected } = element;

  // Basic styling wrapper
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    transform: `rotate(${rotation}deg)`,
    zIndex,
    cursor: selected ? 'move' : 'pointer',
    boxSizing: 'border-box',
    touchAction: 'none' // Prevent scrolling on mobile
  };

  const renderBubbleSVG = () => {
    const s = style?.shape || 'rectangle';
    const strokeWidth = style?.borderWidth || 2;
    const stroke = style?.borderColor || '#000000';
    const fill = style?.backgroundColor || '#ffffff';
    const showTail = !style?.hideTail;
    
    // Dynamic Tail Config
    const placement = style?.tailPlacement || 'bottom';
    // Clamp offset to avoid corners (10% to 90%)
    const rawOffset = style?.tailOffset ?? 50;
    const offsetPct = Math.max(10, Math.min(90, rawOffset));
    
    const tailLen = style?.tailLength ?? 50;
    // Tail width at base
    const tailBaseWidth = Math.min(40, (placement === 'top' || placement === 'bottom' ? width : height) * 0.4);

    // Calculate Tip Position & Base Center
    let tipX = 0, tipY = 0;
    let baseCx = 0, baseCy = 0; 

    if (placement === 'bottom') {
        baseCx = width * (offsetPct / 100);
        baseCy = height;
        tipX = baseCx + (offsetPct < 50 ? -10 : 10);
        tipY = height + tailLen;
    } else if (placement === 'top') {
        baseCx = width * (offsetPct / 100);
        baseCy = 0;
        tipX = baseCx + (offsetPct < 50 ? -10 : 10);
        tipY = -tailLen;
    } else if (placement === 'left') {
        baseCx = 0;
        baseCy = height * (offsetPct / 100);
        tipX = -tailLen;
        tipY = baseCy + (offsetPct < 50 ? -10 : 10);
    } else if (placement === 'right') {
        baseCx = width;
        baseCy = height * (offsetPct / 100);
        tipX = width + tailLen;
        tipY = baseCy + (offsetPct < 50 ? -10 : 10);
    }

    let pathD = '';
    let extras = null;

    if (s === 'circle') {
       const rx = width / 2;
       const ry = height / 2;
       const cx = width / 2;
       const cy = height / 2;

       if (!showTail || s === 'thought') {
           // Standard Oval
           pathD = `M ${width} ${cy} A ${rx} ${ry} 0 1 1 0 ${cy} A ${rx} ${ry} 0 1 1 ${width} ${cy} Z`;
           
           if (s === 'thought' && showTail) {
               // Add Thought Dots for Oval
               const dx = tipX - baseCx;
               const dy = tipY - baseCy;
               extras = (
                 <>
                   <circle cx={baseCx + dx * 0.25} cy={baseCy + dy * 0.25} r={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                   <circle cx={baseCx + dx * 0.6} cy={baseCy + dy * 0.6} r={5} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                   <circle cx={tipX} cy={tipY} r={3} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                 </>
               );
           }
       } else {
           // Merged Tail Oval
           const dx = (baseCx - cx) / rx;
           const dy = (baseCy - cy) / ry;
           const baseT = Math.atan2(dy, dx); 

           const spread = 0.2 + (20 / Math.max(width, height)); 
           const t1 = baseT - spread;
           const t2 = baseT + spread;
           
           const p1 = { x: cx + rx * Math.cos(t1), y: cy + ry * Math.sin(t1) };
           const p2 = { x: cx + rx * Math.cos(t2), y: cy + ry * Math.sin(t2) };

           pathD = `
             M ${p2.x} ${p2.y}
             A ${rx} ${ry} 0 1 1 ${p1.x} ${p1.y}
             L ${tipX} ${tipY}
             Z
           `;
       }

    } else if (s === 'rectangle') {
       const r = 8;
       const halfTail = tailBaseWidth / 2;
       const useTailInPath = showTail && s !== 'thought';
       
       const drawSide = (x1: number, y1: number, x2: number, y2: number, sideName: string) => {
           if (useTailInPath && placement === sideName) {
               let bxStart_x, bxStart_y, bxEnd_x, bxEnd_y;
               if (sideName === 'top') {
                   const safeCx = Math.max(r + halfTail, Math.min(width - r - halfTail, baseCx));
                   bxStart_x = safeCx - halfTail; bxStart_y = 0;
                   bxEnd_x = safeCx + halfTail;   bxEnd_y = 0;
               } else if (sideName === 'bottom') {
                   const safeCx = Math.max(r + halfTail, Math.min(width - r - halfTail, baseCx));
                   bxStart_x = safeCx + halfTail; bxStart_y = height; 
                   bxEnd_x = safeCx - halfTail;   bxEnd_y = height;
               } else if (sideName === 'right') {
                   const safeCy = Math.max(r + halfTail, Math.min(height - r - halfTail, baseCy));
                   bxStart_x = width; bxStart_y = safeCy - halfTail;
                   bxEnd_x = width;   bxEnd_y = safeCy + halfTail;
               } else { 
                   const safeCy = Math.max(r + halfTail, Math.min(height - r - halfTail, baseCy));
                   bxStart_x = 0; bxStart_y = safeCy + halfTail; 
                   bxEnd_x = 0;   bxEnd_y = safeCy - halfTail;
               }
               return `L ${bxStart_x} ${bxStart_y} L ${tipX} ${tipY} L ${bxEnd_x} ${bxEnd_y} L ${x2} ${y2}`;
           }
           return `L ${x2} ${y2}`;
       };

       pathD = `
         M ${r} 0
         ${drawSide(r, 0, width - r, 0, 'top')}
         A ${r} ${r} 0 0 1 ${width} ${r}
         ${drawSide(width, r, width, height - r, 'right')}
         A ${r} ${r} 0 0 1 ${width - r} ${height}
         ${drawSide(width - r, height, r, height, 'bottom')}
         A ${r} ${r} 0 0 1 0 ${height - r}
         ${drawSide(0, height - r, 0, r, 'left')}
         A ${r} ${r} 0 0 1 ${r} 0
         Z
       `;

    } else if (s === 'electric' || s === 'wobbly') {
       const points: {x: number, y: number}[] = [];
       const step = s === 'electric' ? 15 : 10;
       const useTailInPath = showTail && s !== 'thought';
       
       const addJitter = (x: number, y: number) => {
          let ox = 0, oy = 0;
          if (s === 'electric') {
             if (y === 0 || y === height) oy = (Math.random() - 0.5) * 10;
             else ox = (Math.random() - 0.5) * 10;
          } else {
             const amp = 3; const freq = 0.2;
             if (y === 0 || y === height) oy = Math.sin(x * freq) * amp;
             else ox = Math.sin(y * freq) * amp;
          }
          return { x: x + ox, y: y + oy };
       };

       const generateSide = (startVal: number, endVal: number, constantVal: number, isHorizontal: boolean, sideName: string) => {
           const range = Math.abs(endVal - startVal);
           const steps = Math.ceil(range / step);
           const inc = (endVal - startVal) / steps;
           let tailInserted = false;
           for (let i = 0; i <= steps; i++) {
               const curr = startVal + i * inc;
               const tCenter = isHorizontal ? baseCx : baseCy;
               const inZone = Math.abs(curr - tCenter) < (tailBaseWidth / 2);
               if (useTailInPath && placement === sideName && inZone) {
                   if (!tailInserted) {
                       points.push({ x: tipX, y: tipY });
                       tailInserted = true;
                   }
               } else {
                   if (isHorizontal) points.push(addJitter(curr, constantVal));
                   else points.push(addJitter(constantVal, curr));
               }
           }
       };

       generateSide(0, width, 0, true, 'top'); 
       generateSide(0, height, width, false, 'right'); 
       generateSide(width, 0, height, true, 'bottom'); 
       generateSide(height, 0, 0, false, 'left'); 

       pathD = `M ${points[0]?.x || 0} ${points[0]?.y || 0} ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + " Z";

    } else if (s === 'shout' || s === 'star') {
       const cx = width / 2;
       const cy = height / 2;
       const spikes = s === 'star' ? 16 : 20;
       const outerR = width / 2;
       const innerR = width / 3;
       
       let tailAngle = Math.atan2(tipY - cy, tipX - cx);
       // Normalize angle to 0 - 2PI to match loop
       if (tailAngle < 0) tailAngle += 2 * Math.PI;
       
       const rawPoints = [];
       let closestSpikeIdx = -1;
       let minAngleDiff = 999;

       for (let i = 0; i < spikes * 2; i++) {
           const r = i % 2 === 0 ? outerR : innerR;
           const a = (Math.PI * i) / spikes; // 0 to 2PI
           
           if (showTail && i % 2 === 0) {
               let diff = Math.abs(a - tailAngle);
               if (diff > Math.PI) diff = 2 * Math.PI - diff; // Handle wraparound
               
               if (diff < minAngleDiff) {
                   minAngleDiff = diff;
                   closestSpikeIdx = i;
               }
           }
           
           const variance = s === 'shout' ? (Math.random() * 20 - 10) : 0;
           const currR = r + variance;
           
           rawPoints.push({
               x: cx + Math.cos(a) * currR,
               y: cy + Math.sin(a) * currR
           });
       }

       if (showTail && closestSpikeIdx !== -1) {
           rawPoints[closestSpikeIdx] = { x: tipX, y: tipY };
       }

       pathD = `M ${rawPoints[0].x} ${rawPoints[0].y} ` + rawPoints.map(p => `L ${p.x} ${p.y}`).join(' ') + " Z";

    } else if (s === 'cloud' || s === 'thought') {
       let d = "";
       const startX = width * 0.1;
       const startY = height * 0.2;
       d = `M ${startX} ${startY}`;

       // For thought bubbles, we DO NOT modify the path for the tail.
       // The tail is drawn as dots (extras).
       const useTailInPath = showTail && s !== 'thought';

       // Top Edge
       if (useTailInPath && placement === 'top') {
           d += `Q ${baseCx - 20} ${-20} ${tipX} ${tipY}`;
           d += `Q ${baseCx + 20} ${-20} ${width*0.9} ${height*0.2}`;
       } else {
           d += `Q ${width * 0.5} ${-height * 0.2} ${width * 0.9} ${height * 0.2}`;
       }

       // Right Edge
       if (useTailInPath && placement === 'right') {
           d += `Q ${width + 20} ${baseCy - 20} ${tipX} ${tipY}`;
           d += `Q ${width + 20} ${baseCy + 20} ${width * 0.8} ${height * 0.9}`;
       } else {
           d += `Q ${width * 1.15} ${height * 0.5} ${width * 0.8} ${height * 0.9}`;
       }

       // Bottom Edge
       if (useTailInPath && placement === 'bottom') {
           d += `Q ${baseCx + 20} ${height + 20} ${tipX} ${tipY}`;
           d += `Q ${baseCx - 20} ${height + 20} ${width * 0.1} ${height * 0.8}`;
       } else {
           d += `Q ${width * 0.5} ${height * 1.2} ${width * 0.1} ${height * 0.8}`;
       }

       // Left Edge
       if (useTailInPath && placement === 'left') {
           d += `Q ${-20} ${baseCy + 20} ${tipX} ${tipY}`;
           d += `Q ${-20} ${baseCy - 20} ${startX} ${startY}`;
       } else {
           d += `Q ${-width * 0.15} ${height * 0.5} ${startX} ${startY}`;
       }
       
       pathD = d + " Z";

       // Thought bubbles dots
       if (s === 'thought' && showTail) {
           const dx = tipX - baseCx;
           const dy = tipY - baseCy;
           
           // Three dots: Big (near base), Medium (mid), Small (tip)
           extras = (
             <>
               <circle cx={baseCx + dx * 0.15} cy={baseCy + dy * 0.15} r={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
               <circle cx={baseCx + dx * 0.5} cy={baseCy + dy * 0.5} r={5} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
               <circle cx={tipX} cy={tipY} r={3} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
             </>
           );
       }
    }

    return (
      <svg width="100%" height="100%" className="absolute inset-0 overflow-visible" style={{ pointerEvents: 'none' }}>
        <path d={pathD} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
        {extras}
      </svg>
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'frame':
        const isTriangle = style?.shape === 'triangle';
        const isPolygon = style?.shape === 'polygon';
        const hasCrop = !!style?.crop;
        
        const getClipPath = () => {
            if (isTriangle) return 'polygon(50% 0%, 100% 100%, 0% 100%)';
            if (isPolygon && style?.polygonPoints) {
                const parts = style.polygonPoints.split(' ');
                return `polygon(${parts.map(p => {
                    const [px, py] = p.split(',');
                    return `${px}% ${py}%`;
                }).join(', ')})`;
            }
            return undefined;
        };

        const clipPath = getClipPath();

        return (
          <div 
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: (isTriangle || isPolygon) ? 'transparent' : (style?.backgroundColor || 'white'),
              border: (isTriangle || isPolygon) ? 'none' : `${style?.borderWidth}px solid ${style?.borderColor}`,
              borderRadius: style?.shape === 'circle' ? '50%' : '0',
              overflow: (isTriangle || isPolygon) ? 'visible' : 'hidden',
              position: 'relative'
            }}
          >
             {(isTriangle || isPolygon) ? (
                <>
                   <svg 
                     width="100%" 
                     height="100%" 
                     viewBox="0 0 100 100" 
                     preserveAspectRatio="none"
                     className="absolute inset-0 pointer-events-none z-10"
                     style={{ overflow: 'visible' }}
                   >
                       <polygon 
                         points={isPolygon ? style?.polygonPoints : "50,0 100,100 0,100"} 
                         fill="none" 
                         stroke={style?.borderColor || 'black'} 
                         strokeWidth={style?.borderWidth || 4}
                         vectorEffect="non-scaling-stroke"
                       />
                   </svg>
                   <div style={{
                       width: '100%', 
                       height: '100%', 
                       clipPath: clipPath,
                       backgroundColor: style?.backgroundColor || 'white',
                       overflow: 'hidden',
                       position: 'relative'
                   }}>
                        {content && (
                            <img 
                                src={content} 
                                alt="frame content"
                                draggable={false}
                                style={{
                                transform: style?.crop ? `translate(${style.crop.x}px, ${style.crop.y}px) scale(${style.crop.scale})` : 'none',
                                transformOrigin: '0 0',
                                width: '100%',
                                height: hasCrop ? 'auto' : '100%',
                                objectFit: hasCrop ? undefined : 'cover',
                                pointerEvents: 'none'
                                }}
                            />
                        )}
                   </div>
                </>
             ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                     {content && (
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <img 
                                src={content} 
                                alt="frame content"
                                draggable={false}
                                style={{
                                transform: style?.crop ? `translate(${style.crop.x}px, ${style.crop.y}px) scale(${style.crop.scale})` : 'none',
                                transformOrigin: '0 0',
                                width: '100%',
                                height: hasCrop ? 'auto' : '100%',
                                objectFit: hasCrop ? undefined : 'cover',
                                maxWidth: 'none',
                                pointerEvents: 'none'
                                }}
                            />
                        </div>
                    )}
                </div>
             )}
          </div>
        );
      
      case 'bubble':
        return (
          <div className="w-full h-full relative">
             {renderBubbleSVG()}
             <div 
               className="absolute inset-0 flex items-center justify-center p-6"
               style={{
                 color: style?.color,
                 fontFamily: style?.fontFamily,
                 fontSize: `${style?.fontSize}px`,
                 textAlign: 'center',
                 whiteSpace: 'pre-wrap', 
                 wordBreak: 'break-word',
                 overflowWrap: 'break-word',
                 lineHeight: 1.2
               }}
             >
                {content}
             </div>
          </div>
        );
      
      case 'sticker':
          const stickerShape = style?.shape || 'star';
          const fillColor = style?.backgroundColor || '#0ea5e9';
          const textColor = style?.color || '#ffffff';
          let sPath = '';
          
          if (stickerShape === 'star') {
               sPath = "M100,10 L125,40 L160,20 L150,60 L190,75 L150,90 L160,130 L125,110 L100,140 L75,110 L40,130 L50,90 L10,75 L50,60 L40,20 L75,40 Z";
          } else if (stickerShape === 'sharp') {
               sPath = "M20,20 L80,10 L180,20 L160,75 L190,130 L100,110 L20,130 L40,75 Z";
          } else if (stickerShape === 'cloud') {
               sPath = "M50,75 Q20,75 20,45 Q20,15 50,15 Q60,5 80,15 Q100,5 120,15 Q150,15 150,45 Q150,75 120,75 Q100,85 80,75 Q60,85 50,75 Z";
          }

          return (
             <div className="w-full h-full relative">
                 <svg width="100%" height="100%" viewBox="0 0 200 150" className="absolute inset-0 overflow-visible" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <filter id={`shadow-${element.id}`}>
                            <feDropShadow dx="3" dy="3" stdDeviation="0" floodColor="black" floodOpacity="1"/>
                        </filter>
                    </defs>
                    {stickerShape !== 'none' && (
                        <path d={sPath} fill={fillColor} stroke="black" strokeWidth="3" filter={`url(#shadow-${element.id})`} vectorEffect="non-scaling-stroke" />
                    )}
                    <text 
                        x="100" 
                        y="75" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontFamily="Impact, sans-serif" 
                        fontWeight="900" 
                        fontSize="40" 
                        fill={textColor} 
                        stroke="black" 
                        strokeWidth="1.5" 
                        transform="rotate(-5, 100, 75)"
                        style={{ pointerEvents: 'none' }}
                    >
                        {content}
                    </text>
                 </svg>
             </div>
          );

      case 'text':
        return (
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: style?.color,
              fontFamily: style?.fontFamily,
              fontSize: `${style?.fontSize}px`,
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              textAlign: 'center',
              lineHeight: 1.2,
              textShadow: style?.stroke ? `2px 2px 0px ${style.stroke}` : 'none'
            }}
          >
            {content}
          </div>
        );

      case 'image':
        const hasImageCrop = !!style?.crop;
        return (
          <div 
             className="w-full h-full overflow-hidden relative" 
             style={{ 
                 borderRadius: style?.shape === 'circle' ? '50%' : '0',
                 borderWidth: `${style?.borderWidth ?? 0}px`,
                 borderColor: style?.borderColor || '#000000',
                 borderStyle: 'solid',
                 backgroundColor: style?.backgroundColor || 'transparent',
                 boxSizing: 'border-box'
             }}
          >
            <img 
              src={content} 
              alt="comic asset" 
              className="pointer-events-none"
              style={{ 
                 transform: style?.crop ? `translate(${style.crop.x}px, ${style.crop.y}px) scale(${style.crop.scale})` : 'none',
                 transformOrigin: '0 0',
                 maxWidth: 'none',
                 width: hasImageCrop ? '100%' : '100%',
                 height: hasImageCrop ? 'auto' : '100%',
                 objectFit: hasImageCrop ? undefined : 'cover'
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      style={wrapperStyle}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, element.id, 'move');
      }}
      className="group"
    >
      <div className="w-full h-full relative">
        {renderContent()}
        {selected && (
          <>
            <div className="absolute inset-0 pointer-events-none border-2 border-brand-500 z-50 mix-blend-multiply opacity-50"></div>
            <div 
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-full cursor-nwse-resize z-50 border-2 border-white shadow-sm flex items-center justify-center"
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, element.id, 'resize');
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.x === nextProps.element.x &&
    prevProps.element.y === nextProps.element.y &&
    prevProps.element.width === nextProps.element.width &&
    prevProps.element.height === nextProps.element.height &&
    prevProps.element.rotation === nextProps.element.rotation &&
    prevProps.element.selected === nextProps.element.selected &&
    prevProps.element.zIndex === nextProps.element.zIndex &&
    prevProps.element.content === nextProps.element.content &&
    JSON.stringify(prevProps.element.style) === JSON.stringify(nextProps.element.style)
  );
});