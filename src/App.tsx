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
  
  // ─── CONFIGURAZIONE DIMENSIONI ───
  const [numCols, setNumCols] = useState(17);
  const [numRows, setNumRows] = useState(9);
  
  // ─── STATO TESTO E STILI ───
  const [richText, setRichText] = useState<RichChar[]>([]);
  const [inputText, setInputText] = useState("");

  // ─── STATI MODALITÀ (Fix 0: parte da null) ───
  const [exploreMode, setExploreMode] = useState<'untranspose' | 'transpose' | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'default' | 'alt' | 'third'>('default');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // ─── SELEZIONE ───
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); 
  const [activeSidebarKeys, setActiveSidebarKeys] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  // ─── INIZIALIZZAZIONE ───
  useEffect(() => {
    // Caricamento iniziale testo pulito (Fix 2: no newlines)
    const raw = Z340Untransposed || "";
    const clean = raw.replace(/[\n\r]+/g, "");
    
    const initialRich: RichChar[] = clean.split("").map(c => ({ char: c }));
    setRichText(initialRich);
    setInputText(clean);
  }, []);

  // ─── GESTIONE INPUT TEXTAREA (Fix 5: Diffing Algorithm) ───
  const handleTextChange = (rawText: string) => {
    // Fix 2: Rimuoviamo subito i ritorni a capo dall'input
    const newText = rawText.replace(/[\n\r]+/g, "");
    
    // Se il testo non è cambiato (es. solo enter premuto e rimosso), non fare nulla
    if (newText === inputText) return;

    // Algoritmo di Diffing per preservare gli stili "sul carattere"
    // 1. Troviamo il prefisso comune
    let prefixLen = 0;
    while (prefixLen < inputText.length && prefixLen < newText.length && inputText[prefixLen] === newText[prefixLen]) {
      prefixLen++;
    }

    // 2. Troviamo il suffisso comune
    let suffixLen = 0;
    while (
      suffixLen < (inputText.length - prefixLen) && 
      suffixLen < (newText.length - prefixLen) && 
      inputText[inputText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    // 3. Costruiamo il nuovo array RichChar
    const newRichText: RichChar[] = [];

    // A. Copia parte immutata iniziale
    for (let i = 0; i < prefixLen; i++) {
      newRichText.push(richText[i]);
    }

    // B. Aggiungi i nuovi caratteri (inseriti dall'utente)
    //    Questi prendono stile di default (nessuno)
    const insertedCount = newText.length - (prefixLen + suffixLen);
    for (let i = 0; i < insertedCount; i++) {
      newRichText.push({ char: newText[prefixLen + i] });
    }

    // C. Copia parte immutata finale (traslando gli indici dallo stato vecchio)
    //    I caratteri cancellati vengono saltati automaticamente perché non li copiamo
    const oldSuffixStart = inputText.length - suffixLen;
    for (let i = 0; i < suffixLen; i++) {
      newRichText.push(richText[oldSuffixStart + i]);
    }

    setInputText(newText);
    setRichText(newRichText);
  };

  // ─── LOGICA DI COLORAZIONE ───
  const applyStyleToSelection = (color: string, type: 'text' | 'bg') => {
    if (selectedIndices.length === 0) return;
    
    setRichText(prev => prev.map((item, idx) => {
      if (selectedIndices.includes(idx)) {
        return {
          ...item,
          [type === 'text' ? 'color' : 'backgroundColor']: color
        };
      }
      return item;
    }));
  };

  // ─── CALCOLO MATRICE DEI TILES ───
  const gridCells = useMemo(() => {
    const cells: GridCell[] = [];
    
    // Fix 0: Se nessuna modalità è selezionata, griglia vuota
    if (exploreMode === null) return [];

    const blockCapacity = numRows * numCols; 
    
    // Dimensioni VISIVE
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
    // Mappa: GridIndex -> TextIndex
    const positionMap = new Map<number, number>();

    // ─── MAPPA POSIZIONI ───
    
    if (exploreMode === 'untranspose') {
      // Lineare semplice per tutto
      for (let i = 0; i < totalChars; i++) {
        positionMap.set(i, i);
      }
    } else {
      // TRANSPOSE (Ciclica sui blocchi, Lineare sul residuo)
      
      let currentR = 1; 
      let currentC = 1; 
      
      for (let i = 0; i < totalChars; i++) {
        const blockIndex = Math.floor(i / blockCapacity);
        
        // Fix 3: Il terzo blocco (residuo) e successivi non usano la trasposizione, ma sono lineari
        if (blockIndex >= 2) {
          // Calcoliamo la posizione assoluta lineare a partire dall'inizio del terzo blocco
          // La posizione grid deve essere consequenziale all'ultimo tile del blocco 2
          const absoluteGridPos = i; 
          positionMap.set(absoluteGridPos, i);
          continue;
        }

        // Logica Trasposizione (Solo blocchi 0 e 1)
        const charInBlockIndex = i % blockCapacity;
        
        if (charInBlockIndex === 0) {
          currentR = 1;
          currentC = 1;
        } else {
          // Regola: riga+1, col+2
          currentR = currentR + 1;
          if (currentR > numRows) currentR = (currentR - numRows); // Wrap residuo

          currentC = currentC + 2;
          if (currentC > numCols) currentC = (currentC - numCols); // Wrap residuo
        }

        const linearPosInBlock = (currentR - 1) * numCols + (currentC - 1);
        const absoluteGridPos = (blockIndex * blockCapacity) + linearPosInBlock;
        positionMap.set(absoluteGridPos, i);
      }
    }

    // ─── CREAZIONE CELLE VISIVE ───
    
    let currentGridRow = 1;
    
    // BLOCCO 1
    for (let r = 1; r <= visualBlockRows; r++) {
      for (let c = 1; c <= visualBlockCols; c++) {
        const linearIdx = (r - 1) * visualBlockCols + (c - 1);
        cells.push(createCell(linearIdx, r, c, visualBlockCols, visualBlockRows, positionMap));
      }
    }
    currentGridRow += visualBlockRows + 1; // Spacer

    // BLOCCO 2
    for (let r = 1; r <= visualBlockRows; r++) {
      for (let c = 1; c <= visualBlockCols; c++) {
        const linearIdx = blockCapacity + (r - 1) * visualBlockCols + (c - 1);
        cells.push(createCell(linearIdx, currentGridRow + r - 1, c, visualBlockCols, visualBlockRows, positionMap));
      }
    }
    currentGridRow += visualBlockRows + 1; // Spacer

    // BLOCCO RESIDUO (Se c'è testo)
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
    
    // Colore Base Grigio (Solo Untranspose)
    if (exploreMode === 'untranspose') {
      const isBlock1Or2 = gridIndex < (vCols * vRows * 2);
      if (isBlock1Or2) {
        const indexInBlock = gridIndex % (vCols * vRows);
        const relCol = (indexInBlock % vCols) + 1; // Colonna visiva interna
        const relRow = Math.floor(indexInBlock / vCols) + 1;
        
        // Logica "triangolare"
        if (relCol === 1) {
          baseColor = "#d3d3d3";
        } else if (relCol >= 3) {
          const grayCount = 2 * (relCol - 2);
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
  // Gestione click singolo o CTRL+click
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

  // Gestione selezione rettangolare (Callback dalla Board)
  const handleRectSelection = (indices: number[], isAdditive: boolean) => {
    if (isAdditive) {
      // Uniamo senza duplicati
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
        <h1 className="full-width" style={{textAlign: "center", marginBottom: "1rem"}}>
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
        // Props dummy per compatibilità
        selectedKeyName={"Z340"}
        setSelectedKeyName={() => {}}
        onDeleteTiles={() => {}}
        isAddMode={false}
        setIsAddMode={() => {}}
        boardFont={"Z340"}
        isCopyMode={false}
        setIsCopyMode={() => {}}
      />
    </div>
  );
}