import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import LZString from 'lz-string';
import type { ToastType } from './useToast';

export function useGameSync(showToast: (msg: string, type?: ToastType) => void) {
  const [videoId, setVideoId] = useState<string>('');
  const [pgnString, setPgnString] = useState<string>('');
  const masterGameRef = useRef(new Chess());
  const [initialFen, setInitialFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [currentFen, setCurrentFen] = useState(masterGameRef.current.fen());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [timeMap, setTimeMap] = useState<Record<number, number>>({});
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [syncTargetIndex, setSyncTargetIndex] = useState<number | null>(null);
  const [editingMoveIndex, setEditingMoveIndex] = useState<number | null>(null);

  const [inputRawPgn, setInputRawPgn] = useState('');
  const [inputVideoId, setInputVideoId] = useState('');

  const stateRef = useRef({
    player,
    isSyncMode,
    syncTargetIndex,
    pgnString,
    history,
    currentMoveIndex,
    timeMap,
    initialFen
  });

  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = { player, isSyncMode, syncTargetIndex, pgnString, history, currentMoveIndex, timeMap, initialFen };
  }, [player, isSyncMode, syncTargetIndex, pgnString, history, currentMoveIndex, timeMap, initialFen]);

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

  const loadGameFromPgn = useCallback((text: string) => {
    try {
      setPgnString(text);
      masterGameRef.current = new Chess();
      masterGameRef.current.loadPgn(text);
      setHistory(masterGameRef.current.history({ verbose: true }) as Move[]);
      
      const extractedTimeMap = extractTimeMap(text);
      setTimeMap(extractedTimeMap);
      
      const resetGame = new Chess();
      resetGame.loadPgn(text);
      while(resetGame.history().length > 0) {
        resetGame.undo();
      }
      setInitialFen(resetGame.fen());
      setCurrentFen(resetGame.fen());
      setCurrentMoveIndex(0);
      
      if (isSyncMode) {
        let nextIndex = 1;
        while(extractedTimeMap[nextIndex] !== undefined) nextIndex++;
        setSyncTargetIndex(nextIndex <= masterGameRef.current.history().length ? nextIndex : null);
      }
    } catch (e) {
      console.error('Failed to parse PGN', e);
      showToast('Invalid PGN format, please check.', 'error');
    }
  }, [isSyncMode, showToast]);

  const updateUrlWithNewPgn = useCallback((newPgn: string) => {
    const url = new URL(window.location.href);
    const compressed = LZString.compressToEncodedURIComponent(newPgn);
    
    url.searchParams.set('data', compressed);
    
    if (url.searchParams.has('pgn')) {
      url.searchParams.delete('pgn');
    }

    window.history.replaceState({}, '', url);
    setInputRawPgn(newPgn);
  }, []);

  const updateMoveVTime = useCallback((moveIndex: number, videoTime: number) => {
    const fullHistory = masterGameRef.current.history();
    const comments = masterGameRef.current.getComments();
    
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
    
    const headers = masterGameRef.current.header();
    for (const key in headers) {
      if (headers[key] !== undefined && headers[key] !== null) {
        newGame.header(key, headers[key] as string);
      }
    }

    if (moveIndex === 0) {
      newGame.header('StartTime', videoTime.toFixed(3));
    }
    
    masterGameRef.current = newGame;
    const newPgn = newGame.pgn();
    setPgnString(newPgn);
    setTimeMap(extractTimeMap(newPgn));
    updateUrlWithNewPgn(newPgn);
  }, [updateUrlWithNewPgn]);

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

    const { isSyncMode, player, currentMoveIndex, timeMap } = stateRef.current;
    if (!isSyncMode || !player) return false;

    const totalMoves = masterGameRef.current.history().length;
    for (let i = 0; i < totalMoves - currentMoveIndex; i++) {
      masterGameRef.current.undo();
    }

    try {
      let promo = 'q';
      if (typeof pieceStr === 'string' && pieceStr.length >= 2) {
        promo = pieceStr[1].toLowerCase();
      }
      if (!['q', 'r', 'b', 'n'].includes(promo)) {
        promo = 'q';
      }

      const move = masterGameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promo,
      });

      if (move === null) {
        console.warn('Invalid move from', sourceSquare, 'to', targetSquare);
        showToast(`Invalid move: ${sourceSquare} to ${targetSquare}`, 'error');
        return false;
      }

      Promise.resolve(player.getCurrentTime()).then((time: any) => {
        const timeNum = Number(time);
        const comment = masterGameRef.current.getComment() || '';
        masterGameRef.current.setComment(`${comment} [%vtime ${timeNum.toFixed(3)}]`.trim());

        const newTimeMap = { ...timeMap };
        for (let i = currentMoveIndex + 1; i <= totalMoves; i++) {
          delete newTimeMap[i];
        }
        newTimeMap[currentMoveIndex + 1] = timeNum;

        const newPgn = masterGameRef.current.pgn();
        setPgnString(newPgn);
        setTimeMap(newTimeMap);
        setHistory(masterGameRef.current.history({ verbose: true }) as Move[]);
        
        setCurrentFen(masterGameRef.current.fen());
        setCurrentMoveIndex(currentMoveIndex + 1);
        updateUrlWithNewPgn(newPgn);
        
        setSyncTargetIndex(null);
      });

      return true;
    } catch (e: any) {
      console.warn('Invalid move:', e.message);
      showToast(`Cannot make move: ${e.message}`, 'error');
      return false;
    }
  }, [showToast, updateUrlWithNewPgn]);

  const truncateHistory = useCallback(() => {
    const { currentMoveIndex, history, timeMap } = stateRef.current;
    if (history.length === 0) return;
    
    if (!window.confirm('Are you sure you want to clear this move and all subsequent moves and markers?')) return;
    
    const targetKeepMoves = Math.max(0, currentMoveIndex - 1);
    const totalMoves = masterGameRef.current.history().length;
    for (let i = 0; i < totalMoves - targetKeepMoves; i++) {
      masterGameRef.current.undo();
    }
    
    const newTimeMap = { ...timeMap };
    for (let i = targetKeepMoves + 1; i <= totalMoves; i++) {
      delete newTimeMap[i];
    }
    
    const newPgn = masterGameRef.current.pgn();
    setPgnString(newPgn);
    setTimeMap(newTimeMap);
    setHistory(masterGameRef.current.history({ verbose: true }) as Move[]);
    setCurrentMoveIndex(targetKeepMoves);
    setCurrentFen(masterGameRef.current.fen());
    updateUrlWithNewPgn(newPgn);
    
    setSyncTargetIndex(null);
  }, [updateUrlWithNewPgn]);

  const updateStartTimeAnchor = useCallback(async () => {
    if (!player) return;
    const time = await player.getCurrentTime();
    
    masterGameRef.current.header('StartTime', time.toFixed(3));
    
    const newPgn = masterGameRef.current.pgn();
    setPgnString(newPgn);
    updateUrlWithNewPgn(newPgn);
    
    setTimeMap(prev => ({ ...prev, 0: time }));
    showToast('Game start time marked!', 'success');
  }, [player, updateUrlWithNewPgn, showToast]);

  const jumpToMoveSilently = useCallback((index: number) => {
    if (index === 0) {
      setCurrentFen(stateRef.current.initialFen);
    } else {
      const hist = masterGameRef.current.history({ verbose: true }) as Move[];
      if (hist[index - 1]) {
        setCurrentFen(hist[index - 1].after);
      }
    }
  }, []);

  const jumpToMove = useCallback((index: number) => {
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
  }, [jumpToMoveSilently, player]);

  const toggleSyncMode = useCallback(() => {
    const newMode = !isSyncMode;
    setIsSyncMode(newMode);
    if (newMode) {
      let nextIndex = 1;
      while(timeMap[nextIndex] !== undefined) nextIndex++;
      setSyncTargetIndex(nextIndex <= history.length ? nextIndex : null);
    } else {
      setSyncTargetIndex(null);
    }
  }, [isSyncMode, timeMap, history.length]);

  const togglePlay = useCallback(() => {
    if (!player || typeof player.getPlayerState !== 'function') return;
    if (player.getPlayerState() === 1) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [player]);

  return {
    videoId, setVideoId,
    pgnString, setPgnString,
    masterGameRef,
    initialFen, setInitialFen,
    currentFen, setCurrentFen,
    currentMoveIndex, setCurrentMoveIndex,
    history, setHistory,
    player, setPlayer,
    isPlaying, setIsPlaying,
    timeMap, setTimeMap,
    isSyncMode, setIsSyncMode,
    syncTargetIndex, setSyncTargetIndex,
    editingMoveIndex, setEditingMoveIndex,
    inputRawPgn, setInputRawPgn,
    inputVideoId, setInputVideoId,
    stateRef,
    isSeekingRef,
    seekTimeoutRef,
    loadGameFromPgn,
    updateMoveVTime,
    updateUrlWithNewPgn,
    handlePieceDrop,
    truncateHistory,
    updateStartTimeAnchor,
    jumpToMoveSilently,
    jumpToMove,
    toggleSyncMode,
    togglePlay,
  };
}
