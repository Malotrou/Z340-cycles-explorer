import React, { useState, useRef, useEffect } from "react";
import { GridCell } from "../App";
import { getCssVarRemFrom, getRemValueInPx } from "../utils/ghostImage";

type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  gridCells: GridCell[];
  selectedIndices: number[];
  onTileClick: (index: number | null, ctrlKey: boolean) => void;
  onRectSelection: (indices: number[], isAdditive: boolean) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  currentTheme: 'default' | 'alt' | 'third';
  setCurrentTheme: React.Dispatch<React.SetStateAction<'default' | 'alt' | 'third'>>;
  totalVisualCols: number;
  setActiveSidebarKeys: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function Board({
  boardRef, 
  gridCells, 
  selectedIndices, 
  onTileClick,
  onRectSelection,
  zoomLevel,
  setZoomLevel,
  currentTheme,
  setCurrentTheme,
  totalVisualCols,
  setActiveSidebarKeys
}: BoardProps) {

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragHasMoved = useRef(false);

  // Helper metriche
  const getLiveMetrics = () => {
    const board = boardRef.current;
    if (!board) return { cellWPx: 0, cellHPx: 0, gapPx: 0, paddingPx: 0 };

    const rootFontSize = getRemValueInPx();
    const baseW = getCssVarRemFrom(board, "--base-cell-width", "3.5");
    const baseH = getCssVarRemFrom(board, "--base-cell-height", "3.5");
    const gapRem = getCssVarRemFrom(board, "--gap-size", "0.2");
    
    const style = window.getComputedStyle(board);
    const paddingPx = parseFloat(style.paddingLeft) || (1.2 * rootFontSize);

    return {
      cellWPx: baseW * zoomLevel * rootFontSize,
      cellHPx: baseH * zoomLevel * rootFontSize,
      gapPx: gapRem * rootFontSize,
      paddingPx: paddingPx
    };
  };

  const handleMouseDownOnBoard = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".zoom-controls, .theme-controls, .tile")) return;
    if (e.button !== 0) return;

    setIsSelecting(true);
    dragHasMoved.current = false;
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    selectionStartPos.current = {
      x: e.clientX - rect.left + board.scrollLeft,
      y: e.clientY - rect.top + board.scrollTop,
    };
    
    onRectSelection([], false); 
    setActiveSidebarKeys([]); 
  };

  const handleMouseMoveOnBoard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelecting && selectionStartPos.current && boardRef.current) {
      dragHasMoved.current = true;
      const board = boardRef.current;
      const rect = board.getBoundingClientRect();
      const currentX = e.clientX - rect.left + board.scrollLeft;
      const currentY = e.clientY - rect.top + board.scrollTop;
      
      const x = Math.min(selectionStartPos.current.x, currentX);
      const y = Math.min(selectionStartPos.current.y, currentY);
      const width = Math.abs(currentX - selectionStartPos.current.x);
      const height = Math.abs(currentY - selectionStartPos.current.y);
      setSelectionBox({ x, y, width, height });

      // Calcolo collisioni migliorato (Fix Offset Centratura)
      const { cellWPx, cellHPx, gapPx, paddingPx } = getLiveMetrics();
      const newSelectedIndices: number[] = [];

      // 1. Calcoliamo la larghezza reale totale della griglia
      const totalGridWidth = totalVisualCols * (cellWPx + gapPx) - gapPx;
      
      // 2. Calcoliamo lo spazio disponibile nel contenitore (tolto il padding)
      const availableWidth = board.clientWidth - (paddingPx * 2);
      
      // 3. Calcoliamo l'offset di centratura (perché justify-content: center)
      // Se la griglia è più piccola della vista, è centrata -> c'è un offset sinistro extra.
      // Se è più grande, è allineata a sinistra (scrollable) -> offset è 0.
      let centeringOffset = 0;
      if (totalGridWidth < availableWidth) {
        centeringOffset = (availableWidth - totalGridWidth) / 2;
      }

      gridCells.forEach((cell) => {
        // TileLeft = Padding + Centratura + (Colonna-1)*Dimensione
        const tileLeft = paddingPx + centeringOffset + (cell.col - 1) * (cellWPx + gapPx);
        const tileTop = paddingPx + (cell.row - 1) * (cellHPx + gapPx); // Verticalmente non c'è centratura dinamica (align-content: start)
        
        if (
          x < tileLeft + cellWPx &&
          x + width > tileLeft &&
          y < tileTop + cellHPx &&
          y + height > tileTop
        ) {
          if (cell.originalIndex !== null) {
            newSelectedIndices.push(cell.originalIndex);
          }
        }
      });
      
      onRectSelection(newSelectedIndices, false);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionBox(null);
      selectionStartPos.current = null;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleEmptyClick = () => {
    if (!dragHasMoved.current) {
        onTileClick(null, false);
        setActiveSidebarKeys([]);
    }
    dragHasMoved.current = false;
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoomLevel(1.0);

  const cycleTheme = () => {
    if (currentTheme === 'default') setCurrentTheme('alt');
    else if (currentTheme === 'alt') setCurrentTheme('third');
    else setCurrentTheme('default');
  };

  const maxRow = gridCells.length > 0 ? Math.max(...gridCells.map(c => c.row)) : 0;

  return (
    <div className="board-container">
      <div className="theme-controls">
        <button className="theme-btn" onClick={cycleTheme} title="Change theme">
          <img src="/zodiac_symbol.svg" alt="Theme" className="theme-btn-icon" />
        </button>
      </div>

      <div
        className={`board theme-${currentTheme}`}
        ref={boardRef}
        onMouseDown={handleMouseDownOnBoard}
        onMouseMove={handleMouseMoveOnBoard}
        onClick={handleEmptyClick} 
        style={{
          // @ts-ignore
          "--zoom": zoomLevel,
          // @ts-ignore
          "--cell-width": "calc(var(--base-cell-width) * var(--zoom))",
          // @ts-ignore
          "--cell-height": "calc(var(--base-cell-height) * var(--zoom))",
          display: "grid",
          gridTemplateColumns: `repeat(${totalVisualCols}, var(--cell-width))`,
          gridTemplateRows: `repeat(${maxRow}, var(--cell-height))`,
          gap: "var(--gap-size)",
          alignContent: "start",
          justifyContent: "center", // Questo causava il disallineamento
          position: "relative" 
        }}
      >
        {isSelecting && selectionBox && (
          <div className="selection-box" style={{ 
            left: selectionBox.x, 
            top: selectionBox.y, 
            width: selectionBox.width, 
            height: selectionBox.height 
          }} />
        )}

        {gridCells.map((cell) => {
          const isSelected = cell.originalIndex !== null && selectedIndices.includes(cell.originalIndex);
          const bgColor = cell.styleBg || cell.baseColor;
          const hasCustomBg = !!cell.styleBg;
          
          return (
            <div
              key={cell.id}
              className={`tile ${isSelected ? "selected" : ""} ${hasCustomBg ? "has-custom-bg" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onTileClick(cell.originalIndex, e.ctrlKey || e.metaKey);
              }}
              style={{
                gridColumnStart: cell.col,
                gridRowStart: cell.row,
                backgroundColor: bgColor,
                color: cell.styleColor || undefined,
                fontFamily: "Z340", 
                borderColor: "var(--border-color-tiles)",
                cursor: "pointer",
                border: isSelected && !hasCustomBg ? "var(--border-selection)" : undefined
              }}
            >
              {cell.char}
            </div>
          );
        })}
      </div>

      <div className="zoom-controls">
        <button onClick={handleZoomOut} className="zoom-btn">-</button>
        <div onClick={handleZoomReset} style={{ minWidth: "3rem", textAlign: "center", cursor: "pointer", userSelect: "none", fontSize: "1.2rem" }}>
          {Math.round(zoomLevel * 100)}%
        </div>
        <button onClick={handleZoomIn} className="zoom-btn">+</button>
      </div>
    </div>
  );
}