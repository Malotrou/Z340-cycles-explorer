import { useState, useCallback } from "react";

export default function useHistory<T>(initialState: T, limit: number = 15) {
  // Storia come array di stati
  const [history, setHistory] = useState<T[]>([initialState]);
  // Indice corrente
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback((action: T | ((prev: T) => T)) => {
    setHistory((prevHistory) => {
      const current = prevHistory[index];
      const nextState = action instanceof Function ? action(current) : action;

      // Se non cambia nulla, ritorna lo stesso array
      if (nextState === current) return prevHistory;

      // Taglia il futuro e aggiungi nuovo stato
      const newHistory = prevHistory.slice(0, index + 1);
      newHistory.push(nextState);

      // Applica il limite
      if (newHistory.length > limit) {
        newHistory.shift();
      }
      return newHistory;
    });

    // Aggiorna l'indice
    setIndex((prevIndex) => {
       // Puntiamo sempre all'ultimo elemento aggiunto.
       // Poiché abbiamo gestito lo shift sopra, l'indice non può superare il limite.
       return Math.min(prevIndex + 1, limit); 
    });
    
    // Correzione asincrona per sicurezza (opzionale ma consigliata)
    setHistory(current => {
       setIndex(current.length - 1);
       return current;
    });

  }, [index, limit]);

  const undo = useCallback(() => setIndex(i => Math.max(i - 1, 0)), []);
  const redo = useCallback(() => setIndex(i => Math.min(i + 1, history.length - 1)), [history.length]);
  
  const resetHistory = useCallback((newState: T) => {
      setHistory([newState]);
      setIndex(0);
  }, []);

  return { 
      state, 
      setState, 
      undo, 
      redo, 
      canUndo: index > 0, 
      canRedo: index < history.length - 1,
      resetHistory 
  };
}