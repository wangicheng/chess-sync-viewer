import React from 'react';
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react';

interface GameControlsProps {
  jumpToMove: (index: number) => void;
  stepBackward: () => void;
  stepForward: () => void;
  historyLength: number;
  togglePlay: () => void;
  isPlaying: boolean;
  layoutMode?: 'sync' | 'study' | 'overlay';
}

export const GameControls: React.FC<GameControlsProps> = ({
  jumpToMove,
  stepBackward,
  stepForward,
  historyLength,
  togglePlay,
  isPlaying,
}) => {
  return (
    <div className="flex-none inline-flex items-center justify-center mx-auto gap-1.5 lg:gap-2 mt-2 lg:mt-3 bg-slate-900/60 rounded-lg px-2.5 lg:px-3 py-1 lg:py-1.5 shadow-md border border-slate-700/50 backdrop-blur-sm">
      <button
        onClick={() => jumpToMove(0)}
        className="p-1.5 lg:p-2 text-slate-400 hover:text-white transition-colors"
        title="First Move"
      >
        <SkipBack className="w-4 h-4 lg:w-5 lg:h-5" />
      </button>
      <button
        onClick={stepBackward}
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
        onClick={stepForward}
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
