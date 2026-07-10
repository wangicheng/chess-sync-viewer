import React from 'react';
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react';

interface GameControlsProps {
  jumpToMove: (index: number) => void;
  currentMoveIndex: number;
  historyLength: number;
  togglePlay: () => void;
  isPlaying: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  jumpToMove,
  currentMoveIndex,
  historyLength,
  togglePlay,
  isPlaying,
}) => {
  return (
    <div className="flex-none flex items-center justify-center gap-4 mt-2 lg:mt-4 bg-slate-900/50 rounded-full px-4 py-1.5 lg:py-2 ring-1 ring-white/10">
      <button
        onClick={() => jumpToMove(0)}
        className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors"
        title="First Move"
      >
        <SkipBack className="w-4 h-4 lg:w-5 lg:h-5" />
      </button>
      <button
        onClick={() => jumpToMove(Math.max(0, currentMoveIndex - 1))}
        className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors"
        title="Previous Move"
      >
        <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>
      <button
        onClick={togglePlay}
        className="p-2 lg:p-3 text-slate-300 hover:text-white transition-colors bg-blue-600/20 hover:bg-blue-600/40 rounded-full"
        title="Play / Pause"
      >
        {isPlaying ? <Pause className="w-5 h-5 lg:w-6 lg:h-6" /> : <Play className="w-5 h-5 lg:w-6 lg:h-6" />}
      </button>
      <button
        onClick={() => jumpToMove(Math.min(historyLength, currentMoveIndex + 1))}
        className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors"
        title="Next Move"
      >
        <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
      </button>
      <button
        onClick={() => jumpToMove(historyLength)}
        className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors"
        title="Last Move"
      >
        <SkipForward className="w-4 h-4 lg:w-5 lg:h-5" />
      </button>
    </div>
  );
};
