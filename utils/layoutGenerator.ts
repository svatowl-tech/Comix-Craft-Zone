import { ComicElement } from '../types';

interface LayoutOptions {
    count: number;
    currentWidth: number;
    currentHeight: number;
    margin?: number;
}

interface TemplateOptions {
    layoutId: string;
    currentWidth: number;
    currentHeight: number;
    margin?: number;
}

interface LayoutResult {
    elements: ComicElement[];
    width?: number; // If layout enforces specific dimensions (e.g. Webtoon)
    height?: number;
}

const createFrame = (fx: number, fy: number, fw: number, fh: number, shape: 'rectangle' | 'circle' | 'triangle' | 'polygon' = 'rectangle', styleExtra: any = {}, zIndex: number = 1): ComicElement => ({
    id: `frame-${Date.now()}-${Math.random()}`,
    type: 'frame',
    x: fx,
    y: fy,
    width: fw,
    height: fh,
    rotation: 0,
    zIndex,
    style: { borderWidth: 4, borderColor: 'black', backgroundColor: 'white', shape, ...styleExtra }
});

export const generateAlgorithmicLayout = ({ count, currentWidth, currentHeight, margin = 20 }: LayoutOptions): LayoutResult => {
    const elements: ComicElement[] = [];
    const availW = currentWidth - (margin * 2);
    const availH = currentHeight - (margin * 2);

    const pageRatio = currentWidth / currentHeight;
    const isWebtoon = pageRatio < 0.6; // Significantly taller than wide

    // Determine strategy based on type and randomization
    const strategies = isWebtoon ? ['stack'] : ['grid', 'masonry', 'slanted'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    if (strategy === 'stack') {
        const gap = 40;
        const varyHeight = count <= 6;
        let totalWeight = 0;
        const weights = Array.from({ length: count }, () => varyHeight ? 0.8 + Math.random() * 0.4 : 1);
        weights.forEach(w => totalWeight += w);

        const totalGapSpace = gap * (count - 1);
        const availableHeight = availH - totalGapSpace;

        let currentY = margin;

        for (let i = 0; i < count; i++) {
            const h = (weights[i] / totalWeight) * availableHeight;
            elements.push(createFrame(margin, currentY, availW, h));
            currentY += h + gap;
        }
    }
    else if (strategy === 'masonry') {
        const gap = 15;
        let blocks = [{ x: margin, y: margin, w: availW, h: availH }];

        while (blocks.length < count) {
            let biggestIdx = 0;
            let biggestArea = 0;
            blocks.forEach((b, idx) => {
                const area = b.w * b.h;
                if (area > biggestArea) {
                    biggestArea = area;
                    biggestIdx = idx;
                }
            });

            const block = blocks[biggestIdx];
            blocks.splice(biggestIdx, 1);

            const splitVert = block.h > block.w * 1.2 ? true : (block.w > block.h * 1.2 ? false : Math.random() > 0.5);

            if (splitVert) {
                const ratio = 0.3 + Math.random() * 0.4;
                const h1 = (block.h - gap) * ratio;
                const h2 = block.h - gap - h1;
                blocks.push({ x: block.x, y: block.y, w: block.w, h: h1 });
                blocks.push({ x: block.x, y: block.y + h1 + gap, w: block.w, h: h2 });
            } else {
                const ratio = 0.3 + Math.random() * 0.4;
                const w1 = (block.w - gap) * ratio;
                const w2 = block.w - gap - w1;
                blocks.push({ x: block.x, y: block.y, w: w1, h: block.h });
                blocks.push({ x: block.x + w1 + gap, y: block.y, w: w2, h: block.h });
            }
        }

        blocks.forEach((b) => {
            elements.push(createFrame(b.x, b.y, b.w, b.h));
        });
    }
    else if (strategy === 'slanted') {
        const gap = 15;
        const rows = Math.round(Math.sqrt(count));
        const rowCounts: number[] = [];
        let remainder = count;
        for (let r = 0; r < rows; r++) {
            const take = r === rows - 1 ? remainder : Math.round(remainder / (rows - r));
            rowCounts.push(take);
            remainder -= take;
        }

        const rowHeight = (availH - (gap * (rows - 1))) / rows;
        let currentY = margin;

        rowCounts.forEach((cols, rIdx) => {
            const dividers: { topX: number, botX: number }[] = [];
            const step = availW / cols;

            for (let c = 1; c < cols; c++) {
                const baseX = c * step;
                const tilt = (Math.random() - 0.5) * (availW / cols * 0.6);
                dividers.push({ topX: baseX + tilt, botX: baseX - tilt });
            }

            const boundaries = [{ topX: 0, botX: 0 }, ...dividers, { topX: availW, botX: availW }];

            for (let i = 0; i < boundaries.length - 1; i++) {
                const start = boundaries[i];
                const end = boundaries[i + 1];

                const pTopLeft = start.topX + (i === 0 ? 0 : gap / 2);
                const pTopRight = end.topX - (i === boundaries.length - 2 ? 0 : gap / 2);
                const pBotRight = end.botX - (i === boundaries.length - 2 ? 0 : gap / 2);
                const pBotLeft = start.botX + (i === 0 ? 0 : gap / 2);

                const minX = Math.min(pTopLeft, pBotLeft);
                const maxX = Math.max(pTopRight, pBotRight);
                const elemW = maxX - minX;

                const pt1 = `${((pTopLeft - minX) / elemW * 100).toFixed(1)},0`;
                const pt2 = `${((pTopRight - minX) / elemW * 100).toFixed(1)},0`;
                const pt3 = `${((pBotRight - minX) / elemW * 100).toFixed(1)},100`;
                const pt4 = `${((pBotLeft - minX) / elemW * 100).toFixed(1)},100`;

                elements.push(createFrame(margin + minX, currentY, elemW, rowHeight, 'polygon', {
                    polygonPoints: `${pt1} ${pt2} ${pt3} ${pt4}`
                }));
            }
            currentY += rowHeight + gap;
        });
    }
    else {
        // Grid fallback
        const gap = 15;
        const idealRows = Math.sqrt(count * (currentHeight / currentWidth));
        const rows = Math.max(1, Math.min(count, Math.round(idealRows)));
        const cols = Math.ceil(count / rows);
        const cellW = (availW - (gap * (cols - 1))) / cols;
        const cellH = (availH - (gap * (rows - 1))) / rows;

        let panelsCreated = 0;
        for (let r = 0; r < rows; r++) {
            const currentY = margin + (r * (cellH + gap));
            for (let c = 0; c < cols; c++) {
                if (panelsCreated >= count) break;
                const currentX = margin + (c * (cellW + gap));
                elements.push(createFrame(currentX, currentY, cellW, cellH));
                panelsCreated++;
            }
        }
    }

    return { elements };
};

export const generateTemplateLayout = ({ layoutId, currentWidth, currentHeight, margin = 20 }: TemplateOptions): LayoutResult => {
    const elements: ComicElement[] = [];
    const gap = 10;

    let targetW = currentWidth;
    let targetH = currentHeight;

    if (layoutId.includes('webtoon')) {
        targetW = 800;
        if (layoutId === 'webtoon-short') targetH = 2000;
        else if (layoutId === 'webtoon-medium') targetH = 3000;
        else if (layoutId === 'webtoon-long') targetH = 4000;
        else if (layoutId === 'webtoon-cinematic') targetH = 3000;
    }

    const w = targetW - margin * 2;
    const h = targetH - margin * 2;
    const m = margin; // shorthand

    switch (layoutId) {
        case '1-full':
            elements.push(createFrame(m, m, w, h));
            break;
        case '2-vert':
            elements.push(createFrame(m, m, w / 2 - gap / 2, h));
            elements.push(createFrame(m + w / 2 + gap / 2, m, w / 2 - gap / 2, h));
            break;
        case '2-horiz':
            elements.push(createFrame(m, m, w, h / 2 - gap / 2));
            elements.push(createFrame(m, m + h / 2 + gap / 2, w, h / 2 - gap / 2));
            break;
        case '4-grid':
            elements.push(createFrame(m, m, w / 2 - gap / 2, h / 2 - gap / 2));
            elements.push(createFrame(m + w / 2 + gap / 2, m, w / 2 - gap / 2, h / 2 - gap / 2));
            elements.push(createFrame(m, m + h / 2 + gap / 2, w / 2 - gap / 2, h / 2 - gap / 2));
            elements.push(createFrame(m + w / 2 + gap / 2, m + h / 2 + gap / 2, w / 2 - gap / 2, h / 2 - gap / 2));
            break;
        case '6-grid':
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 2; c++) {
                    const cellW = (w - gap) / 2;
                    const cellH = (h - gap * 2) / 3;
                    elements.push(createFrame(m + c * (cellW + gap), m + r * (cellH + gap), cellW, cellH));
                }
            }
            break;
        case 'masonry-hero':
            elements.push(createFrame(m, m, w * 0.6, h));
            elements.push(createFrame(m + w * 0.6 + gap, m, w * 0.4 - gap, h * 0.5 - gap / 2));
            elements.push(createFrame(m + w * 0.6 + gap, m + h * 0.5 + gap / 2, w * 0.4 - gap, h * 0.5 - gap / 2));
            break;
        case 'slanted-split':
            elements.push(createFrame(m, m, w, h * 0.6, 'polygon', { polygonPoints: "0,0 100,0 100,80 0,100" }));
            elements.push(createFrame(m, m + h * 0.4 + 10, w, h * 0.6 - 10, 'polygon', { polygonPoints: "0,20 100,0 100,100 0,100" }));
            break;
        case 'slanted-action': {
            const h1 = h * 0.35;
            const h2 = h * 0.35;
            const h3 = h * 0.3 - gap * 2;
            elements.push(createFrame(m, m, w, h1, 'polygon', { polygonPoints: "0,0 100,0 100,85 0,100" }));
            elements.push(createFrame(m, m + h1 + gap, w, h2, 'polygon', { polygonPoints: "0,15 100,0 100,85 0,100" }));
            elements.push(createFrame(m, m + h1 + h2 + gap * 2, w, h3, 'polygon', { polygonPoints: "0,15 100,0 100,100 0,100" }));
            break;
        }
        case 'shattered':
            elements.push(createFrame(m, m, w, h * 0.6, 'triangle'));
            elements.push(createFrame(m, m + h * 0.6 - 40, w / 2 - gap / 2, h * 0.4 + 40, 'rectangle', {}, 0));
            elements.push(createFrame(m + w / 2 + gap / 2, m + h * 0.6 - 40, w / 2 - gap / 2, h * 0.4 + 40, 'rectangle', {}, 0));
            break;
        case 'webtoon-short': {
            const wtGap = 60;
            const pHeight = (h - wtGap * 2) / 3;
            elements.push(createFrame(m, m, w, pHeight));
            elements.push(createFrame(m, m + pHeight + wtGap, w, pHeight));
            elements.push(createFrame(m, m + (pHeight + wtGap) * 2, w, pHeight));
            break;
        }
        case 'webtoon-medium': {
            const wtGap = 80;
            const count = 5;
            // Equal sized frames
            const pHeight = (h - wtGap * (count - 1)) / count;
            for(let i=0; i<count; i++) {
                elements.push(createFrame(m, m + i * (pHeight + wtGap), w, pHeight));
            }
            break;
        }
        case 'webtoon-cinematic': {
            const wtGap = 150;
            const pHeight = 800;
            elements.push(createFrame(m, m, w, pHeight));
            elements.push(createFrame(m, m + pHeight + wtGap, w, pHeight));
            elements.push(createFrame(m, m + (pHeight + wtGap) * 2, w, pHeight));
            break;
        }
    }

    return { elements, width: targetW, height: targetH };
};