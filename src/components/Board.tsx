import React, { useState, useRef, useEffect } from "react";
import { GridCell } from "../App";
import { Tile } from "../types";
import { handleUpload } from "../utils/fileHandlers";

// ─── UTILITY MATEMATICHE (Copia da ghostImage.ts) ───
const getCssVarRemFrom = (el: Element | null, name: string, fallback = "0") => {
  try {
    const styleTarget = el ? getComputedStyle(el) : getComputedStyle(document.documentElement);
    const val = styleTarget.getPropertyValue(name) || fallback;
    return parseFloat(val.trim()) || 0;
  } catch {
    return parseFloat(fallback) || 0;
  }
};

const getRemValueInPx = () => {
  if (typeof window === "undefined") return 16;
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
};
// ────────────────────────────────────────────────────

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
  
  // Props Bottoni
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSnag: () => void;
  onSave: () => void;
  onUploadLoaded: (tiles: Tile[], font: string) => void;
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
  setActiveSidebarKeys,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSnag,
  onSave,
  onUploadLoaded
}: BoardProps) {

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragHasMoved = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if ((e.target as HTMLElement).closest(".zoom-controls, .theme-controls, .undo-redo-controls, .file-controls, .tile")) return;
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

      const { cellWPx, cellHPx, gapPx, paddingPx } = getLiveMetrics();
      const newSelectedIndices: number[] = [];

      const totalGridWidth = totalVisualCols * (cellWPx + gapPx) - gapPx;
      const availableWidth = board.clientWidth - (paddingPx * 2);
      let centeringOffset = 0;
      if (totalGridWidth < availableWidth) {
        centeringOffset = (availableWidth - totalGridWidth) / 2;
      }

      gridCells.forEach((cell) => {
        const tileLeft = paddingPx + centeringOffset + (cell.col - 1) * (cellWPx + gapPx);
        const tileTop = paddingPx + (cell.row - 1) * (cellHPx + gapPx);
        
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
      
      {/* Undo/Redo Controls */}
      <div className="undo-redo-controls">
        <button className="undo-redo-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
          <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
        </button>
        <button className="undo-redo-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
          <svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
        </button>
      </div>

      {/* File Controls */}
      <div className="file-controls">
        <button className="file-btn" onClick={onSnag}>SNAPSHOT 📸</button> 
        <button className="file-btn" onClick={onSave}>SAVE ⭳</button>
        <button className="file-btn" onClick={() => fileInputRef.current?.click()}>UPLOAD ⭱</button>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".json" onChange={(e) => handleUpload(e, onUploadLoaded)} />
      </div>

      {/* Theme Button */}
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
          justifyContent: "center", 
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