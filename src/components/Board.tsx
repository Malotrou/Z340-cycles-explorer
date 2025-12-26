import React, { useState, useRef, useEffect} from "react";
import { Tile, DropPreview } from "../types";
import { createGhostImage, getCssVarRemFrom, getRemValueInPx } from "../utils/ghostImage";
import { handleSnag, handleSave, handleUpload, handleSaveAsText } from "../utils/fileHandlers";


type BoardProps = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  tiles: Tile[];
  setTiles: React.Dispatch<React.SetStateAction<Tile[]>>;
  selectedTileIds: number[];
  setSelectedTileIds: React.Dispatch<React.SetStateAction<number[]>>;
  boardFont: string;
  totalColumns: number;
  totalRows: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUploadLoaded?: (tiles: Tile[], font: string) => void;
  currentTheme: 'default' | 'alt' | 'third';
  setCurrentTheme: React.Dispatch<React.SetStateAction<'default' | 'alt' | 'third'>>;
  isCopyMode: boolean;
  setIsCopyMode: React.Dispatch<React.SetStateAction<boolean>>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
};

export default function Board({
  boardRef, 
  tiles, 
  setTiles, 
  selectedTileIds, 
  setSelectedTileIds,
  boardFont, 
  totalColumns, 
  totalRows, 
  onUndo, 
  onRedo, 
  canUndo, 
  canRedo, 
  onUploadLoaded, 
  currentTheme, 
  setCurrentTheme,
  isCopyMode,
  setIsCopyMode,
  zoomLevel,
  setZoomLevel
}: BoardProps) {
  
  const [draggedTileId, setDraggedTileId] = useState<number | null>(null);
  const [dragOffsets, setDragOffsets] = useState<{ id: number; offsetCol: number; offsetRow: number }[]>([]);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragHasMoved = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funzione per ruotare il tema
  const cycleTheme = () => {
    if (currentTheme === 'default') setCurrentTheme('alt');
    else if (currentTheme === 'alt') setCurrentTheme('third');
    else setCurrentTheme('default');
  };

  // --- COSTANTI DI CONTROLLO SCROLL ---
  const EDGE_THRESHOLD = 10; // Distanza dal bordo (px)
  const SCROLL_STEP = 0.1;     // VELOCITÀ MOLTO BASSA (pixel per frame)

  // Timer per lo scroll fluido
  const scrollTimerRef = useRef<number | null>(null);

  // --- LOGICA AUTO-SCROLL MANUALE ---
  const stopAutoScroll = () => {
    if (scrollTimerRef.current) {
      cancelAnimationFrame(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
  };

  const startAutoScroll = (e: React.MouseEvent | React.DragEvent) => {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    let dx = 0;
    let dy = 0;

    // Se il mouse "spinge" contro i bordi
    if (x > rect.right - EDGE_THRESHOLD) dx = SCROLL_STEP;
    else if (x < rect.left + EDGE_THRESHOLD) dx = -SCROLL_STEP;

    if (y > rect.bottom - EDGE_THRESHOLD) dy = SCROLL_STEP;
    else if (y < rect.top + EDGE_THRESHOLD) dy = -SCROLL_STEP;

    // Se non siamo in zona di spinta, fermiamo il ciclo
    if (dx === 0 && dy === 0) {
      stopAutoScroll();
      return;
    }

    // Funzione ricorsiva per il movimento fluido
    const performScroll = () => {
      if (board) {
        board.scrollLeft += dx;
        board.scrollTop += dy;
        scrollTimerRef.current = requestAnimationFrame(performScroll);
      }
    };

    // Facciamo partire il loop solo se non è già attivo
    if (!scrollTimerRef.current) {
      scrollTimerRef.current = requestAnimationFrame(performScroll);
    }
  };

  // Helper per le dimensioni (incluso il padding della board)
  const getLiveMetrics = () => {
  const board = boardRef.current;
  const rootFontSize = getRemValueInPx();
  
  // FIX: Leggi le variabili da 'board', perché è lì che il tema le sovrascrive
  const baseW = getCssVarRemFrom(board, "--base-cell-width", "3.5");
  const baseH = getCssVarRemFrom(board, "--base-cell-height", "3.5");
  
  const gapRem = getCssVarRemFrom(board, "--gap-size", "0.2");
  const style = board ? window.getComputedStyle(board) : null;
  const paddingPx = style ? parseFloat(style.paddingLeft) : (1.2 * rootFontSize);

  return {
    cellWPx: baseW * zoomLevel * rootFontSize,
    cellHPx: baseH * zoomLevel * rootFontSize,
    gapPx: gapRem * rootFontSize,
    paddingPx: paddingPx
  };
};

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoomLevel(1.0);

  const handleTileClick = (e: React.MouseEvent<HTMLDivElement>, id: number) => {
    e.stopPropagation();
    setSelectedTileIds((prev) => prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]);
  };

  const handleEmptyCellClick = () => {
    if (!dragHasMoved.current) {
      setSelectedTileIds([]);
      setIsCopyMode(false); // <--- AGGIUNTO
    }
    dragHasMoved.current = false;
  };

  const handleMouseDownOnBoard = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".zoom-controls, .undo-redo-btn, .file-btn, .theme-btn, .tile")) return;
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
    setSelectedTileIds([]);
  };

  const handleMouseMoveOnBoard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelecting && selectionStartPos.current && boardRef.current) {
      // Gestione scroll durante selezione rettangolare
      startAutoScroll(e);

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

      const newSelectedIds: number[] = [];
      tiles.forEach((tile) => {
        const tileLeft = paddingPx + (tile.col - 1) * (cellWPx + gapPx);
        const tileTop = paddingPx + (tile.row - 1) * (cellHPx + gapPx);
        if (x < tileLeft + cellWPx && x + width > tileLeft && y < tileTop + cellHPx && y + height > tileTop) {
          newSelectedIds.push(tile.id);
        }
      });
      setSelectedTileIds(newSelectedIds);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      stopAutoScroll();
      setIsSelecting(false);
      setSelectionBox(null);
      selectionStartPos.current = null;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const calculateDropPreview = (clientX: number, clientY: number) => {
    if (!boardRef.current || draggedTileId === null) return null;
    const { cellWPx, cellHPx, gapPx, paddingPx } = getLiveMetrics();
    const board = boardRef.current;
    const rect = board.getBoundingClientRect();
    const clickX = clientX - rect.left + board.scrollLeft;
    const clickY = clientY - rect.top + board.scrollTop;

    const targetCol = Math.floor((clickX - paddingPx) / (cellWPx + gapPx)) + 1;
    const targetRow = Math.floor((clickY - paddingPx) / (cellHPx + gapPx)) + 1;

    if (targetCol < 1 || targetRow < 1) return null;

    const movingIds = selectedTileIds.includes(draggedTileId) ? selectedTileIds : [draggedTileId];
    const previewCells: { col: number; row: number }[] = [];
    let collision = false;
    const occupied = new Map();
    tiles.forEach(t => occupied.set(`${t.col}-${t.row}`, t.id));

    movingIds.forEach(id => {
      const off = dragOffsets.find(o => o.id === id) || { offsetCol: 0, offsetRow: 0 };
      const nCol = targetCol + off.offsetCol;
      const nRow = targetRow + off.offsetRow;
      previewCells.push({ col: nCol, row: nRow });
      if (occupied.has(`${nCol}-${nRow}`) && !movingIds.includes(occupied.get(`${nCol}-${nRow}`))) collision = true;
    });

    return { isValid: !collision, cells: previewCells };
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    setDraggedTileId(id);
    const draggingIds = selectedTileIds.includes(id) ? selectedTileIds : [id];
    const draggingTiles = tiles.filter(t => draggingIds.includes(t.id));
    const draggedTile = tiles.find(t => t.id === id)!;

    setDragOffsets(draggingTiles.map(t => ({
      id: t.id, offsetCol: t.col - draggedTile.col, offsetRow: t.row - draggedTile.row
    })));

    const minC = Math.min(...draggingTiles.map(t => t.col));
    const minR = Math.min(...draggingTiles.map(t => t.row));
    createGhostImage(e, draggingTiles.map(t => ({ id: t.id, offsetCol: t.col - minC, offsetRow: t.row - minR })), draggingTiles, id, selectedTileIds, boardFont, boardRef.current);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    startAutoScroll(e); // Scroll lento manuale durante il drag
    setDropPreview(calculateDropPreview(e.clientX, e.clientY));
  };

  const handleBoardDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    stopAutoScroll();
    setDropPreview(null);
    
    const { cellWPx, cellHPx, gapPx, paddingPx } = getLiveMetrics();
    const board = boardRef.current!;
    const rect = board.getBoundingClientRect();
    const clickX = e.clientX - rect.left + board.scrollLeft;
    const clickY = e.clientY - rect.top + board.scrollTop;

    const targetCol = Math.floor((clickX - paddingPx) / (cellWPx + gapPx)) + 1;
    const targetRow = Math.floor((clickY - paddingPx) / (cellHPx + gapPx)) + 1;

    if (targetCol < 1 || targetRow < 1) return;

    const dragType = e.dataTransfer.getData("dragType");
    if (dragType === "NEW_TILE") {
      const char = e.dataTransfer.getData("newChar");
      if (!tiles.some(t => t.col === targetCol && t.row === targetRow)) {
        const newId = tiles.length > 0 ? Math.max(...tiles.map(t => t.id)) + 1 : 0;
        setTiles(prev => [...prev, { id: newId, char, col: targetCol, row: targetRow }]);
      }
      return;
    }

    if (draggedTileId === null) return;
    const preview = calculateDropPreview(e.clientX, e.clientY);
    if (preview?.isValid) {
      const idsToMove = selectedTileIds.includes(draggedTileId) ? selectedTileIds : [draggedTileId];

 // ─── LOGICA COPIA ───
      if (isCopyMode) {
        // 1. Troviamo l'ID più alto attuale per generare nuovi ID
        let maxId = tiles.length > 0 ? Math.max(...tiles.map(t => t.id)) : 0;
        
        const newTiles: Tile[] = [];
        const newSelectedIds: number[] = [];

        // 2. Per ogni tile originale selezionato, creiamo una copia
        tiles.forEach(t => {
          if (idsToMove.includes(t.id)) {
            // Calcolo offset rispetto al tile trascinato
            const off = dragOffsets.find(o => o.id === t.id);
            if (off) {
              maxId++;
              const newTile: Tile = {
                ...t, // Copia proprietà (char, color, bg...)
                id: maxId,
                col: targetCol + off.offsetCol,
                row: targetRow + off.offsetRow
              };
              newTiles.push(newTile);
              newSelectedIds.push(newTile.id);
            }
          }
        });

        // 3. Aggiungiamo i nuovi tile allo stato
        setTiles(prev => [...prev, ...newTiles]);
        
        // 4. Selezioniamo i NUOVI tiles (così l'utente può copiarli ancora se vuole)
        setSelectedTileIds(newSelectedIds);
        
        // 5. Manteniamo draggedTileId a null e isCopyMode a true (comportamento richiesto)
        setDraggedTileId(null);
        return; 
      }

      // ─── LOGICA SPOSTAMENTO (STANDARD) ───
      setTiles(prev => prev.map(t => {
        const off = dragOffsets.find(o => o.id === t.id);
        return off && idsToMove.includes(t.id) ? { ...t, col: targetCol + off.offsetCol, row: targetRow + off.offsetRow } : t;
      }));
    }
    
    setDraggedTileId(null);
    if (!isCopyMode) {
        setSelectedTileIds([]);
    }
  };

  return (
    <div className="board-container" onDragLeave={stopAutoScroll}>
      {/* Bottoni Undo/Redo */}
      <div className="undo-redo-controls">
        <button className="undo-redo-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
          <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
        </button>
        <button className="undo-redo-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
          <svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
        </button>
      </div>

      {/* Bottoni Tema e File */}
      <div className="theme-controls">
        <button className="theme-btn" onClick={cycleTheme} title="Change theme">
          <img src="/zodiac_symbol.svg" alt="Theme" className="theme-btn-icon" />
        </button>
      </div>

      <div className="file-controls">
        <button className="file-btn" onClick={() => handleSnag(boardRef.current, tiles, boardFont)}>SNAPSHOT 📸</button> 
        <button className="file-btn" onClick={() => handleSaveAsText(tiles)}>SNAPTEXT 📰</button>
        <button className="file-btn" onClick={() => handleSave(tiles, boardFont)}>SAVE ⭳</button>
        <button className="file-btn" onClick={() => fileInputRef.current?.click()}>UPLOAD ⭱</button>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".json" onChange={(e) => onUploadLoaded && handleUpload(e, onUploadLoaded)} />
      </div>


      <div
        className={`board theme-${currentTheme}`}
        ref={boardRef}
        onClick={handleEmptyCellClick}
        onDragOver={handleDragOver}
        onDrop={handleBoardDrop}
        onMouseDown={handleMouseDownOnBoard}
        onMouseMove={handleMouseMoveOnBoard}
        onDragEnd={stopAutoScroll} // Fermata di sicurezza
        style={{
          // @ts-ignore
          "--zoom": zoomLevel,
          // @ts-ignore
          "--cell-width": "calc(var(--base-cell-width) * var(--zoom))",
          // @ts-ignore
          "--cell-height": "calc(var(--base-cell-height) * var(--zoom))",
          gridTemplateColumns: `repeat(${totalColumns}, var(--cell-width))`,
          gridTemplateRows: `repeat(${totalRows}, var(--cell-height))`,
        }}
      >
        {isSelecting && selectionBox && (
          <div className="selection-box" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} />
        )}

        {dropPreview && dropPreview.cells.map((cell, idx) => (
          <div key={`prev-${idx}`} className="drop-preview-cell" style={{ gridColumnStart: cell.col, gridRowStart: cell.row, backgroundColor: dropPreview.isValid ? "rgba(144, 238, 144, 0.5)" : "rgba(255, 0, 0, 0.5)", border: dropPreview.isValid ? "0.2rem dashed green" : "0.2rem dashed red", width: "var(--cell-width)", height: "var(--cell-height)" }} />
        ))}

        {tiles.map((tile) => {
          const isSelected = selectedTileIds.includes(tile.id);
          
          // Verifica se il tile ha un colore "custom" (cioè non è null, non è bianco e non è la variabile default)
          const hasCustomBg = tile.backgroundColor && 
                              //tile.backgroundColor !== "#ffffff" && // commento perché in teoria il bianco potrebbe essere custom
                              tile.backgroundColor !== "var(--bg-color-board-tiles)";
          // Definizione stato "Pronto per la copia"
          const isCopyReady = isCopyMode && isSelected;

          // Se siamo in isCopyReady, NON mettiamo la classe "selected".
          // In questo modo evitiamo che il CSS col giallo !important sovrascriva il nostro azzurro.
          const tileClasses = `tile ${isSelected && !isCopyReady ? "selected" : ""} ${hasCustomBg ? "has-custom-bg" : ""}`;

          return (
            <div
              key={tile.id}
              className={tileClasses} 
              style={{
                gridColumnStart: tile.col,
                gridRowStart: tile.row,
                
                // SE COPY MODE + SELECTED: Sfondo azzurrino (#e0f7fa)
                backgroundColor: isCopyReady 
                    ? "#e0f7fa" 
                    : (tile.backgroundColor ?? "var(--bg-color-board-tiles)"),
                
                // SE COPY MODE + SELECTED: Bordo dashed azzurro scuro
                border: isCopyReady 
                    ? "0.1rem dashed #00bcd4" 
                    : (isSelected && !hasCustomBg ? "var(--border-selection)" : "0.1rem solid var(--border-color-tiles)"),
                
                color: tile.color ?? undefined,
                fontFamily: boardFont,
                
                cursor: "grab" 
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, tile.id)}
              onClick={(e) => handleTileClick(e, tile.id)}
            >
              {tile.char}
            </div>
          );
        })}
      </div>

      <div className="zoom-controls">
        <button onClick={handleZoomOut} className="zoom-btn">-</button>
        <div onClick={handleZoomReset} style={{ minWidth: "3rem", textAlign: "center", cursor: "pointer", userSelect: "none", fontSize: "1.2rem" }} title="Reset Zoom">
          {Math.round(zoomLevel * 100)}%
        </div>
        <button onClick={handleZoomIn} className="zoom-btn">+</button>
      </div>
    </div>
  );
}