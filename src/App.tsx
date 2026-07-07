import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';
import { 
  Settings, AlertCircle, FileText, Globe, 
  PlaySquare, Edit3, Check, ChevronLeft, ChevronRight, Clock, Scissors,
  SkipBack, SkipForward, Play, Pause
} from 'lucide-react';
import LZString from 'lz-string';

type ToastType = 'success' | 'error' | 'info';
interface ToastMsg {
  id: string;
  message: string;
  type: ToastType;
}

export interface ClockSettings {
  enabled: boolean;
  initial: number;
  increment: number;
  useDifferentForBlack?: boolean;
  bInitial?: number;
  bIncrement?: number;
}

const getClockState = (t: number, timeMap: Record<number, number>, history: Move[], initial: number, increment: number, bInitial?: number, bIncrement?: number) => {
  let wTime = initial;
  let bTime = bInitial !== undefined ? bInitial : initial;
  const wInc = increment;
  const bInc = bIncrement !== undefined ? bIncrement : increment;
  
  if (timeMap[0] === undefined || t < timeMap[0]) {
    return { wTime, bTime, active: null };
  }
  
  let lastTime = timeMap[0];
  let i = 1;
  
  while (timeMap[i] !== undefined && timeMap[i] <= t) {
    const dt = timeMap[i] - lastTime;
    if (i % 2 === 1) {
      wTime = wTime - dt + wInc;
    } else {
      bTime = bTime - dt + bInc;
    }
    lastTime = timeMap[i];
    i++;
  }
  
  const dt = t - lastTime;
  let isGameOver = false;
  if (i - 1 === history.length && history.length > 0) {
    const lastMove = history[history.length - 1].san;
    if (lastMove.includes('#')) isGameOver = true;
  }
  
  if (!isGameOver && dt > 0) {
    if (i % 2 === 1) {
      wTime -= dt;
    } else {
      bTime -= dt;
    }
  }
  
  return { wTime, bTime, active: isGameOver ? null : (i % 2 === 1 ? 'white' : 'black') };
};

const ClockInfo = ({ player, timeMap, history, settings, color }: { player: any, timeMap: Record<number, number>, history: Move[], settings: ClockSettings, color: 'white' | 'black' }) => {
  const [time, setTime] = useState(settings.initial);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (!settings.enabled || !player) {
      setTime(settings.initial);
      setIsActive(false);
      return;
    }
    
    let isUnmounted = false;
    const interval = setInterval(async () => {
      if (isUnmounted) return;
      try {
        const t = await Promise.resolve(player.getCurrentTime());
        const { wTime, bTime, active } = getClockState(
          t, timeMap, history, 
          settings.initial, settings.increment,
          settings.useDifferentForBlack ? settings.bInitial : undefined,
          settings.useDifferentForBlack ? settings.bIncrement : undefined
        );
        setTime(color === 'white' ? wTime : bTime);
        setIsActive(active === color);
      } catch (e) {}
    }, 100);
    
    return () => {
      isUnmounted = true;
      clearInterval(interval);
    };
  }, [player, timeMap, history, settings, color]);
  
  if (!settings.enabled) return null;
  
  const formatClock = (seconds: number) => {
    const maxZero = Math.max(0, seconds);
    const m = Math.floor(maxZero / 60);
    const s = Math.floor(maxZero % 60);
    const ms = Math.floor((maxZero % 1) * 10);
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${s}.${ms}`;
    }
  };
  
  return (
    <div className={`font-mono text-lg md:text-xl font-bold px-3 py-0.5 leading-none rounded shadow-sm flex items-center justify-center min-w-[70px] lg:min-w-[90px] transition-colors ${isActive ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500 shadow-amber-900/20' : 'bg-slate-900/80 text-slate-400 border border-slate-700/50'}`}>
      {formatClock(time)}
    </div>
  );
};

