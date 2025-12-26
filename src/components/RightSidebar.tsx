import React, { useState, useEffect } from "react";
import Z340Key from "../keys/Z340Key";
import { Tile } from "../types";

// ─── COSTANTI PALETTE ───
const TEXT_PALETTE = ["#000000", "#333333", "#555555", "#777777", "#999999", "#800000", "#a52a2a", "#cc0000", "#ff0000", "#e65100", "#ff6600", "#ff9900", "#cc9900", "#b38f00", "#806000", "#003300", "#006400", "#008000", "#228b22", "#2e8b57", "#000080", "#0000cd", "#0000ff", "#008080", "#008b8b", "#4b0082", "#800080", "#8b008b", "#9400d3", "#9932cc", "#8b4513", "#d2691e", "#cd853f", "#708090", "#2f4f4f"];
const BG_PALETTE = ["#ffffff00", "#ffffff", "#f2f2f2", "#e6e6e6", "#d9d9d9", "#ffe6e6", "#ffcccc", "#fadadd", "#f8c8dc", "#e6b3b3", "#fff0e6", "#ffe0cc", "#ffebd9", "#fffacd", "#fff5c2", "#ffffe0", "#ffffcc", "#ffffb3", "#fcf4a3", "#fff080", "#e6ffe6", "#ccffcc", "#d0f0c0", "#c1e1c1", "#b3e6b3", "#e0ffff", "#ccffff", "#d1f2eb", "#cce5ff", "#b3d9ff", "#e6f2ff", "#d6eaf8", "#e6e6fa", "#dcd0ff", "#c7b3e5"];

// ─── COLOR PICKER ───
type ColorPickerToolProps = {
  type: "text" | "bg";
  title: string;
  tiles: Tile[];
  selectedTileIds: number[];
  onApplyColor: (color: string, type: "text" | "bg") => void;
};

