import { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import "./style.css";
import { Tile } from "./types";
import { getCssVarRemFrom, getRemValueInPx } from "./utils/ghostImage";
import Z340Untransposed from "./texts/Z340untransposed";

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
  
  const [numCols, setNumCols] = useState(17);
  const [numRows, setNumRows] = useState(9);
  
  const [richText, setRichText] = useState<RichChar[]>([]);
  const [inputText, setInputText] = useState("");

  const [exploreMode, setExploreMode] = useState<'untranspose' | 'transpose' | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'alt' | 'third'>('default');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); 
  const [activeSidebarKeys, setActiveSidebarKeys] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  // Inizializzazione
  useEffect(() => {
    const raw = Z340Untransposed || "";
    const clean = raw.replace(/[\n\r]+/g, "");
    const initialRich: RichChar[] = clean.split("").map(c => ({ char: c }));
    setRichText(initialRich);
    setInputText(clean);
  }, []);

  // Gestione Input con Diffing
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

    // Creazione celle visive
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
    
    // ─── LOGICA COLORE GRIGIO (Untranspose) ───
    if (exploreMode === 'untranspose') {
      const blockCapacity = vCols * vRows;
      const isBlock1Or2 = gridIndex < (blockCapacity * 2);

      if (isBlock1Or2) {
        // Calcolo coordinate relative interne al blocco (1-based)
        const indexInBlock = gridIndex % blockCapacity;
        
        // Attenzione: l'ordine di riempimento in untranspose è lineare Row-Major (riga per riga)
        // Quindi calcoliamo relRow e relCol sulla base di vCols (che è la larghezza visiva)
        const relRow = Math.floor(indexInBlock / vCols) + 1;
        const relCol = (indexInBlock % vCols) + 1;

        // Regola 1: Prima colonna (relCol == 1) sempre grigia
        if (relCol === 1) {
          baseColor = "#d3d3d3";
        } 
        // Regola 2: Altre colonne
        else if (relCol > 1) {
          // Formula: Ultimi 2 * (col - 1) tiles sono grigi
          // Esempio Col 2: 2 * (1) = 2 tiles finali
          // Esempio Col 3: 2 * (2) = 4 tiles finali
          const grayCount = 2 * (relCol - 1);
          
          // Se la riga attuale è nel range finale
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

  // UI Utils
  const handleTileClick = (textIndex: number | null, ctrlKey: boolean) => {
    if (textIndex === null) {
      if (!ctrlKey) setSelectedIndices([]);
      return;
    }
    if (ctrlKey) {
      setSelectedIndices(prev => 
        prev.includes(textIndex) ? prev.filter(i => i !== textIndex) : [...prev, textIndex]
      );
    } else {
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
      />

      <div className="center-section">
        {/* Fix 5: Titolo più grande */}
        <h1 className="full-width" style={{textAlign: "center", marginBottom: "1rem", fontSize: "4rem"}}>
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
        hideManipulationButtons={true} // Nasconde bottoni inutili
      />
    </div>
  );
}