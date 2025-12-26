import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import "./style.css";
import { Tile } from "./types";
import { getCssVarRemFrom, getRemValueInPx } from "./utils/ghostImage";
import useHistory from "./utils/useHistory";

// Import Componenti
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";
import Board from "./components/Board";

export default function App() {
  
  // ─── STATO TEMA ───
  const [currentTheme, setCurrentTheme] = useState<'default' | 'alt' | 'third'>('default');

  // ─── NUOVO: STATO ZOOM (Spostato qui dalla Board) ───
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // ─── STATI DI CONFIGURAZIONE ───
  const [selectedNumber, setSelectedNumber] = useState(17);
  const [inputText, setInputText] = useState("");
  // NUOVO STATO: Gestione spazi
  const [spacesMode, setSpacesMode] = useState<'keep' | 'remove'>('keep');
  
  // ─── GESTIONE STATO TILES (CON UNDO/REDO) ───
  const { 
    state: tiles, 
    setState: setTiles, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    resetHistory
  } = useHistory<Tile[]>([], 15);
  
  const [selectedTileIds, setSelectedTileIds] = useState<number[]>([]);
  
  // ─── STATI FONT E CIFRARIO ───
  const [cipherType, setCipherType] = useState<string>("Custom");
  const [uiFont, setUiFont] = useState("Arial");
  const [boardFont, setBoardFont] = useState("Arial");
  const [selectedKeyName, setSelectedKeyName] = useState<"Plaintext" | "Z408" | "Z340">("Plaintext");

  // ─── STATI UI ───
  const [isAddMode, setIsAddMode] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const [needsScrollReset, setNeedsScrollReset] = useState(false);
  
  const prevThemeRef = useRef(currentTheme);

  // ─── EASTER EGG STATE ───
  const eggCountRef = useRef(0); 
  const eggTimerRef = useRef<number | null>(null);

  // ─── CALCOLO DIMENSIONI GRIGLIA ───
  const margin = 40;
  const maxTileCol = tiles.length > 0 ? Math.max(...tiles.map(t => t.col)) : 0;
  const maxTileRow = tiles.length > 0 ? Math.max(...tiles.map(t => t.row)) : 0;
  const minGridCols = selectedNumber + 2 * margin;
  const minGridRows = Math.ceil(tiles.length / selectedNumber) + 2 * margin;
  const totalColumns = Math.max(minGridCols, maxTileCol + margin);
  const totalRows = Math.max(minGridRows, maxTileRow + margin);

  // ─── LOGICHE APPLICAZIONE ───

const createTiles = () => {
    // 1. Pulizia testo
    let cleanText = inputText.replace(/[\n\r]+/g, "");
    if (spacesMode === 'remove') {
        cleanText = cleanText.replace(/ /g, "");
    }

    // 2. Creazione Tiles
    const chars = cleanText.split("");
    const newTiles: Tile[] = [];

    chars.forEach((c, idx) => {
      if (c === " ") return;
      newTiles.push({
        id: idx,
        char: c,
        col: (idx % selectedNumber) + 1 + margin,
        row: Math.floor(idx / selectedNumber) + 1 + margin,
      });
    });
    
    // 3. Reset Stati
    resetHistory(newTiles);
    setBoardFont(uiFont);
    
    // 4. Gestione Key Name
    if (uiFont === "Z408" || uiFont === "Largo") {
      setSelectedKeyName("Z408");
    } else if (uiFont === "Z340") {
      setSelectedKeyName("Z340");
    } else {
      setSelectedKeyName("Plaintext");
    }
    
    // 5. TRIGGER DI RESET
    setNeedsScrollReset(true); // Attiva il centraggio
    setZoomLevel(1.0);         // <--- FORZA LO ZOOM AL 100%
  };

  const deleteSelectedTiles = useCallback(() => {
    if (selectedTileIds.length === 0) return;
    setTiles(prev => prev.filter(t => !selectedTileIds.includes(t.id)));
    setSelectedTileIds([]);
    setIsCopyMode(false); 
  }, [selectedTileIds, setTiles]);

  const handleUploadLoaded = (loadedTiles: Tile[], loadedFont: string) => {
    resetHistory(loadedTiles);
    setUiFont(loadedFont);
    setBoardFont(loadedFont);
    setNeedsScrollReset(true);
  };

  const handleEasterEggClick = () => {
    if (eggTimerRef.current) {
      clearTimeout(eggTimerRef.current);
    }
    eggCountRef.current += 1;
    
    if (eggCountRef.current === 5) {
      const link = document.createElement('a');
      link.href = "https://github.com/Malotrou/Zodiac_word_puzzle/archive/refs/heads/main.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      eggCountRef.current = 0;
      return;
    }
    eggTimerRef.current = window.setTimeout(() => {
      eggCountRef.current = 0;
    }, 1000);
  };

  // ─── EFFETTI ───
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedTiles();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        if (selectedTileIds.length > 0) {
          setIsCopyMode(true);
          setIsAddMode(false); 
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedTiles, undo, redo, selectedTileIds, setIsAddMode]);

  useLayoutEffect(() => {
    const themeChanged = prevThemeRef.current !== currentTheme;
    
    // FIX: Aggiunta condizione "o se lo zoom è cambiato" non strettamente necessaria per la logica 
    // ma utile per coerenza, qui ci basiamo su needsScrollReset che è true quando clicchi CREATE.
    if ((needsScrollReset || themeChanged) && boardRef.current && tiles.length > 0) {
      const board = boardRef.current;
      
      prevThemeRef.current = currentTheme;

      const rootFontSize = getRemValueInPx();
      
      const baseH = getCssVarRemFrom(document.documentElement, "--base-cell-height", "3.5");
      const gapRem = getCssVarRemFrom(board, "--gap-size", "0.2");
      
      // FIX: Moltiplichiamo per zoomLevel. 
      // Anche se cliccando CREATE è 1.0, questo garantisce che il calcolo sia 
      // sincronizzato con lo stato attuale renderizzato.
      const cellSizePx = baseH * zoomLevel * rootFontSize;
      const gapPx = gapRem * rootFontSize; // Il gap spesso non scala col zoom, ma dipende dal tuo CSS. Se scala, va moltiplicato.
      const totalRowHeight = cellSizePx + gapPx;

      // CALCOLO ORIZZONTALE
      board.scrollLeft = (board.scrollWidth - board.clientWidth) / 2;

      // CALCOLO VERTICALE
      const rowsToScrollPast = Math.max(0, margin - 1);
      const targetScrollTop = rowsToScrollPast * totalRowHeight;

      board.scrollTop = targetScrollTop;
      
      if (needsScrollReset) {
        setNeedsScrollReset(false);
      }
    }
  // FIX: Aggiunto zoomLevel alle dipendenze qui sotto!
  }, [tiles, needsScrollReset, margin, currentTheme, zoomLevel]);

  // ─── RENDER ───
  return (
    <div className="container">
      <LeftSidebar
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed(!leftCollapsed)}
        inputText={inputText}
        setInputText={setInputText}
        cipherType={cipherType}
        setCipherType={setCipherType}
        uiFont={uiFont}
        setUiFont={setUiFont}
        selectedNumber={selectedNumber}
        setSelectedNumber={setSelectedNumber}
        onCreateTiles={createTiles}
        // NUOVE PROPS
        spacesMode={spacesMode}
        setSpacesMode={setSpacesMode}
      />

      <div className="center-section">
        <h1 className="full-width">
          <img
            src="/concerned_citizen_quote_red.jpg"
            alt="Zodiac Quote"
            className="quote-image"
            onClick={handleEasterEggClick}
            style={{ cursor: "default" }}
          />
        </h1>
        
        <Board
          boardRef={boardRef}
          tiles={tiles}
          setTiles={setTiles}
          selectedTileIds={selectedTileIds}
          setSelectedTileIds={setSelectedTileIds}
          boardFont={boardFont}
          totalColumns={totalColumns}
          totalRows={totalRows}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onUploadLoaded={handleUploadLoaded}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          isCopyMode={isCopyMode}
          setIsCopyMode={setIsCopyMode}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
        />
      </div>

      <RightSidebar
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed(!rightCollapsed)}
        tiles={tiles}
        setTiles={setTiles}
        selectedTileIds={selectedTileIds}
        setSelectedTileIds={setSelectedTileIds}
        selectedKeyName={selectedKeyName}
        setSelectedKeyName={setSelectedKeyName}
        onDeleteTiles={deleteSelectedTiles}
        isAddMode={isAddMode}
        setIsAddMode={setIsAddMode}
        boardFont={boardFont}
        currentTheme={currentTheme}
        isCopyMode={isCopyMode}
        setIsCopyMode={setIsCopyMode}
      />
    </div>
  );
}