const ColorPickerTool = ({ type, title, tiles, selectedTileIds, onApplyColor }: ColorPickerToolProps) => {
  const firstSelected = tiles.find((t) => selectedTileIds.includes(t.id));
  const currentColor = type === "text" ? firstSelected?.color || "#000000" : firstSelected?.backgroundColor || "#ffffff";
  const paletteToUse = type === "text" ? TEXT_PALETTE : BG_PALETTE;
  const [localInput, setLocalInput] = useState(currentColor);

  useEffect(() => { setLocalInput(currentColor); }, [currentColor]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalInput(val); 
    const hexPattern = /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i;
    if (hexPattern.test(val)) {
      let colorToApply = val;
      if (!colorToApply.startsWith("#")) { colorToApply = "#" + colorToApply; }
      onApplyColor(colorToApply, type);
    }
  };

  const handleEyeDropper = async () => { 
    if (!(window as any).EyeDropper) { alert("No EyeDropper"); return; } 
    try { const res = await new (window as any).EyeDropper().open(); onApplyColor(res.sRGBHex, type); } catch (e) { } 
  };

  return (
    <div className="flex-column gap-small">
      <h4 style={{ fontSize: "1.4rem", fontWeight: "bold", textAlign: "center", margin: 0 }}>{title}</h4>
      <div className="color-picker-grid">
        {paletteToUse.map((c, i) => (
          <div key={i} className="color-swatch" onClick={() => onApplyColor(c, type)} title={c} style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex-row gap-small">
        <button onClick={handleEyeDropper} title="Pick" style={{ padding: "0 0.3rem", cursor: "pointer", border: "0.1rem solid #ccc", backgroundColor: "#eee", borderRadius: "0.4rem", fontSize: "1.1rem" }}>🖊️</button>
        <input type="text" value={localInput.toUpperCase()} onChange={handleInputChange} style={{ flex: 1, width: "100%", textAlign: "center", fontFamily: "monospace", fontSize: "1.3rem", border: "0.1rem solid #ccc", borderRadius: "0.4rem" }} />
      </div>
      <button onClick={() => onApplyColor(type === "text" ? "var(--color-text-main)" : "var(--bg-color-board-tiles)", type)} style={{ width: "100%", backgroundColor: "#f0f0f0", border: "0.1rem solid #ccc", borderRadius: "0.4rem", cursor: "pointer", fontSize: "1.1rem", fontWeight: "normal", padding: "0.2rem 0" }}>RESET ↺</button>
    </div>
  );
};

// ─── RIGHT SIDEBAR ───

type RightSidebarProps = {
  tiles: Tile[];
  setTiles: React.Dispatch<React.SetStateAction<Tile[]>>;
  selectedTileIds: number[];
  setSelectedTileIds: React.Dispatch<React.SetStateAction<number[]>>;
  activeSidebarKeys: string[];
  setActiveSidebarKeys: React.Dispatch<React.SetStateAction<string[]>>;
  customApplyColor?: (color: string, type: "text" | "bg") => void;
  // Props dummy per compatibilità
  [key: string]: any; 
};

export default function RightSidebar({
  tiles,
  selectedTileIds,
  setSelectedTileIds,
  activeSidebarKeys,
  setActiveSidebarKeys,
  customApplyColor,
  currentTheme 
}: RightSidebarProps) {
  
  const currentKeyData = Z340Key;
  const sortedPlaintextChars = Object.keys(currentKeyData).sort();
  // Fix 4: Font corretto per la sidebar
  const currentFont = "Largo"; 

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) { setSelectedTileIds([]); setActiveSidebarKeys([]); }
  };

  const applyColorToSelection = (color: string, type: "text" | "bg") => {
    if (customApplyColor) {
      customApplyColor(color, type);
      return;
    }
  };

  const handleGlyphClick = (e: React.MouseEvent, symbol: string, parentChar: string) => {
    e.stopPropagation();
    const glyphKey = `glyph:${symbol}`;
    const isActive = activeSidebarKeys.includes(glyphKey);
    const willBeActive = !isActive;
    const matchingTiles = tiles.filter((t) => t.char === symbol);
    const targetIds = matchingTiles.map((t) => t.id);
    if (willBeActive) { setSelectedTileIds(p => { const u = targetIds.filter(id => !p.includes(id)); return [...p, ...u]; }); } else { setSelectedTileIds(p => p.filter(id => !targetIds.includes(id))); }
    setActiveSidebarKeys(p => { let n = willBeActive ? [...p, glyphKey] : p.filter(k => k !== glyphKey); const sibs = (currentKeyData as Record<string, string[]>)[parentChar]; const allActive = sibs.every(s => n.includes(`glyph:${s}`)); const pKey = `plain:${parentChar}`; if (allActive) { if (!n.includes(pKey)) n.push(pKey); } else { n = n.filter(k => k !== pKey); } return n; });
  };

  const handlePlaintextClick = (e: React.MouseEvent, char: string) => {
     e.stopPropagation(); const parentKey = `plain:${char}`; const associatedSymbols = (currentKeyData as Record<string, string[]>)[char]; const glyphKeys = associatedSymbols.map(s => `glyph:${s}`); const willBeActive = !activeSidebarKeys.includes(parentKey); const matchingTiles = tiles.filter(t => associatedSymbols.includes(t.char)); const targetIds = matchingTiles.map(t => t.id); if (willBeActive) { setSelectedTileIds(p => { const u = targetIds.filter(id => !p.includes(id)); return [...p, ...u]; }); setActiveSidebarKeys(p => { const u = new Set([...p, parentKey, ...glyphKeys]); return Array.from(u); }); } else { setSelectedTileIds(p => p.filter(id => !targetIds.includes(id))); setActiveSidebarKeys(p => p.filter(k => k !== parentKey && !glyphKeys.includes(k))); }
  };

  return (
    <div className="sidebar-section pr-4" onClick={handleBackgroundClick} style={{ cursor: "pointer" }}>
      
      <div className="flex-between mb-3rem" onClick={(e) => e.stopPropagation()}>
        <h1 className="sidebar-title">Editing tools</h1>
      </div>

      <div style={{ height: "0.1rem", backgroundColor: "#9e9c9cb0", flexShrink: 0, marginBottom: "3rem"}}></div>

      <div className="flex-row gap-medium full-height" style={{ minHeight: 0, marginTop: "1rem" }} onClick={(e) => e.stopPropagation()}>
        
        {/* LISTA CHIAVI */}
        <div className={`key-list-container theme-${currentTheme}`}>
          {sortedPlaintextChars.map((char) => {
              const isPlainActive = activeSidebarKeys.includes(`plain:${char}`);
              const plainBg = isPlainActive ? "#FFF44F" : "#2b2b2b";
              const plainColor = isPlainActive ? "#000000" : "#ffffff";
              return (
              <div key={char} className="flex-row items-center" style={{ marginBottom: "0.3rem" }}>
                <div className="flex-row items-center" style={{ marginRight: "0.4rem", flexShrink: 0 }}>
                  <div className="tile" onClick={(e) => handlePlaintextClick(e, char)} style={{ width: "calc(var(--cell-size) * 0.7)", height: "calc(var(--cell-size) * 0.7)", minWidth: "calc(var(--cell-size) * 0.7)", fontSize: "1.7rem", backgroundColor: plainBg, color: plainColor, cursor: "pointer", border: "none", borderRadius: "0.4rem" }}>{char}</div>
                  <span style={{ fontSize: "1rem", fontWeight: "bold", marginLeft: "0.2rem" }}>:</span>
                </div>
                <div className="flex-row flex-wrap gap-small" style={{ flex: 1 }}>
                  {(currentKeyData as Record<string, string[]>)[char].map((symbol, idx) => {
                    const isSelected = activeSidebarKeys.includes(`glyph:${symbol}`);
                    const glyphBg = isSelected ? "#FFF44F" : "#ffffff";
                    const border = "0.1rem solid #000";
                    return (
                      <div key={`${char}-${idx}`} className="tile" onClick={(e) => handleGlyphClick(e, symbol, char)} style={{ width: "calc(var(--cell-size) * 0.75)", height: "calc(var(--cell-size) * 0.75)", minWidth: "calc(var(--cell-size) * 0.75)", fontFamily: currentFont, fontWeight: "normal", fontSize: "2rem", lineHeight: "1", paddingTop: "0.4rem", backgroundColor: glyphBg, cursor: "pointer", border: border, borderRadius: "0.4rem" }}>{symbol}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* STRUMENTI (Solo Colore) */}
        <div className="tools-container">
          <div className="flex-column gap-large">
            <ColorPickerTool 
              title="Text" 
              type="text" 
              tiles={tiles}
              selectedTileIds={selectedTileIds}
              onApplyColor={applyColorToSelection}
            />
            <div style={{ height: "0.1rem", backgroundColor: "#ddd", flexShrink: 0 }}></div>
            <ColorPickerTool 
              title="Shade" 
              type="bg" 
              tiles={tiles}
              selectedTileIds={selectedTileIds}
              onApplyColor={applyColorToSelection}
            />
          </div>
        </div>
      </div>
    </div>
  );
}