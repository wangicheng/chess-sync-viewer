import { useState, useEffect, useRef } from 'react';
import LZString from 'lz-string';
import { Chess } from 'chess.js';

import { MoveDiagonal, Move } from 'lucide-react';

import { useToast } from './hooks/useToast';
import { useSettings } from './hooks/useSettings';
import { useChessEngine } from './hooks/useChessEngine';
import { useGameSync } from './hooks/useGameSync';
import { useInteractable } from './hooks/useInteractable';
import { useSplitPane } from './hooks/useSplitPane';

import { Header, type LayoutMode } from './components/Header';
import { VideoArea } from './components/VideoArea';
import { BoardArea } from './components/BoardArea';
import { GameControls } from './components/GameControls';
import { MoveList } from './components/MoveList';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';

function App() {
  const { toasts, showToast } = useToast();
  
  const {
    clockSettings, updateClockSettings,
    engineSettings, updateEngineSettings,
    boardSettings, updateBoardSettings
  } = useSettings();

  const gameSync = useGameSync(showToast);
  const engineScore = useChessEngine(gameSync.currentFen, engineSettings.enabled);

  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'source' | 'clock' | 'engine' | 'board' | 'export'>('source');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('sync');
  
  const interactable = useInteractable();
  const splitPane = useSplitPane(500, 320, () => window.innerWidth - 400);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { isSyncMode, player, syncTargetIndex, history } = gameSync.stateRef.current;
      if (!isSyncMode || !player || syncTargetIndex === null) return;
      
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const time = await player.getCurrentTime();
        
        gameSync.updateMoveVTime(syncTargetIndex, time);
        gameSync.jumpToMove(syncTargetIndex);
        
        if (syncTargetIndex < history.length) {
          gameSync.setSyncTargetIndex(syncTargetIndex + 1);
        } else {
          gameSync.setSyncTargetIndex(null);
          gameSync.setIsSyncMode(false);
          showToast('Marked!', 'success');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameSync.stateRef, gameSync.updateMoveVTime, gameSync.jumpToMove, gameSync.setSyncTargetIndex, gameSync.setIsSyncMode, showToast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    const data = params.get('data');
    
    if (v) gameSync.setVideoId(v);
    
    if (data) {
      const decompressed = LZString.decompressFromEncodedURIComponent(data);
      if (decompressed) {
        gameSync.loadGameFromPgn(decompressed);
        gameSync.setInputRawPgn(decompressed);
      }
    }
    
    if (v) gameSync.setInputVideoId(v);
    
    if (!v && !data) {
      setIsUrlModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!gameSync.player) return;
    
    const interval = setInterval(async () => {
      let isPlaying = false;
      if (typeof gameSync.player.getPlayerState === 'function') {
        isPlaying = gameSync.player.getPlayerState() === 1;
        gameSync.setIsPlaying(isPlaying);
      }

      const time = await gameSync.player.getCurrentTime();
      const isScrubbing = Math.abs(time - lastTimeRef.current) > 1.5 && !isPlaying;
      lastTimeRef.current = time;
      
      if (gameSync.isSeekingRef.current) return;
      
      const { history, timeMap, mainLineIds, currentNodeId } = gameSync.stateRef.current;
      
      let latestValidMove = 0;
      for (let i = 1; i <= history.length; i++) {
        if (timeMap[i] !== undefined && timeMap[i] <= time + 0.1) {
          latestValidMove = i;
        } else if (timeMap[i] !== undefined) {
          break;
        }
      }
      
      const isMainLine = mainLineIds.includes(currentNodeId);

      gameSync.setCurrentMoveIndex((prev) => {
        // Jump if the main line index has naturally progressed OR if we should snap back from a variation
        if (prev !== latestValidMove || (!isMainLine && (isPlaying || isScrubbing))) {
          gameSync.jumpToMoveSilently(latestValidMove);
          return latestValidMove;
        }
        return prev;
      });
      
    }, 500);
    
    return () => clearInterval(interval);
  }, [gameSync.player, gameSync.stateRef, gameSync.isSeekingRef, gameSync.setIsPlaying, gameSync.setCurrentMoveIndex, gameSync.jumpToMoveSilently]);

  const handleApplyUrl = () => {
    const url = new URL(window.location.href);
    
    if (gameSync.inputVideoId) {
      const vIdMatch = gameSync.inputVideoId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      const finalVId = vIdMatch ? vIdMatch[1] : gameSync.inputVideoId;
      url.searchParams.set('v', finalVId);
      gameSync.setVideoId(finalVId);
    } else {
      url.searchParams.delete('v');
      gameSync.setVideoId('');
    }
    
    url.searchParams.delete('pgn');
    url.searchParams.delete('data');
    
    if (gameSync.inputRawPgn) {
      const compressed = LZString.compressToEncodedURIComponent(gameSync.inputRawPgn);
      if (compressed.length > 1800) {
        showToast('Warning: The pasted PGN is too long, the generated share link may fail in some browsers.', 'error');
      }
      url.searchParams.set('data', compressed);
      gameSync.loadGameFromPgn(gameSync.inputRawPgn);
    } else {
      gameSync.setPgnString('');
      gameSync.masterGameRef.current = new Chess();
      gameSync.setCurrentFen(gameSync.masterGameRef.current.fen());
      gameSync.setHistory([]);
      gameSync.setTimeMap({});
    }
    
    window.history.pushState({}, '', url);
    setIsUrlModalOpen(false);
  };

  useEffect(() => {
    if (gameSync.player && typeof gameSync.player.getIframe === 'function') {
      try {
        const iframe = gameSync.player.getIframe();
        if (!iframe || !iframe.contentWindow) return; // Prevent postMessage to unloaded iframe

        if (layoutMode === 'study') {
          if (typeof gameSync.player.pauseVideo === 'function') {
            gameSync.player.pauseVideo();
          }
          if (typeof gameSync.player.mute === 'function') {
            gameSync.player.mute();
          }
        } else {
          if (typeof gameSync.player.unMute === 'function') {
            gameSync.player.unMute();
          }
        }
      } catch (e) {
        console.warn('YouTube API error:', e);
      }
    }
  }, [layoutMode, gameSync.player]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-200">
      <Header
        engineSettings={engineSettings}
        updateEngineSettings={updateEngineSettings}
        isSyncMode={gameSync.isSyncMode}
        toggleSyncMode={gameSync.toggleSyncMode}
        player={gameSync.player}
        setIsUrlModalOpen={setIsUrlModalOpen}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
      />

      <main className={`flex-1 overflow-hidden ${
        layoutMode === 'sync' ? 'flex flex-col landscape:flex-row lg:flex-row' : 
        layoutMode === 'study' ? 'flex flex-col landscape:flex-row lg:flex-row landscape:p-2 lg:p-4 landscape:gap-2 lg:gap-4 justify-center bg-slate-900 shadow-inner' : 
        'relative flex flex-col lg:block'
      }`}>
        {/* Video Area Container */}
        <div className={`${
          layoutMode === 'sync' ? 'w-full aspect-video landscape:h-auto landscape:aspect-auto landscape:flex-1 lg:h-auto lg:aspect-auto lg:flex-1 min-w-0 flex flex-col flex-shrink-0' :
          layoutMode === 'study' ? 'hidden' :
          'w-full aspect-video lg:h-auto lg:aspect-auto lg:absolute lg:inset-0 lg:w-full lg:h-full z-0 lg:pointer-events-none flex-shrink-0'
        }`}>
          <div className="w-full h-full pointer-events-auto">
            <VideoArea
              videoId={gameSync.videoId}
              setPlayer={gameSync.setPlayer}
              isSyncMode={gameSync.isSyncMode}
              updateStartTimeAnchor={gameSync.updateStartTimeAnchor}
              history={gameSync.history}
              truncateHistory={gameSync.truncateHistory}
              layoutMode={layoutMode}
            />
          </div>
        </div>

        {/* Split Pane Divider */}
        {layoutMode === 'sync' && (
          <div 
            className="hidden lg:flex w-2 lg:w-2 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20 flex-shrink-0 relative items-center justify-center group/divider"
            onMouseDown={splitPane.handleMouseDown}
            onTouchStart={splitPane.handleMouseDown}
          >
            <div className="w-0.5 h-8 bg-slate-600 group-hover/divider:bg-white rounded-full"></div>
          </div>
        )}

        {/* Board Area Container */}
        <div 
          ref={interactable.ref}
          className={`group ${
          layoutMode === 'sync' ? 'flex-1 landscape:flex-none lg:flex-none w-full landscape:w-[320px] lg:sync-pane-w lg:max-w-[calc(100vw-400px)] flex flex-col min-h-0 border-b landscape:border-b-0 landscape:border-l lg:border-b-0 lg:border-l lg:border-t-0 border-slate-700 bg-slate-800/50 relative z-10' :
          layoutMode === 'study' ? 'flex-1 w-full landscape:w-auto flex flex-col min-h-0 relative z-10' :
          'flex-1 lg:flex-none lg:absolute lg:right-8 lg:bottom-8 pointer-events-auto flex flex-col w-full lg:w-[450px] z-10 bg-slate-800 lg:bg-transparent overflow-y-auto lg:overflow-visible'
        }`}
        style={{
          '--sync-pane-width': `${splitPane.paneWidth}px`,
          ...(layoutMode === 'overlay' ? interactable.style : undefined)
        } as React.CSSProperties}
        >
          {layoutMode === 'overlay' && (
            <div className="hidden lg:flex absolute -right-3 -bottom-3 items-center gap-0.5 bg-slate-900/90 p-1 rounded-full border border-slate-700/50 shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
              <div 
                className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
                onMouseDown={interactable.handleDragStart}
                onTouchStart={interactable.handleDragStart}
                title="Move Board"
              >
                <Move className="w-4 h-4" />
              </div>
              <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
              <div 
                className="cursor-nwse-resize active:cursor-grabbing p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
                onMouseDown={interactable.handleResizeStart}
                onTouchStart={interactable.handleResizeStart}
                title="Resize Board (From Center)"
              >
                <MoveDiagonal className="w-4 h-4" />
              </div>
            </div>
          )}
          <div className={`${
            layoutMode === 'sync' ? 'flex-1 lg:flex-[3] lg:flex-shrink-0 w-full min-h-0 p-2 lg:p-6 flex flex-col bg-slate-800/80 shadow-inner' :
            layoutMode === 'study' ? 'flex-1 lg:flex-shrink-0 w-full flex flex-col pt-2 lg:pt-0 min-h-0' :
            'flex flex-col flex-shrink-0 w-full aspect-square lg:aspect-square drop-shadow-2xl pt-2 lg:pt-0 min-h-0'
          }`}>
            <BoardArea
              clockSettings={clockSettings}
              engineSettings={engineSettings}
              boardSettings={boardSettings}
              player={gameSync.player}
              timeMap={gameSync.timeMap}
              history={gameSync.history}
              engineScore={engineScore}
              isSyncMode={gameSync.isSyncMode}
              currentFen={gameSync.currentFen}
              handlePieceDrop={gameSync.handlePieceDrop}
              masterGameRef={gameSync.masterGameRef}
            />
            
            <div className={layoutMode === 'overlay' ? 'lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 w-full flex justify-center pb-2 lg:pb-0' : 'w-full flex justify-center pb-2 lg:pb-0'}>
              <GameControls
                jumpToMove={gameSync.jumpToMove}
                currentMoveIndex={gameSync.currentMoveIndex}
                historyLength={gameSync.history.length}
                togglePlay={gameSync.togglePlay}
                isPlaying={gameSync.isPlaying}
                layoutMode={layoutMode}
              />
            </div>
          </div>
          
          {layoutMode === 'sync' && (
            <div className="flex flex-col flex-none lg:flex-1 min-h-0">
              <MoveList
                currentMoveIndex={gameSync.currentMoveIndex}
                jumpToMove={gameSync.jumpToMove}
                jumpToNode={gameSync.jumpToNode}
                isSyncMode={gameSync.isSyncMode}
                syncTargetIndex={gameSync.syncTargetIndex}
                timeMap={gameSync.timeMap}
                editingMoveIndex={gameSync.editingMoveIndex}
                setEditingMoveIndex={gameSync.setEditingMoveIndex}
                history={gameSync.history}
                gameTree={gameSync.gameTree}
                mainLineIds={gameSync.mainLineIds}
                currentNodeId={gameSync.currentNodeId}
                player={gameSync.player}
                updateMoveVTime={gameSync.updateMoveVTime}
              />
            </div>
          )}
        </div>

        {/* Study Mode Exclusive MoveList Container (Side-by-side) */}
        {layoutMode === 'study' && (
          <div className="flex-none w-full landscape:w-[300px] lg:w-[400px] xl:w-[450px] min-h-0 flex flex-col bg-slate-800 border-slate-700 landscape:border-l lg:border lg:rounded-lg overflow-hidden shadow-2xl z-10">
            <MoveList
              currentMoveIndex={gameSync.currentMoveIndex}
              jumpToMove={gameSync.jumpToMove}
              jumpToNode={gameSync.jumpToNode}
              isSyncMode={gameSync.isSyncMode}
              syncTargetIndex={gameSync.syncTargetIndex}
              timeMap={gameSync.timeMap}
              editingMoveIndex={gameSync.editingMoveIndex}
              setEditingMoveIndex={gameSync.setEditingMoveIndex}
              history={gameSync.history}
              gameTree={gameSync.gameTree}
              mainLineIds={gameSync.mainLineIds}
              currentNodeId={gameSync.currentNodeId}
              player={gameSync.player}
              updateMoveVTime={gameSync.updateMoveVTime}
            />
          </div>
        )}
      </main>

      {(interactable.interactionType || splitPane.isDragging) && (
        <div 
          className={`fixed inset-0 z-[9999] ${
            interactable.interactionType === 'resize' ? 'cursor-nwse-resize' : 
            splitPane.isDragging ? 'cursor-col-resize' : 'cursor-grabbing'
          }`} 
        />
      )}

      <SettingsModal
        isUrlModalOpen={isUrlModalOpen}
        setIsUrlModalOpen={setIsUrlModalOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inputVideoId={gameSync.inputVideoId}
        setInputVideoId={gameSync.setInputVideoId}
        inputRawPgn={gameSync.inputRawPgn}
        setInputRawPgn={gameSync.setInputRawPgn}
        clockSettings={clockSettings}
        updateClockSettings={updateClockSettings}
        engineSettings={engineSettings}
        updateEngineSettings={updateEngineSettings}
        boardSettings={boardSettings}
        updateBoardSettings={updateBoardSettings}
        videoId={gameSync.videoId}
        pgnString={gameSync.pgnString}
        handleApplyUrl={handleApplyUrl}
        history={gameSync.history}
        timeMap={gameSync.timeMap}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
