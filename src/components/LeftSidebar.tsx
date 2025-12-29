type LeftSidebarProps = {
  inputText: string;
  setInputText: (val: string) => void;
  numCols: number;
  setNumCols: (val: number) => void;
  numRows: number;
  setNumRows: (val: number) => void;
  exploreMode: 'untranspose' | 'transpose' | null;
  setExploreMode: (val: 'untranspose' | 'transpose') => void;
  repoText: string;
  setRepoText: (val: string) => void;
  onReset: () => void;
};

export default function LeftSidebar({
  inputText,
  setInputText,
  numCols,
  setNumCols,
  numRows,
  setNumRows,
 // exploreMode,
  setExploreMode,
  repoText,
  setRepoText,
  onReset
}: LeftSidebarProps) {
  
  const colOptions = Array.from({ length: 8 }, (_, i) => 13 + i); 
  const rowOptions = Array.from({ length: 7 }, (_, i) => 7 + i);  

  return (
    <div className="sidebar-section">
      <div className="flex-column full-height">
        
        <h1 className="sidebar-title">Input area</h1>
        <div style={{ height: "0.1rem", backgroundColor: "#9e9c9cb0", flexShrink: 0, marginTop: "3rem", marginBottom: "3rem"}}></div>

        {/* 1. Canvas Textarea */}
        <div className="flex-column flex-1 mb-2rem" style={{ minHeight: "20rem", width: "100%" }}>
             <label className="label-bold mb-1rem" style={{ alignSelf: "flex-start", paddingLeft: "0.5rem" }}>Canvas</label>
             <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-area-input"
                style={{  
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                }}
             />
        </div>

        {/* 2. Repository Textarea */}
        <div className="flex-column flex-2 mb-2rem" style={{ minHeight: "15rem", width: "100%" }}>
             <label className="label-bold mb-1rem" style={{ alignSelf: "flex-start", paddingLeft: "0.5rem" }}>Text portions repository:</label>
             <textarea
                value={repoText}
                onChange={(e) => setRepoText(e.target.value)}
                className="text-area-input"
                //placeholder="Park your text snippets here..."
                style={{  
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                }}
             />
        </div>

        {/* Dropdowns */}
        <div className="flex-row gap-medium mb-3rem full-width" style={{ justifyContent: "center" }}>
            <div className="flex-column" style={{ width: "50%", alignItems: "left" }}>
                <label className="label-bold mb-1rem" style={{fontSize: "1.5rem"}}>No. of columns</label>
                <select 
                    className="dropdown-select"
                    value={numCols}
                    onChange={(e) => setNumCols(Number(e.target.value))}
                >
                    {colOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
            <div className="flex-column" style={{ width: "50%", alignItems: "left" }}>
                <label className="label-bold mb-1rem" style={{fontSize: "1.5rem"}}>No. of rows</label>
                <select 
                    className="dropdown-select"
                    value={numRows}
                    onChange={(e) => setNumRows(Number(e.target.value))}
                >
                    {rowOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>


        {/* 3. Reset Button */}
         <div className="mb-1rem full-width">
            <button 
                className="reset-button"
                onClick={onReset}
            >
                RESET APP
            </button>
        </div>

        {/* Action Buttons */}
        <div className="flex-column gap-medium mt-auto full-width">
            <button 
                className="action-button"
                onClick={() => setExploreMode('transpose')}
            >
                GENERATE TRANSPOSED
            </button>

            <button 
                className="action-button"
                onClick={() => setExploreMode('untranspose')}
            >
                GENERATE UNTRANSPOSED
            </button>
        </div>

      </div>
    </div>
  );
}