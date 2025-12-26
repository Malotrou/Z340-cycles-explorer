// src/types.ts

export type Tile = {
  id: number;
  char: string;
  col: number;
  row: number;
  // NUOVE PROPRIETÀ OPZIONALI
  color?: string;           // Colore del testo
  backgroundColor?: string; // Colore di sfondo
};

// ... lascia invariato il resto (DragOffset, DropPreview, etc.)
export type DragOffset = {
  id: number;
  offsetCol: number;
  offsetRow: number;
};

export type DropPreview = {
  isValid: boolean;
  cells: { col: number; row: number }[];
};

export type SelectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};