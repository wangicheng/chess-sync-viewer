import { useState, useEffect, useRef } from 'react';
import { StockfishManager, type EngineScore } from '../engine/StockfishManager';

export function useChessEngine(currentFen: string, enabled: boolean) {
  const [engineScore, setEngineScore] = useState<EngineScore | null>(null);
  const engineManagerRef = useRef<StockfishManager | null>(null);

  useEffect(() => {
    if (enabled) {
      if (!engineManagerRef.current) {
        engineManagerRef.current = new StockfishManager();
        engineManagerRef.current.setOnScoreUpdate(setEngineScore);
      }
      const timeoutId = setTimeout(() => {
        engineManagerRef.current?.evaluate(currentFen);
      }, 250);
      return () => clearTimeout(timeoutId);
    } else {
      if (engineManagerRef.current) {
        engineManagerRef.current.terminate();
        engineManagerRef.current = null;
      }
      setEngineScore(null);
    }
  }, [enabled, currentFen]);

  // Cleanup worker when component unmounts
  useEffect(() => {
    return () => {
      if (engineManagerRef.current) {
        engineManagerRef.current.terminate();
      }
    };
  }, []);

  return engineScore;
}
