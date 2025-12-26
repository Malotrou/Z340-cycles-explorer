import html2canvas from "html2canvas";
import { Tile } from "../types";
import { getCssVarRemFrom, getRemValueInPx } from "./ghostImage";

// ─── UTILITY: SALVARE FILE ───
const downloadFile = (href: string, filename: string) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ... (imports e downloadFile restano uguali)

// ... (imports e downloadFile restano uguali)

// ─── 1. SNAG (SCREENSHOT - THEME AWARE + FILENAME PROMPT) ───
export const handleSnag = async (
  boardEl: HTMLDivElement | null,
  tiles: Tile[],
  boardFont: string
) => {
  if (!boardEl || tiles.length === 0) {
    alert("Board is empty or not available.");
    return;
  }

  // 1. RICHIESTA NOME FILE
  const defaultName = `zodiac_snapshot_${new Date().toISOString().slice(0, 10)}`;
  let fileName = window.prompt("Enter a name for your snapshot:", defaultName);

  // Se l'utente clicca annulla, fermiamo tutto
  if (fileName === null) return;

  // Pulizia nome ed estensione
  fileName = fileName.trim() || defaultName;
  if (!fileName.toLowerCase().endsWith(".jpg")) {
    fileName += ".jpg";
  }

  // 2. LETTURA PARAMETRI (Dimensioni e COLORI LIVE)
  //const root = document.documentElement;
  const rootFontSize = getRemValueInPx();
  
  const computedStyle = getComputedStyle(boardEl);
  
  const themeBoardBg = computedStyle.getPropertyValue('--bg-color-board').trim() || '#E1E0E0';
  const themeTileBgDefault = computedStyle.getPropertyValue('--bg-color-board-tiles').trim() || '#ffffff';
  const themeTileBorder = computedStyle.getPropertyValue('--border-color-tiles').trim() || '#000000';

  const zoom = getCssVarRemFrom(boardEl, "--zoom", "1");
  const baseW = getCssVarRemFrom(boardEl, "--base-cell-width", "3.5");
  const baseH = getCssVarRemFrom(boardEl, "--base-cell-height", "3.5");
  const gapRem = getCssVarRemFrom(boardEl, "--gap-size", "0.2");

  const cellW = baseW * zoom * rootFontSize;
  const cellH = baseH * zoom * rootFontSize;
  const gap = gapRem * rootFontSize;

  // 3. Calcolo Bounding Box
  const minCol = Math.min(...tiles.map((t) => t.col));
  const maxCol = Math.max(...tiles.map((t) => t.col));
  const minRow = Math.min(...tiles.map((t) => t.row));
  const maxRow = Math.max(...tiles.map((t) => t.row));

  const colsContent = (maxCol - minCol + 1);
  const rowsContent = (maxRow - minRow + 1);

  // 4. Creazione Stage
  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.top = "-99999px";
  stage.style.left = "-99999px";
  
  stage.style.backgroundColor = themeBoardBg; 
  
  stage.style.display = "grid";
  stage.style.gap = `${gap}px`;
  stage.style.gridTemplateColumns = `repeat(${colsContent}, ${cellW}px)`;
  stage.style.gridTemplateRows = `repeat(${rowsContent}, ${cellH}px)`;
  stage.style.padding = `${cellH}px ${cellW}px`; 
  stage.style.width = "max-content";
  stage.style.height = "max-content";
  stage.style.fontFamily = boardFont; 

  document.body.appendChild(stage);

  // 5. Popolamento Stage
  tiles.forEach(tile => {
    const el = document.createElement("div");
    
    el.style.width = `${cellW}px`;
    el.style.height = `${cellH}px`;
    el.style.backgroundColor = tile.backgroundColor ?? themeTileBgDefault;
    el.style.border = `1px solid ${themeTileBorder}`;
    el.style.color = tile.color || (themeTileBorder === '#00000000' ? '#000000' : '#000000'); 
    el.style.borderRadius = "0.4rem"; 
    
    el.style.display = "flex";
    el.style.justifyContent = "center";
    el.style.alignItems = "center"; 
    el.style.boxSizing = "border-box";
    el.style.paddingBottom = `${cellH * 0.25}px`; // Fix centratura
    //el.style.fontWeight = "bold";
    el.style.fontSize = `${cellW * 0.6}px`;
    el.style.fontFamily = boardFont;
    el.style.overflow = "hidden";
    el.innerText = tile.char;

    const relCol = tile.col - minCol + 1;
    const relRow = tile.row - minRow + 1;
    el.style.gridColumnStart = relCol.toString();
    el.style.gridRowStart = relRow.toString();

    stage.appendChild(el);
  });

  try {
    // 6. Scatto Fotografia
    const canvas = await html2canvas(stage, {
      backgroundColor: themeBoardBg, 
      scale: 2, 
      logging: false,
    });

    // 7. Download con il nome scelto
    downloadFile(canvas.toDataURL("image/jpeg", 0.9), fileName);
  } catch (err) {
    console.error("Snag failed:", err);
    alert("Failed to create screenshot.");
  } finally {
    document.body.removeChild(stage);
  }
};

// ─── 2. SAVE (JSON con richiesta nome) ───
export const handleSave = (tiles: Tile[], boardFont: string) => {
  if (tiles.length === 0) {
    alert("Nothing to save!");
    return;
  }

  // 1. Chiediamo all'utente il nome del file
  const defaultName = `zodiac_session_${new Date().toISOString().slice(0, 10)}`;
  let fileName = window.prompt("Enter a name for your save file:", defaultName);

  // 2. Se l'utente clicca "Annulla", interrompiamo il salvataggio
  if (fileName === null) return;

  // 3. Pulizia nome (rimozione spazi bianchi e aggiunta estensione se manca)
  fileName = fileName.trim() || defaultName;
  if (!fileName.toLowerCase().endsWith(".json")) {
    fileName += ".json";
  }

  // 4. Preparazione dei dati
  const exportData = {
    version: "1.0",
    timestamp: Date.now(),
    boardFont: boardFont,
    tiles: tiles.map(({ id, char, col, row, color, backgroundColor }) => ({
      id, char, col, row, color, backgroundColor
    }))
  };

  // 5. Creazione del Blob e download
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  
  // Usiamo la utility downloadFile che avevamo già definito in questo file
  downloadFile(href, fileName);
  
  // Pulizia memoria
  URL.revokeObjectURL(href);
};

// ─── 3. UPLOAD (JSON) ───
export const handleUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  onLoadSuccess: (tiles: Tile[], font: string) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target?.result as string);
      
      if (!json.tiles || !Array.isArray(json.tiles)) {
        throw new Error("Invalid file format: missing tiles array");
      }

      const savedFont = json.boardFont || "Arial";

      onLoadSuccess(json.tiles, savedFont);
    } catch (err) {
      console.error(err);
      alert("Error loading file. Make sure it's a valid Zodiac JSON.");
    } finally {
      e.target.value = ""; 
    }
  };
  reader.readAsText(file);
};

