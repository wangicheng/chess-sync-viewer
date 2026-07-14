import React, { useEffect } from 'react';
import { Clock, Check, Edit3, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Chess, type Move } from 'chess.js';
import type { GameNode } from '../hooks/useGameSync';

interface MoveListProps {
  currentMoveIndex: number;
  jumpToMove: (index: number) => void;
  jumpToNode: (nodeId: string) => void;
  isSyncMode: boolean;
  syncTargetIndex: number | null;
  timeMap: Record<number, number>;
  editingMoveIndex: number | 'end' | null;
  setEditingMoveIndex: (index: number | 'end' | null) => void;
  history: Move[];
  gameTree: Record<string, GameNode>;
  mainLineIds: string[];
  currentNodeId: string;
  player: any;
  updateMoveVTime: (moveIndex: number, videoTime: number) => void;
  updateEndTime: (newTime: number) => void;
  masterGameRef: React.MutableRefObject<Chess>;
}

export const MoveList: React.FC<MoveListProps> = ({
  currentMoveIndex,
  jumpToMove,
  jumpToNode,
  isSyncMode,
  syncTargetIndex,
  timeMap,
  editingMoveIndex,
  setEditingMoveIndex,
  history,
  gameTree,
  mainLineIds,
  currentNodeId,
  player,
  updateMoveVTime,
  updateEndTime,
  masterGameRef,
}) => {
  useEffect(() => {
    const el = document.getElementById(`move-btn-${currentMoveIndex}`);
    if (el && mainLineIds.includes(currentNodeId)) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentMoveIndex, currentNodeId, mainLineIds]);

  const formatTime = (seconds: number) => {
    if (seconds === undefined || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const VariationLine: React.FC<{ startNodeId: string }> = ({ startNodeId }) => {
    const lineNodes = [];
    let currId: string | undefined = startNodeId;
    while(currId) {
      const node: GameNode | undefined = gameTree[currId];
      if (!node) break;
      lineNodes.push(node);
      if (node.childrenIds.length > 0) {
        currId = node.childrenIds[0];
      } else {
        break;
      }
    }

    return (
      <div className="flex flex-col mb-1 last:mb-0">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-slate-500 font-bold ml-1">↳</span>
          {lineNodes.map(n => {
             const isFirstInVar = n.id === startNodeId;
             const mNum = n.move?.color === 'w' ? n.fen.split(' ')[5] : String(parseInt(n.fen.split(' ')[5] || '1') - 1);
             const prefix = n.move?.color === 'w' ? `${mNum}. ` : (isFirstInVar ? `${mNum}... ` : '');
             return (
               <React.Fragment key={n.id}>
                 <button
                   onClick={() => jumpToNode(n.id)}
                   className={`px-1.5 py-0.5 text-[13px] rounded transition-colors ${
                     currentNodeId === n.id ? 'bg-indigo-600/60 text-indigo-100 font-bold' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                   }`}
                 >
                   {prefix}{n.move?.san}
                 </button>
                 {n.childrenIds.length > 1 && (
                   <div className="w-full pl-4 py-1 border-l border-slate-600/50 my-1">
                     {n.childrenIds.slice(1).map(childId => (
                       <VariationLine key={childId} startNodeId={childId} />
                     ))}
                   </div>
                 )}
               </React.Fragment>
             )
          })}
        </div>
      </div>
    );
  };

  const renderVariations = (parentId: string, mainChildId: string) => {
    const parent: GameNode | undefined = gameTree[parentId];
    if (!parent) return null;
    const variations = parent.childrenIds.filter((id: string) => id !== mainChildId);
    if (variations.length === 0) return null;

    return (
      <div className="flex flex-col pl-6 py-1.5 bg-slate-800/30 border-l-2 border-indigo-500/20 ml-3 mb-1 mt-1 rounded-r">
        {variations.map((vid: string) => (
          <VariationLine key={vid} startNodeId={vid} />
        ))}
      </div>
    );
  };

  const isMainLine = mainLineIds.includes(currentNodeId);
  
  const rawEndTime = masterGameRef.current.header().EndTime;
  const gameEndTime = rawEndTime ? parseFloat(rawEndTime) : undefined;

  return (
    <div className="flex-none lg:flex-1 h-[72px] lg:h-auto min-h-[72px] lg:min-h-0 overflow-hidden flex flex-col p-2 lg:p-4 custom-scrollbar relative bg-slate-800/90 lg:bg-transparent border-t border-slate-700 lg:border-t-0 shadow-lg lg:shadow-none z-20">
      <h3 className="hidden lg:flex text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 sticky top-0 bg-slate-800/90 py-2 backdrop-blur-sm z-20 justify-between">
        <span>Game Record</span>
      </h3>

      <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto hide-scrollbar gap-2 lg:gap-1 pb-2 lg:pb-20 items-center lg:items-stretch w-full flex-1 min-h-0 relative">
        <div className="flex-shrink-0 w-auto min-w-[100px] lg:min-w-0 lg:w-full flex flex-col border border-slate-700/50 bg-slate-800/30 rounded mb-0 lg:mb-2 h-[42px] lg:h-auto group">
          <div className="flex items-center w-full h-full">
            <button
              id="move-btn-0"
              onClick={() => jumpToMove(0)}
              className={`flex-1 py-1 lg:py-2 px-2 lg:px-3 text-left transition-colors flex justify-between items-center h-full ${
                currentMoveIndex === 0 && isMainLine ? 'bg-blue-600/30 text-blue-300 font-bold' : 'hover:bg-slate-700'
              } ${isSyncMode && syncTargetIndex === 0 ? 'text-indigo-300 font-bold' : ''}`}
            >
              <span className="flex items-center gap-1.5 lg:gap-2 whitespace-nowrap text-xs lg:text-sm">
                <Clock className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Game Start Time</span>
                <span className="lg:hidden">Start</span>
              </span>
              {timeMap[0] !== undefined && isSyncMode && editingMoveIndex !== 0 && (
                <span className="text-xs text-slate-500 font-normal ml-2">{formatTime(timeMap[0])}</span>
              )}
            </button>

            {timeMap[0] !== undefined && isSyncMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMoveIndex(editingMoveIndex === 0 ? null : 0);
                }}
                className={`px-2 py-1 lg:py-2 transition-colors ${
                  editingMoveIndex === 0
                    ? 'text-green-400 opacity-100'
                    : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                } opacity-100 lg:opacity-0`}
                title={editingMoveIndex === 0 ? 'Finish Adjustment' : 'Adjust Time'}
              >
                {editingMoveIndex === 0 ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {editingMoveIndex === 0 && isSyncMode && (
            <div className="absolute lg:relative -top-10 lg:top-0 left-0 lg:left-auto z-20 w-full bg-slate-900 border lg:border-t border-slate-700 p-2 flex flex-col gap-2 shadow-xl lg:shadow-inner rounded lg:rounded-none">
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => {
                    const newTime = Math.max(0, timeMap[0] - 0.033);
                    updateMoveVTime(0, newTime);
                    if (player) player.seekTo(newTime, true);
                  }}
                  className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>

                <span className="text-xs text-blue-400 font-bold">{formatTime(timeMap[0])}</span>

                <button
                  onClick={() => {
                    const newTime = timeMap[0] + 0.033;
                    updateMoveVTime(0, newTime);
                    if (player) player.seekTo(newTime, true);
                  }}
                  className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  <ChevronRight className="w-3 h-3" />
             </button>
              </div>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex-shrink-0 text-center p-4 lg:p-8 text-sm lg:text-base text-slate-500 border border-dashed border-slate-700 rounded-lg h-[42px] lg:h-auto flex items-center justify-center">
            <span className="hidden lg:inline">No records yet. Enable recording mode and drag pieces to start!</span>
            <span className="lg:hidden">No records</span>
          </div>
        ) : (
          <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 lg:gap-1 text-sm font-mono flex-nowrap lg:whitespace-normal w-max lg:w-auto h-full lg:h-auto items-center lg:items-stretch">
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, rowIndex) => {
              const whiteMoveIndex = rowIndex * 2 + 1;
              const blackMoveIndex = rowIndex * 2 + 2;
              const whiteMove = history[whiteMoveIndex - 1];
              const blackMove = history[blackMoveIndex - 1];
              
              const prevWhiteNodeId = mainLineIds[whiteMoveIndex - 1];
              const whiteNodeId = mainLineIds[whiteMoveIndex];
              const prevBlackNodeId = mainLineIds[blackMoveIndex - 1];
              const blackNodeId = mainLineIds[blackMoveIndex];

              const renderMoveBtn = (move: Move | undefined, mIndex: number) => {
                if (!move) return <div className="hidden lg:block lg:flex-1" />;

                const isTarget = isSyncMode && syncTargetIndex === mIndex;
                const isCurrent = currentMoveIndex === mIndex && isMainLine;
                const hasTime = timeMap[mIndex] !== undefined;
                const isEditing = editingMoveIndex === mIndex;

                return (
                  <div
                    key={mIndex}
                    className={`flex-shrink-0 w-auto min-w-[70px] lg:min-w-0 lg:w-auto lg:flex-1 flex flex-col border-r border-slate-700/30 lg:border-r-0 lg:border-l ${
                      isTarget ? 'bg-indigo-900/40 ring-1 ring-indigo-500 inset-0 relative z-10' : ''
                    } h-full group`}
                  >
                    <div className="flex items-center w-full h-full">
                      <button
                        id={`move-btn-${mIndex}`}
                        onClick={() => jumpToMove(mIndex)}
                        className={`w-full py-1.5 lg:py-2 px-2 lg:px-3 text-left transition-colors flex justify-between items-center h-full ${
                          isCurrent ? 'bg-blue-600/30 text-blue-300 font-bold' : 'hover:bg-slate-700'
                        } ${isTarget ? 'text-indigo-300 font-bold' : ''}`}
                      >
                        <span>{move.san}</span>
                        {hasTime && isSyncMode && !isEditing && (
                          <span className="text-xs text-slate-500 font-normal ml-1.5 lg:ml-0">
                            {formatTime(timeMap[mIndex])}
                          </span>
                        )}
                      </button>

                      {hasTime && isSyncMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMoveIndex(isEditing ? null : mIndex);
                          }}
                          className={`px-1.5 lg:px-2 py-1.5 lg:py-2 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${
                            isEditing ? 'text-green-400 opacity-100' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700'
                          }`}
                          title={isEditing ? 'Finish Adjustment' : 'Adjust Time'}
                        >
                          {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {isEditing && isSyncMode && (
                      <div className="absolute lg:relative -top-10 lg:top-0 left-0 lg:left-auto z-20 w-64 lg:w-auto bg-slate-900 border lg:border-t border-slate-700 p-2 flex flex-col gap-2 shadow-xl lg:shadow-inner rounded lg:rounded-none">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => {
                              const newTime = Math.max(0, timeMap[mIndex] - 0.033);
                              updateMoveVTime(mIndex, newTime);
                              if (player) player.seekTo(newTime, true);
                            }}
                            className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>

                          <span className="text-xs text-blue-400 font-bold">{formatTime(timeMap[mIndex])}</span>

                          <button
                            onClick={() => {
                              const newTime = timeMap[mIndex] + 0.033;
                              updateMoveVTime(mIndex, newTime);
                              if (player) player.seekTo(newTime, true);
                            }}
                            className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div key={rowIndex} className="contents group">
                  <div className="hidden lg:block lg:col-span-2">
                     {prevWhiteNodeId && whiteNodeId && renderVariations(prevWhiteNodeId, whiteNodeId)}
                  </div>
                  <div className="hidden lg:block lg:col-span-2">
                     {prevBlackNodeId && blackNodeId && renderVariations(prevBlackNodeId, blackNodeId)}
                  </div>
                  
                  <div className="flex-shrink-0 flex flex-row lg:col-span-2 border border-slate-700/50 lg:border-0 lg:border-b lg:border-slate-700/50 bg-slate-800/20 lg:bg-transparent rounded lg:rounded-none hover:bg-slate-700/10 items-center h-[42px] lg:h-auto">
                    <div className="w-8 lg:w-10 py-1.5 lg:py-2 px-1 lg:px-2 text-slate-500 flex-shrink-0 text-center lg:text-right text-xs lg:pt-2.5 bg-slate-800/50 lg:bg-transparent h-full flex items-center justify-center border-r border-slate-700/30 lg:border-0">
                      {rowIndex + 1}.
                    </div>
                    {renderMoveBtn(whiteMove, whiteMoveIndex)}
                    {renderMoveBtn(blackMove, blackMoveIndex)}
                  </div>
                </div>
              );
            })}
            
            {history.length > 0 && (
              <div className="hidden lg:block lg:col-span-2">
                 {renderVariations(mainLineIds[mainLineIds.length - 1], 'none')}
              </div>
            )}
            
            {gameEndTime !== undefined && (
              <div className="flex-shrink-0 w-auto min-w-[100px] lg:min-w-0 lg:w-full lg:col-span-2 flex flex-col border border-slate-700/50 bg-slate-800/30 rounded mt-0 lg:mt-2 h-[42px] lg:h-auto group">
                <div className="flex items-center w-full h-full">
                  <button
                    onClick={() => {
                      if (player) player.seekTo(gameEndTime, true);
                    }}
                    className={`flex-1 py-1 lg:py-2 px-2 lg:px-3 text-left transition-colors flex justify-between items-center h-full hover:bg-slate-700`}
                  >
                    <span className="flex items-center gap-1.5 lg:gap-2 whitespace-nowrap text-xs lg:text-sm">
                      <Flag className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Game End Time</span>
                      <span className="lg:hidden">End</span>
                    </span>
                    {isSyncMode && editingMoveIndex !== 'end' && (
                      <span className="text-xs text-slate-500 font-normal ml-2">{formatTime(gameEndTime)}</span>
                    )}
                  </button>

                  {isSyncMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMoveIndex(editingMoveIndex === 'end' ? null : 'end');
                      }}
                      className={`px-2 py-1 lg:py-2 transition-colors ${
                        editingMoveIndex === 'end'
                          ? 'text-green-400 opacity-100'
                          : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                      } opacity-100 lg:opacity-0`}
                      title={editingMoveIndex === 'end' ? 'Finish Adjustment' : 'Adjust Time'}
                    >
                      {editingMoveIndex === 'end' ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {editingMoveIndex === 'end' && isSyncMode && (
                  <div className="absolute lg:relative -top-10 lg:top-0 left-0 lg:left-auto z-20 w-full bg-slate-900 border lg:border-t border-slate-700 p-2 flex flex-col gap-2 shadow-xl lg:shadow-inner rounded lg:rounded-none">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => {
                          const newTime = Math.max(0, gameEndTime - 0.033);
                          updateEndTime(newTime);
                          if (player) player.seekTo(newTime, true);
                        }}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>

                      <span className="text-xs text-blue-400 font-bold">{formatTime(gameEndTime)}</span>

                      <button
                        onClick={() => {
                          const newTime = gameEndTime + 0.033;
                          updateEndTime(newTime);
                          if (player) player.seekTo(newTime, true);
                        }}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isMainLine && (
        <div className="lg:hidden absolute bottom-0 left-0 w-full bg-indigo-600/90 text-indigo-100 text-xs text-center py-1.5 font-semibold z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all">
          Exploring Variation (Play video to return)
        </div>
      )}
    </div>
  );
};
