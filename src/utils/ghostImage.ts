import { Tile } from "../types";

// ────────── Helper Utility (CSS Math) ──────────
export const getCssVarRemFrom = (el: Element | null, name: string, fallback = "0") => {
  try {
    // Se el è null, guarda nel root (document.documentElement)
    const styleTarget = el ? getComputedStyle(el) : getComputedStyle(document.documentElement);
    const val = styleTarget.getPropertyValue(name) || fallback;
    // parseFloat parsa "3.5rem" in 3.5, ignorando il suffisso
    return parseFloat(val.trim()) || 0;
  } catch {
    return parseFloat(fallback) || 0;
  }
};

export const getRemValueInPx = () => {
  if (typeof window === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
};

// ────────── Funzione Principale Ghost Image ──────────

export const createGhostImage = (
  e: React.DragEvent<HTMLDivElement>,
  ghostOffsets: { id: number; offsetCol: number; offsetRow: number }[],
  draggingTiles: Tile[],
  pivotId: number,
  selectedTileIds: number[], 
  fontType: string,          
  boardEl: HTMLDivElement | null
) => {
  if (!boardEl) return;

  // 1. RECUPERO DIMENSIONE FONT DAL TILE REALE
  const sourceElement = e.currentTarget as HTMLElement;
  const computedFontSize = getComputedStyle(sourceElement).fontSize;

  // 2. RECUPERO VARIABILI DIMENSIONI (Svincolate Width/Height)
  // Leggiamo i valori base dal Root
  //const root = document.documentElement;
  const baseW = getCssVarRemFrom(boardEl, "--base-cell-width", "3.5");
  const baseH = getCssVarRemFrom(boardEl, "--base-cell-height", "3.5");
  
  // Leggiamo lo zoom corrente dalla Board (che lo ha inline style)
  const zoom = getCssVarRemFrom(boardEl, "--zoom", "1");
  const gapRem = getCssVarRemFrom(boardEl, "--gap-size", "0.2");

  // Calcolo dimensioni finali in REM
  const cellWRem = baseW * zoom;
  const cellHRem = baseH * zoom;

  // Calcolo dimensioni totali della Ghost Image
  const colsSpan = Math.max(...ghostOffsets.map((o) => o.offsetCol)) + 1;
  const rowsSpan = Math.max(...ghostOffsets.map((o) => o.offsetRow)) + 1;

  const ghostWidth = colsSpan * cellWRem + Math.max(0, colsSpan - 1) * gapRem;
  const ghostHeight = rowsSpan * cellHRem + Math.max(0, rowsSpan - 1) * gapRem;

  const ghost = document.createElement("div");
  ghost.style.position = "absolute";
  ghost.style.top = "-999.9rem";
  ghost.style.left = "-999.9rem";
  ghost.style.width = `${ghostWidth}rem`;
  ghost.style.height = `${ghostHeight}rem`;
  ghost.style.display = "grid";
  // Definizione griglia rettangolare
  ghost.style.gridTemplateColumns = `repeat(${colsSpan}, ${cellWRem}rem)`;
  ghost.style.gridTemplateRows = `repeat(${rowsSpan}, ${cellHRem}rem)`;
  ghost.style.gap = `${gapRem}rem`;
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "9999";
  ghost.style.opacity = "0.85";

  const tileBorderRadius = "0.4rem";
  const tileBorder = "0.1rem solid rgba(0,0,0,0.6)";
  const normalBg = "#ffffff";
  const selectedBg = "#FFF44F"; // Giallo selezione

  const minColForGhost = Math.min(...draggingTiles.map((t) => t.col));
  const minRowForGhost = Math.min(...draggingTiles.map((t) => t.row));

  draggingTiles.forEach((t) => {
    const off = ghostOffsets.find((o) => o.id === t.id);
    if (!off) return;

    const cell = document.createElement("div");
    // Dimensioni cella specifica
    cell.style.width = `${cellWRem}rem`;
    cell.style.height = `${cellHRem}rem`;
    
    cell.style.boxSizing = "border-box";
    cell.style.border = tileBorder;
    cell.style.borderRadius = tileBorderRadius;
    
    const isSelected = selectedTileIds.includes(t.id);
    cell.style.background = isSelected ? selectedBg : (t.backgroundColor || normalBg);
    
    cell.style.fontFamily = fontType;

    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.fontWeight = "bold";
    cell.style.fontSize = computedFontSize;
    cell.style.userSelect = "none";
    cell.style.color = t.color || "";

    cell.textContent = t.char ?? "";

    cell.style.gridColumnStart = String(off.offsetCol + 1);
    cell.style.gridRowStart = String(off.offsetRow + 1);

    ghost.appendChild(cell);
  });

  document.body.appendChild(ghost);

  // 3. CALCOLO PIVOT (Punto di presa del mouse)
  // Il pivot deve considerare width e height separatamente
  const pivot = draggingTiles.find((t) => t.id === pivotId) ?? draggingTiles[0];
  const pivotOffsetCol = pivot.col - minColForGhost;
  const pivotOffsetRow = pivot.row - minRowForGhost;

  const rootFontSize = getRemValueInPx();
  const cellWPx = cellWRem * rootFontSize;
  const cellHPx = cellHRem * rootFontSize;
  const gapPx = gapRem * rootFontSize;

  const pivotOffsetX = pivotOffsetCol * (cellWPx + gapPx) + cellWPx / 2;
  const pivotOffsetY = pivotOffsetRow * (cellHPx + gapPx) + cellHPx / 2;

  e.dataTransfer.setDragImage(ghost, pivotOffsetX, pivotOffsetY);

  const onDragEnd = () => {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    window.removeEventListener("dragend", onDragEnd);
  };
  window.addEventListener("dragend", onDragEnd);
  setTimeout(() => {
    if (ghost && ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
      window.removeEventListener("dragend", onDragEnd);
    }
  }, 2500);
};


// ─── GHOST PER NUOVO TILE (DALLA SIDEBAR) ───
export const createSingleTileGhost = (
  e: React.DragEvent<HTMLDivElement>,
  char: string,
  fontType: string
) => {
  // Anche qui dobbiamo rispettare le dimensioni "Base" impostate nel CSS Root.
  // Nota: Dalla sidebar non abbiamo accesso facile allo zoom della board, 
  // quindi usiamo le dimensioni base (zoom = 1), che è standard per i drag da palette.
  
  const root = document.documentElement;
  const baseW = getCssVarRemFrom(root, "--base-cell-width", "3.5");
  const baseH = getCssVarRemFrom(root, "--base-cell-height", "3.5");
  
  const rootFontSize = getRemValueInPx(); 
  
  const cellWPx = baseW * rootFontSize;
  const cellHPx = baseH * rootFontSize;

  const ghost = document.createElement("div");
  ghost.style.position = "absolute";
  ghost.style.top = "-9999px";
  ghost.style.left = "-9999px";
  
  // Applica larghezza e altezza separate
  ghost.style.width = `${cellWPx}px`;
  ghost.style.height = `${cellHPx}px`;
  
  ghost.style.background = "var(--bg-color-board-tiles)"; 
  ghost.style.border = "0.1rem solid var(--border-color-tiles)";
  ghost.style.borderRadius = "0.4rem";
  ghost.style.display = "flex";
  ghost.style.alignItems = "center";
  ghost.style.justifyContent = "center";
  ghost.style.fontWeight = "bold";
  ghost.style.fontFamily = fontType; 
  
  // Font size proporzionale alla larghezza
  ghost.style.fontSize = `${cellWPx * 0.6}px`; 
  
  ghost.style.color = "#000";
  ghost.style.zIndex = "9999";
  ghost.textContent = char;

  document.body.appendChild(ghost);

  // Centra il cursore sul rettangolo
  e.dataTransfer.setDragImage(ghost, cellWPx / 2, cellHPx / 2);

  // Pulizia
  const onDragEnd = () => {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    window.removeEventListener("dragend", onDragEnd);
  };
  window.addEventListener("dragend", onDragEnd);
  setTimeout(() => {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
  }, 2500);
};