import React, { useState, useRef, useEffect } from "react";
import PlaintextKey from "../keys/PlaintextKey"; 
import Z408Key from "../keys/Z408Key";
import Z340Key from "../keys/Z340Key";
import { Tile } from "../types";
import { createSingleTileGhost } from "../utils/ghostImage";
import Z408_new_tiles from "../special_glyphs/Z408Key_additional_glyphs"; 
import Z340_new_tiles from "../special_glyphs/Z340Key_additional_glyphs"; 

// ─── COSTANTI PALETTE (Spostate fuori) ───
const TEXT_PALETTE = ["#000000", "#333333", "#555555", "#777777", "#999999", "#800000", "#a52a2a", "#cc0000", "#ff0000", "#e65100", "#ff6600", "#ff9900", "#cc9900", "#b38f00", "#806000", "#003300", "#006400", "#008000", "#228b22", "#2e8b57", "#000080", "#0000cd", "#0000ff", "#008080", "#008b8b", "#4b0082", "#800080", "#8b008b", "#9400d3", "#9932cc", "#8b4513", "#d2691e", "#cd853f", "#708090", "#2f4f4f"];
const BG_PALETTE = ["#ffffff00", "#ffffff", "#f2f2f2", "#e6e6e6", "#d9d9d9", "#ffe6e6", "#ffcccc", "#fadadd", "#f8c8dc", "#e6b3b3", "#fff0e6", "#ffe0cc", "#ffebd9", "#fffacd", "#fff5c2", "#ffffe0", "#ffffcc", "#ffffb3", "#fcf4a3", "#fff080", "#e6ffe6", "#ccffcc", "#d0f0c0", "#c1e1c1", "#b3e6b3", "#e0ffff", "#ccffff", "#d1f2eb", "#cce5ff", "#b3d9ff", "#e6f2ff", "#d6eaf8", "#e6e6fa", "#dcd0ff", "#c7b3e5"];

// ─── COMPONENTE COLOR PICKER ESTRATTO (Fix Focus Input) ───
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

  // Stato locale per gestire l'input manuale senza scatti
  const [localInput, setLocalInput] = useState(currentColor);

  // Sincronizza l'input locale se cambia la selezione tile (es. clicco su un altro tile)
  useEffect(() => {
    setLocalInput(currentColor);
  }, [currentColor]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalInput(val); // Aggiorna subito la UI per permettere la digitazione

    // Validazione Hex permissiva (accetta con o senza #, 3 o 6 caratteri)
    // Es: FFF, #FFF, FFFFFF, #FFFFFF
    const hexPattern = /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i;
    
    if (hexPattern.test(val)) {
      // Se è valido, normalizziamo con # e applichiamo
      let colorToApply = val;
      if (!colorToApply.startsWith("#")) {
        colorToApply = "#" + colorToApply;
      }
      onApplyColor(colorToApply, type);
    }
  };

  const handleEyeDropper = async () => { 
    if (!(window as any).EyeDropper) { alert("No EyeDropper"); return; } 
    try { 
      const res = await new (window as any).EyeDropper().open(); 
      onApplyColor(res.sRGBHex, type); 
    } catch (e) { } 
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
        <input 
          type="text" 
          value={localInput.toUpperCase()} 
          onChange={handleInputChange} 
          style={{ flex: 1, width: "100%", textAlign: "center", fontFamily: "monospace", fontSize: "1.3rem", border: "0.1rem solid #ccc", borderRadius: "0.4rem" }} 
        />
      </div>
      <button onClick={() => onApplyColor(type === "text" ? "var(--color-text-main)" : "var(--bg-color-board-tiles)", type)} style={{ width: "100%", backgroundColor: "#f0f0f0", border: "0.1rem solid #ccc", borderRadius: "0.4rem", cursor: "pointer", fontSize: "1.1rem", fontWeight: "normal", padding: "0.2rem 0" }}>RESET ↺</button>
    </div>
  );
};

// ─── COMPONENTE PRINCIPALE ───

type RightSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  tiles: Tile[];
  setTiles: React.Dispatch<React.SetStateAction<Tile[]>>;
  selectedTileIds: number[];
  setSelectedTileIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedKeyName: "Plaintext" | "Z408" | "Z340";
  setSelectedKeyName: React.Dispatch<React.SetStateAction<"Plaintext" | "Z408" | "Z340">>;
  onDeleteTiles: () => void;
  isAddMode: boolean;
  setIsAddMode: React.Dispatch<React.SetStateAction<boolean>>;
  boardFont: string;
  currentTheme: 'default' | 'alt' | 'third';
  isCopyMode: boolean;
  setIsCopyMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function RightSidebar({
  collapsed,
  onToggle,
  tiles,
  setTiles,
  selectedTileIds,
  setSelectedTileIds,
  selectedKeyName,
  setSelectedKeyName,
  onDeleteTiles,
  isAddMode,
  setIsAddMode,
  boardFont,
  currentTheme,
  isCopyMode,
  setIsCopyMode,
}: RightSidebarProps) {
  
  const [activeSidebarKeys, setActiveSidebarKeys] = useState<string[]>([]);
  
  // TOOLTIP STATES
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState("");
  const tooltipTimeoutRef = useRef<number | null>(null);
  const blockHoverRef = useRef(false);

  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const copyTooltipTimeoutRef = useRef<number | null>(null);
  const blockCopyHoverRef = useRef(false);

  // DROPDOWN SPECIAL STATES
  const [specialGlyph, setSpecialGlyph] = useState(" "); 
  const [isSpecialOpen, setIsSpecialOpen] = useState(false);
  const specialDropdownRef = useRef<HTMLDivElement>(null);

  // KEY DATA
  const keyDataMap = { "Plaintext": PlaintextKey, "Z408": Z408Key, "Z340": Z340Key };
  const currentKeyData = keyDataMap[selectedKeyName];

  // LOGICA SELEZIONE LISTA SPECIALI
  let activeSpecialTiles: string[] = [];
  let activeSpecialFont = "Arial";

  if (selectedKeyName === "Z408") {
    activeSpecialTiles = Z408_new_tiles;
    activeSpecialFont = "Z408";
  } else if (selectedKeyName === "Z340") {
    activeSpecialTiles = Z340_new_tiles;
    activeSpecialFont = "Z340";
  }

  useEffect(() => {
    if (activeSpecialTiles.length > 0) {
      setSpecialGlyph(activeSpecialTiles[0]);
    }
    setIsSpecialOpen(false);
  }, [selectedKeyName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specialDropdownRef.current && !specialDropdownRef.current.contains(event.target as Node)) {
        setIsSpecialOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentKeyData) return null;

  // HANDLERS...
  const handleDropBtnEnter = () => { if (blockHoverRef.current) return; tooltipTimeoutRef.current = window.setTimeout(() => { setTooltipText("Delete selected tiles from board"); setShowTooltip(true); }, 800); };
  const handleDropBtnLeave = () => { if (blockHoverRef.current) return; if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); setShowTooltip(false); };
  const handleDropBtnClick = () => { if (selectedTileIds.length > 0) { onDeleteTiles(); setShowTooltip(false); if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); } else { blockHoverRef.current = true; if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); setTooltipText("Select one or more tiles on the board"); setShowTooltip(true); tooltipTimeoutRef.current = window.setTimeout(() => { setShowTooltip(false); blockHoverRef.current = false; }, 2000); } };

  const handleCopyBtnEnter = () => { if (blockCopyHoverRef.current || isCopyMode) return; copyTooltipTimeoutRef.current = window.setTimeout(() => { setShowCopyTooltip(true); }, 800); };
  const handleCopyBtnLeave = () => { if (blockCopyHoverRef.current) return; if (copyTooltipTimeoutRef.current) clearTimeout(copyTooltipTimeoutRef.current); setShowCopyTooltip(false); };
  const handleCopyBtnClick = () => { 
    if (selectedTileIds.length === 0) { 
      blockCopyHoverRef.current = true; 
      if (copyTooltipTimeoutRef.current) clearTimeout(copyTooltipTimeoutRef.current); 
      setShowCopyTooltip(true); 
      copyTooltipTimeoutRef.current = window.setTimeout(() => { setShowCopyTooltip(false); blockCopyHoverRef.current = false; }, 2000); 
      return; 
    } 
    const newMode = !isCopyMode; 
    setIsCopyMode(newMode); 
    setShowCopyTooltip(false); 
    if (newMode) { 
      setIsAddMode(false); 
    } 
  };

  const handleSidebarDragStart = (e: React.DragEvent<HTMLDivElement>, char: string) => {
    if (!isAddMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("dragType", "NEW_TILE");
    e.dataTransfer.setData("newChar", char);
    e.dataTransfer.effectAllowed = "copy";
    createSingleTileGhost(e, char, boardFont); 
  };

  const applyColorToSelection = (color: string, type: "text" | "bg") => {
    if (selectedTileIds.length === 0) return;
    setTiles((prevTiles) => prevTiles.map((t) => {
      if (selectedTileIds.includes(t.id)) {
        return { ...t, [type === "text" ? "color" : "backgroundColor"]: color };
      }
      return t;
    }));
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) { setSelectedTileIds([]); setActiveSidebarKeys([]); }
  };

  const handleGlyphClick = (e: React.MouseEvent, symbol: string, parentChar: string) => {
    if (isAddMode) return; 
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
     if (isAddMode) return; 
     e.stopPropagation(); const parentKey = `plain:${char}`; const associatedSymbols = (currentKeyData as Record<string, string[]>)[char]; const glyphKeys = associatedSymbols.map(s => `glyph:${s}`); const willBeActive = !activeSidebarKeys.includes(parentKey); const matchingTiles = tiles.filter(t => associatedSymbols.includes(t.char)); const targetIds = matchingTiles.map(t => t.id); if (willBeActive) { setSelectedTileIds(p => { const u = targetIds.filter(id => !p.includes(id)); return [...p, ...u]; }); setActiveSidebarKeys(p => { const u = new Set([...p, parentKey, ...glyphKeys]); return Array.from(u); }); } else { setSelectedTileIds(p => p.filter(id => !targetIds.includes(id))); setActiveSidebarKeys(p => p.filter(k => k !== parentKey && !glyphKeys.includes(k))); }
  };

  const sortedPlaintextChars = Object.keys(currentKeyData).sort();
  const currentFont = "Largo";

  return (
    <div className={`sidebar-section ${collapsed ? "collapsed" : "pr-4"}`} onClick={handleBackgroundClick} style={{ cursor: collapsed ? "default" : "pointer" }}>
      {!collapsed && (
        <>
          <div className="flex-between mb-3rem" onClick={(e) => e.stopPropagation()}>
            <h1 className="sidebar-title">Editing tools</h1>
            <button className="toggle-btn" onClick={onToggle} title="Chiudi">☰</button>
          </div>

          <div style={{ height: "0.1rem", backgroundColor: "#9e9c9cb0", flexShrink: 0, marginBottom: "3rem"}}></div>

          <div className="flex-row items-center gap-medium mb-1rem" onClick={(e) => e.stopPropagation()}>
            <span className="label-bold">Select Key:</span>
            <select value={selectedKeyName} onChange={(e) => { setSelectedKeyName(e.target.value as any); setActiveSidebarKeys([]); }} className="dropdown-select font-normal flex-1">
              <option value="Plaintext">Plaintext Key</option>
              <option value="Z408">Z408 Key</option>
              <option value="Z340">Z340 Key</option>
            </select>
          </div>

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
                        const glyphBg = isAddMode ? "#e0f7fa" : (isSelected ? "#FFF44F" : "#ffffff");
                        const cursor = isAddMode ? "grab" : "pointer";
                        const border = isAddMode ? "0.1rem dashed #00bcd4" : "0.1rem solid #000";
                        return (
                          <div key={`${char}-${idx}`} className="tile" draggable={isAddMode} onDragStart={(e) => handleSidebarDragStart(e, symbol)} onClick={(e) => handleGlyphClick(e, symbol, char)} style={{ width: "calc(var(--cell-size) * 0.75)", height: "calc(var(--cell-size) * 0.75)", minWidth: "calc(var(--cell-size) * 0.75)", fontFamily: currentFont, fontWeight: "normal", fontSize: "2rem", lineHeight: "1", paddingTop: "0.4rem", backgroundColor: glyphBg, cursor: cursor, border: border, borderRadius: "0.4rem" }}>{symbol}</div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STRUMENTI */}
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
                
                {/* ── DIVISORE ── */}
                <div style={{ height: "0.1rem", backgroundColor: "#ddd", flexShrink: 0 }}></div>
                
                {/* ── SEZIONE SPECIAL GLYPHS ── */}
                {isAddMode && activeSpecialTiles.length > 0 && (
                   <div className="flex-column gap-small" style={{ alignItems: "center" }}>
                      <h4 style={{ fontSize: "1.4rem", fontWeight: "bold", textAlign: "center", margin: 0 }}>Special</h4>
                      
                      <div 
                        ref={specialDropdownRef}
                        style={{ position: "relative", width: "max-content" }}
                      >
                          <div 
                             draggable 
                             onDragStart={(e) => handleSidebarDragStart(e, specialGlyph)} 
                             onClick={() => setIsSpecialOpen(!isSpecialOpen)}
                             title="Drag to board or Click to change"
                             style={{ 
                               width: "4.5rem",   
                               height: "4.5rem",  
                               fontFamily: activeSpecialFont, 
                               cursor: "grab", 
                               backgroundColor: "#e0f7fa", 
                               border: "0.1rem dashed #00bcd4",
                               borderRadius: "0.4rem",
                               fontSize: "2.5rem", 
                               display: "flex",
                               alignItems: "center",
                               justifyContent: "center",
                               position: "relative", 
                               userSelect: "none"
                             }}
                           >
                             {specialGlyph}
                             <div style={{ position: "absolute", bottom: "0.1rem", right: "0.3rem", fontSize: "1rem", color: "#00bcd4", fontFamily: "Arial", pointerEvents: "none" }}>▼</div>
                           </div>

                           {isSpecialOpen && (
                             <div style={{ position: "absolute", top: "110%", left: "0", width: "100%", backgroundColor: "#ffffff", border: "0.1rem solid #ccc", borderRadius: "0.4rem", boxShadow: "0 0.4rem 0.8rem rgba(0,0,0,0.2)", zIndex: 1000, display: "flex", flexDirection: "column", padding: "0.2rem", maxHeight: "15rem", overflowY: "auto" }}>
                               {activeSpecialTiles.map((char, i) => (
                                 <div 
                                   key={i}
                                   onClick={() => { setSpecialGlyph(char); setIsSpecialOpen(false); }}
                                   style={{ fontFamily: activeSpecialFont, fontSize: "2rem", padding: "0.5rem 0", textAlign: "center", cursor: "pointer", backgroundColor: char === specialGlyph ? "#e0f7fa" : "transparent", borderBottom: i < activeSpecialTiles.length - 1 ? "0.1rem solid #eee" : "none" }}
                                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = char === specialGlyph ? "#e0f7fa" : "transparent"}
                                 >
                                   {char === " " ? "\u00A0" : char}
                                 </div>
                               ))}
                             </div>
                           )}
                      </div>
                   </div>
                )}
              </div>

              <div className="flex-column gap-medium" style={{ marginTop: "1rem" }}>
                <button
                  onClick={() => { setIsAddMode(!isAddMode); setSelectedTileIds([]); setIsCopyMode(false); }}
                  className="action-button"
                  style={{ backgroundColor: isAddMode ? "#00bcd4" : undefined, fontSize: "1.4rem", opacity: isCopyMode ? 0.5 : 1, pointerEvents: isCopyMode ? "none" : "auto" }}
                >
                  {isAddMode ? "DONE" : "NEW TILES"}
                </button>

                <div style={{ position: "relative" }}>
                   <button onClick={handleCopyBtnClick} onMouseEnter={handleCopyBtnEnter} onMouseLeave={handleCopyBtnLeave} className="action-button" style={{ backgroundColor: isCopyMode ? "#00bcd4" : undefined, fontSize: "1.4rem", opacity: isAddMode ? 0.5 : 1, pointerEvents: isAddMode ? "none" : "auto" }}>{isCopyMode ? "DONE" : "COPY TILES"}</button>
                   {showCopyTooltip && (<div className="tooltip-container" style={{ bottom: "110%", right: 0 }}>{"Select one or more tiles"}<div className="tooltip-arrow" /></div>)}
                </div>

                <div style={{ position: "relative" }}>
                  <button onClick={handleDropBtnClick} onMouseEnter={handleDropBtnEnter} onMouseLeave={handleDropBtnLeave} className="drop-btn" style={{ opacity: (isAddMode || isCopyMode) ? 0.5 : 1, pointerEvents: (isAddMode || isCopyMode) ? "none" : "auto" }}>DROP TILES</button>
                  {showTooltip && (<div className="tooltip-container">{tooltipText}<div className="tooltip-arrow" /></div>)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {collapsed && (
        <>
          <div className="flex-between" onClick={(e) => e.stopPropagation()}>
            <button className="toggle-btn reopen-btn" onClick={onToggle}>☰</button>
          </div>
          <div className="collapsed-label dx  mt-35rem">EDITING TOOLS</div>
        </>
      )}
    </div>
  );
}