import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { ClockInfo } from './ClockInfo';
import { EvalBar } from './EvalBar';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import type { ClockSettings, EngineSettings, BoardSettings } from '../hooks/useSettings';
import type { EngineScore } from '../engine/StockfishManager';

interface BoardAreaProps {
  clockSettings: ClockSettings;
  engineSettings: EngineSettings;
  boardSettings: BoardSettings;
  player: any;
  timeMap: Record<number, number>;
  history: Move[];
  engineScore: EngineScore | null;
  isSyncMode: boolean;
  currentFen: string;
  handlePieceDrop: (arg1: any, arg2?: any, arg3?: any) => boolean;
  masterGameRef: React.MutableRefObject<Chess>;
}

export const BoardArea: React.FC<BoardAreaProps> = ({
  clockSettings,
  engineSettings,
  boardSettings,
  player,
  timeMap,
  history,
  engineScore,
  isSyncMode,
  currentFen,
  handlePieceDrop,
  masterGameRef,
}) => {
  const arrows = useMemo(() => {
    if (engineSettings.enabled && engineSettings.showArrow && engineScore?.bestMove) {
      const move = engineScore.bestMove;
      if (move.length >= 4) {
        return [
          {
            startSquare: move.substring(0, 2),
            endSquare: move.substring(2, 4),
            color: 'rgba(255, 170, 0, 0.5)',
          },
        ];
      }
    }
    return [];
  }, [engineSettings.enabled, engineSettings.showArrow, engineScore?.bestMove]);

  const chessboardOptions = useMemo(() => {
    return {
      position: currentFen,
      onPieceDrop: handlePieceDrop,
      allowDragging: true,
      darkSquareStyle: { backgroundColor: '#475569' },
      lightSquareStyle: { backgroundColor: '#94a3b8' },
      arrows: arrows,
      boardOrientation: boardSettings.orientation,
      showNotation: false,
    };
  }, [currentFen, isSyncMode, handlePieceDrop, arrows, boardSettings.orientation]);

  const outerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState<number>(0);

  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        const isDesktop = window.innerWidth >= 1024;
        
        const evalBarW = engineSettings.enabled ? (isDesktop ? 32 : 22) : 0;
        const clocksH = clockSettings.enabled ? (isDesktop ? 88 : 64) : 0;
        
        const size = Math.floor(Math.max(0, Math.min(width - evalBarW, height - clocksH)));
        setBoardSize(size);
      }
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, [engineSettings.enabled, clockSettings.enabled]);

  const totalContentWidth = boardSize + (engineSettings.enabled ? (window.innerWidth >= 1024 ? 32 : 22) : 0);

  return (
    <div ref={outerRef} className="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="flex flex-col justify-center items-center h-full transition-all" 
        style={{ width: boardSize > 0 ? `${totalContentWidth}px` : '100%', opacity: boardSize > 0 ? 1 : 0 }}
      >
        {clockSettings.enabled && (
          <div className="flex justify-between items-end pb-1 lg:pb-2 px-2 flex-shrink-0 w-full">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-800 rounded shadow border border-slate-700"></div>
              <span className="font-semibold text-slate-300 text-sm lg:text-base">
                {masterGameRef.current.header().Black && masterGameRef.current.header().Black !== '?'
                  ? masterGameRef.current.header().Black
                  : 'Black'}
              </span>
            </div>
            <ClockInfo player={player} timeMap={timeMap} history={history} settings={clockSettings} color="black" />
          </div>
        )}

        <div className="flex flex-row items-stretch justify-center w-full" style={{ height: boardSize > 0 ? `${boardSize}px` : '100%' }}>
          {engineSettings.enabled && (
            <div className="flex-shrink-0 mr-1.5 lg:mr-2 py-[2%] min-w-[16px] sm:min-w-[24px]">
              <EvalBar score={engineScore} orientation={boardSettings.orientation} />
            </div>
          )}
          <div
            className={`transition-all flex items-center justify-center flex-shrink-0 w-full h-full ${
              isSyncMode ? 'ring-4 ring-indigo-500/50 rounded-sm' : ''
            }`}
            style={boardSize > 0 ? { width: `${boardSize}px`, height: `${boardSize}px` } : undefined}
          >
            <Chessboard options={chessboardOptions} />
          </div>
        </div>

        {clockSettings.enabled && (
          <div className="flex justify-between items-start pt-1 lg:pt-2 px-2 flex-shrink-0 w-full">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-200 rounded shadow border border-slate-300"></div>
              <span className="font-semibold text-slate-300 text-sm lg:text-base">
                {masterGameRef.current.header().White && masterGameRef.current.header().White !== '?'
                  ? masterGameRef.current.header().White
                  : 'White'}
              </span>
            </div>
            <ClockInfo player={player} timeMap={timeMap} history={history} settings={clockSettings} color="white" />
          </div>
        )}
      </div>
    </div>
  );
};
