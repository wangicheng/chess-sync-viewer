import React, { useState, useEffect } from 'react';
import { Chess, Move } from 'chess.js';
import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import { Download, Check, AlertCircle } from 'lucide-react';

interface VideoExportProps {
  history: Move[];
  boardSettings: { orientation: 'white' | 'black' };
  timeMap: Record<number, number>;
}

let globalPieceImages: Record<string, HTMLImageElement> | null = null;

export const VideoExport: React.FC<VideoExportProps> = ({ history, boardSettings, timeMap }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(history.length);
  
  
  const [pauseDuration, setPauseDuration] = useState(0.5);
  const [animDuration, setAnimDuration] = useState(0.3);
  const [useMarkedTime, setUseMarkedTime] = useState(true);

  useEffect(() => {
    setEndIdx(history.length);
  }, [history.length]);

  const loadPieces = async () => {
    if (globalPieceImages) return globalPieceImages;

    const pieces = ['bk', 'bq', 'br', 'bb', 'bn', 'bp', 'wk', 'wq', 'wr', 'wb', 'wn', 'wp'];
    const pieceImages: Record<string, HTMLImageElement> = {};
    
    await Promise.all(pieces.map(p => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          pieceImages[p] = img;
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load ${p}`));
        img.src = `${import.meta.env.BASE_URL}pieces/${p}.svg`;
      });
    }));
    
    globalPieceImages = pieceImages;
    return pieceImages;
  };

  const getSquarePos = (sq: string, orientation: string, sqSize: number) => {
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(sq[1]);
    if (orientation === 'black') {
      return { x: (7 - file) * sqSize, y: (7 - rank) * sqSize };
    }
    return { x: file * sqSize, y: rank * sqSize };
  };

  const drawBoard = (ctx: CanvasRenderingContext2D, sqSize: number) => {
    const light = '#f0d9b5';
    const dark = '#b58863';
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 0;
        ctx.fillStyle = isLight ? light : dark;
        ctx.fillRect(file * sqSize, rank * sqSize, sqSize, sqSize);
      }
    }
  };

  const handleExport = async () => {
    if (startIdx >= endIdx || startIdx < 0 || endIdx > history.length) {
      alert("Invalid move range.");
      return;
    }

    if (typeof (window as any).VideoEncoder === 'undefined') {
      alert("Your browser does not support WebCodecs API, which is required for exporting video. Please try using Chrome, Edge, or a supported browser.");
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setStatus('Loading assets...');

    try {
      const pieceImages = await loadPieces();
      
      const fps = 60;
      const width = 1080;
      const height = 1080;
      const sqSize = width / 8;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Failed to get canvas context");

      let muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width: width,
          height: height
        }
      });

      let frameCounter = 0;
      const encodeFrame = async (encoder: any, timestampUs: number) => {
        const frame = new (window as any).VideoFrame(canvas, { timestamp: timestampUs });
        encoder.encode(frame, { keyFrame: frameCounter % 60 === 0 });
        frame.close();
        frameCounter++;
      };

      const encoder = new (window as any).VideoEncoder({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: any) => console.error(e)
      });

      encoder.configure({
        codec: 'vp09.00.10.08',
        width,
        height,
        bitrate: 5_000_000,
        framerate: fps
      });

      setStatus('Simulating game...');
      
      const chess = new Chess();
      for (let i = 0; i < startIdx; i++) {
        chess.move(history[i]);
      }

      let totalFrames = 0;
      const moveFramesList: { pFrames: number; aFrames: number }[] = [];
      
      for (let i = startIdx; i < endIdx; i++) {
        let moveDt = pauseDuration + animDuration;
        if (useMarkedTime) {
          const t1 = timeMap[i];
          const t2 = timeMap[i + 1];
          if (t1 !== undefined && t2 !== undefined) {
            moveDt = t2 - t1;
          }
        }
        if (moveDt < 0.1) moveDt = 0.1; // minimum length per move
        
        let currentAnim = animDuration;
        if (moveDt < animDuration) currentAnim = moveDt;
        let currentPause = moveDt - currentAnim;
        
        let pFrames = Math.round(currentPause * fps);
        let aFrames = Math.round(currentAnim * fps);
        if (aFrames < 1) aFrames = 1;
        
        moveFramesList.push({ pFrames, aFrames });
        totalFrames += (pFrames + aFrames);
      }
      const finalPauseFrames = Math.round(pauseDuration * fps);
      totalFrames += finalPauseFrames;
      
      let currentFrame = 0;
      
      const renderState = async (t: number = 0, move: any = null) => {
        ctx.clearRect(0, 0, width, height);
        drawBoard(ctx, sqSize);
        
        const board2d = chess.board();
        const hiddenSquares: string[] = [];
        const movingPieces: any[] = [];
        
        if (move && t > 0 && t <= 1) {
          hiddenSquares.push(move.from);
          movingPieces.push({ piece: move.color + move.piece, from: move.from, to: move.to });
          
          if (move.flags.includes('k') || move.flags.includes('q')) {
            let rFrom, rTo;
            if (move.color === 'w') {
              if (move.flags.includes('k')) { rFrom = 'h1'; rTo = 'f1'; }
              else { rFrom = 'a1'; rTo = 'd1'; }
            } else {
              if (move.flags.includes('k')) { rFrom = 'h8'; rTo = 'f8'; }
              else { rFrom = 'a8'; rTo = 'd8'; }
            }
            movingPieces.push({ piece: move.color + 'r', from: rFrom, to: rTo });
            hiddenSquares.push(rFrom);
          }
          
          if (move.flags.includes('e')) {
            const capSq = move.to[0] + move.from[1];
            hiddenSquares.push(capSq);
          }
        }
        
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const fileStr = String.fromCharCode('a'.charCodeAt(0) + f);
            const rankStr = (8 - r).toString();
            const sq = fileStr + rankStr;
            
            if (hiddenSquares.includes(sq)) continue;
            
            const p = board2d[r][f];
            if (p) {
              const pName = p.color + p.type;
              const pos = getSquarePos(sq, boardSettings.orientation, sqSize);
              ctx.drawImage(pieceImages[pName], pos.x, pos.y, sqSize, sqSize);
            }
          }
        }
        
        for (const mp of movingPieces) {
          const fromPos = getSquarePos(mp.from, boardSettings.orientation, sqSize);
          const toPos = getSquarePos(mp.to, boardSettings.orientation, sqSize);
          const x = fromPos.x + (toPos.x - fromPos.x) * t;
          const y = fromPos.y + (toPos.y - fromPos.y) * t;
          ctx.drawImage(pieceImages[mp.piece], x, y, sqSize, sqSize);
        }
        
        const timestampUs = currentFrame * (1000000 / fps);
        await encodeFrame(encoder, timestampUs);
        currentFrame++;
        
        if (currentFrame % 10 === 0) {
          setProgress((currentFrame / totalFrames) * 100);
          await new Promise(r => setTimeout(r, 0));
        }
      };

      for (let i = startIdx; i < endIdx; i++) {
        setStatus(`Rendering move ${i + 1}/${endIdx}...`);
        const move = history[i];
        const moveFrames = moveFramesList[i - startIdx];
        
        for (let f = 0; f < moveFrames.pFrames; f++) {
          await renderState(0, null);
        }
        
        for (let f = 1; f <= moveFrames.aFrames; f++) {
          const t = f / moveFrames.aFrames;
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          await renderState(ease, move);
        }
        
        chess.move(move);
      }
      
      setStatus('Finalizing video...');
      for (let f = 0; f < finalPauseFrames; f++) {
        await renderState(0, null);
      }
      
      await encoder.flush();
      muxer.finalize();
      
      const { buffer } = muxer.target as ArrayBufferTarget;
      const blob = new Blob([buffer], { type: 'video/webm' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `chess_export_${startIdx}_to_${endIdx}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setStatus('Export complete!');
      setProgress(100);
      
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      <p className="text-slate-400 text-sm mb-4">
        Export the chessboard animation as a smooth WebM video file, processed entirely in your browser without uploading any data.
      </p>

      <div className={`p-4 rounded-xl border transition-all ${useMarkedTime ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/50 border-slate-700/50'}`}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={useMarkedTime}
            onChange={(e) => setUseMarkedTime(e.target.checked)}
            className="w-5 h-5 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
          />
          <div>
            <span className={`text-sm font-medium block ${useMarkedTime ? 'text-blue-400' : 'text-slate-300'}`}>Use Video Sync Timing</span>
            <span className="text-xs text-slate-400 mt-0.5 block">If enabled, the time between moves will perfectly match the original synced video.</span>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Start Move</label>
            <input
              type="number"
              min="0"
              max={endIdx}
              value={startIdx}
              onChange={(e) => setStartIdx(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">End Move</label>
            <input
              type="number"
              min={startIdx}
              max={history.length}
              value={endIdx}
              onChange={(e) => setEndIdx(parseInt(e.target.value) || history.length)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
            />
            <div className="text-xs text-slate-500 text-right">Max: {history.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`space-y-2 transition-opacity ${useMarkedTime ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="text-sm font-medium text-slate-300">Pause Duration (sec)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(parseFloat(e.target.value) || 0.5)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Animation Duration (sec)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={animDuration}
              onChange={(e) => setAnimDuration(parseFloat(e.target.value) || 0.3)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>
        </div>

        {status && (
          <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-slate-300 mb-2">
              {progress === 100 ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-blue-400 animate-pulse" />}
              <span>{status}</span>
            </div>
            {isExporting && (
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting || history.length === 0}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          {isExporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Exporting ({Math.round(progress)}%)</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Start Export</span>
            </>
          )}
        </button>
    </div>
  );
};
