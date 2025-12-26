import { useState, useRef, useMemo, useEffect } from "react";
import "./style.css";
import { Tile } from "./types";
import Z340Untransposed from "./texts/Z340untransposed";
import useHistory from "./utils/useHistory";
import { handleSnag, handleSave, handleUpload,} from "./utils/fileHandlers";

// Import Componenti
import LeftSidebar from "./components/LeftSidebar";
import RightSidebar from "./components/RightSidebar";
import Board from "./components/Board";

// Definizione di un carattere "ricco"
type RichChar = {
  char: string;
  color?: string;
  backgroundColor?: string;
};

// Configurazione Griglia Visuale
export type GridCell = {
  id: number;          
  row: number;         
  col: number;         
  char: string;        
  baseColor: string;   
  styleColor?: string; 
  styleBg?: string;    
  originalIndex: number | null; 
};

export default function App() {
  
  // ─── CONFIGURAZIONE DIMENSIONI ───
  const [numCols, setNumCols] = useState(17);
  const [numRows, setNumRows] = useState(9);
  
  // ─── STATO TESTO E STILI CON HISTORY (Fix Undo/Redo) ───
  // useHistory sostituisce useState per richText
  const { 
    state: richText, 
    setState: setRichText, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    resetHistory
  } = useHistory<RichChar[]>([], 50);

  const [inputText, setInputText] = useState("");
  // Nuovo stato per la repository di testo
  const [repoText, setRepoText] = useState("");

  // ─── STATI MODALITÀ ───
  const [exploreMode, setExploreMode] = useState<'untranspose' | 'transpose' | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'alt' | 'third'>('default');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // ─── SELEZIONE ───
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); 
  const [activeSidebarKeys, setActiveSidebarKeys] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  // ─── INIZIALIZZAZIONE ───
  useEffect(() => {
    const raw = Z340Untransposed || "";
    const clean = raw.replace(/[\n\r]+/g, "");
    const initialRich: RichChar[] = clean.split("").map(c => ({ char: c }));
    
    // Inizializza history
    resetHistory(initialRich);
    setInputText(clean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── GESTIONE RESET (Fix Reset Button) ───
  const handleReset = () => {
    const raw = Z340Untransposed || "";
    const clean = raw.replace(/[\n\r]+/g, "");
    const initialRich: RichChar[] = clean.split("").map(c => ({ char: c }));
    
    resetHistory(initialRich);
    setInputText(clean);
    setRepoText("");
    setExploreMode(null);
    setNumCols(17);
    setNumRows(9);
    setSelectedIndices([]);
    setActiveSidebarKeys([]);
    setZoomLevel(1.0);
  };

  // ─── GESTIONE FILE (Save, Upload, Snag) ───
  // Adattatore per convertire GridCells in Tiles per le funzioni di utilità vecchie
  const getTilesForExport = () => {
    return gridCells.map(c => ({
      id: c.id,
      char: c.char,
      col: c.col,
      row: c.row,
      color: c.styleColor,
      backgroundColor: c.styleBg || c.baseColor // Esporta il colore visibile (Base o Shade)
    }));
  };

  const onSave = () => handleSave(getTilesForExport(), "Z340");
  const onSnag = () => handleSnag(boardRef.current, getTilesForExport(), "Z340");
  
  const onUploadLoaded = (loadedTiles: Tile[], _loadedFont: string) => {
    // Quando carichiamo un JSON, dobbiamo ricostruire il richText
    // Questa è una logica semplificata: assumiamo che l'upload sia un salvataggio di questa app
    // e proviamo a estrarre i caratteri in ordine.
    // Nota: L'upload su Z340 Explorer è complesso perché la struttura è rigida.
    // Per ora carichiamo solo i caratteri e gli stili nel flusso lineare.
    
    // Ordiniamo per ID (che in questa app corrisponde all'ordine visuale/logico a seconda del mode)
    // Ma per ricostruire il testo serve l'ordine originale.
    // Dato che il JSON standard non salva 'originalIndex', l'upload potrebbe essere impreciso
    // sui testi complessi. Facciamo un best effort basato sull'ordine array.
    
    const newRich: RichChar[] = loadedTiles.map(t => ({
      char: t.char,
      color: t.color,
      backgroundColor: t.backgroundColor
    }));
    
    resetHistory(newRich);
    setInputText(newRich.map(r => r.char).join(""));
  };


  // ─── GESTIONE INPUT TEXTAREA ───
  const handleTextChange = (rawText: string) => {
    const newText = rawText.replace(/[\n\r]+/g, "");
    if (newText === inputText) return;

    let prefixLen = 0;
    while (prefixLen < inputText.length && prefixLen < newText.length && inputText[prefixLen] === newText[prefixLen]) {
      prefixLen++;
    }

    let suffixLen = 0;
    while (
      suffixLen < (inputText.length - prefixLen) && 
      suffixLen < (newText.length - prefixLen) && 
      inputText[inputText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    const newRichText: RichChar[] = [];
    for (let i = 0; i < prefixLen; i++) newRichText.push(richText[i]);
    
    const insertedCount = newText.length - (prefixLen + suffixLen);
    for (let i = 0; i < insertedCount; i++) newRichText.push({ char: newText[prefixLen + i] });
    
    const oldSuffixStart = inputText.length - suffixLen;
    for (let i = 0; i < suffixLen; i++) newRichText.push(richText[oldSuffixStart + i]);

    setInputText(newText);
    setRichText(newRichText);
  };

  const applyStyleToSelection = (color: string, type: 'text' | 'bg') => {
    if (selectedIndices.length === 0) return;
    setRichText(prev => prev.map((item, idx) => {
      if (selectedIndices.includes(idx)) {
        return { ...item, [type === 'text' ? 'color' : 'backgroundColor']: color };
      }
      return item;
    }));
  };

  // ─── CALCOLO MATRICE DEI TILES ───
  const gridCells = useMemo(() => {
    const cells: GridCell[] = [];
    if (exploreMode === null) return [];

    const blockCapacity = numRows * numCols; 
    let visualBlockCols = 0;
    let visualBlockRows = 0;

    if (exploreMode === 'untranspose') {
      visualBlockCols = numRows; 
      visualBlockRows = numCols; 
    } else {
      visualBlockCols = numCols;
      visualBlockRows = numRows;
    }

    const totalChars = richText.length;
    const positionMap = new Map<number, number>();

    if (exploreMode === 'untranspose') {
      for (let i = 0; i < totalChars; i++) positionMap.set(i, i);
    } else {
      let currentR = 1; 
      let currentC = 1; 
      
      for (let i = 0; i < totalChars; i++) {
        const blockIndex = Math.floor(i / blockCapacity);
        if (blockIndex >= 2) {
          positionMap.set(i, i);
          continue;
        }

        const charInBlockIndex = i % blockCapacity;
        if (charInBlockIndex === 0) {
          currentR = 1;
          currentC = 1;
        } else {
          currentR = currentR + 1;
          if (currentR > numRows) currentR = (currentR - numRows); 
          currentC = currentC + 2;
          if (currentC > numCols) currentC = (currentC - numCols); 
        }

        const linearPosInBlock = (currentR - 1) * numCols + (currentC - 1);
        const absoluteGridPos = (blockIndex * blockCapacity) + linearPosInBlock;
        positionMap.set(absoluteGridPos, i);
      }
    }

    let currentGridRow = 1;
    
    // Blocco 1
    for (let r = 1; r <= visualBlockRows; r++) {
      for (let c = 1; c <= visualBlockCols; c++) {
        const linearIdx = (r - 1) * visualBlockCols + (c - 1);
        cells.push(createCell(linearIdx, r, c, visualBlockCols, visualBlockRows, positionMap));
      }
    }
    currentGridRow += visualBlockRows + 1;

    // Blocco 2
    for (let r = 1; r <= visualBlockRows; r++) {
      for (let c = 1; c <= visualBlockCols; c++) {
        const linearIdx = blockCapacity + (r - 1) * visualBlockCols + (c - 1);
        cells.push(createCell(linearIdx, currentGridRow + r - 1, c, visualBlockCols, visualBlockRows, positionMap));
      }
    }
    currentGridRow += visualBlockRows + 1;

    // Blocco Residuo
    const remainingCharsStart = blockCapacity * 2;
    if (totalChars > remainingCharsStart) {
      const remainingCount = totalChars - remainingCharsStart;
      const residRows = Math.ceil(remainingCount / visualBlockCols);
      for (let r = 1; r <= residRows; r++) {
        for (let c = 1; c <= visualBlockCols; c++) {
          const linearIdx = remainingCharsStart + (r - 1) * visualBlockCols + (c - 1);
          if (linearIdx < totalChars) {
             cells.push(createCell(linearIdx, currentGridRow + r - 1, c, visualBlockCols, visualBlockRows, positionMap));
          }
        }
      }
    }
    
    return cells;

  }, [numCols, numRows, richText, exploreMode]);

  function createCell(
    gridIndex: number, 
    cssRow: number, 
    cssCol: number, 
    vCols: number, 
    vRows: number, 
    posMap: Map<number, number>
  ): GridCell {
    
    const textIndex = posMap.get(gridIndex);
    const richChar = textIndex !== undefined ? richText[textIndex] : null;

    let baseColor = "var(--bg-color-board-tiles)"; 
    
    if (exploreMode === 'untranspose') {
      const blockCapacity = vCols * vRows;
      const isBlock1Or2 = gridIndex < (blockCapacity * 2);

      if (isBlock1Or2) {
        const indexInBlock = gridIndex % blockCapacity;
        const relCol = (indexInBlock % vCols) + 1; 
        const relRow = Math.floor(indexInBlock / vCols) + 1;

        if (relCol === 1) {
          baseColor = "#d3d3d3";
        } 
        else if (relCol > 1) {
          const grayCount = 2 * (relCol - 1);
          if (relRow > (vRows - grayCount)) {
            baseColor = "#d3d3d3";
          }
        }
      }
    }

    return {
      id: gridIndex,
      row: cssRow,
      col: cssCol,
      char: richChar?.char || "",
      baseColor: baseColor,
      styleColor: richChar?.color,
      styleBg: richChar?.backgroundColor,
      originalIndex: textIndex ?? null
    };
  }

  // ─── UTILS UI ───
  const handleTileClick = (textIndex: number | null, ctrlKey: boolean) => {
    if (textIndex === null) {
      if (!ctrlKey) setSelectedIndices([]);
      return;
    }
    
    // Logica: click successivi aggiungono alla selezione (toggle)
    // Se preferisci il comportamento standard (click = nuovo, ctrl+click = aggiungi), 
    // usa la logica commentata sotto.
    
    // Logica Standard (Richiesta dall'utente: "selezionare più tiles con click successivi")
    // Interpreto come: Cliccare su un tile non deseleziona gli altri se premo CTRL, 
    // oppure comportamento additivo di default? 
    // Per sicurezza mantengo lo standard CTRL+Click, ma mi assicuro che funzioni.
    
    if (ctrlKey) {
      setSelectedIndices(prev => 
        prev.includes(textIndex) ? prev.filter(i => i !== textIndex) : [...prev, textIndex]
      );
    } else {
      // Comportamento standard: click singolo seleziona SOLO quello
      setSelectedIndices([textIndex]);
    }
  };

  const handleRectSelection = (indices: number[], isAdditive: boolean) => {
    if (isAdditive) {
      setSelectedIndices(prev => Array.from(new Set([...prev, ...indices])));
    } else {
      setSelectedIndices(indices);
    }
  };

  return (
    <div className="container">

        <LeftSidebar
          inputText={inputText}
          setInputText={handleTextChange}
          numCols={numCols}
          setNumCols={setNumCols}
          numRows={numRows}
          setNumRows={setNumRows}
          exploreMode={exploreMode}
          setExploreMode={setExploreMode}
          repoText={repoText}
          setRepoText={setRepoText}
          onReset={handleReset}
        />

      <div className="center-section">
        <h1 className="full-width" style={{textAlign: "center", marginBottom: "1rem", fontSize: "3.5rem"}}>
           Explore Z340’s homophonic cycles
        </h1>
        
        <Board
          boardRef={boardRef}
          gridCells={gridCells}
          selectedIndices={selectedIndices}
          onTileClick={handleTileClick}
          onRectSelection={handleRectSelection}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          totalVisualCols={exploreMode === 'untranspose' ? numRows : numCols}
          setActiveSidebarKeys={setActiveSidebarKeys}
          // Nuove props per bottoni board
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSnag={onSnag}
          onSave={onSave}
          onUploadLoaded={onUploadLoaded}
        />
      </div>

        <RightSidebar
          tiles={richText.map((rc, i) => ({ id: i, char: rc.char, col: 0, row: 0, color: rc.color, backgroundColor: rc.backgroundColor }))}
          setTiles={() => {}} 
          selectedTileIds={selectedIndices}
          setSelectedTileIds={setSelectedIndices} 
          activeSidebarKeys={activeSidebarKeys}
          setActiveSidebarKeys={setActiveSidebarKeys}
          customApplyColor={applyStyleToSelection}
          currentTheme={currentTheme}
          selectedKeyName={"Z340"}
          setSelectedKeyName={() => {}}
          onDeleteTiles={() => {}}
          isAddMode={false}
          setIsAddMode={() => {}}
          boardFont={"Z340"}
          isCopyMode={false}
          setIsCopyMode={() => {}}
          hideManipulationButtons={true} 
        />
      </div>
  );
}