function App() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const [videoId, setVideoId] = useState<string>('');
  const [pgnUrl, setPgnUrl] = useState<string>('');
  const [pgnString, setPgnString] = useState<string>('');
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputVideoId, setInputVideoId] = useState('');
  
  const [inputType, setInputType] = useState<'raw' | 'url'>('raw');
  const [inputPgnUrl, setInputPgnUrl] = useState('');
  const [inputRawPgn, setInputRawPgn] = useState('');

  const [activeTab, setActiveTab] = useState<'source' | 'clock'>('source');

  const [timeMap, setTimeMap] = useState<Record<number, number>>({});
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [syncTargetIndex, setSyncTargetIndex] = useState<number | null>(null);
  const [editingMoveIndex, setEditingMoveIndex] = useState<number | null>(null);
  
  const [clockSettings, setClockSettings] = useState<ClockSettings>(() => {
    const saved = localStorage.getItem('chessSyncClockSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { enabled: false, initial: 300, increment: 5 };
  });

  const updateClockSettings = useCallback((newSettings: Partial<ClockSettings>) => {
    setClockSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chessSyncClockSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const stateRef = useRef({
    player,
    isSyncMode,
    syncTargetIndex,
    pgnString,
    history,
    currentMoveIndex,
    timeMap
  });

  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = { player, isSyncMode, syncTargetIndex, pgnString, history, currentMoveIndex, timeMap };
  }, [player, isSyncMode, syncTargetIndex, pgnString, history, currentMoveIndex, timeMap]);

  const extractTimeMap = (pgn: string) => {
    const tempGame = new Chess();
    tempGame.loadPgn(pgn);
    const tempHistory = tempGame.history();
    const comments = tempGame.getComments();
    const map: Record<number, number> = {};
    
    const headerStartTime = tempGame.header().StartTime;
    if (headerStartTime) {
      map[0] = parseFloat(headerStartTime);
    }
    
    const playbackGame = new Chess();
    for (let i = 0; i < tempHistory.length; i++) {
      playbackGame.move(tempHistory[i]);
      const commentObj = comments.find(x => x.fen === playbackGame.fen());
      if (commentObj && commentObj.comment) {
        const match = commentObj.comment.match(/\[%vtime ([\d.]+)\]/);
        if (match) {
          map[i + 1] = parseFloat(match[1]);
        }
      }
    }
    return map;
  };

  const loadGameFromPgn = (text: string) => {
    try {
      setPgnString(text);
      const newGame = new Chess();
      newGame.loadPgn(text);
      setHistory(newGame.history({ verbose: true }) as Move[]);
      
      const extractedTimeMap = extractTimeMap(text);
      setTimeMap(extractedTimeMap);
      
      const resetGame = new Chess();
      resetGame.loadPgn(text);
      while(resetGame.history().length > 0) {
        resetGame.undo();
      }
      setGame(resetGame);
      setCurrentMoveIndex(0);
      
      if (isSyncMode) {
        let nextIndex = 1;
        while(extractedTimeMap[nextIndex] !== undefined) nextIndex++;
        setSyncTargetIndex(nextIndex <= newGame.history().length ? nextIndex : null);
      }
    } catch (e) {
      console.error('Failed to parse PGN', e);
      showToast('無效的 PGN 格式，請檢查。', 'error');
    }
  };

  const updateMoveVTime = (moveIndex: number, videoTime: number) => {
    const tempGame = new Chess();
    tempGame.loadPgn(pgnString);
    const fullHistory = tempGame.history();
    const comments = tempGame.getComments();
    
    const newGame = new Chess();
    for (let i = 0; i < fullHistory.length; i++) {
      newGame.move(fullHistory[i]);
      let c = comments.find(x => x.fen === newGame.fen())?.comment || '';
      
      if (i + 1 === moveIndex) {
        if (c.includes('[%vtime')) {
          c = c.replace(/\[%vtime [\d.]+\]/, `[%vtime ${videoTime.toFixed(3)}]`);
        } else {
          c = c ? `${c} [%vtime ${videoTime.toFixed(3)}]` : `[%vtime ${videoTime.toFixed(3)}]`;
        }
      }
      if (c) newGame.setComment(c);
    }
    
    const headers = tempGame.header();
    for (const key in headers) {
      if (headers[key] !== undefined && headers[key] !== null) {
        newGame.header(key, headers[key] as string);
      }
    }

    if (moveIndex === 0) {
      newGame.header('StartTime', videoTime.toFixed(3));
    }
    
    const newPgn = newGame.pgn();
    setPgnString(newPgn);
    setTimeMap(extractTimeMap(newPgn));
    updateUrlWithNewPgn(newPgn);
  };

  const updateUrlWithNewPgn = (newPgn: string) => {
    const url = new URL(window.location.href);
    const compressed = LZString.compressToEncodedURIComponent(newPgn);
    
    url.searchParams.set('data', compressed);
    
    if (url.searchParams.has('pgn')) {
      url.searchParams.delete('pgn');
      setPgnUrl('');
      setInputType('raw');
    }

    window.history.replaceState({}, '', url);
    setInputRawPgn(newPgn);
  };

  // Live Recording Drop Handler
  const handlePieceDrop = useCallback((arg1: any, arg2?: any, arg3?: any) => {
    let sourceSquare: string;
    let targetSquare: string;
    let pieceStr: string;

    if (typeof arg1 === 'object' && arg1 !== null && 'sourceSquare' in arg1) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
      pieceStr = arg1.piece?.pieceType || arg1.piece; 
    } else {
      sourceSquare = arg1;
      targetSquare = arg2;
      pieceStr = arg3;
    }

    const { isSyncMode, player, pgnString, currentMoveIndex, timeMap } = stateRef.current;
    if (!isSyncMode || !player) return false;

    const rebuiltGame = new Chess();
    if (pgnString) rebuiltGame.loadPgn(pgnString);
    
    const totalMoves = rebuiltGame.history().length;
    for (let i = 0; i < totalMoves - currentMoveIndex; i++) {
      rebuiltGame.undo();
    }

    try {
      let promo = 'q';
      if (typeof pieceStr === 'string' && pieceStr.length >= 2) {
        promo = pieceStr[1].toLowerCase();
      }
      if (!['q', 'r', 'b', 'n'].includes(promo)) {
        promo = 'q';
      }

      const move = rebuiltGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promo,
      });

      if (move === null) {
        console.warn('Invalid move from', sourceSquare, 'to', targetSquare);
        showToast(`無效棋步: ${sourceSquare} 到 ${targetSquare}`, 'error');
        return false;
      }

      // Handle time stamping (works whether getCurrentTime returns a Promise or a Number)
      Promise.resolve(player.getCurrentTime()).then((time: any) => {
        const timeNum = Number(time);
        const comment = rebuiltGame.getComment() || '';
        rebuiltGame.setComment(`${comment} [%vtime ${timeNum.toFixed(3)}]`.trim());

        const newTimeMap = { ...timeMap };
        // Clean future times if truncated
        for (let i = currentMoveIndex + 1; i <= totalMoves; i++) {
          delete newTimeMap[i];
        }
        newTimeMap[currentMoveIndex + 1] = timeNum;

        const newPgn = rebuiltGame.pgn();
        setPgnString(newPgn);
        setTimeMap(newTimeMap);
        setHistory(rebuiltGame.history({ verbose: true }) as Move[]);
        
        const uiGame = new Chess();
        uiGame.loadPgn(newPgn);
        setGame(uiGame); // Display latest
        
        setCurrentMoveIndex(currentMoveIndex + 1);
        updateUrlWithNewPgn(newPgn);
        
        // Target index moves to the new end
        setSyncTargetIndex(null);
      });

      return true;
    } catch (e: any) {
      console.warn('Invalid move:', e.message);
      showToast(`無法走棋: ${e.message}`, 'error');
      return false; // Invalid move
    }
  }, [showToast]);

  // Truncate function
  const truncateHistory = () => {
    const { pgnString, currentMoveIndex, history, timeMap } = stateRef.current;
    if (history.length === 0) return;
    
    if (!window.confirm('確定要清除包含此步及之後的所有棋步與標記嗎？')) return;
    
    const rebuiltGame = new Chess();
    if (pgnString) rebuiltGame.loadPgn(pgnString);
    
    const targetKeepMoves = Math.max(0, currentMoveIndex - 1);
    const totalMoves = rebuiltGame.history().length;
    for (let i = 0; i < totalMoves - targetKeepMoves; i++) {
      rebuiltGame.undo();
    }
    
    const newTimeMap = { ...timeMap };
    for (let i = targetKeepMoves + 1; i <= totalMoves; i++) {
      delete newTimeMap[i];
    }
    
    const newPgn = rebuiltGame.pgn();
    setPgnString(newPgn);
    setTimeMap(newTimeMap);
    setHistory(rebuiltGame.history({ verbose: true }) as Move[]);
    setCurrentMoveIndex(targetKeepMoves);
    setGame(rebuiltGame);
    updateUrlWithNewPgn(newPgn);
    
    setSyncTargetIndex(null);
  };

  const updateStartTimeAnchor = async () => {
    if (!player) return;
    const time = await player.getCurrentTime();
    
    const newGame = new Chess();
    if (pgnString) newGame.loadPgn(pgnString);
    
    newGame.header('StartTime', time.toFixed(3));
    
    const newPgn = newGame.pgn();
    setPgnString(newPgn);
    updateUrlWithNewPgn(newPgn);
    
    setTimeMap(prev => ({ ...prev, 0: time }));
    showToast('已標記棋局起始時間！', 'success');
  };

  // Keyboard shortcut for Sync Mode (Spacebar)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const { isSyncMode, player, syncTargetIndex, history } = stateRef.current;
      if (!isSyncMode || !player || syncTargetIndex === null) return;
      
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const time = await player.getCurrentTime();
        
        updateMoveVTime(syncTargetIndex, time);
        jumpToMove(syncTargetIndex);
        
        if (syncTargetIndex < history.length) {
          setSyncTargetIndex(syncTargetIndex + 1);
        } else {
          setSyncTargetIndex(null);
          setIsSyncMode(false);
          showToast('已標記！', 'success');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    const pgn = params.get('pgn');
    const data = params.get('data');
    
    if (v) setVideoId(v);
    
    if (data) {
      const decompressed = LZString.decompressFromEncodedURIComponent(data);
      if (decompressed) {
        loadGameFromPgn(decompressed);
        setInputRawPgn(decompressed);
        setInputType('raw');
      }
    } else if (pgn) {
      setPgnUrl(pgn);
      setInputPgnUrl(pgn);
      setInputType('url');
    }
    
    if (v) setInputVideoId(v);
    
    if (!v && !pgn && !data) {
      setIsUrlModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!pgnUrl) return;
    const fetchPgn = async () => {
      try {
        const response = await fetch(pgnUrl);
        if (!response.ok) throw new Error('Failed to fetch PGN');
        const text = await response.text();
        loadGameFromPgn(text);
      } catch (error) {
        console.error('Error fetching PGN:', error);
        showToast('載入 PGN 失敗。', 'error');
      }
    };
    fetchPgn();
  }, [pgnUrl]);

  // Sync current time from YouTube player and Scrubbing
  useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(async () => {
      if (typeof player.getPlayerState === 'function') {
        setIsPlaying(player.getPlayerState() === 1);
      }

      const time = await player.getCurrentTime();
      
      if (isSeekingRef.current) return;
      
      const { history, timeMap } = stateRef.current;
      
      let latestValidMove = 0;
      for (let i = 1; i <= history.length; i++) {
        if (timeMap[i] !== undefined && timeMap[i] <= time + 0.1) {
          latestValidMove = i;
        } else if (timeMap[i] !== undefined) {
          break;
        }
      }
      
      setCurrentMoveIndex((prev) => {
        // Always sync the board to the correct move for the current video time.
        // This ensures scrubbing backward AND forward updates the chessboard correctly in both normal and sync modes.
        if (prev !== latestValidMove) {
          jumpToMoveSilently(latestValidMove);
          return latestValidMove;
        }
        return prev;
      });
      
    }, 500);
    
    return () => clearInterval(interval);
  }, [player]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
  };

  const jumpToMoveSilently = (index: number) => {
    const newGame = new Chess();
    if (stateRef.current.pgnString) {
      newGame.loadPgn(stateRef.current.pgnString);
      const totalMoves = newGame.history().length;
      for (let i = 0; i < totalMoves - index; i++) {
        newGame.undo();
      }
      setGame(newGame);
    }
  };

  const jumpToMove = (index: number) => {
    jumpToMoveSilently(index);
    setCurrentMoveIndex(index);
    
    if (stateRef.current.timeMap[index] !== undefined && player) {
      isSeekingRef.current = true;
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      
      player.seekTo(stateRef.current.timeMap[index], true);
      
      seekTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    const el = document.getElementById(`move-btn-${currentMoveIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentMoveIndex]);

  const toggleSyncMode = () => {
    const newMode = !isSyncMode;
    setIsSyncMode(newMode);
    if (newMode) {
      let nextIndex = 1;
      while(timeMap[nextIndex] !== undefined) nextIndex++;
      setSyncTargetIndex(nextIndex <= history.length ? nextIndex : null);
    } else {
      setSyncTargetIndex(null);
    }
  };

  const togglePlay = () => {
    if (!player || typeof player.getPlayerState !== 'function') return;
    if (player.getPlayerState() === 1) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleApplyUrl = () => {
    const url = new URL(window.location.href);
    
    if (inputVideoId) {
      const vIdMatch = inputVideoId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      const finalVId = vIdMatch ? vIdMatch[1] : inputVideoId;
      url.searchParams.set('v', finalVId);
      setVideoId(finalVId);
    } else {
      url.searchParams.delete('v');
      setVideoId('');
    }
    
    url.searchParams.delete('pgn');
    url.searchParams.delete('data');
    setPgnUrl('');
    
    if (inputType === 'url' && inputPgnUrl) {
      url.searchParams.set('pgn', inputPgnUrl);
      setPgnUrl(inputPgnUrl);
    } else if (inputType === 'raw') {
      if (inputRawPgn) {
        const compressed = LZString.compressToEncodedURIComponent(inputRawPgn);
        if (compressed.length > 1800) {
          showToast('警告：您貼上的 PGN 過長，產生的分享連結可能會在某些瀏覽器中失效。', 'error');
        }
        url.searchParams.set('data', compressed);
        loadGameFromPgn(inputRawPgn);
      } else {
        // Clear board if empty
        setPgnString('');
        setGame(new Chess());
        setHistory([]);
        setTimeMap({});
      }
    }
    
    window.history.pushState({}, '', url);
    setIsUrlModalOpen(false);
  };

  const formatTime = (seconds: number) => {
    if (seconds === undefined || isNaN(seconds)) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const chessboardOptions = React.useMemo(() => ({
    position: game.fen(),
    onPieceDrop: handlePieceDrop,
    allowDragging: isSyncMode,
    darkSquareStyle: { backgroundColor: '#475569' },
    lightSquareStyle: { backgroundColor: '#94a3b8' }
  }), [game.fen(), isSyncMode, handlePieceDrop]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-200">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">
            CS
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 hidden sm:block">
            ChessSync Viewer
          </h1>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <button
            onClick={toggleSyncMode}
            disabled={!player}
            className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 text-sm font-medium rounded-md transition-all shadow-sm ${isSyncMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none'}`}
          >
            {isSyncMode ? <Check className="w-4 h-4" /> : <PlaySquare className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSyncMode ? '完成編輯' : '編輯模式'}</span>
            <span className="sm:hidden">{isSyncMode ? '完成' : '編輯'}</span>
          </button>
          
          <button 
            onClick={() => setIsUrlModalOpen(true)}
            className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">設定</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane */}
        <div className="flex-none lg:flex-1 flex flex-col p-2 lg:p-4 gap-2 lg:gap-4 overflow-visible lg:overflow-y-auto z-10 border-b lg:border-b-0 border-slate-700/50 bg-slate-900/90 lg:bg-transparent backdrop-blur-sm">
          <div className="w-full mx-auto aspect-video bg-black rounded-lg lg:rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 relative flex-shrink-0">
            {videoId ? (
              <YouTube 
                videoId={videoId} 
                opts={{ width: '100%', height: '100%', playerVars: { playsinline: 1 } }} 
                className="w-full h-full absolute inset-0"
                onReady={onPlayerReady}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <AlertCircle className="w-8 h-8 lg:w-12 lg:h-12 mb-2 opacity-50" />
                <p className="text-sm lg:text-base">請設定 YouTube影片ID</p>
              </div>
            )}
          </div>
          
          {isSyncMode && (
            <div className="p-3 lg:p-4 bg-indigo-950/80 border border-indigo-800/80 rounded-lg flex flex-col xl:flex-row gap-3 xl:gap-4 justify-between flex-shrink-0 shadow-lg ring-1 ring-indigo-500/50">
              <div className="hidden sm:block">
                <div className="text-sm text-indigo-300 mb-1">正在錄製/編輯中...</div>
                <div className="text-xs lg:text-sm text-indigo-100 flex items-center gap-2">
                  您可以直接在右側棋盤拖曳棋子，或在影片落子時按下空白鍵。
                </div>
              </div>
              <div className="flex flex-row xl:flex-col gap-2 overflow-x-auto hide-scrollbar">
                <button 
                  onClick={updateStartTimeAnchor}
                  className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 rounded border border-indigo-800 transition-colors text-xs lg:text-sm whitespace-nowrap"
                >
                  <Clock className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                  標記當下時間為起點
                </button>
                {history.length > 0 && (
                  <button 
                    onClick={truncateHistory}
                    className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-red-900/50 hover:bg-red-800/80 text-red-300 rounded border border-red-800 transition-colors text-xs lg:text-sm whitespace-nowrap"
                  >
                    <Scissors className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                    清除此步及之後紀錄
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane */}
        <div className="flex-1 lg:flex-none w-full lg:w-[450px] xl:w-[500px] flex flex-col min-h-0 border-l lg:border-t-0 border-slate-700 bg-slate-800/50">
          <div className="flex-1 min-h-0 p-2 lg:p-6 flex flex-col items-center justify-center bg-slate-800/80 shadow-inner">
            <div className="flex-1 min-h-0 w-full flex items-center justify-center" style={{ containerType: 'size' }}>
              <div 
                className="flex flex-col justify-center items-center h-full transition-all"
                style={{ width: clockSettings.enabled ? 'min(100cqw, calc(100cqh - 4rem))' : '100cqmin' }}
              >
                {clockSettings.enabled && (
                  <div className="flex justify-between items-end pb-1 lg:pb-2 px-2 flex-shrink-0 w-full">
                    <div className="flex items-center gap-2 lg:gap-3">
                       <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-800 rounded shadow border border-slate-700"></div>
                       <span className="font-semibold text-slate-300 text-sm lg:text-base">Black</span>
                    </div>
                    <ClockInfo player={player} timeMap={timeMap} history={history} settings={clockSettings} color="black" />
                  </div>
                )}
                
                <div className={`transition-all flex items-center justify-center flex-shrink-0 w-full aspect-square ${isSyncMode ? 'ring-4 ring-indigo-500/50 rounded-sm' : ''}`}>
                  <Chessboard options={chessboardOptions} />
                </div>
                
                {clockSettings.enabled && (
                  <div className="flex justify-between items-start pt-1 lg:pt-2 px-2 flex-shrink-0 w-full">
                    <div className="flex items-center gap-2 lg:gap-3">
                       <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-200 rounded shadow border border-slate-300"></div>
                       <span className="font-semibold text-slate-300 text-sm lg:text-base">White</span>
                    </div>
                    <ClockInfo player={player} timeMap={timeMap} history={history} settings={clockSettings} color="white" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-none flex items-center justify-center gap-4 mt-2 lg:mt-4 bg-slate-900/50 rounded-full px-4 py-1.5 lg:py-2 ring-1 ring-white/10">
              <button onClick={() => jumpToMove(0)} className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors" title="第一步"><SkipBack className="w-4 h-4 lg:w-5 lg:h-5" /></button>
              <button onClick={() => jumpToMove(Math.max(0, currentMoveIndex - 1))} className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors" title="上一步"><ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" /></button>
              <button onClick={togglePlay} className="p-2 lg:p-3 text-slate-300 hover:text-white transition-colors bg-blue-600/20 hover:bg-blue-600/40 rounded-full" title="播放 / 暫停">
                {isPlaying ? <Pause className="w-5 h-5 lg:w-6 lg:h-6" /> : <Play className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>
              <button onClick={() => jumpToMove(Math.min(history.length, currentMoveIndex + 1))} className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors" title="下一步"><ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" /></button>
              <button onClick={() => jumpToMove(history.length)} className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors" title="最後一步"><SkipForward className="w-4 h-4 lg:w-5 lg:h-5" /></button>
            </div>
          </div>
          
          <div className="flex-none lg:flex-1 h-[72px] lg:h-auto min-h-[72px] lg:min-h-0 overflow-hidden flex flex-col p-2 lg:p-4 custom-scrollbar relative bg-slate-800/90 lg:bg-transparent border-t border-slate-700 lg:border-t-0 shadow-lg lg:shadow-none z-20">
            <h3 className="hidden lg:flex text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 sticky top-0 bg-slate-800/90 py-2 backdrop-blur-sm z-20 justify-between">
              <span>對局紀錄</span>
            </h3>
            
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto hide-scrollbar gap-2 lg:gap-1 pb-2 lg:pb-20 items-center lg:items-stretch w-full h-full lg:h-auto">
              <div className="flex-shrink-0 w-[180px] lg:w-full flex flex-col border border-slate-700/50 bg-slate-800/30 rounded mb-0 lg:mb-2 h-[42px] lg:h-auto">
                <div className="flex items-center w-full h-full">
                  <button 
                    id="move-btn-0"
                    onClick={() => jumpToMove(0)}
                    className={`flex-1 py-1 lg:py-2 px-2 lg:px-3 text-left transition-colors flex justify-between items-center h-full ${currentMoveIndex === 0 ? 'bg-blue-600/30 text-blue-300 font-bold' : 'hover:bg-slate-700'} ${isSyncMode && syncTargetIndex === 0 ? 'text-indigo-300 font-bold' : ''}`}
                  >
                    <span className="flex items-center gap-1.5 lg:gap-2 whitespace-nowrap text-xs lg:text-sm"><Clock className="w-3.5 h-3.5" /> <span className="hidden lg:inline">棋局起始時間</span><span className="lg:hidden">起點</span></span>
                    {timeMap[0] !== undefined && isSyncMode && editingMoveIndex !== 0 && (
                      <span className="text-xs text-slate-500 font-normal ml-2">
                        {formatTime(timeMap[0])}
                      </span>
                    )}
                  </button>
                  
                  {timeMap[0] !== undefined && isSyncMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingMoveIndex(editingMoveIndex === 0 ? null : 0); }}
                      className={`px-2 py-1 lg:py-2 transition-colors ${editingMoveIndex === 0 ? 'text-green-400 opacity-100' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100'} opacity-100 lg:opacity-0`}
                      title={editingMoveIndex === 0 ? "完成微調" : "微調時間"}
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
                      
                      <span className="text-xs text-blue-400 font-bold">
                        {formatTime(timeMap[0])}
                      </span>
                      
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
                <span className="hidden lg:inline">尚無紀錄。開啟錄製模式並在棋盤上拖曳以開始！</span>
                <span className="lg:hidden">尚無紀錄</span>
              </div>
            ) : (
              <div className="flex flex-row lg:grid lg:grid-cols-2 gap-2 lg:gap-1 text-sm font-mono flex-nowrap lg:whitespace-normal w-max lg:w-auto h-full lg:h-auto items-center lg:items-stretch">
                {Array.from({ length: Math.ceil(history.length / 2) }).map((_, rowIndex) => {
                  const whiteMoveIndex = rowIndex * 2 + 1;
                  const blackMoveIndex = rowIndex * 2 + 2;
                  const whiteMove = history[whiteMoveIndex - 1];
                  const blackMove = history[blackMoveIndex - 1];
                  
                  const renderMoveBtn = (move: Move | undefined, mIndex: number) => {
                    if (!move) return <div className="hidden lg:block lg:flex-1" />;
                    
                    const isTarget = isSyncMode && syncTargetIndex === mIndex;
                    const isCurrent = currentMoveIndex === mIndex;
                    const hasTime = timeMap[mIndex] !== undefined;
                    const isEditing = editingMoveIndex === mIndex;
                    
                    return (
                      <div className={`flex-shrink-0 w-[110px] lg:w-auto lg:flex-1 flex flex-col border-r border-slate-700/30 lg:border-r-0 lg:border-l ${isTarget ? 'bg-indigo-900/40 ring-1 ring-indigo-500 inset-0 relative z-10' : ''} h-full`}>
                        <div className="flex items-center w-full h-full">
                          <button 
                            id={`move-btn-${mIndex}`}
                            onClick={() => jumpToMove(mIndex)}
                            className={`w-full py-1.5 lg:py-2 px-2 lg:px-3 text-left transition-colors flex justify-between items-center h-full ${isCurrent ? 'bg-blue-600/30 text-blue-300 font-bold' : 'hover:bg-slate-700'} ${isTarget ? 'text-indigo-300 font-bold' : ''}`}
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
                              onClick={(e) => { e.stopPropagation(); setEditingMoveIndex(isEditing ? null : mIndex); }}
                              className={`px-1.5 lg:px-2 py-1.5 lg:py-2 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${isEditing ? 'text-green-400 opacity-100' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700'}`}
                              title={isEditing ? "完成微調" : "微調時間"}
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
                              
                              <span className="text-xs text-blue-400 font-bold">
                                {formatTime(timeMap[mIndex])}
                              </span>
                              
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
              </div>
            )}
            </div>
          </div>
        </div>
      </main>

      {isUrlModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              設定
            </h2>
            <div className="flex border-b border-slate-700 mb-6">
              <button 
                onClick={() => setActiveTab('source')}
                className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'source' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'}`}
              >
                影片與來源
              </button>
              <button 
                onClick={() => setActiveTab('clock')}
                className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'clock' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'}`}
              >
                棋鐘
              </button>
            </div>
            
            <div className="space-y-6">
              {activeTab === 'source' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">YouTube 影片 ID 或網址</label>
                    <input 
                      type="text" 
                      value={inputVideoId}
                      onChange={(e) => setInputVideoId(e.target.value)}
                      placeholder="e.g. dQw4w9WgXcQ 或完整網址"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <hr className="border-slate-700" />
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3">PGN 載入方式</label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={() => setInputType('raw')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'raw' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        <FileText className="w-4 h-4" />
                        手動輸入/錄製
                      </button>
                      <button 
                        onClick={() => setInputType('url')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        <Globe className="w-4 h-4" />
                        使用外部網址
                      </button>
                    </div>
                    
                    {inputType === 'raw' ? (
                      <textarea 
                        value={inputRawPgn}
                        onChange={(e) => setInputRawPgn(e.target.value)}
                        placeholder="在此貼上 PGN，留白則會從零開始錄製..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none custom-scrollbar font-mono text-sm"
                      />
                    ) : (
                      <input 
                        type="text" 
                        value={inputPgnUrl}
                        onChange={(e) => setInputPgnUrl(e.target.value)}
                        placeholder="https://... (需支援 CORS)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'clock' && (
                <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={clockSettings.enabled}
                      onChange={(e) => updateClockSettings({ enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-300">顯示並計算雙方剩餘時間</span>
                  </label>
                  
                  <div className={`transition-opacity duration-200 ${clockSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">{clockSettings.useDifferentForBlack ? '白方' : ''}初始時間 (分鐘)</label>
                        <input 
                          type="number" 
                          min="0.5"
                          step="0.5"
                          value={Math.round((clockSettings.initial / 60) * 10) / 10}
                          onChange={(e) => updateClockSettings({ initial: Math.max(0.5, parseFloat(e.target.value) || 1) * 60 })}
                          disabled={!clockSettings.enabled}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">{clockSettings.useDifferentForBlack ? '白方' : ''}每步加時 (秒)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={clockSettings.increment}
                          onChange={(e) => updateClockSettings({ increment: Math.max(0, parseInt(e.target.value) || 0) })}
                          disabled={!clockSettings.enabled}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 transition-colors w-max">
                        <input 
                          type="checkbox" 
                          checked={clockSettings.useDifferentForBlack || false}
                          onChange={(e) => updateClockSettings({ 
                            useDifferentForBlack: e.target.checked,
                            bInitial: e.target.checked ? clockSettings.initial : undefined,
                            bIncrement: e.target.checked ? clockSettings.increment : undefined
                          })}
                          disabled={!clockSettings.enabled}
                          className="w-3.5 h-3.5 text-slate-500 bg-slate-800 border-slate-600 rounded focus:ring-slate-500"
                        />
                        <span className="text-xs font-medium">設定雙方不同時間</span>
                      </label>
                    </div>
                    
                    {clockSettings.useDifferentForBlack && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">黑方初始時間 (分鐘)</label>
                          <input 
                            type="number" 
                            min="0.5"
                            step="0.5"
                            value={Math.round(((clockSettings.bInitial !== undefined ? clockSettings.bInitial : clockSettings.initial) / 60) * 10) / 10}
                            onChange={(e) => updateClockSettings({ bInitial: Math.max(0.5, parseFloat(e.target.value) || 1) * 60 })}
                            disabled={!clockSettings.enabled}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">黑方每步加時 (秒)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={clockSettings.bIncrement !== undefined ? clockSettings.bIncrement : clockSettings.increment}
                            onChange={(e) => updateClockSettings({ bIncrement: Math.max(0, parseInt(e.target.value) || 0) })}
                            disabled={!clockSettings.enabled}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-700/50 mt-4">
                {(videoId || pgnUrl || pgnString) && (
                  <button 
                    onClick={() => setIsUrlModalOpen(false)}
                    className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    取消
                  </button>
                )}
                <button 
                  onClick={handleApplyUrl}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
                >
                  確認載入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toasts Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-3 transform transition-all duration-300 pointer-events-auto ${
              t.type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-800' :
              t.type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-800' :
              'bg-slate-800/90 text-slate-200 border border-slate-700'
            }`}
          >
            {t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <p>{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
