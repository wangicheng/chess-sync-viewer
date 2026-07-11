import { useState, useEffect } from 'react';
import LZString from 'lz-string';
import { Chess } from 'chess.js';

import { MoveDiagonal, Move } from 'lucide-react';

import { useToast } from './hooks/useToast';
import { useSettings } from './hooks/useSettings';
import { useChessEngine } from './hooks/useChessEngine';
import { useGameSync } from './hooks/useGameSync';
import { useInteractable } from './hooks/useInteractable';

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

  useEffect(() => {
    if (!gameSync.player) return;
    
    const interval = setInterval(async () => {
      if (typeof gameSync.player.getPlayerState === 'function') {
        gameSync.setIsPlaying(gameSync.player.getPlayerState() === 1);
      }

      const time = await gameSync.player.getCurrentTime();
      
      if (gameSync.isSeekingRef.current) return;
      
      const { history, timeMap } = gameSync.stateRef.current;
      
      let latestValidMove = 0;
      for (let i = 1; i <= history.length; i++) {
        if (timeMap[i] !== undefined && timeMap[i] <= time + 0.1) {
          latestValidMove = i;
        } else if (timeMap[i] !== undefined) {
          break;
        }
      }
      
      gameSync.setCurrentMoveIndex((prev) => {
        if (prev !== latestValidMove) {
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
        layoutMode === 'sync' ? 'flex flex-col lg:flex-row' : 
        layoutMode === 'study' ? 'flex flex-col lg:flex-row p-4 gap-4 justify-center bg-slate-900 shadow-inner' : 
        'relative flex'
      }`}>
        {/* Video Area Container */}
        <div className={`${
          layoutMode === 'sync' ? 'flex-1 min-w-0 flex flex-col' :
          layoutMode === 'study' ? 'absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden z-[-1]' :
          'absolute inset-0 w-full h-full z-0 pointer-events-none'
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

        {/* Board Area Container */}
        <div 
          ref={interactable.ref}
          className={`group ${
          layoutMode === 'sync' ? 'flex-1 lg:flex-none w-full lg:w-[450px] xl:w-[500px] flex flex-col min-h-0 border-l lg:border-t-0 border-slate-700 bg-slate-800/50 relative z-10' :
          layoutMode === 'study' ? 'w-full lg:w-[65vh] xl:w-[75vh] flex flex-col min-h-0 relative z-10' :
          'absolute right-4 bottom-4 lg:right-8 lg:bottom-8 pointer-events-auto flex flex-col w-[350px] sm:w-[400px] lg:w-[450px] z-10 bg-transparent'
        }`}
        style={layoutMode === 'overlay' ? interactable.style : undefined}
        >
          {layoutMode === 'overlay' && (
            <div className="absolute -right-3 -bottom-3 flex items-center gap-0.5 bg-slate-900/90 p-1 rounded-full border border-slate-700/50 shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
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
            layoutMode === 'sync' ? 'flex-1 min-h-0 p-2 lg:p-6 flex flex-col items-center justify-center bg-slate-800/80 shadow-inner' :
            layoutMode === 'study' ? 'flex-1 flex flex-col items-center justify-center' :
            'flex flex-col items-center justify-center flex-shrink-0 w-full aspect-square drop-shadow-2xl'
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
            
            <div className={layoutMode === 'overlay' ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full flex justify-center' : 'w-full flex justify-center'}>
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
            <div className="flex flex-col min-h-[300px] lg:min-h-0 flex-shrink-0 lg:flex-1">
              <MoveList
                currentMoveIndex={gameSync.currentMoveIndex}
                jumpToMove={gameSync.jumpToMove}
                isSyncMode={gameSync.isSyncMode}
                syncTargetIndex={gameSync.syncTargetIndex}
                timeMap={gameSync.timeMap}
                editingMoveIndex={gameSync.editingMoveIndex}
                setEditingMoveIndex={gameSync.setEditingMoveIndex}
                history={gameSync.history}
                player={gameSync.player}
                updateMoveVTime={gameSync.updateMoveVTime}
              />
            </div>
          )}
        </div>

        {/* Study Mode Exclusive MoveList Container (Side-by-side) */}
        {layoutMode === 'study' && (
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col min-h-[400px] lg:min-h-0 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-2xl z-10">
            <MoveList
              currentMoveIndex={gameSync.currentMoveIndex}
              jumpToMove={gameSync.jumpToMove}
              isSyncMode={gameSync.isSyncMode}
              syncTargetIndex={gameSync.syncTargetIndex}
              timeMap={gameSync.timeMap}
              editingMoveIndex={gameSync.editingMoveIndex}
              setEditingMoveIndex={gameSync.setEditingMoveIndex}
              history={gameSync.history}
              player={gameSync.player}
              updateMoveVTime={gameSync.updateMoveVTime}
            />
          </div>
        )}
      </main>

      {interactable.interactionType && (
        <div 
          className={`fixed inset-0 z-[9999] ${interactable.interactionType === 'resize' ? 'cursor-nwse-resize' : 'cursor-grabbing'}`} 
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
