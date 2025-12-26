import React from "react";

type LeftSidebarProps = {
  inputText: string;
  setInputText: (val: string) => void;
  numCols: number;
  setNumCols: (val: number) => void;
  numRows: number;
  setNumRows: (val: number) => void;
  exploreMode: 'untranspose' | 'transpose' | null;
  setExploreMode: (val: 'untranspose' | 'transpose') => void;
};

export default function LeftSidebar({
  inputText,
  setInputText,
  numCols,
  setNumCols,
  numRows,
  setNumRows,
  exploreMode,
  setExploreMode
}: LeftSidebarProps) {
  
  const colOptions = Array.from({ length: 8 }, (_, i) => 13 + i); 
  const rowOptions = Array.from({ length: 7 }, (_, i) => 7 + i);  

  return (
    <div className="sidebar-section">
      <div className="flex-column full-height">
        
        <h1 className="sidebar-title mb-3rem">Input area</h1>
        <div style={{ height: "0.1rem", backgroundColor: "#9e9c9cb0", flexShrink: 0, marginBottom: "3rem"}}></div>

        {/* Dropdowns Colonne/Righe - CENTRATI */}
        <div className="flex-row gap-medium mb-2rem full-width" style={{ justifyContent: "center" }}>
            <div className="flex-column" style={{ width: "45%", alignItems: "center" }}>
                <label className="label-bold mb-1rem" style={{fontSize: "1.2rem"}}>No. of columns</label>
                <select 
                    className="dropdown-select full-width"
                    value={numCols}
                    onChange={(e) => setNumCols(Number(e.target.value))}
                >
                    {colOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
            <div className="flex-column" style={{ width: "45%", alignItems: "center" }}>
                <label className="label-bold mb-1rem" style={{fontSize: "1.2rem"}}>No. of rows</label>
                <select 
                    className="dropdown-select full-width"
                    value={numRows}
                    onChange={(e) => setNumRows(Number(e.target.value))}
                >
                    {rowOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>

        {/* Canvas Textarea - TITOLO CENTRATO */}
        <div className="flex-column flex-1 mb-2rem" style={{ minHeight: 0, width: "100%", alignItems: "center" }}>
             <label className="label-bold mb-1rem" style={{ textAlign: "center", width: "100%" }}>Canvas</label>
             <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-area-input"
                cols={numCols}
                style={{
                    fontFamily: "Z340",
                    fontSize: "2rem", 
                    height: "100%",   
                    resize: "none",   
                    width: "auto",    
                    maxWidth: "100%", 
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    overflowWrap: "anywhere",
                    lineHeight: "1.2",
                    letterSpacing: "0.1rem",
                    textAlign: "left"
                }}
             />
        </div>

        {/* Action Buttons - INVERTITI E RINOMINATI */}
        <div className="flex-column gap-medium mt-auto full-width">
            <button 
                className="action-button"
                onClick={() => setExploreMode('transpose')}
                style={{
                    backgroundColor: exploreMode === 'transpose' ? "#ccc" : "var(--color-primary)",
                    cursor: exploreMode === 'transpose' ? "default" : "pointer",
                     border: exploreMode === 'transpose' ? "0.2rem solid #000" : "none"
                }}
            >
                GENERATE TRANSPOSED
            </button>

            <button 
                className="action-button"
                onClick={() => setExploreMode('untranspose')}
                style={{
                    backgroundColor: exploreMode === 'untranspose' ? "#ccc" : "var(--color-primary)",
                    cursor: exploreMode === 'untranspose' ? "default" : "pointer",
                    border: exploreMode === 'untranspose' ? "0.2rem solid #000" : "none"
                }}
            >
                GENERATE UNTRANSPOSED
            </button>
        </div>

      </div>
    </div>
  );
}