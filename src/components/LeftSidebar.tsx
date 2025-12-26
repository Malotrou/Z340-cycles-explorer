import React, { useState, useEffect } from "react";
import CustomText from "../texts/Custom";
import Z408Text from "../texts/Z408";
import Z340Transposed from "../texts/Z340transposed";
import Z340Untransposed from "../texts/Z340untransposed";
import Z408Plain from "../texts/Z408_plain";
import Z340TransposedPlain from "../texts/Z340transposed_plain";
import Z340UntransposedPlain from "../texts/Z340untransposed_plain";

type LeftSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  inputText: string;
  setInputText: (val: string) => void;
  cipherType: string;
  setCipherType: (val: string) => void;
  uiFont: string;
  setUiFont: (val: string) => void;
  selectedNumber: number;
  setSelectedNumber: (val: number) => void;
  onCreateTiles: () => void;
  // NUOVE PROPS
  spacesMode: 'keep' | 'remove';
  setSpacesMode: (val: 'keep' | 'remove') => void;
};

export default function LeftSidebar({
  collapsed,
  onToggle,
  inputText,
  setInputText,
  cipherType,
  setCipherType,
  uiFont,
  setUiFont,
  selectedNumber,
  setSelectedNumber,
  onCreateTiles,
  spacesMode,
  setSpacesMode,
}: LeftSidebarProps) {
  
  const [textMode, setTextMode] = useState<"plaintext" | "ciphertext">("plaintext");
  const [customDraft, setCustomDraft] = useState(CustomText);

  const textContentMap: Record<string, { plaintext: string; ciphertext: string }> = {
    "Custom": { plaintext: "", ciphertext: "" },
    "Z408": { plaintext: Z408Plain, ciphertext: Z408Text },
    "Z340": { plaintext: Z340TransposedPlain, ciphertext: Z340Transposed },
    "Z340 untrasposed": { plaintext: Z340UntransposedPlain, ciphertext: Z340Untransposed}
  };

  useEffect(() => {
    if (cipherType === "Custom") {
      setInputText(customDraft);
      setTextMode("plaintext"); 
    } else {
      const data = textContentMap[cipherType];
      if (data) setInputText(data[textMode]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cipherType, textMode]); 

  useEffect(() => {
    if (textMode === "plaintext") {
      setUiFont("Arial");
    } else {
      if (cipherType === "Z408") {
        setUiFont("Z408");
      } else if (cipherType === "Z340" || cipherType === "Z340 untrasposed") {
        setUiFont("Z340");
      }
    }
  }, [cipherType, textMode, setUiFont]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (cipherType === "Custom") setCustomDraft(val);
  };

  return (
    <div className={`sidebar-section ${collapsed ? "collapsed" : ""}`}>
      {!collapsed && (
        <div className="flex-column full-height">
          
          <div>
            <div className="flex-between mb-3rem">
              <h1 className="sidebar-title">Input area</h1>
              <button className="toggle-btn" onClick={onToggle} title="Chiudi pannello">☰</button>
            </div>

            <div style={{ height: "0.1rem", backgroundColor: "#9e9c9cb0", flexShrink: 0, marginBottom: "3rem"}}></div>

            {/* Cifrario */}
            {/* MARGINE RIDOTTO A 1rem */}
            <div className="label-bold mb-1rem">Drop your text:</div>
            <div className="radio-group mb-4rem">
              {["Custom", "Z408", "Z340", "Z340 untrasposed"].map((type) => (
                <label key={type}>
                  <input
                    type="radio"
                    name="cipherType"
                    value={type}
                    checked={cipherType === type}
                    onChange={(e) => setCipherType(e.target.value)}
                  />
                  {type}
                </label>
              ))}
            </div>

            {/* Visualizzazione */}
            {/* MARGINE RIDOTTO A 1rem */}
            <div className="label-bold mb-1rem">Visualize:</div>
            <div className="radio-group mb-2rem">
              <label style={{ opacity: cipherType === "Custom" ? 0.5 : 1 }}>
                <input
                  type="radio"
                  name="textMode"
                  value="plaintext"
                  checked={textMode === "plaintext"}
                  onChange={() => setTextMode("plaintext")}
                  disabled={cipherType === "Custom"}
                />
                Plaintext
              </label>
              <label style={{ opacity: cipherType === "Custom" ? 0.5 : 1 }}>
                <input
                  type="radio"
                  name="textMode"
                  value="ciphertext"
                  checked={textMode === "ciphertext"}
                  onChange={() => setTextMode("ciphertext")}
                  disabled={cipherType === "Custom"}
                />
                Ciphertext
              </label>
            </div>

            {/* Input Text */}
            <textarea
              placeholder="Insert text here..."
              value={inputText}
              onChange={handleTextChange}
              className="text-area-input mb-4rem"
            />

            {/* ─── NUOVO: SEZIONE SPACES ─── */}
            <div className="label-bold mb-1rem">Spaces:</div>
            <div className="radio-group mb-4rem">
              <label>
                <input
                  type="radio"
                  name="spacesMode"
                  value="keep"
                  checked={spacesMode === "keep"}
                  onChange={() => setSpacesMode("keep")}
                />
                Keep
              </label>
              <label>
                <input
                  type="radio"
                  name="spacesMode"
                  value="remove"
                  checked={spacesMode === "remove"}
                  onChange={() => setSpacesMode("remove")}
                />
                Remove
              </label>
            </div>
            {/* ───────────────────────────── */}

            {/* Font */}
            {/* MARGINE RIDOTTO A 1rem */}
            <div className="label-bold mb-1rem">Choose font:</div>
            <div className="radio-group mb-4rem">
              {["Arial", "Z408", "Z340", "Largo"].map((font) => (
                <label key={font}>
                  <input
                    type="radio"
                    name="fontType"
                    value={font}
                    checked={uiFont === font}
                    onChange={(e) => setUiFont(e.target.value)}
                  />
                  {font === "Largo" ? "Glyphs-only" : font}
                </label>
              ))}
            </div>

            <div className="flex-column gap-small">
              {/* MARGINE RIDOTTO A 1rem */}
              <label htmlFor="numberSelect" className="label-bold mb-1rem">
                No. of columns:
              </label>
              <select
                id="numberSelect"
                value={selectedNumber}
                onChange={(e) => setSelectedNumber(Number(e.target.value))}
                className="dropdown-select"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>{num}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="action-button" onClick={onCreateTiles}>CREATE</button>
        </div>
      )}

      {collapsed && (
        <>
          <div className="flex-between">
            <button className="toggle-btn reopen-btn" onClick={onToggle} title="Apri pannello">☰</button>
          </div>
          <div className="collapsed-label sx mt-35rem">INPUT AREA</div>
        </>
      )}
    </div>
  );
}