import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  handlePieceDrop: (arg1: any, arg2?: any, arg3?: any, arg4?: any) => boolean;
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



  const outerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState<number>(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [pendingPromotion, setPendingPromotion] = useState<{ sourceSquare: string, targetSquare: string, pieceStr: string, color: 'w' | 'b' } | null>(null);

  useEffect(() => {
    setSelectedSquare(null);
    setOptionSquares({});
    setPendingPromotion(null);
  }, [currentFen]);

  const processMove = useCallback((sourceSquare: string, targetSquare: string, pieceStr: string) => {
    const game = new Chess(currentFen);
    const moves = game.moves({ square: sourceSquare as any, verbose: true }) as Move[];
    const isPromotion = moves.some(m => m.to === targetSquare && m.promotion);
    
    if (isPromotion) {
      setPendingPromotion({ sourceSquare, targetSquare, pieceStr, color: game.turn() });
      return false;
    }
    
    return handlePieceDrop(sourceSquare, targetSquare, pieceStr);
  }, [currentFen, handlePieceDrop]);

  const onPieceDropWrapper = useCallback((arg1: any, arg2?: any, arg3?: any) => {
    let sourceSquare: string;
    let targetSquare: string;
    let pieceStr: string;

    if (typeof arg1 === 'object' && arg1 !== null && 'sourceSquare' in arg1) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
      pieceStr = arg1.piece; 
    } else {
      sourceSquare = arg1;
      targetSquare = arg2;
      pieceStr = arg3;
    }
    const success = processMove(sourceSquare, targetSquare, pieceStr);
    return success !== false;
  }, [processMove]);

  const onSquareClick = useCallback((arg1: any) => {
    try {
      const square = typeof arg1 === 'object' && arg1 !== null && 'square' in arg1 ? arg1.square : arg1;
      const game = new Chess(currentFen);
      
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }

      const piece = game.get(square as any);
      if (piece && piece.color === game.turn()) {
        const moves = game.moves({ square: square as any, verbose: true }) as Move[];
        
        if (moves.length === 0) {
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }
        
        setSelectedSquare(square);
        
        const newOptionSquares: Record<string, React.CSSProperties> = {};
        moves.forEach((move) => {
          newOptionSquares[move.to] = {
            background:
              game.get(move.to as any)
                ? 'radial-gradient(circle, rgba(0,0,0,.3) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)',
            borderRadius: '50%',
          };
        });
        newOptionSquares[square] = {
          background: 'rgba(255, 255, 0, 0.4)',
        };
        
        setOptionSquares(newOptionSquares);
        return;
      }

      if (selectedSquare) {
        const moves = game.moves({ square: selectedSquare as any, verbose: true }) as Move[];
        const isMoveValid = moves.some((move) => move.to === square);
        
        if (isMoveValid) {
          const pieceOnSource = game.get(selectedSquare as any);
          const pieceStr = pieceOnSource ? pieceOnSource.color + pieceOnSource.type.toUpperCase() : '';
          processMove(selectedSquare, square, pieceStr);
          setSelectedSquare(null);
          setOptionSquares({});
        } else {
          setSelectedSquare(null);
          setOptionSquares({});
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentFen, selectedSquare, processMove]);

  const chessboardOptions = useMemo(() => {
    return {
      position: currentFen,
      onPieceDrop: onPieceDropWrapper,
      onSquareClick: onSquareClick,
      squareStyles: optionSquares,
      allowDragging: true,
      darkSquareStyle: { backgroundColor: '#475569' },
      lightSquareStyle: { backgroundColor: '#94a3b8' },
      arrows: arrows,
      boardOrientation: boardSettings.orientation,
      showNotation: false,
    };
  }, [currentFen, onPieceDropWrapper, onSquareClick, optionSquares, arrows, boardSettings.orientation]);

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
            className={`transition-all flex items-center justify-center flex-shrink-0 w-full h-full relative ${
              isSyncMode ? 'ring-4 ring-indigo-500/50 rounded-sm' : ''
            }`}
            style={boardSize > 0 ? { width: `${boardSize}px`, height: `${boardSize}px` } : undefined}
          >
            <Chessboard options={chessboardOptions} />
            
            {pendingPromotion && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-sm">
                <div className="bg-slate-800 p-4 rounded-lg shadow-2xl flex flex-col items-center gap-4 border border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-200">Promote to</h3>
                  <div className="flex gap-2">
                    {(() => {
                      const pieces = pendingPromotion.color === 'w' 
                        ? [{ type: 'q', char: '♕' }, { type: 'r', char: '♖' }, { type: 'b', char: '♗' }, { type: 'n', char: '♘' }]
                        : [{ type: 'q', char: '♛' }, { type: 'r', char: '♜' }, { type: 'b', char: '♝' }, { type: 'n', char: '♞' }];
                      return pieces.map(p => (
                        <button
                          key={p.type}
                          className="w-14 h-14 sm:w-16 sm:h-16 text-4xl sm:text-5xl flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded cursor-pointer transition-colors border border-slate-600 hover:border-indigo-400"
                          onClick={() => {
                            handlePieceDrop(
                              pendingPromotion.sourceSquare, 
                              pendingPromotion.targetSquare, 
                              pendingPromotion.pieceStr, 
                              p.type
                            );
                            setPendingPromotion(null);
                          }}
                        >
                          <span style={{ 
                            color: pendingPromotion.color === 'w' ? '#fff' : '#111', 
                            WebkitTextStroke: pendingPromotion.color === 'b' ? '1.5px #cbd5e1' : 'none' 
                          }}>
                            {p.char}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                  <button 
                    className="text-sm text-slate-400 hover:text-white mt-2"
                    onClick={() => setPendingPromotion(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
